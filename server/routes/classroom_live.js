import express from 'express';
import { db } from '../db.js';
import { STUDENTS_K26_A } from '../students_data.js';

export const classroomLiveRouter = express.Router();

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

function resolveStudentName(code, providedName = '') {
  const clean = normalizeStudentCode(code);
  const fromList = STUDENTS_K26_A.find(s => s.code === clean);
  if (fromList?.name) return fromList.name;
  const fromDb = db.prepare('SELECT name FROM users WHERE code = ? LIMIT 1').get(clean);
  if (fromDb?.name) return fromDb.name;
  const cleanProvided = String(providedName || '').trim();
  if (cleanProvided && cleanProvided !== 'Lê Hoàng Bảo') return cleanProvided;
  return `Sinh viên (${clean})`;
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

function awardColdCallBonusToGradebook(studentCode, classId = 'K26 CNTT - Lớp A', bonusDelta = 0.25) {
  const gradeRow = db.prepare(`
    SELECT * FROM gradebook_records
    WHERE student_code = ? AND subject_code = 'IT204' AND class_id = ?
    LIMIT 1
  `).get(studentCode, classId);

  if (!gradeRow) return null;

  const totalSessions = gradeRow.total_sessions || 15;
  const unexcused = Number(gradeRow.unexcused) || 0;
  const excused = Number(gradeRow.excused) || 0;
  const attended = Math.max(0, totalSessions - unexcused - excused);
  const attendanceRate = Math.round((attended / totalSessions) * 1000) / 10;

  let attendanceScore = 10 - (unexcused * 2.0) - (excused * 0.5);
  attendanceScore = Math.max(0, Math.min(10, Math.round(attendanceScore * 10) / 10));

  const labScore = Math.max(0, Math.min(10, Number(gradeRow.lab_score) || 0));
  const midtermScore = Math.max(0, Math.min(10, Number(gradeRow.midterm_score) || 0));
  const nextBonus = Math.max(0, Math.min(2.0, Math.round(((Number(gradeRow.bonus_score) || 0) + bonusDelta) * 100) / 100));

  let finalProcessScore = (attendanceScore * 0.2) + (labScore * 0.3) + (midtermScore * 0.5) + nextBonus;
  finalProcessScore = Math.max(0, Math.min(10, Math.round(finalProcessScore * 10) / 10));

  const { gpa4, letter } = convertToGPA(finalProcessScore);
  let status = 'eligible';
  if (unexcused >= 4 || attendanceRate < 80.0) {
    status = 'banned';
  } else if (unexcused === 3 || finalProcessScore < 4.0) {
    status = 'warning';
  } else if (finalProcessScore >= 8.5 && attendanceScore >= 9.0) {
    status = 'scholarship';
  }

  db.prepare(`
    UPDATE gradebook_records
    SET bonus_score = ?, final_process_score = ?, gpa4 = ?, letter_grade = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextBonus, finalProcessScore, gpa4, letter, status, gradeRow.id);

  return {
    bonusScore: nextBonus,
    finalProcessScore,
    gpa4,
    letterGrade: letter,
    status
  };
}

function formatExitTicketRow(row) {
  return {
    id: row.id,
    sessionCode: row.session_code,
    classId: row.class_id,
    isOpen: Boolean(row.is_open),
    sessionTitle: row.session_title,
    question1: row.question1,
    question2: row.question2,
    ComprehensionQuiz: row.comprehension_quiz,
    quizOptions: safeJsonParse(row.quiz_options_json, []),
    correctOptionIndex: Number(row.correct_option_index || 0),
    responses: safeJsonParse(row.responses_json, []),
    coldCallHistory: safeJsonParse(row.cold_call_history_json, []),
    updatedAt: row.updated_at
  };
}

function formatQaRow(row) {
  return {
    id: row.id,
    sessionCode: row.session_code,
    classId: row.class_id,
    questions: safeJsonParse(row.questions_json, []),
    checkpoint: safeJsonParse(row.checkpoint_json, { topicId: 'CHK-W10', title: '', prompt: '', posts: [] }),
    updatedAt: row.updated_at
  };
}

function formatVirtualRoomRow(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    classId: row.class_id,
    title: row.title,
    hostName: row.host_name,
    isLive: Boolean(row.is_live),
    startedAt: row.started_at,
    jitsiRoomName: row.jitsi_room_name,
    screenSharingActive: Boolean(row.screen_sharing_active),
    activeSlideTitle: row.active_slide_title,
    autoAttendanceMinMinutes: Number(row.auto_attendance_min_minutes || 35),
    participants: safeJsonParse(row.participants_json, []),
    chatMessages: safeJsonParse(row.chat_messages_json, []),
    updatedAt: row.updated_at
  };
}

function getExitTicketRow(classId = 'K26 CNTT - Lớp A') {
  let row = db.prepare('SELECT * FROM exit_ticket_sessions WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId)
    || db.prepare('SELECT * FROM exit_ticket_sessions ORDER BY id DESC LIMIT 1').get();
  if (!row) {
    const code = `EXIT-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO exit_ticket_sessions (
        session_code, class_id, is_open, session_title, question1, question2,
        comprehension_quiz, quiz_options_json, correct_option_index,
        responses_json, cold_call_history_json
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 0, '[]', '[]')
    `).run(
      code,
      classId,
      'Phiếu Xác Nhận Cuối Buổi (Exit Ticket)',
      '1. Khái niệm hoặc thuật toán nào trong buổi học hôm nay bạn nắm vững nhất?',
      '2. Phần kiến thức nào bạn còn thấy mơ hồ, cần Giảng viên giải thích thêm ở đầu buổi sau?',
      'Câu hỏi kiểm tra nhanh kiến thức trọng tâm cuối buổi:',
      JSON.stringify(['Phương án A', 'Phương án B', 'Phương án C'])
    );
    row = db.prepare('SELECT * FROM exit_ticket_sessions WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId);
  }
  return row;
}

function getLiveQaRow(classId = 'K26 CNTT - Lớp A') {
  let row = db.prepare('SELECT * FROM live_qa_sessions WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId)
    || db.prepare('SELECT * FROM live_qa_sessions ORDER BY id DESC LIMIT 1').get();
  if (!row) {
    const code = `QA-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO live_qa_sessions (
        session_code, class_id, questions_json, checkpoint_json
      ) VALUES (?, ?, '[]', ?)
    `).run(
      code,
      classId,
      JSON.stringify({
        topicId: 'CHK-W10',
        title: 'Thảo luận 2 giai đoạn (Post-Before-View)',
        prompt: 'Giảng viên cập nhật câu hỏi thảo luận trọng tâm của buổi học tại đây.',
        posts: []
      })
    );
    row = db.prepare('SELECT * FROM live_qa_sessions WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId);
  }
  return row;
}

function getVirtualRoomRow(classId = 'K26 CNTT - Lớp A') {
  let row = db.prepare('SELECT * FROM virtual_classrooms WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId)
    || db.prepare('SELECT * FROM virtual_classrooms ORDER BY id DESC LIMIT 1').get();
  if (!row) {
    const cleanRoomId = 'EG-CNTT-K26';
    db.prepare(`
      INSERT INTO virtual_classrooms (
        room_id, class_id, title, host_name, is_live, started_at, jitsi_room_name,
        screen_sharing_active, active_slide_title, auto_attendance_min_minutes,
        participants_json, chat_messages_json
      ) VALUES (?, ?, ?, ?, 1, '', ?, 0, ?, 35, '[]', '[]')
    `).run(
      cleanRoomId,
      classId,
      'Phòng Học Trực Tuyến — Lớp CNTT K26',
      'ThS. Phạm Văn Thuận',
      'EGEducation_CNTT_K26_LiveRoom',
      'Bảng trắng & Trình chiếu trực tiếp Lớp CNTT K26'
    );
    row = db.prepare('SELECT * FROM virtual_classrooms WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(classId);
  }
  return row;
}

// =============================================================================
// 1. EXIT TICKETS & COLD CALL PICKER
// =============================================================================

classroomLiveRouter.get('/exit-tickets', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const row = getExitTicketRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Exit Ticket!' });
    }
    res.json({ success: true, ...formatExitTicketRow(row) });
  } catch (err) {
    console.error('[Exit Tickets GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu Exit Ticket & Cold Call!', error: err.message });
  }
});

classroomLiveRouter.post('/exit-tickets/submit', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', studentCode, studentName, ans1, ans2, selectedOption = 0 } = req.body || {};
    if (!ans1 || !String(ans1).trim() || !ans2 || !String(ans2).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ cả 2 câu phản hồi cuối buổi trước khi nộp!' });
    }

    const row = getExitTicketRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Exit Ticket!' });
    }

    const cleanCode = normalizeStudentCode(studentCode);
    const realName = resolveStudentName(cleanCode, studentName);
    const responses = safeJsonParse(row.responses_json, []);

    const entry = {
      studentCode: cleanCode,
      studentName: realName,
      ans1: String(ans1).trim(),
      ans2: String(ans2).trim(),
      quizCorrect: Number(selectedOption) === Number(row.correct_option_index),
      submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      checkoutStatus: 'VALID_CHECKOUT'
    };

    const existingIdx = responses.findIndex(r => r.studentCode === cleanCode);
    if (existingIdx >= 0) {
      responses[existingIdx] = entry;
    } else {
      responses.unshift(entry);
    }

    db.prepare(`
      UPDATE exit_ticket_sessions
      SET responses_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(responses), row.id);

    const updated = db.prepare('SELECT * FROM exit_ticket_sessions WHERE id = ?').get(row.id);
    const formatted = formatExitTicketRow(updated);
    res.json({
      success: true,
      message: 'Đã nộp Phiếu xác nhận cuối buổi & hoàn tất điểm danh ra về!',
      entry,
      ...formatted,
      exitData: formatted
    });
  } catch (err) {
    console.error('[Exit Tickets Submit Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi nộp Exit Ticket!', error: err.message });
  }
});

