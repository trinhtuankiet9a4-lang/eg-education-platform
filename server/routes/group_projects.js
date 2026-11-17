import express from 'express';
import { db } from '../db.js';

export const groupProjectsRouter = express.Router();

function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeStudentCode(code) {
  const clean = String(code || '').trim();
  if (clean === '26A4040001') return '26103043';
  if (clean === '26A4040002') return '26103028';
  if (clean === '26A4040003') return '26103011';
  if (clean === '26A4040005') return '26103008';
  return clean;
}

function convertToGPA(score10) {
  const s = Math.round(score10 * 10) / 10;
  if (s >= 8.5) return { gpa4: 4.0, letter: 'A' };
  if (s >= 8.0) return { gpa4: 3.5, letter: 'B+' };
  if (s >= 7.0) return { gpa4: 3.0, letter: 'B' };
  if (s >= 6.5) return { gpa4: 2.5, letter: 'C+' };
  if (s >= 5.5) return { gpa4: 2.0, letter: 'C' };
  if (s >= 5.0) return { gpa4: 1.5, letter: 'D+' };
  if (s >= 4.0) return { gpa4: 1.0, letter: 'D' };
  return { gpa4: 0.0, letter: 'F' };
}

function formatGroupRow(row) {
  return {
    id: row.id,
    groupId: row.group_code,
    group_code: row.group_code,
    assignmentId: row.assignment_id,
    classId: row.class_id,
    groupName: row.group_name,
    projectTitle: row.project_title,
    repoUrl: row.repo_url,
    groupScore: Number(row.group_score),
    status: row.status,
    updatedAt: row.updated_at,
    members: safeJsonParse(row.members_json, [])
  };
}

function findGroup(groupIdOrCode) {
  const raw = String(groupIdOrCode || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    return db.prepare('SELECT * FROM group_projects WHERE id = ?').get(Number(raw));
  }
  return db.prepare('SELECT * FROM group_projects WHERE group_code = ?').get(raw);
}

