import express from 'express';
import { db } from '../db.js';

export const drlRiskRouter = express.Router();

const SPOTLIGHT_CODES = ['26103043', '26103028', '26103011', '26103008', '26103004'];

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
  if (clean === '26A4040004') return '26103008';
  if (clean === '26A4040005') return '26103004';
  return clean;
}

function computeDrlRank(score) {
  if (score >= 90) return 'Xuất sắc';
  if (score >= 80) return 'Tốt';
  if (score >= 65) return 'Khá';
  if (score >= 50) return 'Trung bình';
  return 'Yếu';
}

function calculateAiRisk(drlRow, gradeRow) {
  const unexcused = Number(gradeRow?.unexcused || 0);
  const excused = Number(gradeRow?.excused || 0);
  const labScore = Number(gradeRow?.lab_score ?? 8.0);
  const finalProcessScore = Number(gradeRow?.final_process_score ?? 7.5);
  const drlScore = Number(drlRow?.drl_score ?? 80);

  const absenceRisk = Math.min(100, unexcused * 25 + excused * 8);
  const labRisk = Math.min(100, Math.max(0, (8.0 - labScore) * 18));
  const scoreDropRisk = Math.min(100, Math.max(0, (7.5 - finalProcessScore) * 22));
  const drlRisk = drlScore < 50 ? 95 : drlScore < 65 ? 65 : drlScore === 65 ? 55 : drlScore < 75 ? 25 : 5;

  let riskIndex = Math.round(
    absenceRisk * 0.35 +
    labRisk * 0.25 +
    scoreDropRisk * 0.25 +
    drlRisk * 0.15
  );

  // Students who exceed absence allowance (banned) or fail process score are always CRITICAL
  if (unexcused >= 4 || gradeRow?.status === 'banned') {
    riskIndex = Math.max(riskIndex, drlScore < 50 ? 89 : 78);
  }
  riskIndex = Math.min(98, Math.max(4, riskIndex));

  const riskLevel = riskIndex >= 70 ? 'CRITICAL' : riskIndex >= 31 ? 'WATCH' : 'SAFE';
  return { riskIndex, riskLevel };
}

function formatDrlRecord(row, gradeRow) {
  return {
    id: row.id,
    studentCode: row.student_code,
    studentName: row.student_name,
    classId: row.class_id,
    semester: row.semester,
    drlScore: Number(row.drl_score),
    drlRank: row.drl_rank,
    activitiesCount: Number(row.activities_count),
    disciplineWarning: row.discipline_warning,
    riskIndex: Number(row.risk_index),
    riskLevel: row.risk_level,
    advisorNotified: Boolean(row.advisor_notified),
    advisorNotifiedAt: row.advisor_notified_at || null,
    finalProcessScore: gradeRow ? Number(gradeRow.final_process_score) : null,
    unexcused: gradeRow ? Number(gradeRow.unexcused) : 0,
    attendanceScore: gradeRow ? Number(gradeRow.attendance_score) : null,
    labScore: gradeRow ? Number(gradeRow.lab_score) : null,
    updatedAt: row.updated_at
  };
}

