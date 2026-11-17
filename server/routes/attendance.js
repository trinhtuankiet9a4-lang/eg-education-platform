import express from 'express';
import os from 'os';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateToken, JWT_SECRET } from './auth.js';

export const attendanceRouter = express.Router();

// Helper: Haversine distance in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    !Number.isFinite(Number(lat1)) || !Number.isFinite(Number(lon1)) ||
    !Number.isFinite(Number(lat2)) || !Number.isFinite(Number(lon2))
  ) {
    return null;
  }
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  const R = 6371000; // Radius of earth in meters
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function hasValidCoordinates(lat, lng) {
  if (lat === '' || lng === '' || lat == null || lng == null) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 && nLat <= 90 &&
    nLng >= -180 && nLng <= 180
  );
}

// Helper: Resolve machine's Wi-Fi/Ethernet IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal && !alias.address.startsWith('169.254')) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// 0. GET /api/attendance/network-info
attendanceRouter.get('/network-info', (req, res) => {
  const lanIp = getLocalIpAddress();
  res.json({
    success: true,
    lanIp,
    frontendUrl: `http://${lanIp}:5173`,
    backendUrl: `http://${lanIp}:5000`
  });
});

// 0.1 GET /api/attendance/class-roster (Full real class students from SQLite)
attendanceRouter.get('/class-roster', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const students = db.prepare(`
      SELECT u.id, u.code, u.name, u.email, u.class_id as classId,
             COALESCE((SELECT g.unexcused FROM gradebook_records g WHERE g.student_code = u.code LIMIT 1), 0) as absences
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.code ASC
    `).all();
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách lớp!', error: err.message });
  }
});

// Helper: Resolve teacher from optional Bearer token or fall back to default lecturer
function resolveTeacherUser(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.role === 'teacher') {
        return decoded;
      }
      if (decoded && decoded.role !== 'teacher') {
        return { unauthorizedRole: decoded.role };
      }
    } catch {
      // Fallback to default demo teacher when local token expired/absent
    }
  }
  const dbTeacher = db.prepare("SELECT id, name, code, role FROM users WHERE role = 'teacher' ORDER BY id ASC LIMIT 1").get();
  return dbTeacher || { id: 1, name: 'ThS. Phạm Văn Thuận', code: 'GV001', role: 'teacher' };
}

// 1. GET /api/attendance/active-session (Accessible by logged-in users and mobile scanning clients)
attendanceRouter.get('/active-session', (req, res) => {
  try {
    const classId = req.query.classId ? String(req.query.classId).trim() : '';
    const session = classId
      ? db.prepare(`
          SELECT * FROM attendance_sessions WHERE status = 'active' AND class_id = ? ORDER BY id DESC LIMIT 1
        `).get(classId)
      : db.prepare(`
          SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1
        `).get();

    if (!session) {
      return res.json({ success: true, session: null, message: 'Hiện không có ca điểm danh nào đang mở.' });
    }

    // Get checked-in records
    const records = db.prepare(`
      SELECT id, session_id, student_id, student_name, student_code, status, method, check_in_time, distance_meters, token_match_type 
      FROM attendance_records 
      WHERE session_id = ? 
      ORDER BY check_in_time DESC
    `).all(session.id);

    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    const absentCount = Math.max(0, totalStudents - (presentCount + lateCount + excusedCount));

    return res.json({
      success: true,
      session: {
        ...session,
        records,
        stats: {
          totalStudents,
          checkedInCount: records.length,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          rate: totalStudents > 0 ? Math.round((records.length / totalStudents) * 100) : 0
        }
      }
    });
  } catch (err) {
    console.error('[Attendance API Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất ca điểm danh!', error: err.message });
  }
});