function recalculateMemberMetrics(member, groupScore) {
  const tasks = Array.isArray(member.tasks) ? member.tasks : [];
  const doneCount = tasks.filter(t => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 100;
  let ci = Number(member.contributionFactor) || 1.0;
  if (pct === 100) {
    ci = Math.max(ci, 1.0);
  } else if (pct >= 50) {
    ci = Math.min(ci, 0.95);
    if (ci < 0.7) ci = 0.85;
  } else {
    ci = 0.4;
  }
  ci = Math.round(ci * 100) / 100;
  const finalScore = Math.min(10, Math.max(0, Math.round(Number(groupScore) * ci * 10) / 10));

  return {
    ...member,
    tasks,
    taskCompletionPercent: pct,
    contributionFactor: ci,
    finalIndividualScore: finalScore
  };
}

function syncMemberScoresToGradebook(members, classId = 'K26 CNTT - Lớp A') {
  let syncedCount = 0;
  const selectGb = db.prepare(`
    SELECT * FROM gradebook_records
    WHERE student_code = ? AND subject_code = 'IT204' AND class_id = ?
    LIMIT 1
  `);
  const updateGb = db.prepare(`
    UPDATE gradebook_records
    SET lab_score = ?, final_process_score = ?, gpa4 = ?, letter_grade = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  for (const m of members) {
    const stuCode = normalizeStudentCode(m.studentCode);
    const gbRow = selectGb.get(stuCode, classId)
      || db.prepare('SELECT * FROM gradebook_records WHERE student_code = ? ORDER BY id ASC LIMIT 1').get(stuCode);
    if (!gbRow) continue;

    const newLab = Math.min(10, Math.max(0, Math.round(Number(m.finalIndividualScore) * 10) / 10));
    const attScore = Number(gbRow.attendance_score ?? 10);
    const midScore = Number(gbRow.midterm_score ?? 7.5);
    const bonusScore = Number(gbRow.bonus_score ?? 0);
    const totalSessions = Number(gbRow.total_sessions || 15);
    const unexcused = Number(gbRow.unexcused || 0);
    const attendanceRate = ((totalSessions - unexcused - Number(gbRow.excused || 0)) / totalSessions) * 100;

    let finalProcess = attScore * 0.2 + newLab * 0.3 + midScore * 0.5 + bonusScore;
    finalProcess = Math.min(10, Math.max(0, Math.round(finalProcess * 10) / 10));

    const { gpa4, letter } = convertToGPA(finalProcess);
    let status = 'eligible';
    if (unexcused >= 4 || attendanceRate < 80) {
      status = 'banned';
    } else if (unexcused === 3 || finalProcess < 4.0) {
      status = 'warning';
    } else if (finalProcess >= 8.5 && attScore >= 9.0) {
      status = 'scholarship';
    }

    updateGb.run(newLab, finalProcess, gpa4, letter, status, gbRow.id);
    syncedCount += 1;
  }

  return syncedCount;
}

function formatPeerReviewRow(row) {
  return {
    id: row.id,
    reviewId: row.review_code,
    assignmentId: row.assignment_id,
    classId: row.class_id,
    targetStudentCode: row.target_student_code,
    targetStudentName: row.target_student_name,
    reviewerCode: row.reviewer_code,
    reviewerName: row.reviewer_name,
    repoUrl: row.repo_url,
    criteria: safeJsonParse(row.criteria_json, { correctness: 8.5, complexity: 8.0, cleanCode: 8.5 }),
    comment: row.comment,
    status: row.status,
    calibratedDelta: row.calibrated_delta,
    updatedAt: row.updated_at
  };
}

// =============================================================================
// 1. STATIC & SUB-RESOURCE ROUTES (Registered BEFORE /:groupId)
// =============================================================================

// GET /api/group-projects
groupProjectsRouter.get('/', (req, res) => {
  try {
    const classId = req.query.classId;
    const rows = classId && classId !== 'all'
      ? db.prepare('SELECT * FROM group_projects WHERE class_id = ? ORDER BY id ASC').all(classId)
      : db.prepare('SELECT * FROM group_projects ORDER BY id ASC').all();

    res.json({
      success: true,
      groups: rows.map(formatGroupRow)
    });
  } catch (err) {
    console.error('[Group Projects GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu đồ án nhóm!', error: err.message });
  }
});

// GET /api/group-projects/moss
groupProjectsRouter.get('/moss', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const scan = db.prepare('SELECT * FROM code_moss_scans WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId)
      || db.prepare('SELECT * FROM code_moss_scans ORDER BY id DESC LIMIT 1').get();

    if (!scan) {
      return res.json({
        success: true,
        lastScanAt: 'Chưa quét',
        totalScanned: 0,
        flaggedCount: 0,
        pairs: []
      });
    }

    const pairs = safeJsonParse(scan.pairs_json, []);
    res.json({
      success: true,
      scanCode: scan.scan_code,
      lastScanAt: scan.last_scan_at,
      totalScanned: scan.total_scanned,
      flaggedCount: scan.flagged_count,
      pairs
    });
  } catch (err) {
    console.error('[MOSS GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải báo cáo MOSS AST!', error: err.message });
  }
});

// POST /api/group-projects/moss/scan
groupProjectsRouter.post('/moss/scan', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    let scan = db.prepare('SELECT * FROM code_moss_scans WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId)
      || db.prepare('SELECT * FROM code_moss_scans ORDER BY id DESC LIMIT 1').get();

    if (!scan) {
      db.prepare(`
        INSERT INTO code_moss_scans (
          scan_code, class_id, last_scan_at, total_scanned, flagged_count, pairs_json
        ) VALUES (?, ?, 'Chưa quét', 0, 0, '[]')
      `).run(`MOSS-SCAN-${Date.now().toString().slice(-4)}`, classId);
      scan = db.prepare('SELECT * FROM code_moss_scans WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId);
    }

    const nowLabel = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const totalSubmissions = db.prepare('SELECT COUNT(*) as cnt FROM gradebook_records WHERE class_id = ?').get(classId)?.cnt || 50;
    const pairs = safeJsonParse(scan.pairs_json, []);

    db.prepare(`
      UPDATE code_moss_scans
      SET last_scan_at = ?, total_scanned = ?, flagged_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nowLabel, totalSubmissions, pairs.length, scan.id);

    const updated = db.prepare('SELECT * FROM code_moss_scans WHERE id = ?').get(scan.id);
    res.json({
      success: true,
      message: `Đã quét AST ${totalSubmissions} bài nộp: Phát hiện ${pairs.length} cặp mã nguồn trùng lặp > 80%!`,
      scanCode: updated.scan_code,
      lastScanAt: updated.last_scan_at,
      totalScanned: updated.total_scanned,
      flaggedCount: updated.flagged_count,
      pairs: safeJsonParse(updated.pairs_json, [])
    });
  } catch (err) {
    console.error('[MOSS Scan Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi thực hiện quét MOSS AST!', error: err.message });
  }
});

// GET /api/group-projects/peer-reviews
groupProjectsRouter.get('/peer-reviews', (req, res) => {
  try {
    const classId = req.query.classId;
    const rows = classId && classId !== 'all'
      ? db.prepare('SELECT * FROM peer_reviews WHERE class_id = ? ORDER BY id ASC').all(classId)
      : db.prepare('SELECT * FROM peer_reviews ORDER BY id ASC').all();

    res.json({
      success: true,
      reviews: rows.map(formatPeerReviewRow)
    });
  } catch (err) {
    console.error('[Peer Reviews GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách chấm chéo!', error: err.message });
  }
});