classroomLiveRouter.post('/exit-tickets/cold-call', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    const requestedCode = req.body?.studentCode ? normalizeStudentCode(req.body.studentCode) : null;

    const row = getExitTicketRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Exit Ticket!' });
    }

    const history = safeJsonParse(row.cold_call_history_json, []);
    const classStudents = STUDENTS_K26_A;

    let pickedStudent = null;
    if (requestedCode) {
      pickedStudent = classStudents.find(s => s.code === requestedCode) || {
        code: requestedCode,
        name: resolveStudentName(requestedCode)
      };
    } else {
      const bannedRows = db.prepare("SELECT student_code FROM gradebook_records WHERE class_id = ? AND status = 'banned'").all(classId);
      const bannedSet = new Set(bannedRows.map(r => r.student_code));
      const calledSet = new Set(history.map(h => h.studentCode));

      let pool = classStudents.filter(s => !bannedSet.has(s.code) && !calledSet.has(s.code));
      if (pool.length === 0) {
        pool = classStudents.filter(s => !bannedSet.has(s.code));
      }
      if (pool.length === 0) pool = classStudents;
      pickedStudent = pool[Math.floor(Math.random() * pool.length)];
    }

    const entry = {
      studentCode: pickedStudent.code,
      studentName: pickedStudent.name,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      bonus: '+0.25đ'
    };

    const nextHistory = [entry, ...history].slice(0, 30);
    db.prepare(`
      UPDATE exit_ticket_sessions
      SET cold_call_history_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(nextHistory), row.id);

    const gradeUpdate = awardColdCallBonusToGradebook(pickedStudent.code, classId, 0.25);
    const updated = db.prepare('SELECT * FROM exit_ticket_sessions WHERE id = ?').get(row.id);
    const formatted = formatExitTicketRow(updated);

    res.json({
      success: true,
      message: `Vòng quay có trọng số đã chọn SV: ${pickedStudent.name} (${pickedStudent.code}) (+0.25đ)!`,
      chosen: {
        code: pickedStudent.code,
        studentCode: pickedStudent.code,
        name: pickedStudent.name,
        studentName: pickedStudent.name,
        fullName: pickedStudent.name
      },
      entry,
      bonusAwarded: 0.25,
      gradeUpdate,
      ...formatted,
      exitData: formatted
    });
  } catch (err) {
    console.error('[Cold Call Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi thực hiện quay chọn sinh viên!', error: err.message });
  }
});

classroomLiveRouter.post('/exit-tickets/reset', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    const row = getExitTicketRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Exit Ticket!' });
    }
    db.prepare(`
      UPDATE exit_ticket_sessions
      SET responses_json = '[]', cold_call_history_json = '[]', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(row.id);

    const updated = db.prepare('SELECT * FROM exit_ticket_sessions WHERE id = ?').get(row.id);
    const formatted = formatExitTicketRow(updated);
    res.json({
      success: true,
      message: 'Đã làm mới lịch sử vòng quay và phiếu kiểm tra hiểu bài!',
      ...formatted,
      exitData: formatted
    });
  } catch (err) {
    console.error('[Reset Exit Ticket Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi làm mới dữ liệu vòng quay & phiếu kiểm tra!', error: err.message });
  }
});

