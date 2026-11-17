import { Router } from 'express';
import { db } from '../db.js';
import { STUDENTS_K26_A, rawStudentList } from '../students_data.js';

export const flashQuizRouter = Router();

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

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseQuizId(raw) {
  if (raw === undefined || raw === null) return NaN;
  const cleaned = String(raw).trim().replace(/^FQ-/i, '');
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

function syncFlashQuizBonusToGradebook(qId, studentCode, bonusAwarded, classId = null) {
  const bonusDelta = Number(bonusAwarded) || 0;
  if (bonusDelta <= 0) return false;

  const sub = db.prepare(`
    SELECT * FROM flash_quiz_submissions
    WHERE quiz_id = ? AND student_code = ?
    LIMIT 1
  `).get(qId, studentCode);

  if (sub && sub.is_synced_to_gradebook === 1) {
    return false;
  }

  const gbRecord = db.prepare(`
    SELECT * FROM gradebook_records
    WHERE student_code = ? AND subject_code = 'IT204'
    ORDER BY (class_id = ?) DESC
    LIMIT 1
  `).get(studentCode, classId || 'K26 CNTT - Lớp A');

  if (!gbRecord) return false;

  const currentNote = String(gbRecord.teacher_note || '');
  const noteTag = `+${bonusDelta}đ Flash Quiz #${qId}`;
  const alreadySyncedPattern = new RegExp(`Flash Quiz #${qId}(?:$|[^0-9])`);
  if (alreadySyncedPattern.test(currentNote)) {
    if (sub && sub.is_synced_to_gradebook !== 1) {
      try {
        db.prepare(`UPDATE flash_quiz_submissions SET is_synced_to_gradebook = 1 WHERE quiz_id = ? AND student_code = ?`).run(qId, studentCode);
      } catch {}
    }
    return false;
  }

  const curBonus = Number(gbRecord.bonus_score) || 0;
  const newBonus = Math.min(2.0, Math.round((curBonus + bonusDelta) * 100) / 100);

  const attScore = gbRecord.attendance_score !== null && gbRecord.attendance_score !== undefined
    ? Number(gbRecord.attendance_score)
    : 10;
  const labScore = gbRecord.lab_score !== null && gbRecord.lab_score !== undefined
    ? Number(gbRecord.lab_score)
    : 8.0;
  const midScore = gbRecord.midterm_score !== null && gbRecord.midterm_score !== undefined
    ? Number(gbRecord.midterm_score)
    : 7.5;
  const finalScore = Math.max(0, Math.min(10, Math.round((attScore * 0.2 + labScore * 0.3 + midScore * 0.5 + newBonus) * 10) / 10));

  const gpa = convertToGPA(finalScore);

  const totalSessions = Number(gbRecord.total_sessions) || 15;
  const unexcused = Number(gbRecord.unexcused) || 0;
  const excused = Number(gbRecord.excused) || 0;
  const attended = Math.max(0, totalSessions - unexcused - excused);
  const attendanceRate = (attended / totalSessions) * 100;

  let status = 'eligible';
  if (unexcused >= 4 || attendanceRate < 80.0) {
    status = 'banned';
  } else if (unexcused === 3 || finalScore < 4.0) {
    status = 'warning';
  } else if (finalScore >= 8.5 && attScore >= 9.0) {
    status = 'scholarship';
  }

  const updatedNote = currentNote.trim() ? `${currentNote} • ${noteTag}` : noteTag;

  db.prepare(`
    UPDATE gradebook_records
    SET
      bonus_score = ?,
      final_process_score = ?,
      gpa4 = ?,
      letter_grade = ?,
      status = ?,
      teacher_note = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(newBonus, finalScore, gpa.gpa4, gpa.letter, status, updatedNote, gbRecord.id);

  try {
    db.prepare(`UPDATE flash_quiz_submissions SET is_synced_to_gradebook = 1 WHERE quiz_id = ? AND student_code = ?`).run(qId, studentCode);
  } catch {}

  return true;
}

function buildActiveQuizPayload(quiz, studentCode = null, remainingOverride = null) {
  const options = parseOptions(quiz.options_json);
  const timeLimit = quiz.time_limit_sec || 45;
  const remainingSec = remainingOverride !== null
    ? remainingOverride
    : Math.max(0, timeLimit - Math.max(0, quiz.elapsed_sec || 0));

  const subCount = db.prepare(`
    SELECT COUNT(*) as count FROM flash_quiz_submissions WHERE quiz_id = ?
  `).get(quiz.id).count;

  let mySubmission = null;
  if (studentCode) {
    mySubmission = db.prepare(`
      SELECT * FROM flash_quiz_submissions WHERE quiz_id = ? AND student_code = ?
    `).get(quiz.id, studentCode);
  }

  return {
    id: quiz.id,
    quizId: `FQ-${quiz.id}`,
    classId: quiz.class_id,
    teacherId: quiz.teacher_id,
    title: quiz.title || 'Live Flash Quiz 45s',
    question: quiz.question_text,
    questionText: quiz.question_text,
    options,
    correctIndex: quiz.correct_index,
    timeLimitSec: timeLimit,
    durationSec: timeLimit,
    status: quiz.status,
    bonusPoints: quiz.bonus_points,
    bonusScore: quiz.bonus_points,
    startedAt: quiz.started_at,
    remainingSeconds: remainingSec,
    totalSubmissions: subCount,
    hasSubmitted: !!mySubmission,
    mySubmission: mySubmission ? {
      selectedOption: mySubmission.selected_option,
      selectedIndex: mySubmission.selected_option,
      responseTimeMs: mySubmission.response_time_ms,
      isCorrect: !!mySubmission.is_correct,
      bonusAwarded: mySubmission.bonus_awarded,
      submittedAt: mySubmission.submitted_at
    } : null
  };
}

// 1. GET /api/flash-quiz/active - Lấy phiên Flash Quiz đang phát trực tiếp cho lớp
flashQuizRouter.get('/active', (req, res) => {
  try {
    const classId = req.query.classId || req.query.class_id || 'K26 CNTT - Lớp A';
    const studentCode = req.query.studentCode || req.query.student_code;

    const quiz = db.prepare(`
      SELECT *,
        CAST((julianday(datetime('now', 'localtime')) - julianday(started_at)) * 86400 AS INTEGER) AS elapsed_sec
      FROM flash_quizzes
      WHERE class_id = ? AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `).get(classId);

    if (!quiz) {
      return res.json({
        success: true,
        data: null,
        message: 'Hiện không có phiên Flash Quiz nào đang diễn ra.'
      });
    }

    res.json({
      success: true,
      data: buildActiveQuizPayload(quiz, studentCode)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. GET /api/flash-quiz/history - Lấy lịch sử các phiên Flash Quiz gần đây của lớp
flashQuizRouter.get('/history', (req, res) => {
  try {
    const classId = req.query.classId || req.query.class_id || 'K26 CNTT - Lớp A';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let query = `
      SELECT
        fq.*,
        COUNT(fqs.id) AS total_submissions,
        COALESCE(SUM(CASE WHEN fqs.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_count
      FROM flash_quizzes fq
      LEFT JOIN flash_quiz_submissions fqs ON fqs.quiz_id = fq.id
    `;
    const params = [];
    if (classId !== 'all') {
      query += ` WHERE fq.class_id = ? `;
      params.push(classId);
    }
    query += `
      GROUP BY fq.id
      ORDER BY fq.id DESC
      LIMIT ?
    `;
    params.push(limit);

    const rows = db.prepare(query).all(...params);

    const history = rows.map(q => ({
      id: q.id,
      quizId: `FQ-${q.id}`,
      classId: q.class_id,
      teacherId: q.teacher_id,
      title: q.title || 'Live Flash Quiz 45s',
      question: q.question_text,
      questionText: q.question_text,
      options: parseOptions(q.options_json),
      correctIndex: q.correct_index,
      timeLimitSec: q.time_limit_sec,
      durationSec: q.time_limit_sec,
      status: q.status,
      bonusPoints: q.bonus_points,
      bonusScore: q.bonus_points,
      startedAt: q.started_at,
      createdAt: q.created_at,
      totalSubmissions: q.total_submissions || 0,
      total_submissions: q.total_submissions || 0,
      correctCount: q.correct_count || 0,
      correct_count: q.correct_count || 0,
      accuracyPercent: q.total_submissions > 0
        ? Math.round(((q.correct_count || 0) / q.total_submissions) * 100)
        : 0
    }));

    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/flash-quiz/start - Giảng viên phát động phiên câu hỏi Flash Quiz 45s mới
flashQuizRouter.post('/start', (req, res) => {
  try {
    const {
      class_id,
      classId,
      teacher_id,
      teacherId,
      title,
      question,
      question_text,
      options,
      options_json,
      correct_index,
      correctIndex,
      time_limit_sec,
      durationSec,
      bonus_points,
      bonusScore
    } = req.body;

    const finalQuestion = (question || question_text || '').trim();
    if (!finalQuestion) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung câu hỏi Flash Quiz!' });
    }

    let finalOptions = parseOptions(options);
    if (!finalOptions || finalOptions.length < 2) {
      finalOptions = parseOptions(options_json);
    }
    if (!finalOptions || finalOptions.length < 2) {
      finalOptions = [
        'A. O(1) — Truy cập tức thì bằng khóa băm',
        'B. O(log N) — Chia đôi không gian tìm kiếm trên cây cân bằng',
        'C. O(N) — Duyệt tuần tự toàn bộ phần tử',
        'D. O(N log N) — Sắp xếp trộn MergeSort'
      ];
    }

    const rawCorrect = correct_index !== undefined ? correct_index : (correctIndex !== undefined ? correctIndex : 1);
    const parsedCorrect = Number(rawCorrect);
    const finalCorrectIndex = (!isNaN(parsedCorrect) && parsedCorrect >= 0 && parsedCorrect < finalOptions.length) ? parsedCorrect : 0;

    const rawDuration = time_limit_sec !== undefined ? time_limit_sec : durationSec;
    const parsedDuration = Number(rawDuration);
    const finalDuration = (!isNaN(parsedDuration) && parsedDuration > 0) ? parsedDuration : 45;

    const rawBonus = bonus_points !== undefined ? bonus_points : (bonusScore !== undefined ? bonusScore : 0.5);
    const parsedBonus = Number(rawBonus);
    const finalBonus = (!isNaN(parsedBonus) && parsedBonus >= 0) ? parsedBonus : 0.5;

    const finalClassId = class_id || classId || 'K26 CNTT - Lớp A';
    const finalTeacherId = teacher_id || teacherId || 1;
    const finalTitle = title || 'Flash Quiz Phản xạ Nhanh Tại Lớp';

    // End previous active quizzes for this class
    db.prepare(`
      UPDATE flash_quizzes
      SET status = 'ended'
      WHERE class_id = ? AND status = 'active'
    `).run(finalClassId);

    const insertStmt = db.prepare(`
      INSERT INTO flash_quizzes (
        class_id, teacher_id, title, question_text, options_json,
        correct_index, time_limit_sec, status, bonus_points, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))
    `);

    const result = insertStmt.run(
      finalClassId,
      finalTeacherId,
      finalTitle,
      finalQuestion,
      JSON.stringify(finalOptions),
      finalCorrectIndex,
      finalDuration,
      finalBonus
    );

    const created = db.prepare(`SELECT * FROM flash_quizzes WHERE id = ?`).get(result.lastInsertRowid);

    try {
      const qSnippet = finalQuestion.length > 90 ? `${finalQuestion.slice(0, 90)}...` : finalQuestion;
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('student', 'flash_quiz', ?, ?, 'live_quiz', 'urgent')
      `).run(
        `⚡ Flash Quiz ${finalDuration}s mới (+${finalBonus}đ)`,
        `Giảng viên vừa phát câu hỏi nhanh tại lớp (${finalClassId}): "${qSnippet}". Tham gia trả lời trong ${finalDuration}s để nhận +${finalBonus}đ vào Sổ điểm!`
      );
    } catch (notifErr) {
      console.warn('[FlashQuiz start notification error]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Đã phát động phiên Flash Quiz ${finalDuration} giây lên toàn bộ giảng đường!`,
      data: {
        id: created.id,
        quizId: `FQ-${created.id}`,
        classId: created.class_id,
        title: created.title,
        question: created.question_text,
        options: finalOptions,
        correctIndex: created.correct_index,
        durationSec: created.time_limit_sec,
        timeLimitSec: created.time_limit_sec,
        status: created.status,
        bonusScore: created.bonus_points,
        bonusPoints: created.bonus_points,
        startedAt: created.started_at,
        remainingSeconds: created.time_limit_sec
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/flash-quiz/submit - Sinh viên nộp phương án trả lời phản xạ
flashQuizRouter.post('/submit', (req, res) => {
  try {
    const {
      quiz_id,
      quizId,
      student_code,
      studentCode,
      student_name,
      studentName,
      student_id,
      studentId,
      selected_option,
      selectedIndex,
      response_time_ms,
      timeSec
    } = req.body;

    const qId = parseQuizId(quiz_id ?? quizId);
    if (isNaN(qId)) {
      return res.status(400).json({ success: false, message: 'Mã câu hỏi Flash Quiz không hợp lệ!' });
    }

    const quiz = db.prepare(`
      SELECT *,
        CAST((julianday(datetime('now', 'localtime')) - julianday(started_at)) * 86400000 AS INTEGER) AS elapsed_ms
      FROM flash_quizzes WHERE id = ?
    `).get(qId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Phiên câu hỏi không tồn tại!' });
    }

    if (quiz.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Phiên câu hỏi này đã kết thúc!' });
    }

    // Check if quiz time limit has expired (with 2500ms grace period for network latency)
    const timeLimitMs = (quiz.time_limit_sec || 45) * 1000;
    if (quiz.elapsed_ms !== null && quiz.elapsed_ms !== undefined && quiz.elapsed_ms > (timeLimitMs + 2500)) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian làm bài Flash Quiz đã kết thúc! Không thể nộp thêm câu trả lời.'
      });
    }

    const stuCode = String(student_code || studentCode || '').trim();
    if (!stuCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã sinh viên!' });
    }

    // Reject duplicate submissions by the same student for fairness and security
    const existingSub = db.prepare(`
      SELECT * FROM flash_quiz_submissions WHERE quiz_id = ? AND student_code = ?
    `).get(qId, stuCode);

    if (existingSub) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nộp câu trả lời cho phiên trắc nghiệm này rồi! Mỗi sinh viên chỉ được nộp một lần.'
      });
    }

    const { studentName: stuName, studentId: resolvedStuId } = resolveStudentInfo(
      stuCode,
      student_name || studentName,
      student_id || studentId
    );

    const chosenOption = Number(selected_option !== undefined ? selected_option : selectedIndex);
    if (isNaN(chosenOption)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn phương án trả lời!' });
    }

    // Calculate response time clamped between 100ms and timeLimitMs
    let finalTimeMs = 5000;
    if (response_time_ms !== undefined && response_time_ms !== null && response_time_ms !== '' && !isNaN(Number(response_time_ms))) {
      finalTimeMs = parseInt(response_time_ms, 10);
    } else if (timeSec !== undefined && timeSec !== null && timeSec !== '' && !isNaN(Number(timeSec))) {
      finalTimeMs = Math.round(parseFloat(timeSec) * 1000);
    } else if (quiz.elapsed_ms !== null && quiz.elapsed_ms !== undefined && !isNaN(quiz.elapsed_ms)) {
      finalTimeMs = quiz.elapsed_ms;
    }
    finalTimeMs = Math.min(timeLimitMs, Math.max(100, finalTimeMs));

    const isCorrect = chosenOption === Number(quiz.correct_index) ? 1 : 0;
    const quizBonus = quiz.bonus_points !== null && quiz.bonus_points !== undefined ? Number(quiz.bonus_points) : 0.5;
    const bonusAwarded = isCorrect ? quizBonus : 0;

    const insertStmt = db.prepare(`
      INSERT INTO flash_quiz_submissions (
        quiz_id, student_id, student_name, student_code,
        selected_option, response_time_ms, is_correct, bonus_awarded, is_synced_to_gradebook, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))
    `);

    insertStmt.run(
      qId,
      resolvedStuId,
      stuName,
      stuCode,
      chosenOption,
      finalTimeMs,
      isCorrect,
      bonusAwarded
    );

    let gradebookSynced = false;
    if (isCorrect === 1 && bonusAwarded > 0) {
      gradebookSynced = syncFlashQuizBonusToGradebook(qId, stuCode, bonusAwarded, quiz.class_id);
    }

    res.json({
      success: true,
      is_correct: isCorrect === 1,
      isCorrect: isCorrect === 1,
      bonus_awarded: bonusAwarded,
      bonusAwarded,
      gradebook_synced: gradebookSynced,
      gradebookSynced,
      correct_index: quiz.correct_index,
      correctIndex: quiz.correct_index,
      response_time_ms: finalTimeMs,
      timeSec: Math.round((finalTimeMs / 1000) * 10) / 10,
      message: isCorrect === 1
        ? (gradebookSynced
          ? `🎉 Chính xác! Bạn đã được cộng +${bonusAwarded}đ thưởng vào Sổ điểm!`
          : `🎉 Chính xác! Đáp án đã được ghi nhận (+${bonusAwarded}đ).`)
        : 'Đã ghi nhận câu trả lời của bạn.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/flash-quiz/:id/results - Lấy phân bổ kết quả (A, B, C, D %) và bảng vàng tốc độ
flashQuizRouter.get('/:id/results', (req, res) => {
  try {
    const qId = parseQuizId(req.params.id);
    if (isNaN(qId)) {
      return res.status(400).json({ success: false, message: 'Mã câu hỏi không hợp lệ!' });
    }

    const quiz = db.prepare(`SELECT * FROM flash_quizzes WHERE id = ?`).get(qId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi!' });
    }

    const options = parseOptions(quiz.options_json);
    const submissions = db.prepare(`
      SELECT * FROM flash_quiz_submissions
      WHERE quiz_id = ?
      ORDER BY response_time_ms ASC
    `).all(qId);

    const totalVotes = submissions.length;

    // Calculate percentage distribution
    const distribution = options.map((opt, idx) => {
      const count = submissions.filter(s => Number(s.selected_option) === idx).length;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        index: idx,
        option: opt,
        count,
        percent: pct,
        isCorrect: idx === Number(quiz.correct_index)
      };
    });

    // Speed podium leaderboard (correct submissions ordered by speed)
    const podium = submissions
      .filter(s => Number(s.is_correct) === 1)
      .map((s, idx) => ({
        rank: idx + 1,
        studentCode: s.student_code,
        studentName: s.student_name,
        timeSec: Math.round(((s.response_time_ms || 5000) / 1000) * 10) / 10,
        bonusAwarded: s.bonus_awarded,
        bonusScore: s.bonus_awarded
      }));

    res.json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          quizId: `FQ-${quiz.id}`,
          classId: quiz.class_id,
          title: quiz.title,
          question: quiz.question_text,
          options,
          correctIndex: quiz.correct_index,
          timeLimitSec: quiz.time_limit_sec,
          durationSec: quiz.time_limit_sec,
          status: quiz.status,
          bonusScore: quiz.bonus_points,
          startedAt: quiz.started_at
        },
        totalSubmissions: totalVotes,
        distribution,
        podium,
        responses: submissions.map(s => ({
          studentCode: s.student_code,
          studentName: s.student_name,
          selectedIndex: s.selected_option,
          isCorrect: s.is_correct === 1,
          timeSec: Math.round(((s.response_time_ms || 5000) / 1000) * 10) / 10
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/flash-quiz/:id/reset-timer - Đặt lại đồng hồ đếm ngược cho phiên Flash Quiz
flashQuizRouter.post('/:id/reset-timer', (req, res) => {
  try {
    const qId = parseQuizId(req.params.id);
    if (isNaN(qId)) {
      return res.status(400).json({ success: false, message: 'Mã phiên Flash Quiz không hợp lệ!' });
    }

    const quiz = db.prepare(`SELECT * FROM flash_quizzes WHERE id = ?`).get(qId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Phiên Flash Quiz không tồn tại!' });
    }

    // Ensure no other quiz stays active for this class when resetting/replaying this quiz
    db.prepare(`
      UPDATE flash_quizzes
      SET status = 'ended'
      WHERE class_id = ? AND status = 'active' AND id != ?
    `).run(quiz.class_id, qId);

    db.prepare(`
      UPDATE flash_quizzes
      SET started_at = datetime('now', 'localtime'),
          status = 'active'
      WHERE id = ?
    `).run(qId);

    const refreshed = db.prepare(`SELECT * FROM flash_quizzes WHERE id = ?`).get(qId);
    const studentCode = req.query.studentCode || req.query.student_code || req.body?.studentCode || req.body?.student_code || null;

    res.json({
      success: true,
      message: `Đã đặt lại đồng hồ đếm ngược ${refreshed.time_limit_sec || 45}s cho phiên Flash Quiz!`,
      data: buildActiveQuizPayload(refreshed, studentCode, refreshed.time_limit_sec || 45)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/flash-quiz/:id/end - Giảng viên chốt phiên & đồng bộ điểm thưởng vào Sổ điểm (idempotent)
flashQuizRouter.post('/:id/end', (req, res) => {
  try {
    const qId = parseQuizId(req.params.id);
    if (isNaN(qId)) {
      return res.status(400).json({ success: false, message: 'Mã phiên không hợp lệ!' });
    }

    const quiz = db.prepare(`SELECT * FROM flash_quizzes WHERE id = ?`).get(qId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Phiên Flash Quiz không tồn tại!' });
    }

    // Mark quiz as ended
    db.prepare(`UPDATE flash_quizzes SET status = 'ended' WHERE id = ?`).run(qId);

    // Get winning submissions and sync ONLY those not yet credited for this quiz
    const winningSubs = db.prepare(`
      SELECT * FROM flash_quiz_submissions
      WHERE quiz_id = ? AND is_correct = 1 AND bonus_awarded > 0
    `).all(qId);

    let syncedCount = 0;
    winningSubs.forEach(sub => {
      if (syncFlashQuizBonusToGradebook(qId, sub.student_code, sub.bonus_awarded, quiz.class_id)) {
        syncedCount++;
      }
    });

    res.json({
      success: true,
      message: syncedCount > 0
        ? `Đã kết thúc phiên Flash Quiz và đồng bộ điểm thưởng bổ sung cho ${syncedCount} sinh viên vào Sổ điểm quá trình!`
        : 'Đã kết thúc phiên Flash Quiz (điểm thưởng hợp lệ đã được đồng bộ đầy đủ vào Sổ điểm).',
      synced_count: syncedCount,
      syncedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
