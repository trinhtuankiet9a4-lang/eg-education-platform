import { Router } from 'express';
import { db } from '../db.js';
import { STUDENTS_K26_A, rawStudentList } from '../students_data.js';

export const labQueueRouter = Router();

export function parseStationNumber(rawStation) {
  if (rawStation === undefined || rawStation === null) return NaN;
  const str = String(rawStation).trim();
  if (!str) return NaN;

  // 1. Explicit keyword: Máy, May, Station, Seat, Vị trí
  const kw = str.match(/(?:máy|may|station|seat|vị trí|vi tri)\s*#?\s*(\d+)/i);
  if (kw) {
    return parseInt(kw[1], 10);
  }

  // 2. Starts with digits: "05", "5", "5 - Dãy A"
  const start = str.match(/^#?\s*(\d+)/);
  if (start) {
    return parseInt(start[1], 10);
  }

  // 3. Remove "Phòng Lab XX" or "Lab XX" and search remaining digits
  const cleaned = str.replace(/(?:phòng\s*lab|phong\s*lab|phòng|phong|lab|p\.)\s*\d+/gi, '');
  const fallback = cleaned.match(/(\d+)/);
  if (fallback) {
    return parseInt(fallback[1], 10);
  }

  return NaN;
}

function parseTicketId(raw) {
  if (raw === undefined || raw === null) return NaN;
  const cleaned = String(raw).trim().replace(/^Q-/i, '');
  if (!/^\d+$/.test(cleaned)) return NaN;
  return parseInt(cleaned, 10);
}

function resolveStudentInfo(stuCode, providedName, providedId) {
  let studentName = (providedName || '').trim();
  let studentId = providedId || null;

  const userRow = db.prepare(`
    SELECT id, name FROM users WHERE code = ? AND role = 'student' LIMIT 1
  `).get(stuCode);

  if (!studentId && userRow) {
    studentId = userRow.id;
  }

  if (!studentName) {
    const matched = STUDENTS_K26_A.find(s => s.code === stuCode)
      || rawStudentList.find(s => s.code === stuCode);
    if (matched) {
      studentName = matched.name;
    } else if (userRow?.name) {
      studentName = userRow.name;
    } else {
      const gbRow = db.prepare(`
        SELECT student_name FROM gradebook_records WHERE student_code = ? LIMIT 1
      `).get(stuCode);
      studentName = gbRow?.student_name || 'Sinh Viên';
    }
  }

  return { studentName, studentId };
}

function formatTicket(t) {
  const numStr = String(t.id).padStart(2, '0');
  const normalizedStatus = (t.status || 'waiting').toLowerCase();
  return {
    id: t.id,
    ticketId: `Q-${numStr}`,
    station: t.station_number,
    station_number: t.station_number,
    studentId: t.student_id,
    student_id: t.student_id,
    studentName: t.student_name,
    student_name: t.student_name,
    studentCode: t.student_code,
    student_code: t.student_code,
    classId: t.class_id,
    class_id: t.class_id,
    labName: t.lab_name,
    lab_name: t.lab_name,
    bugTitle: t.issue_description,
    issue_description: t.issue_description,
    codeSnippet: t.code_snippet,
    code_snippet: t.code_snippet,
    errorTags: t.error_tags ? t.error_tags.split(',').map(s => s.trim()) : [],
    status: normalizedStatus,
    statusUpper: normalizedStatus.toUpperCase(),
    assignedTo: t.assigned_to,
    assigned_to: t.assigned_to,
    assignedTa: t.assigned_to,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at
  };
}

// 1. GET /api/lab-queue - Lấy danh sách phiếu hàng đợi hỗ trợ phòng Lab
labQueueRouter.get('/', (req, res) => {
  try {
    const classId = req.query.classId || req.query.class_id || 'K26 CNTT - Lớp A';
    const statusFilter = req.query.status;

    let query = `
      SELECT * FROM lab_help_requests
      WHERE class_id = ?
    `;
    const params = [classId];

    if (statusFilter && statusFilter !== 'all') {
      const norm = statusFilter.toLowerCase() === 'helping' ? 'assisting' : statusFilter.toLowerCase();
      query += ` AND LOWER(status) = ?`;
      params.push(norm);
    }

    query += `
      ORDER BY 
        CASE LOWER(status)
          WHEN 'waiting' THEN 1
          WHEN 'assisting' THEN 2
          WHEN 'resolved' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END,
        created_at ASC
    `;

    const rows = db.prepare(query).all(...params);
    const tickets = rows.map(formatTicket);

    // Compute live stats for class
    const allRows = db.prepare(`SELECT status, created_at, resolved_at FROM lab_help_requests WHERE class_id = ?`).all(classId);
    let waitingCount = 0;
    let assistingCount = 0;
    let resolvedCount = 0;
    let totalWaitTimeMs = 0;
    let waitTimeCount = 0;

    allRows.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (s === 'waiting') waitingCount++;
      else if (s === 'assisting' || s === 'helping') assistingCount++;
      else if (s === 'resolved') {
        resolvedCount++;
        if (r.created_at && r.resolved_at) {
          const tCreated = new Date(r.created_at).getTime();
          const tResolved = new Date(r.resolved_at).getTime();
          if (!isNaN(tCreated) && !isNaN(tResolved) && tResolved >= tCreated) {
            totalWaitTimeMs += (tResolved - tCreated);
            waitTimeCount++;
          }
        }
      }
    });

    const avgWaitMin = waitTimeCount > 0 ? Math.round((totalWaitTimeMs / waitTimeCount / 60000) * 10) / 10 : 4.5;

    res.json({
      success: true,
      data: tickets,
      stats: {
        total: allRows.length,
        waiting: waitingCount,
        assisting: assistingCount,
        resolved: resolvedCount,
        avg_wait_time_min: avgWaitMin
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/lab-queue/request - Sinh viên đăng ký gọi trợ giúp tại máy
labQueueRouter.post('/request', (req, res) => {
  try {
    const {
      station,
      station_number,
      student_code,
      studentCode,
      student_name,
      studentName,
      student_id,
      studentId,
      class_id,
      classId,
      issue_description,
      bugTitle,
      bug_title,
      lab_name,
      labName,
      code_snippet,
      codeSnippet,
      error_tags,
      errorTags
    } = req.body;

    const rawStation = String(station || station_number || '').trim();
    if (!rawStation) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp vị trí máy thực hành (Máy 01 - 24)!'
      });
    }

    // Validate station number strictly using robust parser: 1 - 24
    const seatNum = parseStationNumber(rawStation);
    if (isNaN(seatNum) || seatNum < 1 || seatNum > 24) {
      return res.status(400).json({
        success: false,
        message: 'Vị trí máy không hợp lệ! Vui lòng chọn số máy từ 01 đến 24 trong phòng Lab.'
      });
    }

    // Normalize station string if user provided just a number or custom string
    const seatPad = String(seatNum).padStart(2, '0');
    const aisle = seatNum <= 8 ? 'Dãy A' : seatNum <= 16 ? 'Dãy B' : 'Dãy C';
    let finalStation = `Máy ${seatPad} — ${aisle} (Phòng Lab 02)`;
    if (rawStation.includes('Máy') && rawStation.includes('Dãy')) {
      finalStation = rawStation;
    }

    const stuCode = String(student_code || studentCode || '').trim();
    if (!stuCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã sinh viên!'
      });
    }

    const { studentName: stuName, studentId: resolvedStuId } = resolveStudentInfo(
      stuCode,
      student_name || studentName,
      student_id || studentId
    );

    const finalClassId = class_id || classId || 'K26 CNTT - Lớp A';
    const finalLabName = lab_name || labName || 'LAB-02: Cây Nhị Phân Cân Bằng AVL';
    const finalDescription = (issue_description || bugTitle || bug_title || 'Cần Giảng viên / Trợ giảng hỗ trợ debug code').trim();
    const finalSnippet = (code_snippet || codeSnippet || '').trim();
    const finalTags = Array.isArray(error_tags || errorTags)
      ? (error_tags || errorTags).join(',')
      : (error_tags || errorTags || 'debug,lab');

    // Check if student already has a pending/waiting ticket in this class
    const existing = db.prepare(`
      SELECT * FROM lab_help_requests
      WHERE class_id = ? AND student_code = ? AND LOWER(status) IN ('waiting', 'assisting')
      LIMIT 1
    `).get(finalClassId, stuCode);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Bạn đang có yêu cầu hỗ trợ chưa hoàn thành tại "${existing.station_number}"! Vui lòng chờ Giảng viên hỗ trợ hoặc hủy phiếu cũ.`
      });
    }

    // Check if station already has an active/pending ticket in this class
    const seatOccupied = db.prepare(`
      SELECT * FROM lab_help_requests
      WHERE class_id = ? AND LOWER(status) IN ('waiting', 'assisting')
        AND (station_number = ? OR station_number LIKE ?)
      LIMIT 1
    `).get(finalClassId, finalStation, `%Máy ${seatPad}%`);

    if (seatOccupied) {
      return res.status(400).json({
        success: false,
        message: `Vị trí Máy ${seatPad} đang có yêu cầu hỗ trợ (${seatOccupied.student_name} - ${seatOccupied.student_code}) đang chờ xử lý! Vui lòng đợi giảng viên hỗ trợ xong.`
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO lab_help_requests (
        station_number, student_id, student_name, student_code, class_id,
        lab_name, issue_description, code_snippet, error_tags, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', datetime('now', 'localtime'))
    `);

    const result = insertStmt.run(
      finalStation,
      resolvedStuId,
      stuName,
      stuCode,
      finalClassId,
      finalLabName,
      finalDescription,
      finalSnippet,
      finalTags
    );

    const created = db.prepare(`SELECT * FROM lab_help_requests WHERE id = ?`).get(result.lastInsertRowid);
    const createdTicket = formatTicket(created);

    try {
      const shortStation = finalStation.split('—')[0].trim();
      const issueSummary = finalDescription.length > 100
        ? `${finalDescription.slice(0, 100)}...`
        : finalDescription;
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('teacher', 'lab_queue', ?, ?, 'lab_queue', 'high')
      `).run(
        `Yêu cầu hỗ trợ Lab mới — ${shortStation}`,
        `Sinh viên ${stuName} (${stuCode}) tại ${finalStation} vừa gửi phiếu ${createdTicket.ticketId}: "${issueSummary}"`
      );
    } catch (notifErr) {
      console.warn('[LabQueue request notification error]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Đã gửi yêu cầu trợ giúp tại máy thành công! Giảng viên sẽ đến hỗ trợ bạn.',
      data: createdTicket
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. PATCH /api/lab-queue/:id/status - Giảng viên / Trợ giảng cập nhật trạng thái phiếu
labQueueRouter.patch('/:id/status', (req, res) => {
  try {
    const ticketId = parseTicketId(req.params.id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, message: 'Mã phiếu hỗ trợ không hợp lệ!' });
    }

    const existing = db.prepare(`SELECT * FROM lab_help_requests WHERE id = ?`).get(ticketId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu hỗ trợ trong hệ thống!' });
    }

    let { status, assigned_to, assignedTo } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái mới!' });
    }

    let normStatus = String(status).toLowerCase();
    if (normStatus === 'helping') normStatus = 'assisting';

    const validStatuses = ['waiting', 'assisting', 'resolved', 'cancelled'];
    if (!validStatuses.includes(normStatus)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ! Hợp lệ: ${validStatuses.join(', ')}`
      });
    }

    let finalAssigned = assigned_to || assignedTo || existing.assigned_to;
    if (normStatus === 'assisting' && !finalAssigned) {
      finalAssigned = 'ThS. Phạm Văn Thuận';
    }

    if (normStatus === 'resolved') {
      db.prepare(`
        UPDATE lab_help_requests
        SET status = ?, assigned_to = ?, resolved_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(normStatus, finalAssigned, ticketId);
    } else {
      db.prepare(`
        UPDATE lab_help_requests
        SET status = ?, assigned_to = ?
        WHERE id = ?
      `).run(normStatus, finalAssigned, ticketId);
    }

    const updated = db.prepare(`SELECT * FROM lab_help_requests WHERE id = ?`).get(ticketId);
    const updatedTicket = formatTicket(updated);

    const prevStatus = (existing.status || '').toLowerCase();
    if (prevStatus !== normStatus && (normStatus === 'assisting' || normStatus === 'resolved')) {
      try {
        const shortStation = (updated.station_number || '').split('—')[0].trim();
        const handlerName = finalAssigned || 'Giảng viên / Trợ giảng';
        const isAssisting = normStatus === 'assisting';

        db.prepare(`
          INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
          VALUES ('student', 'lab_queue', ?, ?, 'lab_queue', ?)
        `).run(
          isAssisting
            ? `Giảng viên đang đến hỗ trợ ${shortStation}`
            : `Phiếu hỗ trợ ${updatedTicket.ticketId} đã được giải quyết`,
          isAssisting
            ? `${handlerName} đang tiếp nhận phiếu ${updatedTicket.ticketId} của ${updated.student_name} (${updated.student_code}) tại ${updated.station_number}.`
            : `${handlerName} đã hoàn thành hỗ trợ tại ${updated.station_number} cho ${updated.student_name}.`,
          isAssisting ? 'high' : 'normal'
        );
      } catch (notifErr) {
        console.warn('[LabQueue status notification error]', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái phiếu sang "${normStatus}"!`,
      data: updatedTicket
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. DELETE /api/lab-queue - Dọn sạch phiếu hỗ trợ đã giải quyết hoặc theo bộ lọc
labQueueRouter.delete('/', (req, res) => {
  try {
    const classId = req.query.classId || req.query.class_id || req.body?.classId || req.body?.class_id || 'K26 CNTT - Lớp A';
    const clearMode = req.query.clear || req.body?.clear || req.query.status || req.body?.status;

    if (!clearMode || clearMode === 'resolved' || clearMode === 'all_resolved') {
      const del = db.prepare(`
        DELETE FROM lab_help_requests
        WHERE class_id = ? AND LOWER(status) IN ('resolved', 'cancelled')
      `).run(classId);

      return res.json({
        success: true,
        message: `Đã dọn dẹp ${del.changes} phiếu hỗ trợ đã giải quyết/hủy.`,
        deletedCount: del.changes
      });
    }

    if (clearMode === 'all') {
      const del = db.prepare(`DELETE FROM lab_help_requests WHERE class_id = ?`).run(classId);
      return res.json({
        success: true,
        message: `Đã dọn dẹp toàn bộ ${del.changes} phiếu trong hàng đợi.`,
        deletedCount: del.changes
      });
    }

    res.status(400).json({
      success: false,
      message: 'Tham số dọn dẹp không hợp lệ! Sử dụng clear=resolved hoặc clear=all.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4b. DELETE /api/lab-queue/:id - Xóa phiếu đơn lẻ hoặc dọn sạch danh sách đã xử lý
labQueueRouter.delete('/:id', (req, res) => {
  try {
    const rawId = req.params.id;
    const classId = req.query.classId || req.query.class_id || 'K26 CNTT - Lớp A';

    if (rawId === 'clear-resolved' || rawId === 'clear' || req.query.clear === 'resolved') {
      const del = db.prepare(`
        DELETE FROM lab_help_requests
        WHERE class_id = ? AND LOWER(status) IN ('resolved', 'cancelled')
      `).run(classId);

      return res.json({
        success: true,
        message: `Đã dọn dẹp ${del.changes} phiếu hỗ trợ đã giải quyết/hủy.`
      });
    }

    const ticketId = parseTicketId(rawId);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, message: 'Mã phiếu không hợp lệ!' });
    }

    const del = db.prepare(`DELETE FROM lab_help_requests WHERE id = ?`).run(ticketId);
    if (del.changes === 0) {
      return res.status(404).json({ success: false, message: 'Phiếu hỗ trợ không tồn tại!' });
    }

    res.json({
      success: true,
      deletedId: ticketId,
      message: 'Đã xóa phiếu hỗ trợ thành công!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