// 1.1 POST /api/attendance/verify-location (Backend yêu cầu & xác thực quyền lấy vị trí GPS từ trình duyệt)
attendanceRouter.post('/verify-location', (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body || {};
    if (!hasValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        code: 'LOCATION_PERMISSION_REQUIRED',
        requiresLocationPermission: true,
        message: 'Backend yêu cầu trình duyệt cấp quyền truy cập Vị trí (GPS)!'
      });
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    const session = db.prepare("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
    const distanceMeters = session && hasValidCoordinates(session.lat, session.lng)
      ? getDistanceFromLatLonInMeters(nLat, nLng, session.lat, session.lng)
      : null;

    return res.json({
      success: true,
      verified: true,
      lat: nLat,
      lng: nLng,
      accuracy: accuracy != null && Number.isFinite(Number(accuracy)) ? Math.round(Number(accuracy)) : null,
      distanceMeters,
      sessionRadius: session?.radius_meters || 50,
      sessionId: session?.id || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xác thực vị trí GPS!', error: err.message });
  }
});

// 1.2 POST /api/attendance/reset-all (Reset toàn bộ dữ liệu phiên, lượt điểm danh và số buổi vắng về ban đầu)
attendanceRouter.post('/reset-all', (req, res) => {
  try {
    const teacher = resolveTeacherUser(req);
    if (teacher.unauthorizedRole) {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền reset dữ liệu điểm danh!' });
    }
    db.prepare('DELETE FROM attendance_records').run();
    db.prepare('DELETE FROM attendance_sessions').run();
    db.prepare(`
      UPDATE gradebook_records
      SET attended = 0, excused = 0, unexcused = 0, attendance_score = 10.0, status = 'eligible', teacher_note = ''
    `).run();
    db.prepare(`
      UPDATE student_drl_risk_records
      SET discipline_warning = NULL, risk_index = 0, risk_level = 'SAFE'
    `).run();
    return res.json({
      success: true,
      message: 'Đã reset toàn bộ dữ liệu phiên, lượt điểm danh và số buổi vắng về trạng thái ban đầu (0 buổi vắng)!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi reset dữ liệu điểm danh!', error: err.message });
  }
});

// 2. POST /api/attendance/session (Teacher manually starts new session with real browser GPS)
attendanceRouter.post('/session', (req, res) => {
  try {
    const teacher = resolveTeacherUser(req);
    if (teacher.unauthorizedRole) {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền mở ca điểm danh!' });
    }

    const { subject_name, class_id, room, lat, lng, radius_meters, wifi_ssid, token_interval } = req.body || {};
    if (!hasValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        code: 'LOCATION_PERMISSION_REQUIRED',
        requiresLocationPermission: true,
        message: 'Máy chủ yêu cầu cấp quyền Vị trí (GPS) trên trình duyệt để lấy tọa độ phòng học trước khi mở điểm danh!'
      });
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    const sessionCode = 'SES-' + Date.now().toString().slice(-6);
    const intervalSec = token_interval ? parseInt(token_interval) : 3;
    const token = 'EG-QR-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Pause any previous active session before opening a new one
    db.prepare("UPDATE attendance_sessions SET status = 'paused' WHERE status = 'active'").run();

    const insert = db.prepare(`
      INSERT INTO attendance_sessions (
        session_code, teacher_id, teacher_name, subject_name, class_id, room, status, current_token, previous_token, token_interval, lat, lng, radius_meters, wifi_ssid
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?, ?, ?)
    `).run(
      sessionCode,
      teacher.id || 1,
      teacher.name || 'ThS. Phạm Văn Thuận',
      subject_name || 'Lớp CNTT K26',
      class_id || 'K26 CNTT - Lớp A',
      room || '',
      token,
      intervalSec,
      nLat,
      nLng,
      radius_meters || 50,
      wifi_ssid || ''
    );

    const newSession = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(insert.lastInsertRowid);
    
    // Broadcast notification to students
    db.prepare(`
      INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
      VALUES ('student', 'attendance', 'Ca điểm danh đã mở', ?, 'attendance', 'urgent')
    `).run(`Thầy ${teacher.name || 'ThS. Phạm Văn Thuận'} vừa mở điểm danh môn ${newSession.subject_name} (${newSession.class_id}). Mã QR đổi tự động mỗi ${intervalSec}s.`);

    return res.json({
      success: true,
      message: `Đã mở ca điểm danh thành công (Chu kỳ QR: ${intervalSec}s)!`,
      session: { ...newSession, records: [] }
    });
  } catch (err) {
    console.error('[Create Session Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi mở ca điểm danh!', error: err.message });
  }
});

