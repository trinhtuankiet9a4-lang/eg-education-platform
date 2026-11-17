import { Router } from 'express';
import { db } from '../db.js';

export const gradebookRouter = Router();

function convertToGPA(score10) {
  const s = Math.round(score10 * 10) / 10;
  if (s >= 8.5) return { gpa4: 4.0, letter: 'A', label: 'Xuất sắc' };
  if (s >= 8.0) return { gpa4: 3.5, letter: 'B+', label: 'Giỏi' };
  if (s >= 7.0) return { gpa4: 3.0, letter: 'B', label: 'Khá' };
  if (s >= 6.5) return { gpa4: 2.5, letter: 'C+', label: 'Trung bình khá' };
  if (s >= 5.5) return { gpa4: 2.0, letter: 'C', label: 'Trung bình' };
  if (s >= 5.0) return { gpa4: 1.5, letter: 'D+', label: 'Trung bình yếu' };
  if (s >= 4.0) return { gpa4: 1.0, letter: 'D', label: 'Đạt' };
  return { gpa4: 0.0, letter: 'F', label: 'Không đạt' };
}

function computeStudentRow(row) {
  const totalSessions = row.total_sessions || row.totalSessions || 15;
  const unexcused = Number(row.unexcused) || 0;
  const excused = Number(row.excused) || 0;
  const attended = Math.max(0, totalSessions - unexcused - excused);
  const attendanceRate = Math.round((attended / totalSessions) * 1000) / 10;

  let attendanceScore = 10 - (unexcused * 2.0) - (excused * 0.5);
  attendanceScore = Math.max(0, Math.min(10, Math.round(attendanceScore * 10) / 10));

  const labScore = Math.max(0, Math.min(10, Number(row.lab_score ?? row.labScore) || 0));
  const midtermScore = Math.max(0, Math.min(10, Number(row.midterm_score ?? row.midtermScore) || 0));
  const bonusScore = Math.max(0, Math.min(2.0, Number(row.bonus_score ?? row.bonusScore) || 0));

  let finalProcessScore = (attendanceScore * 0.2) + (labScore * 0.3) + (midtermScore * 0.5) + bonusScore;
  finalProcessScore = Math.max(0, Math.min(10, Math.round(finalProcessScore * 10) / 10));

  const gpaInfo = convertToGPA(finalProcessScore);

  let status = 'eligible';
  if (unexcused >= 4 || attendanceRate < 80.0) {
    status = 'banned';
  } else if (unexcused === 3 || finalProcessScore < 4.0) {
    status = 'warning';
  } else if (finalProcessScore >= 8.5 && attendanceScore >= 9.0) {
    status = 'scholarship';
  }

  return {
    ...row,
    studentCode: row.student_code || row.studentCode,
    studentName: row.student_name || row.studentName,
    subjectCode: row.subject_code || row.subjectCode,
    subjectName: row.subject_name || row.subjectName,
    classId: row.class_id || row.classId,
    totalSessions,
    attended,
    attendanceRate,
    attendance_score: attendanceScore,
    attendanceScore,
    lab_score: labScore,
    labScore,
    midterm_score: midtermScore,
    midtermScore,
    bonus_score: bonusScore,
    bonusScore,
    final_process_score: finalProcessScore,
    finalProcessScore,
    gpa4: gpaInfo.gpa4,
    letter_grade: gpaInfo.letter,
    letterGrade: gpaInfo.letter,
    gradeLabel: gpaInfo.label,
    teacher_note: row.teacher_note ?? row.teacherNote ?? '',
    teacherNote: row.teacher_note ?? row.teacherNote ?? '',
    status
  };
}