// =============================================================================
// 2. LIVE Q&A UPVOTE & DISCUSSION CHECKPOINTS
// =============================================================================

classroomLiveRouter.get('/qa-checkpoints', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Q&A!' });
    }
    res.json({ success: true, ...formatQaRow(row) });
  } catch (err) {
    console.error('[Live QA GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu Hỏi đáp & Thảo luận!', error: err.message });
  }
});

classroomLiveRouter.post('/qa-checkpoints/questions', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', studentCode, text, isAnonymous = true } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung câu hỏi!' });
    }

    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Q&A!' });
    }

    const cleanCode = normalizeStudentCode(studentCode);
    const realName = resolveStudentName(cleanCode);
    const questions = safeJsonParse(row.questions_json, []);

    const newQuestion = {
      id: `QA-${Date.now().toString().slice(-4)}`,
      authorName: isAnonymous ? `Sinh viên Ẩn danh #${Math.floor(100 + Math.random() * 899)}` : realName,
      studentCode: cleanCode,
      isAnonymous: Boolean(isAnonymous),
      question: String(text).trim(),
      upvotes: 1,
      upvotedBy: [cleanCode],
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isAnswered: false,
      teacherReply: null
    };

    questions.unshift(newQuestion);
    db.prepare('UPDATE live_qa_sessions SET questions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(questions), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.status(201).json({
      success: true,
      message: 'Đã gửi câu hỏi ẩn danh lên bảng Q&A giảng đường!',
      question: newQuestion,
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Live QA Ask Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi câu hỏi Q&A!', error: err.message });
  }
});

