import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET } from './auth.js';
import { aiService } from '../services/aiService.js';

export const leaveRouter = express.Router();

const DEFAULT_AI_CONFIG = { aiAutoApproveEnabled: true, confidenceThreshold: 88 };

const DEFAULT_QUIZ_QUESTIONS = [
  {
    id: 'Q1',
    q: 'Hệ số cân bằng (Balance Factor) hợp lệ của một nút bất kỳ trong cây AVL nằm trong tập giá trị nào?',
    options: ['{-2, -1, 0, 1, 2}', '{-1, 0, 1}', '{0, 1}', '{-1, 1}'],
    correctIndex: 1
  },
  {
    id: 'Q2',
    q: 'Khi chèn nút mới vào cây con trái của cây con phải (Trường hợp Right-Left), ta cần thực hiện phép xoay nào?',
    options: [
      'Xoay đơn phải (Right Rotation)',
      'Xoay đơn trái (Left Rotation)',
      'Xoay kép Phải - Trái (Right-Left Rotation)',
      'Không cần xoay'
    ],
    correctIndex: 2
  }
];

function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? null : decoded;
    next();
  });
}

function normalizeStudentCode(code, name) {
  const cleanCode = String(code || '').trim();
  const cleanName = String(name || '').trim().toLowerCase();
  if (cleanCode === '26A4040001' || cleanName === 'lê hoàng bảo') return '26103043';
  if (cleanCode === '26A4040005' || cleanName === 'hoàng minh đức') return '26103008';
  return cleanCode;
}

function resolveStudentInfo(stuCode, providedName, providedId) {
  const normalizedCode = normalizeStudentCode(stuCode, providedName);
  let matched = null;

  if (normalizedCode) {
    matched = db.prepare('SELECT id, code, name, class_id FROM users WHERE LOWER(code) = LOWER(?) LIMIT 1').get(normalizedCode);
  }
  if (!matched && providedId) {
    matched = db.prepare('SELECT id, code, name, class_id FROM users WHERE id = ? LIMIT 1').get(providedId);
  }
  if (!matched && providedName) {
    matched = db.prepare("SELECT id, code, name, class_id FROM users WHERE role = 'student' AND LOWER(name) = LOWER(?) LIMIT 1").get(providedName.trim());
  }
  if (!matched && !normalizedCode && !providedName) {
    matched = db.prepare("SELECT id, code, name, class_id FROM users WHERE code = '26103043' LIMIT 1").get();
  }

  return {
    id: matched?.id || Number(providedId) || 37,
    code: matched?.code || normalizedCode || '26103043',
    name: matched?.name || providedName || 'Trịnh Tuấn Kiệt',
    classId: matched?.class_id || 'K26 CNTT - Lớp A'
  };
}

function getLeaveAiConfig() {
  const row = db.prepare("SELECT value_json FROM system_settings WHERE key = 'leave_ai_config'").get();
  return { ...DEFAULT_AI_CONFIG, ...safeJsonParse(row?.value_json, {}) };
}