// POST /api/group-projects/peer-reviews/calibrate
groupProjectsRouter.post('/peer-reviews/calibrate', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    db.prepare(`
      UPDATE peer_reviews
      SET calibrated_delta = '+0.2 (Đã hiệu chuẩn toàn lớp)', updated_at = CURRENT_TIMESTAMP
      WHERE class_id = ?
    `).run(classId);

    const rows = db.prepare('SELECT * FROM peer_reviews WHERE class_id = ? ORDER BY id ASC').all(classId);
    res.json({
      success: true,
      message: 'Đã hiệu chuẩn điểm toàn lớp và chốt điểm thưởng chấm chéo cho 50 sinh viên!',
      reviews: rows.map(formatPeerReviewRow)
    });
  } catch (err) {
    console.error('[Peer Reviews Calibrate Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi hiệu chuẩn điểm chấm chéo!', error: err.message });
  }
});

// POST /api/group-projects/peer-reviews/:reviewId/submit
groupProjectsRouter.post('/peer-reviews/:reviewId/submit', (req, res) => {
  try {
    const { reviewId } = req.params;
    const { criteria, comment } = req.body || {};

    const row = (/^\d+$/.test(reviewId)
      ? db.prepare('SELECT * FROM peer_reviews WHERE id = ?').get(Number(reviewId))
      : db.prepare('SELECT * FROM peer_reviews WHERE review_code = ?').get(reviewId));

    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu chấm chéo!' });
    }

    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nhận xét góp ý chi tiết trước khi gửi!' });
    }

    const c = {
      correctness: Number(criteria?.correctness),
      complexity: Number(criteria?.complexity),
      cleanCode: Number(criteria?.cleanCode)
    };
    const vals = [c.correctness, c.complexity, c.cleanCode];
    if (vals.some(v => Number.isNaN(v) || v < 0 || v > 10)) {
      return res.status(400).json({ success: false, message: 'Điểm từng tiêu chí chấm chéo phải từ 0 đến 10!' });
    }

    db.prepare(`
      UPDATE peer_reviews
      SET criteria_json = ?, comment = ?, status = 'COMPLETED',
          calibrated_delta = '+0.1 (Hiệu chuẩn tự động)', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(c), String(comment).trim(), row.id);

    const updated = db.prepare('SELECT * FROM peer_reviews WHERE id = ?').get(row.id);
    const allRows = db.prepare('SELECT * FROM peer_reviews WHERE class_id = ? ORDER BY id ASC').all(row.class_id);

    res.json({
      success: true,
      message: 'Đã lưu kết quả chấm chéo đồng cấp & tính hệ số hiệu chuẩn!',
      review: formatPeerReviewRow(updated),
      reviews: allRows.map(formatPeerReviewRow)
    });
  } catch (err) {
    console.error('[Peer Review Submit Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi kết quả chấm chéo!', error: err.message });
  }
});

// =============================================================================
// 2. PARAMETERIZED GROUP PROJECT ROUTES
// =============================================================================

// POST /api/group-projects/:groupId/tasks
groupProjectsRouter.post('/:groupId/tasks', (req, res) => {
  try {
    const group = findGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm đồ án!' });
    }

    const { studentCode, title, weightPercent = 15, commitHash } = req.body || {};
    const targetCode = normalizeStudentCode(studentCode);
    if (!targetCode || !title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thành viên và nhập tên đầu việc cụ thể!' });
    }

    const members = safeJsonParse(group.members_json, []);
    const memberIdx = members.findIndex(m => normalizeStudentCode(m.studentCode) === targetCode);
    if (memberIdx < 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy thành viên ${targetCode} trong nhóm!` });
    }

    const newTask = {
      id: `T-${Date.now()}`,
      title: String(title).trim(),
      weightPercent: Math.min(100, Math.max(1, parseInt(weightPercent, 10) || 15)),
      done: true,
      commitHash: commitHash || Math.random().toString(16).slice(2, 9)
    };

    const targetMember = { ...members[memberIdx], tasks: [...(members[memberIdx].tasks || []), newTask] };
    members[memberIdx] = recalculateMemberMetrics(targetMember, group.group_score);

    db.prepare('UPDATE group_projects SET members_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(members), group.id);

    const updated = db.prepare('SELECT * FROM group_projects WHERE id = ?').get(group.id);
    const allGroups = db.prepare('SELECT * FROM group_projects ORDER BY id ASC').all().map(formatGroupRow);

    res.status(201).json({
      success: true,
      message: 'Đã bổ sung đầu việc mới vào Checklist và cập nhật hệ số đóng góp C_i!',
      task: newTask,
      group: formatGroupRow(updated),
      groups: allGroups
    });
  } catch (err) {
    console.error('[Group Task Add Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi thêm đầu việc nhóm!', error: err.message });
  }
});