classroomLiveRouter.post('/qa-checkpoints/questions/:questionId/upvote', (req, res) => {
  try {
    const { questionId } = req.params;
    const { classId = 'K26 CNTT - Lớp A', studentCode } = req.body || {};
    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Q&A!' });
    }

    const cleanCode = normalizeStudentCode(studentCode);
    const questions = safeJsonParse(row.questions_json, []);
    let targetQ = null;

    const updatedQuestions = questions
      .map(q => {
        if (q.id !== questionId) return q;
        const list = Array.isArray(q.upvotedBy) ? q.upvotedBy : [];
        const already = list.includes(cleanCode);
        const upvotedBy = already ? list.filter(c => c !== cleanCode) : [...list, cleanCode];
        const upvotes = Math.max(0, Number(q.upvotes || 0) + (already ? -1 : 1));
        targetQ = { ...q, upvotes, upvotedBy };
        return targetQ;
      })
      .sort((a, b) => Number(b.upvotes || 0) - Number(a.upvotes || 0));

    if (!targetQ) {
      return res.status(404).json({ success: false, message: `Không tìm thấy câu hỏi ${questionId}!` });
    }

    db.prepare('UPDATE live_qa_sessions SET questions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(updatedQuestions), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.json({
      success: true,
      question: targetQ,
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Live QA Upvote Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi bình chọn câu hỏi!', error: err.message });
  }
});