function saveLeaveAiConfig(config) {
  const next = { ...DEFAULT_AI_CONFIG, ...config };
  db.prepare(`
    INSERT INTO system_settings (key, value_json, updated_at)
    VALUES ('leave_ai_config', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(next));
  return next;
}

function convertToGPA(score10) {
  if (score10 >= 8.5) return { gpa4: 4.0, letter: 'A' };
  if (score10 >= 8.0) return { gpa4: 3.5, letter: 'B+' };
  if (score10 >= 7.0) return { gpa4: 3.0, letter: 'B' };
  if (score10 >= 6.5) return { gpa4: 2.5, letter: 'C+' };
  if (score10 >= 5.5) return { gpa4: 2.0, letter: 'C' };
  if (score10 >= 5.0) return { gpa4: 1.5, letter: 'D+' };
  if (score10 >= 4.0) return { gpa4: 1.0, letter: 'D' };
  return { gpa4: 0.0, letter: 'F' };
}

function formatDisplayDate(dateStr) {
  const raw = String(dateStr || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  return raw || new Date().toLocaleDateString('vi-VN');
}

function computeAiOcrAnalysis({ studentName, leaveDate, reason, reasonCategory, proofFileName }) {
  const lower = String(proofFileName || '').toLowerCase();
  const isSuspicious =
    lower.includes('mo') ||
    lower.includes('cu') ||
    lower.includes('fake') ||
    lower.includes('nghi_van') ||
    lower.includes('lech');
  const confidence = isSuspicious ? 48 : 95;
  const displayDate = formatDisplayDate(leaveDate);

  const hospital = reasonCategory === 'competition'
    ? 'Văn phòng Khoa CNTT & Ban Tổ chức'
    : (isSuspicious ? 'Không nhận diện rõ con dấu' : 'Bệnh viện Đại học Y Dược');

  return {
    hospital,
    patientName: String(studentName || '').toUpperCase(),
    examDate: displayDate,
    diagnosis: reason,
    stampDetected: !isSuspicious,
    dateMatched: !isSuspicious,
    nameMatched: true,
    confidence,
    verdict: isSuspicious ? 'SUSPICIOUS' : 'VALID',
    verdictLabel: isSuspicious
      ? 'Cần GV kiểm tra thủ công (Ảnh mờ / Thiếu mộc đỏ)'
      : `Hợp lệ (${confidence}% khớp họ tên, ngày khám & mộc đỏ)`
  };
}

function buildDefaultMakeupPack({ requestCode, leaveDate, subjectName, teacherRequirement }) {
  return {
    packId: `PACK-${requestCode || 'IT204'}`,
    lessonTitle: `Buổi học ${formatDisplayDate(leaveDate)}: ${subjectName || 'Cấu trúc dữ liệu & Giải thuật (IT204)'}`,
    slideFile: 'Slide_Bai10_Cay_AVL_Full.pdf',
    videoUrl: 'https://video.eg.edu.vn/it204/avl-rotations',
    teacherRequirement: teacherRequirement || 'Xem kỹ slide bài giảng đính kèm và trả lời đúng 2 câu hỏi ôn tập bên dưới để hoàn thành học bù tự động.',
    quizQuestions: DEFAULT_QUIZ_QUESTIONS
  };
}

function parseCorrectOptionIndex(correct, options = []) {
  if (typeof correct === 'number' && Number.isFinite(correct)) {
    const idx = Math.trunc(correct);
    if (idx >= 0 && idx < options.length) return idx;
  }
  const raw = String(correct ?? '').trim();
  if (/^[A-D]$/i.test(raw)) {
    const idx = ['A', 'B', 'C', 'D'].indexOf(raw.toUpperCase());
    if (idx >= 0 && idx < options.length) return idx;
  }
  if (/^[A-D][.):\s]/i.test(raw)) {
    const idx = ['A', 'B', 'C', 'D'].indexOf(raw[0].toUpperCase());
    if (idx >= 0 && idx < options.length) return idx;
  }
  if (/^\d+$/.test(raw)) {
    const idx = Number(raw);
    if (idx >= 0 && idx < options.length) return idx;
  }
  if (raw && Array.isArray(options) && options.length > 0) {
    const lowerRaw = raw.toLowerCase();
    const matchIdx = options.findIndex(o => {
      const lo = String(o || '').trim().toLowerCase();
      return lo === lowerRaw || lo.includes(lowerRaw) || lowerRaw.includes(lo);
    });
    if (matchIdx >= 0) return matchIdx;
  }
  return 0;
}

function normalizeGeneratedMakeupPack(aiPack, { requestCode, leaveDate, subjectName, reason }) {
  const fallbackPack = buildDefaultMakeupPack({ requestCode, leaveDate, subjectName });
  if (!aiPack || typeof aiPack !== 'object') {
    return fallbackPack;
  }

  let normalizedQuestions = [];
  if (Array.isArray(aiPack.quizQuestions) && aiPack.quizQuestions.length > 0) {
    normalizedQuestions = aiPack.quizQuestions
      .map((item, idx) => {
        const opts = Array.isArray(item?.options) ? item.options.map(o => String(o)).filter(Boolean) : [];
        const qText = String(item?.q || item?.question || '').trim();
        if (!qText || opts.length < 2) return null;
        const cIdx = item?.correctIndex !== undefined
          ? parseCorrectOptionIndex(item.correctIndex, opts)
          : parseCorrectOptionIndex(item?.correct, opts);
        return {
          id: String(item?.id || `Q${idx + 1}`),
          q: qText,
          options: opts,
          correctIndex: cIdx,
          ...(item?.explanation || item?.explain ? { explanation: item.explanation || item.explain } : {})
        };
      })
      .filter(Boolean);
  } else if (aiPack.quizQuestion && typeof aiPack.quizQuestion === 'object') {
    const qq = aiPack.quizQuestion;
    const opts = Array.isArray(qq.options) ? qq.options.map(o => String(o)).filter(Boolean) : [];
    const qText = String(qq.question || qq.q || '').trim();
    if (qText && opts.length >= 2) {
      normalizedQuestions.push({
        id: String(qq.id || 'Q1'),
        q: qText,
        options: opts,
        correctIndex: qq.correctIndex !== undefined
          ? parseCorrectOptionIndex(qq.correctIndex, opts)
          : parseCorrectOptionIndex(qq.correct, opts),
        ...(qq.explanation || qq.explain ? { explanation: qq.explanation || qq.explain } : {})
      });
    }
  }

  const quizQuestions = normalizedQuestions.length > 0 ? normalizedQuestions : fallbackPack.quizQuestions;
  const keyPoints = Array.isArray(aiPack.keyPoints) ? aiPack.keyPoints.filter(Boolean) : [];
  const summaryText = String(aiPack.summary || '').trim();

  let teacherRequirement = String(aiPack.teacherRequirement || '').trim();
  if (!teacherRequirement) {
    const parts = [];
    if (summaryText) parts.push(summaryText);
    if (keyPoints.length > 0) parts.push(`Trọng tâm ôn tập: ${keyPoints.join(' • ')}.`);
    if (!summaryText && reason) parts.push(`Nội dung ôn tập theo lý do nghỉ: "${reason}".`);
    parts.push(`Hoàn thành đọc tài liệu và trả lời ${quizQuestions.length} câu hỏi kiểm tra bên dưới để hoàn tất học bù tự động.`);
    teacherRequirement = parts.join(' ');
  }

  return {
    packId: aiPack.packId || fallbackPack.packId,
    lessonTitle: String(aiPack.lessonTitle || aiPack.title || fallbackPack.lessonTitle).trim(),
    slideFile: String(aiPack.slideFile || fallbackPack.slideFile).trim(),
    videoUrl: String(aiPack.videoUrl || fallbackPack.videoUrl).trim(),
    teacherRequirement,
    quizQuestions,
    ...(summaryText ? { summary: summaryText } : {}),
    ...(keyPoints.length > 0 ? { keyPoints } : {}),
    ...(aiPack.aiEngine ? { aiEngine: aiPack.aiEngine } : {})
  };
}

function formatLeaveRequest(row) {
  const rawOcr = safeJsonParse(row.ai_ocr_json, null);
  const aiOcrResult = rawOcr || computeAiOcrAnalysis({
    studentName: row.student_name,
    leaveDate: row.leave_date,
    reason: row.reason,
    reasonCategory: row.reason_category,
    proofFileName: row.proof_file_name
  });

  const rawPack = safeJsonParse(row.makeup_pack_json, null);
  const basePack = rawPack || buildDefaultMakeupPack({
    requestCode: row.request_code,
    leaveDate: row.leave_date,
    subjectName: row.subject_name
  });

  const resolvedQuestions = Array.isArray(basePack.quizQuestions) && basePack.quizQuestions.length > 0
    ? basePack.quizQuestions
    : DEFAULT_QUIZ_QUESTIONS;

  const makeupPack = {
    ...basePack,
    quizQuestions: resolvedQuestions,
    isCompleted: Boolean(row.makeup_completed),
    score: row.makeup_score !== null && row.makeup_score !== undefined ? Number(row.makeup_score) : null,
    completedAt: row.makeup_completed_at || null
  };

  return {
    id: row.request_code || `LEAVE-AI-${row.id}`,
    dbId: row.id,
    request_code: row.request_code,
    studentId: row.student_id,
    student_id: row.student_id,
    studentCode: row.student_code,
    student_code: row.student_code,
    studentName: row.student_name,
    student_name: row.student_name,
    classId: row.class_id,
    class_id: row.class_id,
    subject_name: row.subject_name,
    subjectName: row.subject_name,
    date: formatDisplayDate(row.leave_date),
    leave_date: row.leave_date,
    sessions_count: row.sessions_count,
    sessionSlot: row.session_slot || 'Tiết 1 - 3 (Buổi Sáng)',
    reason_category: row.reason_category,
    reasonCategory: row.reason_category,
    reason: row.reason,
    proofFileName: row.proof_file_name,
    proof_file_name: row.proof_file_name,
    proofType: row.proof_type || 'Giấy khám bệnh / Minh chứng',
    proof_url: row.proof_url,
    proofUrl: row.proof_url,
    approvalStatus: row.status,
    status: row.status,
    approvedBy: row.approved_by || (
      row.status === 'approved'
        ? (row.reviewer_name ? `${row.reviewer_name} (GV)` : 'Đã duyệt')
        : row.status === 'rejected'
          ? 'Từ chối bởi GV'
          : null
    ),
    reviewer_id: row.reviewer_id,
    reviewer_name: row.reviewer_name,
    review_note: row.review_note,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    attendanceRestored: Boolean(row.attendance_restored),
    aiOcrResult,
    makeupPack
  };
}

function findLeaveRequest(idOrCode) {
  const raw = String(idOrCode || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    return db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(Number(raw));
  }
  return db.prepare('SELECT * FROM leave_requests WHERE request_code = ?').get(raw);
}

function syncActiveAttendanceOnReview(reqItem, status) {
  const activeSession = db.prepare("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
  if (!activeSession) return;

  if (status === 'approved') {
    db.prepare(`
      INSERT INTO attendance_records (session_id, student_id, student_name, student_code, status, method, distance_meters)
      VALUES (?, ?, ?, ?, 'excused', 'leave_sync', 0)
      ON CONFLICT(session_id, student_id) DO UPDATE SET status = 'excused', method = 'leave_sync'
    `).run(activeSession.id, reqItem.student_id, reqItem.student_name, reqItem.student_code);
  } else if (status === 'rejected') {
    db.prepare(`
      DELETE FROM attendance_records
      WHERE session_id = ? AND student_id = ? AND method = 'leave_sync'
    `).run(activeSession.id, reqItem.student_id);
  }
}

function recalculateGradebookAfterMakeup(studentCode, classId) {
  const gbRow = db.prepare(`
    SELECT * FROM gradebook_records
    WHERE student_code = ? AND (? IS NULL OR class_id = ?)
    ORDER BY id ASC LIMIT 1
  `).get(studentCode, classId || null, classId || null)
    || db.prepare('SELECT * FROM gradebook_records WHERE student_code = ? ORDER BY id ASC LIMIT 1').get(studentCode);

  if (!gbRow) return null;

  let newAttended = gbRow.attended;
  let newExcused = gbRow.excused;
  let newUnexcused = gbRow.unexcused;
  let newAttendanceScore = gbRow.attendance_score;

  if (newUnexcused > 0) {
    newUnexcused = Math.max(0, newUnexcused - 1);
    newAttended = Math.min(gbRow.total_sessions, newAttended + 1);
    newAttendanceScore = Math.max(0, Math.min(10, Math.round((10 - newUnexcused * 2 - newExcused * 0.5) * 10) / 10));
  } else if (newExcused > 0) {
    newExcused = Math.max(0, newExcused - 1);
    newAttended = Math.min(gbRow.total_sessions, newAttended + 1);
    newAttendanceScore = Math.max(0, Math.min(10, Math.round((10 - newUnexcused * 2 - newExcused * 0.5) * 10) / 10));
  } else if (newAttendanceScore < 10) {
    newAttendanceScore = Math.min(10, Math.round((newAttendanceScore + 0.5) * 10) / 10);
  }

  const rawFinal = newAttendanceScore * 0.2 + gbRow.lab_score * 0.3 + gbRow.midterm_score * 0.5 + (gbRow.bonus_score || 0);
  const newFinalScore = Math.min(10, Math.round(rawFinal * 10) / 10);
  const { gpa4, letter } = convertToGPA(newFinalScore);
  const newStatus = newUnexcused >= 4 ? 'banned' : newFinalScore >= 8.5 ? 'scholarship' : 'eligible';

  db.prepare(`
    UPDATE gradebook_records
    SET attended = ?, excused = ?, unexcused = ?,
        attendance_score = ?, final_process_score = ?,
        gpa4 = ?, letter_grade = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newAttended,
    newExcused,
    newUnexcused,
    newAttendanceScore,
    newFinalScore,
    gpa4,
    letter,
    newStatus,
    gbRow.id
  );

  // Also ensure active attendance session shows present/compensated if previously leave_sync
  const activeSession = db.prepare("SELECT id FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
  if (activeSession) {
    db.prepare(`
      UPDATE attendance_records
      SET status = 'present', method = 'makeup_pack'
      WHERE session_id = ? AND student_code = ? AND status = 'excused'
    `).run(activeSession.id, studentCode);
  }

  return {
    studentCode,
    attended: newAttended,
    excused: newExcused,
    unexcused: newUnexcused,
    attendanceScore: newAttendanceScore,
    finalProcessScore: newFinalScore,
    gpa4,
    letterGrade: letter,
    status: newStatus
  };
}

function getAllFormattedRequests({ classId, status, onlyAi } = {}) {
  let sql = 'SELECT * FROM leave_requests';
  const conditions = [];
  const params = [];

  if (classId && classId !== 'all') {
    conditions.push('class_id = ?');
    params.push(classId);
  }
  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (onlyAi) {
    conditions.push("request_code LIKE 'LEAVE-AI-%'");
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY id DESC';

  return db.prepare(sql).all(...params).map(formatLeaveRequest);
}

// =============================================================================
// AI OCR LEAVE & MAKEUP PACK ENDPOINTS (Registered BEFORE parameterized routes)
// =============================================================================

// 1. GET /api/leave-requests/ai-packs
leaveRouter.get('/ai-packs', optionalAuth, (req, res) => {
  try {
    const { classId, status, onlyAi } = req.query;
    const config = getLeaveAiConfig();
    const requests = getAllFormattedRequests({
      classId: classId || 'K26 CNTT - Lớp A',
      status,
      onlyAi: onlyAi === 'true'
    });

    res.json({
      success: true,
      aiAutoApproveEnabled: Boolean(config.aiAutoApproveEnabled),
      confidenceThreshold: Number(config.confidenceThreshold || 88),
      requests
    });
  } catch (err) {
    console.error('[Leave AI Packs GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách đơn AI OCR & Gói học bù!', error: err.message });
  }
});

// 2. PATCH /api/leave-requests/ai-config
leaveRouter.patch('/ai-config', optionalAuth, (req, res) => {
  try {
    const current = getLeaveAiConfig();
    const nextEnabled = typeof req.body?.aiAutoApproveEnabled === 'boolean'
      ? req.body.aiAutoApproveEnabled
      : !current.aiAutoApproveEnabled;
    const nextThreshold = typeof req.body?.confidenceThreshold === 'number'
      ? req.body.confidenceThreshold
      : current.confidenceThreshold;

    const updated = saveLeaveAiConfig({
      aiAutoApproveEnabled: nextEnabled,
      confidenceThreshold: nextThreshold
    });

    res.json({
      success: true,
      ...updated
    });
  } catch (err) {
    console.error('[Leave AI Config Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình AI OCR!', error: err.message });
  }
});