function buildFullDrlPayload(classId = 'K26 CNTT - Lớp A') {
  const metaRow = db.prepare("SELECT value_json FROM system_settings WHERE key = 'drl_risk_meta'").get();
  const meta = safeJsonParse(metaRow?.value_json, {
    syncSource: 'Hệ thống Quản lý Công tác Sinh viên (CTSV - Trường ĐH)',
    lastSyncedAt: '10/11/2026 07:00'
  });

  const rows = classId && classId !== 'all'
    ? db.prepare('SELECT * FROM student_drl_risk_records WHERE class_id = ? ORDER BY student_code ASC').all(classId)
    : db.prepare('SELECT * FROM student_drl_risk_records ORDER BY student_code ASC').all();

  const gradeRows = db.prepare("SELECT * FROM gradebook_records WHERE subject_code = 'IT204'").all();
  const gradeMap = new Map();
  for (const g of gradeRows) {
    gradeMap.set(g.student_code, g);
  }

  const records = {};
  const list = rows.map(row => {
    const formatted = formatDrlRecord(row, gradeMap.get(row.student_code));
    records[formatted.studentCode] = formatted;
    return formatted;
  });

  const safeCount = list.filter(r => r.riskLevel === 'SAFE').length;
  const watchCount = list.filter(r => r.riskLevel === 'WATCH').length;
  const criticalCount = list.filter(r => r.riskLevel === 'CRITICAL').length;

  const spotlightStudents = SPOTLIGHT_CODES
    .map(code => records[code])
    .filter(Boolean);

  return {
    syncSource: meta.syncSource,
    lastSyncedAt: meta.lastSyncedAt,
    summary: {
      total: list.length,
      safeCount,
      watchCount,
      criticalCount
    },
    records,
    list,
    spotlightStudents: spotlightStudents.length > 0 ? spotlightStudents : list.slice(0, 5)
  };
}

// 1. GET /api/drl-risk
drlRiskRouter.get('/', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const payload = buildFullDrlPayload(classId);
    res.json({
      success: true,
      ...payload
    });
  } catch (err) {
    console.error('[DRL Risk GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu Điểm Rèn Luyện & Dự báo Rủi ro!', error: err.message });
  }
});

// 2. POST /api/drl-risk/sync
drlRiskRouter.post('/sync', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    const rows = db.prepare('SELECT * FROM student_drl_risk_records WHERE class_id = ?').all(classId);
    const gradeRows = db.prepare("SELECT * FROM gradebook_records WHERE subject_code = 'IT204' AND class_id = ?").all(classId);
    const gradeMap = new Map(gradeRows.map(g => [g.student_code, g]));

    const updateStmt = db.prepare(`
      UPDATE student_drl_risk_records
      SET drl_rank = ?, risk_index = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const row of rows) {
      const gradeRow = gradeMap.get(row.student_code);
      const rank = computeDrlRank(Number(row.drl_score));
      const { riskIndex, riskLevel } = calculateAiRisk(row, gradeRow);
      updateStmt.run(rank, riskIndex, riskLevel, row.id);
    }

    const syncedAt = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const meta = {
      syncSource: 'Hệ thống Quản lý Công tác Sinh viên (CTSV - Trường ĐH)',
      lastSyncedAt: syncedAt
    };

    db.prepare(`
      INSERT INTO system_settings (key, value_json, updated_at)
      VALUES ('drl_risk_meta', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(meta));

    const payload = buildFullDrlPayload(classId);
    res.json({
      success: true,
      message: `Đã đồng bộ Điểm Rèn Luyện & tính lại Chỉ số Nguy cơ AI cho ${payload.summary.total} sinh viên!`,
      ...payload
    });
  } catch (err) {
    console.error('[DRL Sync Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi đồng bộ dữ liệu CTSV & tính rủi ro AI!', error: err.message });
  }
});