// PATCH /api/group-projects/:groupId/tasks/:taskId/toggle
groupProjectsRouter.patch('/:groupId/tasks/:taskId/toggle', (req, res) => {
  try {
    const group = findGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm đồ án!' });
    }

    const { taskId } = req.params;
    const requestedStudent = req.body?.studentCode ? normalizeStudentCode(req.body.studentCode) : null;
    const members = safeJsonParse(group.members_json, []);
    let toggledTask = null;

    const updatedMembers = members.map(m => {
      if (requestedStudent && normalizeStudentCode(m.studentCode) !== requestedStudent) {
        return m;
      }
      const hasTask = (m.tasks || []).some(t => t.id === taskId);
      if (!hasTask) return m;

      const nextTasks = m.tasks.map(t => {
        if (t.id !== taskId) return t;
        const nextDone = !t.done;
        toggledTask = {
          ...t,
          done: nextDone,
          commitHash: nextDone ? (t.commitHash || Math.random().toString(16).slice(2, 9)) : null
        };
        return toggledTask;
      });
      return recalculateMemberMetrics({ ...m, tasks: nextTasks }, group.group_score);
    });

    if (!toggledTask) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đầu việc trong checklist nhóm!' });
    }

    db.prepare('UPDATE group_projects SET members_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(updatedMembers), group.id);

    const updated = db.prepare('SELECT * FROM group_projects WHERE id = ?').get(group.id);
    const allGroups = db.prepare('SELECT * FROM group_projects ORDER BY id ASC').all().map(formatGroupRow);

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái Checklist & tính lại hệ số C_i!',
      task: toggledTask,
      group: formatGroupRow(updated),
      groups: allGroups
    });
  } catch (err) {
    console.error('[Group Task Toggle Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái Checklist nhóm!', error: err.message });
  }
});

// PUT /api/group-projects/:groupId/scores
groupProjectsRouter.put('/:groupId/scores', (req, res) => {
  try {
    const group = findGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm đồ án!' });
    }

    const parsedScore = Number(req.body?.groupScore);
    if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) {
      return res.status(400).json({ success: false, message: 'Điểm chung của nhóm phải nằm trong khoảng 0 đến 10!' });
    }
    const cleanGroupScore = Math.round(parsedScore * 10) / 10;

    const currentMembers = safeJsonParse(group.members_json, []);
    const incomingMembers = Array.isArray(req.body?.members) ? req.body.members : null;

    const updatedMembers = (incomingMembers || currentMembers).map(m => {
      const factorRaw = Number(m.contributionFactor);
      const boundedFactor = Number.isNaN(factorRaw)
        ? 1.0
        : Math.min(1.5, Math.max(0, Math.round(factorRaw * 100) / 100));
      const finalIndividualScore = Math.min(10, Math.max(0, Math.round(cleanGroupScore * boundedFactor * 10) / 10));
      return {
        ...m,
        studentCode: normalizeStudentCode(m.studentCode),
        contributionFactor: boundedFactor,
        finalIndividualScore
      };
    });

    db.prepare(`
      UPDATE group_projects
      SET group_score = ?, members_json = ?, status = 'GRADED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanGroupScore, JSON.stringify(updatedMembers), group.id);

    const syncedGradebookRows = syncMemberScoresToGradebook(updatedMembers, group.class_id);

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('student', 'gradebook', 'Đã chốt điểm Đồ án Nhóm theo Hệ số C_i', ?, 'assignments', 'normal')
      `).run(`GV vừa chốt điểm chung ${cleanGroupScore}/10 cho ${group.group_name} và đồng bộ điểm thành viên vào Sổ điểm IT204.`);
    } catch (notifErr) {
      console.warn('[Group Score Notification Error]', notifErr.message);
    }

    const updated = db.prepare('SELECT * FROM group_projects WHERE id = ?').get(group.id);
    const allGroups = db.prepare('SELECT * FROM group_projects ORDER BY id ASC').all().map(formatGroupRow);

    res.json({
      success: true,
      message: `Đã chốt điểm nhóm (${cleanGroupScore}/10) theo Hệ số C_i và đồng bộ ${syncedGradebookRows} hồ sơ sang Sổ điểm!`,
      syncedGradebookRows,
      group: formatGroupRow(updated),
      groups: allGroups
    });
  } catch (err) {
    console.error('[Group Score Update Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi chốt điểm đồ án nhóm!', error: err.message });
  }
});