classroomLiveRouter.post('/qa-checkpoints/questions/:questionId/reply', (req, res) => {
  try {
    const { questionId } = req.params;
    const { classId = 'K26 CNTT - Lớp A', replyText } = req.body || {};
    if (!replyText || !String(replyText).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung giải đáp của Giảng viên!' });
    }

    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Q&A!' });
    }

    const questions = safeJsonParse(row.questions_json, []);
    let targetQ = null;
    const updatedQuestions = questions.map(q => {
      if (q.id !== questionId) return q;
      targetQ = { ...q, isAnswered: true, teacherReply: String(replyText).trim() };
      return targetQ;
    });

    if (!targetQ) {
      return res.status(404).json({ success: false, message: `Không tìm thấy câu hỏi ${questionId}!` });
    }

    db.prepare('UPDATE live_qa_sessions SET questions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(updatedQuestions), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.json({
      success: true,
      message: 'Đã đăng phản hồi chính thức cho câu hỏi!',
      question: targetQ,
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Live QA Reply Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi phản hồi câu hỏi!', error: err.message });
  }
});

classroomLiveRouter.delete('/qa-checkpoints/questions/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const classId = req.query.classId || req.body?.classId || 'K26 CNTT - Lớp A';
    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên Q&A!' });
    }

    const questions = safeJsonParse(row.questions_json, []);
    const exists = questions.some(q => q.id === questionId);
    if (!exists) {
      return res.status(404).json({ success: false, message: `Không tìm thấy câu hỏi ${questionId}!` });
    }

    const updatedQuestions = questions.filter(q => q.id !== questionId);
    db.prepare('UPDATE live_qa_sessions SET questions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(updatedQuestions), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.json({
      success: true,
      message: 'Đã xóa câu hỏi khỏi bảng Q&A!',
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Live QA Delete Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi xóa câu hỏi Q&A!', error: err.message });
  }
});

classroomLiveRouter.put('/qa-checkpoints/checkpoint', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', title, prompt } = req.body || {};
    if (!title || !String(title).trim() || !prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung câu hỏi thảo luận!' });
    }

    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thảo luận!' });
    }

    const currentCheckpoint = safeJsonParse(row.checkpoint_json, { topicId: 'CHK-W10', title: '', prompt: '', posts: [] });
    const nextCheckpoint = {
      ...currentCheckpoint,
      title: String(title).trim(),
      prompt: String(prompt).trim()
    };

    db.prepare('UPDATE live_qa_sessions SET checkpoint_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(nextCheckpoint), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.json({
      success: true,
      message: 'Đã cập nhật chủ đề Điểm dừng Thảo luận!',
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Live QA Checkpoint Update Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm dừng thảo luận!', error: err.message });
  }
});

classroomLiveRouter.post('/qa-checkpoints/checkpoint-posts', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', studentCode, studentName, content } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lập luận thảo luận trước khi mở khóa!' });
    }

    const row = getLiveQaRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thảo luận!' });
    }

    const cleanCode = normalizeStudentCode(studentCode);
    const realName = resolveStudentName(cleanCode, studentName);
    const checkpoint = safeJsonParse(row.checkpoint_json, { topicId: 'CHK-W10', title: '', prompt: '', posts: [] });

    const newPost = {
      id: `POST-${Date.now().toString().slice(-4)}`,
      studentCode: cleanCode,
      studentName: realName,
      content: String(content).trim(),
      postedAt: 'Vừa xong',
      likes: 1
    };

    checkpoint.posts = [newPost, ...(Array.isArray(checkpoint.posts) ? checkpoint.posts : [])];
    db.prepare('UPDATE live_qa_sessions SET checkpoint_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(checkpoint), row.id);

    const updated = db.prepare('SELECT * FROM live_qa_sessions WHERE id = ?').get(row.id);
    res.status(201).json({
      success: true,
      message: 'Đã đăng bài thảo luận & mở khóa câu trả lời của cả lớp!',
      post: newPost,
      ...formatQaRow(updated)
    });
  } catch (err) {
    console.error('[Checkpoint Post Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi đăng bài thảo luận!', error: err.message });
  }
});