// 3. PUT /api/drl-risk/:studentCode
drlRiskRouter.put('/:studentCode', (req, res) => {
  try {
    const cleanCode = normalizeStudentCode(req.params.studentCode);
    const existing = db.prepare('SELECT * FROM student_drl_risk_records WHERE student_code = ?').get(cleanCode);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Không tìm thấy hồ sơ ĐRL của sinh viên ${cleanCode}!` });
    }

    const nextScoreRaw = Number(req.body?.drlScore);
    if (Number.isNaN(nextScoreRaw) || nextScoreRaw < 0 || nextScoreRaw > 100) {
      return res.status(400).json({ success: false, message: 'Điểm Rèn luyện phải là số nguyên từ 0 đến 100!' });
    }
    const nextScore = Math.round(nextScoreRaw);
    const nextRank = computeDrlRank(nextScore);
    const nextActivities = req.body?.activitiesCount !== undefined
      ? Math.max(0, parseInt(req.body.activitiesCount, 10) || 0)
      : existing.activities_count;
    const nextWarning = req.body?.disciplineWarning !== undefined
      ? req.body.disciplineWarning
      : existing.discipline_warning;

    const gradeRow = db.prepare("SELECT * FROM gradebook_records WHERE student_code = ? AND subject_code = 'IT204' LIMIT 1").get(cleanCode);
    const { riskIndex, riskLevel } = calculateAiRisk({ ...existing, drl_score: nextScore }, gradeRow);

    db.prepare(`
      UPDATE student_drl_risk_records
      SET drl_score = ?, drl_rank = ?, activities_count = ?, discipline_warning = ?,
          risk_index = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextScore, nextRank, nextActivities, nextWarning, riskIndex, riskLevel, existing.id);

    const updatedRow = db.prepare('SELECT * FROM student_drl_risk_records WHERE id = ?').get(existing.id);
    const payload = buildFullDrlPayload(existing.class_id);

    res.json({
      success: true,
      message: `Đã cập nhật ĐRL (${nextScore}/100 - ${nextRank}) & chỉ số rủi ro (${riskIndex}%) cho ${updatedRow.student_name}!`,
      record: formatDrlRecord(updatedRow, gradeRow),
      ...payload
    });
  } catch (err) {
    console.error('[DRL Update Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật Điểm Rèn luyện!', error: err.message });
  }
});

// 4. POST /api/drl-risk/:studentCode/notify-advisor
drlRiskRouter.post('/:studentCode/notify-advisor', (req, res) => {
  try {
    const cleanCode = normalizeStudentCode(req.params.studentCode);
    const existing = db.prepare('SELECT * FROM student_drl_risk_records WHERE student_code = ?').get(cleanCode);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Không tìm thấy sinh viên ${cleanCode}!` });
    }

    db.prepare(`
      UPDATE student_drl_risk_records
      SET advisor_notified = 1, advisor_notified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.id);

    const updatedRow = db.prepare('SELECT * FROM student_drl_risk_records WHERE id = ?').get(existing.id);
    const gradeRow = db.prepare("SELECT * FROM gradebook_records WHERE student_code = ? AND subject_code = 'IT204' LIMIT 1").get(cleanCode);

    const customNote = req.body?.note ? ` Ghi chú: ${String(req.body.note).trim()}` : '';
    const desc = `Hồ sơ SV ${updatedRow.student_name} (${updatedRow.student_code}): ĐRL ${updatedRow.drl_score}/100 (${updatedRow.drl_rank}), Nguy cơ học vụ AI ${updatedRow.risk_index}% (${updatedRow.risk_level}).${customNote}`;

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('teacher', 'risk_alert', 'Cảnh báo sớm học vụ & ĐRL từ Giảng viên bộ môn', ?, 'gradebook', 'urgent')
      `).run(desc);

      const userRow = db.prepare('SELECT id FROM users WHERE code = ? LIMIT 1').get(cleanCode);
      if (userRow) {
        db.prepare(`
          INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
          VALUES ('student', ?, 'risk_alert', 'Cảnh báo sớm học vụ từ Giảng viên & Cố vấn học tập', ?, 'gradebook', 'urgent')
        `).run(userRow.id, `Giảng viên đã gửi hồ sơ cảnh báo sớm (Nguy cơ AI ${updatedRow.risk_index}%, ĐRL ${updatedRow.drl_score}/100) tới Cố vấn học tập. Hãy liên hệ GV để được hỗ trợ.`);
      }
    } catch (notifErr) {
      console.warn('[Advisor Notification Error]', notifErr.message);
    }

    const payload = buildFullDrlPayload(existing.class_id);
    res.json({
      success: true,
      message: `Đã gửi Hồ sơ Cảnh báo sớm (GPA + ĐRL ${updatedRow.drl_score}/100) của SV ${updatedRow.student_name} tới Cố vấn học tập & Phòng CTSV!`,
      record: formatDrlRecord(updatedRow, gradeRow),
      ...payload
    });
  } catch (err) {
    console.error('[Notify Advisor Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi cảnh báo Cố vấn học tập!', error: err.message });
  }
});
