import express from 'express';
import { db } from '../db.js';

export const gamificationRouter = express.Router();

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
  return clean || '26103043';
}

function formatProfileRow(row) {
  return {
    id: row.id,
    studentCode: row.student_code,
    studentName: row.student_name,
    classId: row.class_id,
    currentStreak: Number(row.current_streak),
    maxStreak: Number(row.max_streak),
    expPoints: Number(row.exp_points),
    level: Number(row.level),
    levelTitle: row.level_title,
    latePassCount: Number(row.late_pass_count),
    weeklyAttendanceDays: safeJsonParse(row.weekly_attendance_json, [true, true, true, true, true]),
    badges: safeJsonParse(row.badges_json, []),
    updatedAt: row.updated_at
  };
}

// 1. GET /api/gamification?classId=...&studentCode=...
gamificationRouter.get('/', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const studentCode = normalizeStudentCode(req.query.studentCode || '26103043');

    const rows = classId && classId !== 'all'
      ? db.prepare('SELECT * FROM gamification_profiles WHERE class_id = ? ORDER BY exp_points DESC').all(classId)
      : db.prepare('SELECT * FROM gamification_profiles ORDER BY exp_points DESC').all();

    const profiles = {};
    for (const r of rows) {
      profiles[r.student_code] = formatProfileRow(r);
    }

    const activeProfile = profiles[studentCode]
      || profiles['26103043']
      || (rows[0] ? formatProfileRow(rows[0]) : null);

    res.json({
      success: true,
      profile: activeProfile,
      profiles
    });
  } catch (err) {
    console.error('[Gamification GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải hồ sơ Gamification & Chuỗi chuyên cần!', error: err.message });
  }
});

// 2. GET /api/gamification/:studentCode
gamificationRouter.get('/:studentCode', (req, res) => {
  try {
    const cleanCode = normalizeStudentCode(req.params.studentCode);
    const row = db.prepare('SELECT * FROM gamification_profiles WHERE student_code = ?').get(cleanCode);
    if (!row) {
      return res.status(404).json({ success: false, message: `Không tìm thấy hồ sơ thành tích của sinh viên ${cleanCode}!` });
    }
    res.json({
      success: true,
      profile: formatProfileRow(row)
    });
  } catch (err) {
    console.error('[Gamification Student GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải hồ sơ thành tích sinh viên!', error: err.message });
  }
});

// 3. POST /api/gamification/:studentCode/redeem-late-pass
gamificationRouter.post('/:studentCode/redeem-late-pass', (req, res) => {
  try {
    const cleanCode = normalizeStudentCode(req.params.studentCode);
    const row = db.prepare('SELECT * FROM gamification_profiles WHERE student_code = ?').get(cleanCode);
    if (!row) {
      return res.status(404).json({ success: false, message: `Không tìm thấy hồ sơ thành tích của sinh viên ${cleanCode}!` });
    }

    if (Number(row.exp_points) < 500) {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần tối thiểu 500 EXP để đổi Vé miễn trừ đi trễ!'
      });
    }

    db.prepare(`
      UPDATE gamification_profiles
      SET exp_points = exp_points - 500,
          late_pass_count = late_pass_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(row.id);

    const updated = db.prepare('SELECT * FROM gamification_profiles WHERE id = ?').get(row.id);

    try {
      const userRow = db.prepare('SELECT id FROM users WHERE code = ? LIMIT 1').get(cleanCode);
      if (userRow) {
        db.prepare(`
          INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
          VALUES ('student', ?, 'gamification', 'Đổi Vé Miễn trừ Đi trễ thành công', ?, 'announcements', 'normal')
        `).run(
          userRow.id,
          `Bạn đã sử dụng 500 EXP để đổi 1 Vé Miễn trừ Đi trễ (Hiện có: ${updated.late_pass_count} vé, Còn lại: ${updated.exp_points} EXP).`
        );
      }
    } catch (notifErr) {
      console.warn('[Gamification Notification Error]', notifErr.message);
    }

    const allRows = db.prepare('SELECT * FROM gamification_profiles WHERE class_id = ? ORDER BY exp_points DESC').all(updated.class_id);
    const profiles = {};
    for (const r of allRows) {
      profiles[r.student_code] = formatProfileRow(r);
    }

    res.json({
      success: true,
      message: 'Đổi thành công 1 Vé Miễn trừ Đi trễ (-500 EXP)! Vé sẽ tự động áp dụng nếu bạn quét QR trễ dưới 15 phút.',
      profile: formatProfileRow(updated),
      profiles
    });
  } catch (err) {
    console.error('[Gamification Redeem Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi đổi Vé Miễn trừ Đi trễ!', error: err.message });
  }
});