// =============================================================================
// 3. VIRTUAL CLASSROOM HUB
// =============================================================================

classroomLiveRouter.get('/virtual-room', (req, res) => {
  try {
    const classId = req.query.classId || 'K26 CNTT - Lớp A';
    const row = getVirtualRoomRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học trực tuyến!' });
    }
    const formatted = formatVirtualRoomRow(row);
    res.json({ success: true, ...formatted, room: formatted });
  } catch (err) {
    console.error('[Virtual Room GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải thông tin phòng học trực tuyến!', error: err.message });
  }
});

classroomLiveRouter.post('/virtual-room/join', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', role = 'student', studentCode, cameraOn = true, micOn = false } = req.body || {};
    const row = getVirtualRoomRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học trực tuyến!' });
    }

    const participants = safeJsonParse(row.participants_json, []);
    let updatedParticipants = participants;

    if (role !== 'teacher') {
      const cleanCode = normalizeStudentCode(studentCode);
      const realName = resolveStudentName(cleanCode);
      const exists = participants.find((p) => p.studentCode === cleanCode);
      if (exists) {
        updatedParticipants = participants.map((p) =>
          p.studentCode === cleanCode
            ? { ...p, camOn: Boolean(cameraOn), micOn: Boolean(micOn) }
            : p
        );
      } else {
        updatedParticipants = [
          ...participants,
          {
            studentCode: cleanCode,
            studentName: realName,
            joinedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            durationMin: 1,
            micOn: Boolean(micOn),
            camOn: Boolean(cameraOn),
            handRaised: false,
            autoAttended: false
          }
        ];
      }
    }

    const startedAt = row.started_at || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    db.prepare(`
      UPDATE virtual_classrooms
      SET is_live = 1, started_at = ?, participants_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(startedAt, JSON.stringify(updatedParticipants), row.id);

    const updated = db.prepare('SELECT * FROM virtual_classrooms WHERE id = ?').get(row.id);
    const formatted = formatVirtualRoomRow(updated);
    res.json({
      success: true,
      message: role === 'teacher' ? 'Đã mở phòng học trực tuyến thành công!' : 'Đã tham gia phòng học trực tuyến!',
      ...formatted,
      room: formatted
    });
  } catch (err) {
    console.error('[Virtual Room Join Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tham gia phòng học trực tuyến!', error: err.message });
  }
});

classroomLiveRouter.post('/virtual-room/chat', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', sender, studentCode, role = 'student', text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung tin nhắn!' });
    }

    const row = getVirtualRoomRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học trực tuyến!' });
    }

    const cleanCode = role === 'teacher' ? 'GV001' : normalizeStudentCode(studentCode);
    const senderLabel = role === 'teacher'
      ? (sender || 'ThS. Phạm Văn Thuận (GV)')
      : `${resolveStudentName(cleanCode, sender)} (SV)`;

    const chatMessages = safeJsonParse(row.chat_messages_json, []);
    const messageItem = {
      id: Date.now(),
      sender: senderLabel,
      studentCode: cleanCode,
      role,
      text: String(text).trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    chatMessages.push(messageItem);

    db.prepare('UPDATE virtual_classrooms SET chat_messages_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(chatMessages), row.id);

    const updated = db.prepare('SELECT * FROM virtual_classrooms WHERE id = ?').get(row.id);
    const formatted = formatVirtualRoomRow(updated);
    res.status(201).json({
      success: true,
      messageItem,
      ...formatted,
      room: formatted
    });
  } catch (err) {
    console.error('[Virtual Room Chat Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn phòng học!', error: err.message });
  }
});

classroomLiveRouter.post('/virtual-room/raise-hand', (req, res) => {
  try {
    const { classId = 'K26 CNTT - Lớp A', studentCode } = req.body || {};
    const row = getVirtualRoomRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học trực tuyến!' });
    }

    const cleanCode = normalizeStudentCode(studentCode);
    const realName = resolveStudentName(cleanCode);
    const participants = safeJsonParse(row.participants_json, []);

    let found = false;
    let currentRaised = false;
    const updatedParticipants = participants.map(p => {
      if (p.studentCode !== cleanCode) return p;
      found = true;
      currentRaised = !p.handRaised;
      return { ...p, handRaised: currentRaised };
    });

    if (!found) {
      currentRaised = true;
      updatedParticipants.push({
        studentCode: cleanCode,
        studentName: realName,
        joinedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        durationMin: Number(row.auto_attendance_min_minutes || 35),
        micOn: false,
        camOn: true,
        handRaised: true,
        autoAttended: true
      });
    }

    db.prepare('UPDATE virtual_classrooms SET participants_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(updatedParticipants), row.id);

    const updated = db.prepare('SELECT * FROM virtual_classrooms WHERE id = ?').get(row.id);
    const formatted = formatVirtualRoomRow(updated);
    res.json({
      success: true,
      studentCode: cleanCode,
      handRaised: currentRaised,
      message: currentRaised
        ? 'Đã gửi tín hiệu Giơ tay phát biểu lên màn hình Giảng viên!'
        : 'Đã hạ tay phát biểu.',
      ...formatted,
      room: formatted
    });
  } catch (err) {
    console.error('[Virtual Room Raise Hand Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái giơ tay!', error: err.message });
  }
});

classroomLiveRouter.post('/virtual-room/sync-attendance', (req, res) => {
  try {
    const classId = req.body?.classId || 'K26 CNTT - Lớp A';
    const row = getVirtualRoomRow(classId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học trực tuyến!' });
    }

    const minMinutes = Number(row.auto_attendance_min_minutes || 35);
    const participants = safeJsonParse(row.participants_json, []).map(p => ({
      ...p,
      autoAttended: Number(p.durationMin || 0) >= minMinutes
    }));

    db.prepare('UPDATE virtual_classrooms SET participants_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(participants), row.id);

    const totalCount = db.prepare("SELECT COUNT(*) as cnt FROM gradebook_records WHERE class_id = ?").get(classId)?.cnt || 88;
    const attendedCount = participants.filter(p => p.autoAttended).length;

    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('teacher', 'attendance', 'Đã chốt điểm danh Phòng học Trực tuyến', ?, 'attendance', 'normal')
      `).run(`Hệ thống đã đối soát thời lượng học trực tuyến ≥ ${minMinutes} phút và ghi nhận ${attendedCount}/${totalCount} sinh viên đủ chuẩn chuyên cần.`);
    } catch (notifErr) {
      console.warn('[Virtual Attendance Notification Error]', notifErr.message);
    }

    const updated = db.prepare('SELECT * FROM virtual_classrooms WHERE id = ?').get(row.id);
    const formatted = formatVirtualRoomRow(updated);
    res.json({
      success: true,
      attendedCount,
      totalCount,
      message: `Đã tự động điểm danh ${attendedCount}/${totalCount} sinh viên có thời lượng học trực tuyến ≥ ${minMinutes} phút vào Sổ điểm!`,
      ...formatted,
      room: formatted
    });
  } catch (err) {
    console.error('[Virtual Room Sync Attendance Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi đồng bộ điểm danh phòng học trực tuyến!', error: err.message });
  }
});