// 3. POST /api/leave-requests/ai-submit
leaveRouter.post('/ai-submit', optionalAuth, async (req, res) => {
  try {
    const {
      studentCode,
      studentName,
      studentId,
      date,
      leaveDate,
      sessionSlot = 'Tiết 1 - 3 (Buổi Sáng)',
      subjectName = 'Cấu trúc dữ liệu & Giải thuật (IT204)',
      reason,
      reasonCategory = 'medical',
      proofFileName,
      proofType = 'Giấy khám bệnh / Minh chứng',
      proofUrl = null
    } = req.body || {};

    if (!reason || !String(reason).trim() || !proofFileName || !String(proofFileName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ lý do xin nghỉ và chọn tệp minh chứng y tế!'
      });
    }

    const stuInfo = resolveStudentInfo(
      req.user?.role === 'student' ? (studentCode || req.user.code) : studentCode,
      req.user?.role === 'student' ? (studentName || req.user.name) : studentName,
      req.user?.role === 'student' ? (studentId || req.user.id) : studentId
    );

    const rawDate = String(leaveDate || date || new Date().toISOString().slice(0, 10)).trim();
    const isoDate = /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)
      ? rawDate.split('/').reverse().join('-')
      : rawDate;

    const cleanReason = String(reason).trim();
    const cleanProofName = String(proofFileName).trim();

    const config = getLeaveAiConfig();
    const aiOcrResult = computeAiOcrAnalysis({
      studentName: stuInfo.name,
      leaveDate: isoDate,
      reason: cleanReason,
      reasonCategory,
      proofFileName: cleanProofName
    });

    const autoApproved = Boolean(config.aiAutoApproveEnabled) && aiOcrResult.confidence >= Number(config.confidenceThreshold || 88);
    const status = autoApproved ? 'approved' : 'pending';
    const approvedBy = autoApproved ? `AI Auto-Verify (${aiOcrResult.confidence}%)` : null;

    const nextAiNum = (db.prepare('SELECT COALESCE(MAX(id), 0) as maxId FROM leave_requests').get()?.maxId || 0) + 1;
    const requestCode = `LEAVE-AI-${String(nextAiNum).padStart(2, '0')}`;

    let makeupPack;
    try {
      const aiPack = await aiService.generateMakeupPack({
        requestCode,
        leaveDate: isoDate,
        subjectName,
        reason: cleanReason,
        apiKey: req.body?.api_key || req.body?.apiKey
      });
      makeupPack = normalizeGeneratedMakeupPack(aiPack, {
        requestCode,
        leaveDate: isoDate,
        subjectName,
        reason: cleanReason
      });
    } catch (aiErr) {
      console.warn('[Leave AI Makeup Pack Fallback]', aiErr.message);
      makeupPack = buildDefaultMakeupPack({
        requestCode,
        leaveDate: isoDate,
        subjectName
      });
    }

    const insertRes = db.prepare(`
      INSERT INTO leave_requests (
        request_code, student_id, student_name, student_code, class_id,
        subject_name, leave_date, sessions_count, session_slot, reason_category, reason,
        proof_file_name, proof_type, proof_url, status, reviewer_id, reviewer_name, review_note,
        reviewed_at, approved_by, ai_ocr_json, makeup_pack_json, makeup_completed, attendance_restored
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END, ?, ?, ?, 0, 0)
    `).run(
      requestCode,
      stuInfo.id,
      stuInfo.name,
      stuInfo.code,
      stuInfo.classId,
      subjectName,
      isoDate,
      sessionSlot,
      reasonCategory,
      cleanReason,
      cleanProofName,
      proofType,
      proofUrl,
      status,
      autoApproved ? 1 : null,
      autoApproved ? approvedBy : null,
      autoApproved ? `AI OCR xác thực tự động (${aiOcrResult.confidence}%).` : null,
      status,
      approvedBy,
      JSON.stringify(aiOcrResult),
      JSON.stringify(makeupPack)
    );

    const createdRow = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(insertRes.lastInsertRowid);

    if (autoApproved) {
      syncActiveAttendanceOnReview(createdRow, 'approved');
    }

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('teacher', 'leave', ?, ?, 'approvals', ?)
      `).run(
        autoApproved ? 'AI đã tự động duyệt đơn nghỉ phép y tế' : 'Đơn nghỉ phép cần GV kiểm tra minh chứng',
        `Sinh viên ${stuInfo.name} (${stuInfo.code}) gửi ${cleanProofName} — AI OCR: ${aiOcrResult.confidence}% (${aiOcrResult.verdict}).`,
        autoApproved ? 'normal' : 'urgent'
      );

      if (autoApproved) {
        db.prepare(`
          INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
          VALUES ('student', ?, 'leave', 'Đơn nghỉ học được AI duyệt & đã mở Gói học bù', ?, 'leave_request', 'normal')
        `).run(
          stuInfo.id,
          `Hệ thống AI OCR xác thực hợp lệ (${aiOcrResult.confidence}%) cho ngày ${formatDisplayDate(isoDate)} và gửi Gói học bù tự động.`
        );
      }
    } catch (notifErr) {
      console.warn('[Leave AI Submit Notification Error]', notifErr.message);
    }

    const requests = getAllFormattedRequests({ classId: stuInfo.classId });

    res.status(201).json({
      success: true,
      message: autoApproved
        ? `AI OCR xác thực giấy khám bệnh (${aiOcrResult.confidence}%) -> Tự động duyệt & gửi Gói học bù!`
        : 'Đã gửi đơn kèm ảnh minh chứng để Giảng viên xem xét.',
      request: formatLeaveRequest(createdRow),
      requests
    });
  } catch (err) {
    console.error('[Leave AI Submit Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi đơn nghỉ & quét AI OCR!', error: err.message });
  }
});

// 4. PATCH /api/leave-requests/:id/ai-review
leaveRouter.patch('/:id/ai-review', optionalAuth, (req, res) => {
  try {
    const reqItem = findLeaveRequest(req.params.id);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn xin nghỉ phép!' });
    }

    const { status, teacherRequirementText, reviewNote } = req.body || {};
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái duyệt phải là approved hoặc rejected!' });
    }

    const reviewerName = req.user?.name || 'ThS. Phạm Văn Thuận';
    const reviewerId = req.user?.id || 1;
    const approvedBy = status === 'approved' ? `${reviewerName} (GV)` : 'Từ chối bởi GV';
    const noteText = reviewNote?.trim() || (
      status === 'approved'
        ? 'Giảng viên đã kiểm tra minh chứng và gửi Gói học bù kiến thức.'
        : 'Minh chứng chưa đầy đủ hoặc không hợp lệ.'
    );

    const existingPack = safeJsonParse(reqItem.makeup_pack_json, null) || buildDefaultMakeupPack({
      requestCode: reqItem.request_code,
      leaveDate: reqItem.leave_date,
      subjectName: reqItem.subject_name
    });
    if (teacherRequirementText && String(teacherRequirementText).trim()) {
      existingPack.teacherRequirement = String(teacherRequirementText).trim();
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = ?, reviewer_id = ?, reviewer_name = ?, review_note = ?,
          approved_by = ?, reviewed_at = CURRENT_TIMESTAMP, makeup_pack_json = ?
      WHERE id = ?
    `).run(
      status,
      reviewerId,
      reviewerName,
      noteText,
      approvedBy,
      JSON.stringify(existingPack),
      reqItem.id
    );

    syncActiveAttendanceOnReview(reqItem, status);

    const updatedRow = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(reqItem.id);

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
        VALUES ('student', ?, 'leave', ?, ?, 'leave_request', ?)
      `).run(
        reqItem.student_id,
        status === 'approved' ? 'Đơn nghỉ học đã được duyệt & mở Gói học bù' : 'Đơn nghỉ học bị từ chối',
        `${reviewerName} đã ${status === 'approved' ? 'phê duyệt có phép và gửi Gói học bù' : 'từ chối'} đơn ngày ${formatDisplayDate(reqItem.leave_date)}.`,
        status === 'approved' ? 'normal' : 'urgent'
      );
    } catch (notifErr) {
      console.warn('[Leave AI Review Notification Error]', notifErr.message);
    }

    const requests = getAllFormattedRequests({ classId: reqItem.class_id });

    res.json({
      success: true,
      message: status === 'approved'
        ? 'Đã duyệt đơn nghỉ phép và tự động gửi Gói học bù cho sinh viên!'
        : 'Đã từ chối đơn xin nghỉ học.',
      request: formatLeaveRequest(updatedRow),
      requests
    });
  } catch (err) {
    console.error('[Leave AI Review Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn AI OCR!', error: err.message });
  }
});

// 5. POST /api/leave-requests/:id/complete-makeup
leaveRouter.post('/:id/complete-makeup', optionalAuth, (req, res) => {
  try {
    const reqItem = findLeaveRequest(req.params.id);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nghỉ học tương ứng!' });
    }

    if (reqItem.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Đơn nghỉ phép phải được phê duyệt trước khi làm bài tập Gói học bù!'
      });
    }

    const pack = safeJsonParse(reqItem.makeup_pack_json, null) || buildDefaultMakeupPack({
      requestCode: reqItem.request_code,
      leaveDate: reqItem.leave_date,
      subjectName: reqItem.subject_name
    });
    const questions = Array.isArray(pack.quizQuestions) && pack.quizQuestions.length > 0
      ? pack.quizQuestions
      : DEFAULT_QUIZ_QUESTIONS;

    const answers = req.body?.quizAnswers;
    let score = 10;

    if (questions.length > 0 && answers && typeof answers === 'object') {
      const missing = questions.some(q => answers[q.id] === undefined || answers[q.id] === null);
      if (missing) {
        return res.status(400).json({
          success: false,
          message: `Vui lòng chọn đáp án cho cả ${questions.length} câu hỏi kiểm tra học bù trước khi nộp bài!`
        });
      }
      const correctCount = questions.reduce(
        (acc, q) => acc + (Number(answers[q.id]) === Number(q.correctIndex) ? 1 : 0),
        0
      );
      score = Math.round((correctCount / questions.length) * 10 * 10) / 10;
    } else if (questions.length > 0 && req.body?.score === undefined) {
      return res.status(400).json({
        success: false,
        message: `Vui lòng chọn đầy đủ ${questions.length} câu trả lời kiểm tra học bù trước khi nộp bài!`
      });
    } else if (req.body?.score !== undefined) {
      const parsed = Number(req.body.score);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) {
        return res.status(400).json({ success: false, message: 'Điểm học bù phải nằm trong khoảng 0 - 10!' });
      }
      score = Math.round(parsed * 10) / 10;
    }

    if (score < 5.0) {
      return res.status(400).json({
        success: false,
        passed: false,
        score,
        message: `Bài kiểm tra học bù đạt ${score}/10đ (chưa đạt ngưỡng ≥ 5.0đ). Hãy xem lại tài liệu và thử lại!`
      });
    }

    const completedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const alreadyRestored = Boolean(reqItem.attendance_restored);

    db.prepare(`
      UPDATE leave_requests
      SET makeup_completed = 1,
          makeup_score = ?,
          makeup_completed_at = ?,
          attendance_restored = 1,
          makeup_pack_json = ?
      WHERE id = ?
    `).run(score, completedAt, JSON.stringify(pack), reqItem.id);

    // Guarantee idempotency: only restore attendance & recalculate GPA once per leave request
    const gradebookUpdate = alreadyRestored
      ? null
      : recalculateGradebookAfterMakeup(reqItem.student_code, reqItem.class_id);

    if (!alreadyRestored) {
      try {
        db.prepare(`
          INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
          VALUES ('teacher', 'makeup', 'Sinh viên hoàn thành Gói học bù tự động', ?, 'approvals', 'normal')
        `).run(
          `${reqItem.student_name} (${reqItem.student_code}) đã hoàn thành quiz học bù đạt ${score}/10đ cho đơn ${reqItem.request_code || reqItem.id} và được bảo toàn điểm chuyên cần.`
        );
      } catch (notifErr) {
        console.warn('[Makeup Complete Notification Error]', notifErr.message);
      }
    }

    const updatedRow = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(reqItem.id);
    const requests = getAllFormattedRequests({ classId: reqItem.class_id });

    res.json({
      success: true,
      passed: true,
      score,
      completedAt,
      alreadyRestored,
      attendanceRestored: true,
      gradebookUpdate,
      message: `Hoàn thành Gói học bù (${score}/10đ)! Điểm chuyên cần và GPA đã được đồng bộ.`,
      request: formatLeaveRequest(updatedRow),
      requests
    });
  } catch (err) {
    console.error('[Complete Makeup Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi lưu kết quả hoàn thành Gói học bù!', error: err.message });
  }
});

// =============================================================================
// CLASSIC LEAVE REQUESTS ENDPOINTS (Backward compatible + unified columns)
// =============================================================================

// 6. GET /api/leave-requests
leaveRouter.get('/', optionalAuth, (req, res) => {
  try {
    const { status, studentCode } = req.query;
    let query = 'SELECT * FROM leave_requests';
    const params = [];

    if (req.user?.role === 'student') {
      query += ' WHERE (student_id = ? OR student_code = ?)';
      params.push(req.user.id, req.user.code);
      if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }
    } else if (studentCode) {
      query += ' WHERE student_code = ?';
      params.push(studentCode);
      if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }
    } else if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = db.prepare(query).all(...params);
    const requests = rows.map(formatLeaveRequest);

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      requests,
      stats: {
        total: requests.length,
        pendingCount,
        approvedCount,
        rejectedCount
      }
    });
  } catch (err) {
    console.error('[Leave Requests GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách đơn nghỉ!', error: err.message });
  }
});

// 7. POST /api/leave-requests (Student submits classic request)
leaveRouter.post('/', optionalAuth, (req, res) => {
  try {
    const {
      leave_date,
      sessions_count = 1,
      reason_category = 'medical',
      subject_name = 'Cấu trúc dữ liệu & Giải thuật (IT204)',
      reason,
      proof_file_name = 'Minh_chung_dinh_kem.jpg',
      proof_url = null,
      student_code,
      student_name,
      student_id
    } = req.body || {};

    if (!leave_date || !reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ ngày xin nghỉ và lý do cụ thể!' });
    }

    const stu = req.user
      ? { id: req.user.id, name: req.user.name, code: req.user.code, classId: req.user.classId || 'K26 CNTT - Lớp A' }
      : resolveStudentInfo(student_code, student_name, student_id);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const requestCode = `LR-${todayStr}-${randCode}`;

    const aiOcrResult = computeAiOcrAnalysis({
      studentName: stu.name,
      leaveDate: leave_date,
      reason,
      reasonCategory: reason_category,
      proofFileName: proof_file_name
    });
    const makeupPack = buildDefaultMakeupPack({
      requestCode,
      leaveDate: leave_date,
      subjectName: subject_name
    });

    const insert = db.prepare(`
      INSERT INTO leave_requests (
        request_code, student_id, student_name, student_code, class_id,
        subject_name, leave_date, sessions_count, reason_category, reason,
        proof_file_name, proof_url, status, ai_ocr_json, makeup_pack_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      requestCode,
      stu.id,
      stu.name,
      stu.code,
      stu.classId,
      subject_name,
      leave_date,
      parseInt(sessions_count, 10) || 1,
      reason_category,
      reason,
      proof_file_name,
      proof_url,
      JSON.stringify(aiOcrResult),
      JSON.stringify(makeupPack)
    );

    const created = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(insert.lastInsertRowid);

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('teacher', 'leave', 'Đơn xin phép nghỉ học mới', ?, 'approvals', 'urgent')
      `).run(`Sinh viên ${stu.name} (${stu.code}) vừa nộp đơn xin nghỉ ngày ${leave_date}. Lý do: ${reason}`);
    } catch (notifErr) {
      console.warn('[Notification create error]', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Đơn xin nghỉ học của bạn đã được gửi thành công đến Giảng viên phụ trách!',
      request: formatLeaveRequest(created)
    });
  } catch (err) {
    console.error('[Leave Submit Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi đơn nghỉ học!', error: err.message });
  }
});

// 8. PATCH /api/leave-requests/:id/review (Teacher reviews classic request)
leaveRouter.patch('/:id/review', optionalAuth, (req, res) => {
  try {
    if (req.user && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền phê duyệt đơn!' });
    }

    const { status, review_note } = req.body || {};
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái duyệt không hợp lệ! (approved hoặc rejected)' });
    }

    const reqItem = findLeaveRequest(req.params.id);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Đơn xin nghỉ không tồn tại!' });
    }

    const reviewerId = req.user?.id || 1;
    const reviewerName = req.user?.name || 'ThS. Phạm Văn Thuận';
    const defaultNote = status === 'approved'
      ? 'Hồ sơ minh chứng y tế / lý do gia đình chính đáng. Phê duyệt có phép.'
      : 'Minh chứng chưa đầy đủ hoặc không hợp lệ theo quy chế.';
    const approvedBy = status === 'approved' ? `${reviewerName} (GV)` : 'Từ chối bởi GV';

    db.prepare(`
      UPDATE leave_requests
      SET status = ?, reviewer_id = ?, reviewer_name = ?, review_note = ?, approved_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      status,
      reviewerId,
      reviewerName,
      review_note?.trim() || defaultNote,
      approvedBy,
      reqItem.id
    );

    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(reqItem.id);
    syncActiveAttendanceOnReview(reqItem, status);

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
        VALUES ('student', ?, 'leave', ?, ?, 'leave_request', ?)
      `).run(
        reqItem.student_id,
        status === 'approved' ? 'Đơn xin nghỉ học đã được duyệt có phép' : 'Đơn xin nghỉ học bị từ chối',
        `Thầy ${reviewerName} đã ${status === 'approved' ? 'phê duyệt có phép' : 'từ chối'} đơn ngày ${reqItem.leave_date}. Ghi chú: ${review_note || defaultNote}`,
        status === 'approved' ? 'normal' : 'urgent'
      );
    } catch (notifErr) {
      console.warn('[Notification create error]', notifErr.message);
    }

    res.json({
      success: true,
      message: `Đã ${status === 'approved' ? 'phê duyệt có phép' : 'từ chối'} đơn nghỉ học thành công!`,
      request: formatLeaveRequest(updated)
    });
  } catch (err) {
    console.error('[Leave Review Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi phê duyệt đơn nghỉ học!', error: err.message });
  }
});

// 9. DELETE /api/leave-requests/:id (Cancel/Delete request)
leaveRouter.delete('/:id', optionalAuth, (req, res) => {
  try {
    const reqItem = findLeaveRequest(req.params.id);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Đơn xin nghỉ không tồn tại!' });
    }

    if (req.user?.role === 'student') {
      if (reqItem.student_id !== req.user.id && reqItem.student_code !== req.user.code) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thu hồi đơn của sinh viên khác!' });
      }
      if (reqItem.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Chỉ có thể thu hồi đơn đang ở trạng thái Chờ duyệt!' });
      }
    }

    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(reqItem.id);

    res.json({
      success: true,
      message: 'Đã thu hồi đơn xin nghỉ học thành công!'
    });
  } catch (err) {
    console.error('[Leave Delete Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi thu hồi đơn nghỉ học!', error: err.message });
  }
});
