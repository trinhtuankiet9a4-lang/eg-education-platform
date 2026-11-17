import { Router } from 'express';
import { db } from '../db.js';
import { STUDENTS_K26_A } from '../students_data.js';

export const assignmentsRouter = Router();

// Middleware: optional auth helper
const optionalAuth = (req, res, next) => {
  req.user = req.user || { id: 1, role: 'teacher', name: 'ThS. Phạm Văn Thuận' };
  next();
};

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

// 1. GET /api/assignments - Lấy danh sách bài tập / Lab (Tối ưu 1 truy vấn LEFT JOIN duy nhất)
assignmentsRouter.get('/', optionalAuth, (req, res) => {
  try {
    const subjectCode = req.query.subject_code || 'IT204';
    const classId = req.query.class_id || 'K26 CNTT - Lớp A';

    const assignments = db.prepare(`
      SELECT 
        a.*,
        COUNT(s.id) as total_submitted,
        SUM(CASE WHEN s.status = 'graded' THEN 1 ELSE 0 END) as total_graded,
        AVG(s.score) as avg_score
      FROM assignments a
      LEFT JOIN submissions s ON s.assignment_id = a.id
      WHERE a.subject_code = ? AND a.class_id = ?
      GROUP BY a.id
      ORDER BY a.id ASC
    `).all(subjectCode, classId);

    const enhanced = assignments.map(a => ({
      ...a,
      assignmentCode: a.assignment_code,
      subjectCode: a.subject_code,
      subjectName: a.subject_name,
      classId: a.class_id,
      maxScore: a.max_score,
      weightPercent: a.weight_percent,
      allowedTypes: a.allowed_types,
      deadlineFormatted: a.deadline ? a.deadline.slice(0, 16) : '',
      totalStudents: 50,
      submittedCount: a.total_submitted || 0,
      gradedCount: a.total_graded || 0,
      avgScore: a.avg_score ? Math.round(a.avg_score * 10) / 10 : null
    }));

    res.json({
      success: true,
      data: enhanced
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/assignments - Giảng viên tạo bài Lab mới
assignmentsRouter.post('/', optionalAuth, (req, res) => {
  try {
    const {
      title,
      description,
      deadline,
      weight_percent = 30.0,
      max_score = 10.0,
      allowed_types = 'all',
      subject_code = 'IT204',
      class_id = 'K26 CNTT - Lớp A'
    } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tiêu đề và hạn nộp!' });
    }

    const assignmentCode = `LAB-IT204-${Date.now().toString().slice(-4)}`;

    const result = db.prepare(`
      INSERT INTO assignments (
        assignment_code, subject_code, subject_name, class_id,
        title, description, deadline, max_score, weight_percent, allowed_types
      ) VALUES (?, ?, 'Cấu trúc dữ liệu & Giải thuật', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignmentCode,
      subject_code,
      class_id,
      title,
      description || '',
      deadline,
      max_score,
      weight_percent,
      allowed_types
    );

    res.json({
      success: true,
      message: 'Tạo bài thực hành Lab mới thành công!',
      assignmentId: result.lastInsertRowid,
      assignmentCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/assignments/:id/submissions - Giảng viên xem danh sách 50 sinh viên đã nộp / chưa nộp
assignmentsRouter.get('/:id/submissions', optionalAuth, (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài Lab!' });
    }

    const submissions = db.prepare(`
      SELECT * FROM submissions WHERE assignment_id = ?
    `).all(assignmentId);

    const submissionMap = new Map();
    submissions.forEach(sub => submissionMap.set(sub.student_code, sub));

    // Combine with full class of 50 students
    const fullRoster = STUDENTS_K26_A.map(student => {
      const sub = submissionMap.get(student.code);
      if (sub) {
        return {
          studentCode: student.code,
          studentName: student.name,
          hasSubmitted: true,
          submissionId: sub.id,
          submissionType: sub.submission_type,
          fileName: sub.file_name,
          githubRepoUrl: sub.github_repo_url,
          studentNote: sub.student_note,
          submittedAt: sub.submitted_at,
          isLate: Boolean(sub.is_late),
          status: sub.status,
          score: sub.score,
          teacherFeedback: sub.teacher_feedback,
          gradedAt: sub.graded_at
        };
      } else {
        return {
          studentCode: student.code,
          studentName: student.name,
          hasSubmitted: false,
          submissionId: null,
          status: 'unsubmitted',
          score: null
        };
      }
    });

    res.json({
      success: true,
      assignment,
      submissions: fullRoster
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/assignments/:id/submit - Sinh viên nộp bài
assignmentsRouter.post('/:id/submit', optionalAuth, (req, res) => {
  try {
    const assignmentId = req.params.id;
    const {
      student_code,
      student_name,
      submission_type = 'github',
      file_name = null,
      file_url = null,
      github_repo_url = null,
      student_note = ''
    } = req.body;

    if (!student_code) {
      return res.status(400).json({ success: false, message: 'Thiếu mã sinh viên!' });
    }

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập!' });
    }

    const now = new Date();
    const deadlineDate = new Date(assignment.deadline);
    const isLate = now > deadlineDate ? 1 : 0;

    // Upsert submission
    const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_code = ?')
      .get(assignmentId, student_code);

    if (existing) {
      db.prepare(`
        UPDATE submissions 
        SET submission_type = ?, file_name = ?, file_url = ?, github_repo_url = ?, student_note = ?, submitted_at = CURRENT_TIMESTAMP, is_late = ?, status = 'submitted'
        WHERE id = ?
      `).run(submission_type, file_name, file_url, github_repo_url, student_note, isLate, existing.id);
    } else {
      db.prepare(`
        INSERT INTO submissions (
          assignment_id, student_code, student_name, submission_type,
          file_name, file_url, github_repo_url, student_note, is_late, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
      `).run(
        assignmentId, student_code, student_name || 'Sinh viên', submission_type,
        file_name, file_url, github_repo_url, student_note, isLate
      );
    }

    res.json({
      success: true,
      message: isLate ? 'Nộp bài thành công (Ghi nhận nộp trễ hạn)!' : 'Nộp bài thành công đúng hạn!',
      isLate: Boolean(isLate)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/assignments/submissions/:id/grade - Giảng viên chấm điểm & TỰ ĐỘNG ĐỒNG BỘ SỔ ĐIỂM
assignmentsRouter.post('/submissions/:id/grade', optionalAuth, (req, res) => {
  try {
    const submissionId = req.params.id;
    const { score, teacher_feedback = '', student_code = null, assignment_id = null } = req.body;

    const parsedScore = Math.max(0, Math.min(10, parseFloat(score) || 0));

    let sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    if (!sub && student_code && assignment_id) {
      sub = db.prepare('SELECT * FROM submissions WHERE student_code = ? AND assignment_id = ?').get(student_code, assignment_id);
    }

    if (!sub && student_code && assignment_id) {
      // Create a submission on-the-fly when teacher grades
      const stuInfo = STUDENTS_K26_A.find(s => s.code === student_code);
      const insertRes = db.prepare(`
        INSERT INTO submissions (assignment_id, student_code, student_name, submission_type, status, score, teacher_feedback, graded_at, graded_by)
        VALUES (?, ?, ?, 'manual', 'graded', ?, ?, CURRENT_TIMESTAMP, ?)
      `).run(assignment_id, student_code, stuInfo?.name || 'Sinh viên', parsedScore, teacher_feedback, req.user.name || 'ThS. Phạm Văn Thuận');
      sub = { id: insertRes.lastInsertRowid, student_code, assignment_id, score: parsedScore };
    } else if (sub) {
      // Update submission score
      db.prepare(`
        UPDATE submissions 
        SET score = ?, teacher_feedback = ?, status = 'graded', graded_at = CURRENT_TIMESTAMP, graded_by = ?
        WHERE id = ?
      `).run(parsedScore, teacher_feedback, req.user.name || 'ThS. Phạm Văn Thuận', sub.id);
    } else {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp!' });
    }

    // AUTO-SYNC TO GRADEBOOK:
    // Calculate new overall lab_score for this student across all graded assignments
    const allStudentSubs = db.prepare(`
      SELECT s.score, a.weight_percent 
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE s.student_code = ? AND s.status = 'graded' AND s.score IS NOT NULL
    `).all(sub.student_code);

    let totalWeight = 0;
    let weightedSum = 0;
    allStudentSubs.forEach(s => {
      const w = s.weight_percent || 1;
      weightedSum += s.score * w;
      totalWeight += w;
    });

    const newLabScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : parsedScore;

    // Update gradebook record for this student
    const existingGB = db.prepare(`
      SELECT * FROM gradebook_records 
      WHERE student_code = ? AND subject_code = 'IT204'
    `).get(sub.student_code);

    if (existingGB) {
      const attScore = existingGB.attendance_score || 10.0;
      const midScore = existingGB.midterm_score || 7.5;
      const bonusScore = existingGB.bonus_score || 0.5;

      let finalProcessScore = (attScore * 0.2) + (newLabScore * 0.3) + (midScore * 0.5) + bonusScore;
      finalProcessScore = Math.max(0, Math.min(10, Math.round(finalProcessScore * 10) / 10));

      const gpaInfo = convertToGPA(finalProcessScore);

      db.prepare(`
        UPDATE gradebook_records 
        SET lab_score = ?, final_process_score = ?, gpa4 = ?, letter_grade = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_code = ? AND subject_code = 'IT204'
      `).run(newLabScore, finalProcessScore, gpaInfo.gpa4, gpaInfo.letter, sub.student_code);
    }

    res.json({
      success: true,
      message: `Đã chấm ${parsedScore}đ và tự động cập nhật vào Sổ Điểm Quá Trình!`,
      newLabScore
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/assignments/sync-to-gradebook - Đồng bộ toàn bộ điểm Lab vào Sổ điểm (Batch Transaction)
assignmentsRouter.post('/sync-to-gradebook', optionalAuth, (req, res) => {
  try {
    const students = STUDENTS_K26_A;
    let syncedCount = 0;
    const updatedLabScores = [];

    const selectSubsStmt = db.prepare(`
      SELECT s.score, a.weight_percent 
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE s.student_code = ? AND s.status = 'graded' AND s.score IS NOT NULL
    `);
    const selectGBStmt = db.prepare(`
      SELECT * FROM gradebook_records 
      WHERE student_code = ? AND subject_code = 'IT204'
    `);
    const updateGBStmt = db.prepare(`
      UPDATE gradebook_records 
      SET lab_score = ?, final_process_score = ?, gpa4 = ?, letter_grade = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_code = ? AND subject_code = 'IT204'
    `);

    db.exec('BEGIN IMMEDIATE');
    try {
      students.forEach(student => {
        const subs = selectSubsStmt.all(student.code);

        if (subs.length > 0) {
          let totalW = 0;
          let sum = 0;
          subs.forEach(s => {
            const w = s.weight_percent || 1;
            sum += s.score * w;
            totalW += w;
          });
          const calculatedLab = Math.round((sum / totalW) * 10) / 10;
          updatedLabScores.push({ studentCode: student.code, labScore: calculatedLab });

          const existingGB = selectGBStmt.get(student.code);

          if (existingGB) {
            const attScore = existingGB.attendance_score || 10.0;
            const midScore = existingGB.midterm_score || 7.5;
            const bonus = existingGB.bonus_score || 0.5;

            let finalScore = (attScore * 0.2) + (calculatedLab * 0.3) + (midScore * 0.5) + bonus;
            finalScore = Math.max(0, Math.min(10, Math.round(finalScore * 10) / 10));
            const gpa = convertToGPA(finalScore);

            updateGBStmt.run(calculatedLab, finalScore, gpa.gpa4, gpa.letter, student.code);
            syncedCount++;
          }
        }
      });
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    res.json({
      success: true,
      message: `Đã đồng bộ điểm thực hành của ${syncedCount} sinh viên vào Sổ Điểm Quá Trình!`,
      syncedCount,
      updatedLabScores
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