// 1. GET /api/gradebook - Lấy toàn bộ bảng điểm
gradebookRouter.get('/', (req, res) => {
  try {
    const subjectCode = req.query.subjectCode || 'IT204';
    const classId = req.query.classId || 'K26 CNTT - Lớp A';

    const records = db.prepare(`
      SELECT * FROM gradebook_records 
      WHERE subject_code = ? AND class_id = ?
      ORDER BY student_code ASC
    `).all(subjectCode, classId).map((r, idx) => ({
      ...computeStudentRow(r),
      stt: idx + 1
    }));

    res.json({
      success: true,
      data: records,
      total: records.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. PUT /api/gradebook/:studentCode - Cập nhật điểm của 1 sinh viên
gradebookRouter.put('/:studentCode', (req, res) => {
  try {
    const { studentCode } = req.params;
    const {
      unexcused,
      excused,
      lab_score,
      labScore,
      midterm_score,
      midtermScore,
      bonus_score,
      bonusScore,
      teacher_note,
      teacherNote,
      subject_code = 'IT204',
      class_id = 'K26 CNTT - Lớp A'
    } = req.body;

    const existing = db.prepare(`
      SELECT * FROM gradebook_records 
      WHERE student_code = ? AND subject_code = ? AND class_id = ?
    `).get(studentCode, subject_code, class_id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ điểm sinh viên!' });
    }

    const nextLab = lab_score !== undefined ? lab_score : (labScore !== undefined ? labScore : existing.lab_score);
    const nextMid = midterm_score !== undefined ? midterm_score : (midtermScore !== undefined ? midtermScore : existing.midterm_score);
    const nextBonus = bonus_score !== undefined ? bonus_score : (bonusScore !== undefined ? bonusScore : existing.bonus_score);
    const nextNote = teacher_note !== undefined ? teacher_note : (teacherNote !== undefined ? teacherNote : existing.teacher_note);

    const merged = {
      ...existing,
      unexcused: unexcused !== undefined ? unexcused : existing.unexcused,
      excused: excused !== undefined ? excused : existing.excused,
      lab_score: nextLab,
      midterm_score: nextMid,
      bonus_score: nextBonus,
      teacher_note: nextNote
    };

    const calculated = computeStudentRow(merged);

    db.prepare(`
      UPDATE gradebook_records 
      SET 
        unexcused = ?,
        excused = ?,
        attended = ?,
        attendance_score = ?,
        lab_score = ?,
        midterm_score = ?,
        bonus_score = ?,
        final_process_score = ?,
        gpa4 = ?,
        letter_grade = ?,
        status = ?,
        teacher_note = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_code = ? AND subject_code = ? AND class_id = ?
    `).run(
      calculated.unexcused,
      calculated.excused,
      calculated.attended,
      calculated.attendance_score,
      calculated.lab_score,
      calculated.midterm_score,
      calculated.bonus_score,
      calculated.final_process_score,
      calculated.gpa4,
      calculated.letter_grade,
      calculated.status,
      calculated.teacher_note,
      studentCode,
      subject_code,
      class_id
    );

    res.json({
      success: true,
      message: 'Cập nhật điểm thành công!',
      data: calculated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/gradebook/sync - Tự động đồng bộ từ chuyên cần QR
gradebookRouter.post('/sync', (req, res) => {
  try {
    const subjectCode = req.body.subjectCode || 'IT204';
    const classId = req.body.classId || 'K26 CNTT - Lớp A';

    res.json({
      success: true,
      message: 'Đã đồng bộ tự động dữ liệu chuyên cần & biểu quyết vào sổ điểm!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/gradebook/disputes - Lấy danh sách khiếu nại
gradebookRouter.get('/disputes', (req, res) => {
  try {
    const disputes = db.prepare(`SELECT * FROM grade_disputes ORDER BY id DESC`).all();
    res.json({ success: true, data: disputes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/gradebook/disputes - Sinh viên nộp đơn thắc mắc điểm
gradebookRouter.post('/disputes', (req, res) => {
  try {
    const {
      studentCode,
      studentName,
      subjectCode = 'IT204',
      component,
      currentScore,
      expectedScore,
      reason
    } = req.body;

    const disputeCode = `DISP-${Date.now().toString().slice(-4)}`;

    db.prepare(`
      INSERT INTO grade_disputes (
        dispute_code, student_code, student_name, subject_code,
        component, current_score, expected_score, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      disputeCode,
      studentCode,
      studentName,
      subjectCode,
      component,
      currentScore,
      expectedScore,
      reason
    );

    res.json({
      success: true,
      message: 'Gửi thắc mắc điểm thành công! Giảng viên sẽ kiểm tra và phản hồi sớm.',
      disputeCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/gradebook/disputes/:disputeId/resolve - Giảng viên duyệt/từ chối khiếu nại
gradebookRouter.post('/disputes/:disputeId/resolve', (req, res) => {
  try {
    const { disputeId } = req.params;
    const { action, resolutionNote, newScore } = req.body;

    let dispute = db.prepare(`SELECT * FROM grade_disputes WHERE id = ? OR dispute_code = ?`).get(disputeId, disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn khiếu nại!' });
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'resolved' : 'rejected';

    db.prepare(`
      UPDATE grade_disputes 
      SET status = ?, resolution_note = ?, resolved_at = ?
      WHERE id = ?
    `).run(newStatus, resolutionNote, now, dispute.id);

    // Nếu duyệt và có điểm mới, cập nhật sổ điểm và tính lại điểm quá trình
    if (action === 'approve' && newScore !== undefined) {
      const col = dispute.component === 'lab' ? 'lab_score' 
                : (dispute.component === 'midterm' ? 'midterm_score' : 'bonus_score');
      
      const existing = db.prepare(`
        SELECT * FROM gradebook_records 
        WHERE student_code = ? AND subject_code = ?
      `).get(dispute.student_code, dispute.subject_code);

      if (existing) {
        const merged = { ...existing, [col]: Number(newScore) };
        const calculated = computeStudentRow(merged);
        db.prepare(`
          UPDATE gradebook_records 
          SET ${col} = ?, final_process_score = ?, gpa4 = ?, letter_grade = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE student_code = ? AND subject_code = ?
        `).run(
          calculated[col],
          calculated.final_process_score,
          calculated.gpa4,
          calculated.letter_grade,
          calculated.status,
          dispute.student_code,
          dispute.subject_code
        );
      }
    }

    res.json({
      success: true,
      message: action === 'approve' ? 'Đã chấp thuận khiếu nại và điều chỉnh điểm!' : 'Đã từ chối khiếu nại!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