// 2.1 POST /api/attendance/session/:id/pause (Teacher manually pauses QR projection)
attendanceRouter.post('/session/:id/pause', (req, res) => {
  try {
    const teacher = resolveTeacherUser(req);
    if (teacher.unauthorizedRole) {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền tạm dừng điểm danh!' });
    }
    const sessionId = req.params.id;
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca điểm danh!' });
    }
    db.prepare("UPDATE attendance_sessions SET status = 'paused', token_updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").run(sessionId);
    const updated = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    res.json({ success: true, message: 'Đã tạm dừng phát mã QR điểm danh!', session: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạm dừng ca điểm danh!', error: err.message });
  }
});

// 3. PATCH /api/attendance/session/:id/token (Rotate Token with Sliding Cache)
attendanceRouter.patch('/session/:id/token', (req, res) => {
  try {
    const session = db.prepare("SELECT * FROM attendance_sessions WHERE id = ? AND status = 'active'").get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Ca điểm danh không còn hiệu lực!' });
    }

    const newToken = req.body?.token || ('EG-QR-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    const prevToken = session.current_token; // Slide current down to previous

    db.prepare(`
      UPDATE attendance_sessions 
      SET previous_token = ?, current_token = ?, token_updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status = 'active'
    `).run(prevToken, newToken, req.params.id);

    res.json({ 
      success: true, 
      token: newToken, 
      previousToken: prevToken, 
      tokenInterval: session.token_interval || 3,
      rotatedAt: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đổi mã QR!', error: err.message });
  }
});

// 3.1 POST /api/attendance/session/:id/reset (Teacher resets records for re-testing)
attendanceRouter.post('/session/:id/reset', (req, res) => {
  try {
    const teacher = resolveTeacherUser(req);
    if (teacher.unauthorizedRole) {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền làm mới ca điểm danh!' });
    }
    db.prepare('DELETE FROM attendance_records WHERE session_id = ?').run(req.params.id);
    db.prepare("UPDATE attendance_sessions SET created_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Đã làm mới dữ liệu ca điểm danh! Bạn có thể bật lại QR và quét từ đầu.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi làm mới ca điểm danh!', error: err.message });
  }
});

// 3.2 POST /api/attendance/session/:id/close (Teacher finalizes and locks session)
attendanceRouter.post('/session/:id/close', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca điểm danh!' });
    }

    // 1. Lock session status
    db.prepare("UPDATE attendance_sessions SET status = 'closed', token_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);

    // 2. Query all students of this class (default to K26 CNTT - Lớp A if not specified)
    const classId = session.class_id || 'K26 CNTT - Lớp A';
    const classStudents = db.prepare("SELECT * FROM users WHERE role = 'student' AND (class_id = ? OR ? = '')").all(classId, classId);
    
    // 3. Get existing checked-in records
    const existingRecords = db.prepare('SELECT student_code FROM attendance_records WHERE session_id = ?').all(sessionId);
    const existingCodes = new Set(existingRecords.map(r => r.student_code));

    // 4. Mark absent for remaining students into SQLite
    const insertAbsent = db.prepare(`
      INSERT INTO attendance_records (
        session_id, student_id, student_name, student_code, status, method, check_in_time, distance_meters, token_match_type
      ) VALUES (?, ?, ?, ?, 'absent', 'auto_finalize', CURRENT_TIMESTAMP, NULL, 'closed_session')
    `);

    let autoAbsentCount = 0;
    for (const student of classStudents) {
      if (!existingCodes.has(student.code)) {
        insertAbsent.run(sessionId, student.id, student.name, student.code);
        autoAbsentCount++;
      }
    }

    // 5. Query updated stats
    const allRecords = db.prepare('SELECT * FROM attendance_records WHERE session_id = ?').all(sessionId);
    const presentCount = allRecords.filter(r => r.status === 'present').length;
    const absentCount = allRecords.filter(r => r.status === 'absent').length;

    res.json({
      success: true,
      message: `Đã chốt sổ và khóa ca điểm danh thành công! (Có mặt: ${presentCount}, Vắng: ${absentCount})`,
      session: {
        ...session,
        status: 'closed',
        records: allRecords,
        stats: {
          totalStudents: classStudents.length,
          checkedInCount: presentCount,
          presentCount,
          absentCount,
          rate: classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 0
        }
      }
    });
  } catch (err) {
    console.error('[Close Session Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi khóa ca điểm danh!', error: err.message });
  }
});

// 3.3 POST /api/attendance/session/:id/reopen (Teacher reopens locked session)
attendanceRouter.post('/session/:id/reopen', (req, res) => {
  try {
    const sessionId = req.params.id;
    db.prepare("UPDATE attendance_sessions SET status = 'active' WHERE id = ?").run(sessionId);
    // Remove auto-finalized absent records so students can scan again
    db.prepare("DELETE FROM attendance_records WHERE session_id = ? AND method = 'auto_finalize'").run(sessionId);
    
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    res.json({
      success: true,
      message: 'Đã mở lại ca điểm danh! Sinh viên có thể tiếp tục quét mã.',
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi mở lại ca điểm danh!', error: err.message });
  }
});

// 4. POST /api/attendance/check-in (Student Scans QR with Sliding Window Verification)
attendanceRouter.post('/check-in', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let student = null;
    if (authHeader && authHeader.split(' ')[1]) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        student = decoded;
      } catch (e) {}
    }

    // Direct Mobile Check-in (allows passing student_code or student_id)
    if (req.body.student_code) {
      const found = db.prepare("SELECT * FROM users WHERE (code = ? OR email = ?) AND role = 'student'").get(req.body.student_code, req.body.student_code);
      if (found) student = found;
    }

    // Safety net for split-screen testing: if teacher account is active, attribute to Trịnh Tuấn Kiệt (id 37)
    if (!student || student.role === 'teacher') {
      const studentUser = db.prepare("SELECT * FROM users WHERE code = '26103043' OR id = 37").get();
      if (studentUser) {
        student = studentUser;
      }
    }
    const { session_id, token, lat, lng, method } = req.body;

    let session = null;
    if (session_id) {
      session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(session_id);
    }
    if (!session) {
      session = db.prepare("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
    }

    if (!session || session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Ca điểm danh đã kết thúc hoặc không tồn tại!' });
    }

    // Verify Token using Sliding Window (current token OR previous token within grace window)
    let tokenMatchType = 'current';
    if (token) {
      const isCurrentMatch = token === session.current_token;
      const isPrevMatch = session.previous_token && token === session.previous_token;

      if (!isCurrentMatch && !isPrevMatch) {
        const interval = session.token_interval || 3;
        return res.status(400).json({ 
          success: false, 
          code: 'QR_EXPIRED',
          message: `Mã QR đã hết hạn (chu kỳ làm mới ${interval}s)! Vui lòng hướng camera quét lại mã mới nhất trên máy chiếu.` 
        });
      }

      tokenMatchType = isCurrentMatch ? 'current' : 'grace_period';
    }

    // Require valid real GPS coordinates from student browser
    if (!hasValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        code: 'LOCATION_PERMISSION_REQUIRED',
        requiresLocationPermission: true,
        message: 'Máy chủ yêu cầu cho phép truy cập Vị trí (GPS) để xác thực điểm danh!'
      });
    }

    // Calculate GPS distance from real teacher session position
    const dist = getDistanceFromLatLonInMeters(Number(lat), Number(lng), session.lat, session.lng);

    // Determine status (present vs late) - sessions within 60 minutes are marked 'present'
    const createdAtStr = session.created_at.includes('Z') ? session.created_at : session.created_at.replace(' ', 'T') + 'Z';
    const sessionAgeMinutes = Math.max(0, (Date.now() - new Date(createdAtStr).getTime()) / 60000);
    const status = sessionAgeMinutes > 60 ? 'late' : 'present';

    // Check if already checked in
    const existing = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(session.id, student.id);
    if (existing) {
      // If student re-scans for testing or re-check, update check_in_time, token_match_type and status
      db.prepare(`
        UPDATE attendance_records 
        SET check_in_time = CURRENT_TIMESTAMP, token_match_type = ?, method = ?, distance_meters = ?, status = ?
        WHERE id = ?
      `).run(tokenMatchType, method || 'qr_scan', dist, status, existing.id);

      const updatedRecord = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(existing.id);
      const intervalInfo = session.token_interval || 3;
      return res.json({
        success: true,
        isRecheck: true,
        message: `[Cập nhật lại] ${student.name} đã quét lại mã thành công (${tokenMatchType === 'grace_period' ? 'Cửa sổ trượt' : `QR ${intervalInfo}s`})!`,
        status,
        tokenMatchType,
        record: updatedRecord
      });
    }

    const insert = db.prepare(`
      INSERT INTO attendance_records (
        session_id, student_id, student_name, student_code, status, method, distance_meters, token_match_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      student.id,
      student.name,
      student.code,
      status,
      method || 'qr_scan',
      dist,
      tokenMatchType
    );

    const record = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(insert.lastInsertRowid);

    const intervalInfo = session.token_interval || 3;
    const successMsg = tokenMatchType === 'grace_period'
      ? `Điểm danh thành công (Xác thực qua cửa sổ mạng trượt ${intervalInfo}s)!`
      : `Điểm danh thành công (Mã QR ${intervalInfo}s hợp lệ)!`;

    return res.json({
      success: true,
      message: successMsg,
      status,
      tokenMatchType,
      record
    });
  } catch (err) {
    console.error('[Check-in Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận điểm danh!', error: err.message });
  }
});

// 4.1 POST /api/attendance/simulate-student-checkin (Teacher triggers real check-in for any student in class roster)
attendanceRouter.post('/simulate-student-checkin', (req, res) => {
  try {
    const { student_code } = req.body;
    const student = db.prepare("SELECT * FROM users WHERE code = ? AND role = 'student'").get(student_code);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên!' });
    }

    const session = db.prepare("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
    if (!session) {
      return res.status(400).json({ success: false, message: 'Chưa có ca điểm danh nào đang mở!' });
    }

    const existing = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(session.id, student.id);
    if (existing) {
      db.prepare(`
        UPDATE attendance_records 
        SET check_in_time = CURRENT_TIMESTAMP, token_match_type = 'current', method = 'qr_scan', status = 'present'
        WHERE id = ?
      `).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance_records (
          session_id, student_id, student_name, student_code, status, method, distance_meters, token_match_type
        ) VALUES (?, ?, ?, ?, 'present', 'qr_scan', 3, 'current')
      `).run(session.id, student.id, student.name, student.code);
    }

    const updatedRecord = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(session.id, student.id);

    res.json({
      success: true,
      message: `Đã ghi nhận điểm danh cho sinh viên ${student.name} (${student.code})!`,
      student,
      record: updatedRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi điểm danh!', error: err.message });
  }
});

// 5. GET /api/attendance/my-history (Student History Log)
attendanceRouter.get('/my-history', authenticateToken, (req, res) => {
  try {
    const studentId = req.user.id;
    const records = db.prepare(`
      SELECT ar.*, s.subject_name, s.room, s.teacher_name, s.session_code 
      FROM attendance_records ar
      JOIN attendance_sessions s ON ar.session_id = s.id
      WHERE ar.student_id = ?
      ORDER BY ar.check_in_time DESC
    `).all(studentId);

    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM attendance_sessions').get().count;
    const myPresentCount = records.filter(r => r.status === 'present' || r.status === 'excused').length;
    const attendanceRate = totalSessions > 0 ? Math.round((myPresentCount / totalSessions) * 100) : 0;

    res.json({
      success: true,
      records,
      stats: {
        totalSessions,
        attendedCount: records.length,
        attendanceRate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử điểm danh!', error: err.message });
  }
});
