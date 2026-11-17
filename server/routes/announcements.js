import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';
import { aiService } from '../services/aiService.js';
import { PDFParse } from 'pdf-parse';

export const announcementsRouter = express.Router();

// Middleware: Optional auth helper for public utilities (e.g. AI file parsing in classroom)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { id: 1, role: 'teacher', name: 'ThS. Phạm Văn Thuận' };
    return next();
  }
  // Try authenticating if token exists
  authenticateToken(req, res, (err) => {
    if (err) {
      req.user = { id: 1, role: 'teacher', name: 'ThS. Phạm Văn Thuận' };
    }
    next();
  });
};

// 0. POST /api/announcements/analyze-ai (AI analyzes raw dispatch text)
announcementsRouter.post('/analyze-ai', optionalAuth, async (req, res) => {
  try {
    const { content, raw_text, api_key } = req.body;
    const textToAnalyze = content || raw_text;
    if (!textToAnalyze || !textToAnalyze.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung văn bản công văn!' });
    }

    const analysis = await aiService.analyzeDispatch(textToAnalyze, { apiKey: api_key });
    res.json({
      success: true,
      analysis
    });
  } catch (err) {
    console.error('[AI Dispatch Analysis Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi phân tích công văn bằng AI!', error: err.message });
  }
});

// 0.1 POST /api/announcements/analyze-file (Extract text from uploaded PDF/Doc file and run AI analysis)
announcementsRouter.post('/analyze-file', optionalAuth, async (req, res) => {
  try {
    const { file_name, file_base64, file_text, api_key } = req.body;
    let textToAnalyze = file_text || '';

    if (!textToAnalyze && file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      const isPdf = !file_name || file_name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        try {
          const parser = new PDFParse({ data: buffer });
          const parsed = await parser.getText();
          textToAnalyze = parsed.text;
        } catch (pdfErr) {
          console.warn('[PDF Parse Warning]', pdfErr.message);
          textToAnalyze = buffer.toString('utf8');
        }
      } else {
        textToAnalyze = buffer.toString('utf8');
      }
    }

    if (!textToAnalyze || !textToAnalyze.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể trích xuất nội dung văn bản từ tập tin tải lên. Vui lòng kiểm tra lại file!' 
      });
    }

    const analysis = await aiService.analyzeDispatch(textToAnalyze, { fileName: file_name, apiKey: api_key });
    res.json({
      success: true,
      fileName: file_name || 'Cong_van_dinh_kem.pdf',
      extractedText: textToAnalyze,
      analysis
    });
  } catch (err) {
    console.error('[AI File Analysis Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi phân tích tập tin công văn: ' + err.message });
  }
});

// 1. GET /api/announcements (List announcements with live poll counts)
announcementsRouter.get('/', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();

    const result = announcements.map(ann => {
      let aiSummary = null;
      try { aiSummary = JSON.parse(ann.ai_summary_json); } catch {}

      // Get options
      const options = db.prepare('SELECT option_index, option_text FROM poll_options WHERE announcement_id = ? ORDER BY option_index ASC').all(ann.id);

      // Get vote counts per option
      const votes = db.prepare('SELECT option_index, student_id, student_name, student_code, voted_at FROM poll_votes WHERE announcement_id = ?').all(ann.id);

      const optionsWithVotes = options.map(opt => {
        const optVotes = votes.filter(v => v.option_index === opt.option_index);
        return {
          id: `opt_${opt.option_index + 1}`,
          optionIndex: opt.option_index,
          text: opt.option_text,
          votes: optVotes.length,
          percentage: votes.length > 0 ? Math.round((optVotes.length / votes.length) * 100) : 0
        };
      });

      // Check if current user voted
      const myVote = votes.find(v => v.student_id === userId);

      const votesList = votes.map(v => ({
        studentCode: v.student_code,
        studentName: v.student_name,
        studentEmail: '',
        optionId: `opt_${v.option_index + 1}`,
        optionIndex: v.option_index,
        votedAt: v.voted_at || new Date().toLocaleString('vi-VN')
      }));

      const badgeColor = ann.urgency === 'urgent' || ann.urgency === 'emergency'
        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
        : (ann.urgency === 'important'
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
          : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30');

      return {
        id: ann.announcement_code,
        dbId: ann.id,
        title: ann.title,
        author: ann.author_name,
        authorRole: ann.author_role,
        targetClass: ann.target_class,
        subject: ann.subject,
        urgency: ann.urgency,
        urgencyLabel: ann.urgency_label,
        badgeColor,
        deadline: ann.deadline,
        rawText: ann.raw_text,
        aiSummary,
        hasPoll: !!ann.has_poll,
        createdAt: ann.created_at,
        poll: ann.has_poll ? {
          id: `POLL-${ann.id}`,
          question: aiSummary?.poll?.question || ann.title,
          totalVotes: votes.length,
          totalStudents: 50,
          hasVoted: !!myVote,
          userChoice: myVote ? `opt_${myVote.option_index + 1}` : null,
          options: optionsWithVotes,
          votesList: votesList
        } : null
      };
    });

    res.json({ success: true, announcements: result });
  } catch (err) {
    console.error('[Announcements GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách công văn & khảo sát!', error: err.message });
  }
});

// 2. POST /api/announcements (Create new announcement + poll)
announcementsRouter.post('/', optionalAuth, (req, res) => {
  try {
    const author = req.user;
    const { 
      title, 
      target_class, 
      subject, 
      urgency, 
      urgency_label, 
      deadline, 
      raw_text, 
      ai_summary, 
      source_file_name = null,
      options = [],
      has_poll = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề thông báo!' });
    }

    const pollEnabled = has_poll && Array.isArray(options) && options.length >= 2;

    const annCode = 'ANN-2026-' + Math.floor(100 + Math.random() * 900);

    const mergedSummary = {
      ...(ai_summary || {}),
      sourceFileName: source_file_name || ai_summary?.sourceFileName || null
    };

    const insert = db.prepare(`
      INSERT INTO announcements (
        announcement_code, title, author_id, author_name, author_role, target_class, subject, urgency, urgency_label, deadline, raw_text, ai_summary_json, has_poll
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      annCode,
      title,
      author.id,
      author.name,
      author.role === 'teacher' ? 'teacher' : 'cadre',
      target_class || 'K26 CNTT - Lớp A',
      subject || 'Cấu trúc dữ liệu & GT',
      urgency || 'normal',
      urgency_label || 'THÔNG BÁO',
      deadline || '23:59 hôm nay',
      raw_text || '',
      JSON.stringify(mergedSummary),
      pollEnabled ? 1 : 0
    );

    const annId = Number(insert.lastInsertRowid);

    // Insert options if poll enabled
    if (pollEnabled) {
      const insertOpt = db.prepare('INSERT INTO poll_options (announcement_id, option_index, option_text) VALUES (?, ?, ?)');
      options.forEach((optText, idx) => {
        insertOpt.run(annId, idx, typeof optText === 'string' ? optText : (optText.text || `Lựa chọn ${idx + 1}`));
      });
    }

    // Notify all students
    try {
      db.prepare(`
        INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
        VALUES ('student', 'poll', ?, ?, 'polls', ?)
      `).run(
        pollEnabled ? `Khảo sát biểu quyết mới: ${title}` : `Công văn thông báo mới: ${title}`,
        `${author.name} vừa ban hành: "${title}". ${pollEnabled ? `Hạn chót bình chọn: ${deadline || '23:59'}.` : 'Xem chi tiết trong mục Thông báo.'}`,
        urgency === 'urgent' ? 'urgent' : 'high'
      );
    } catch (notifErr) {
      console.warn('[Notification Error]', notifErr.message);
    }

    res.json({
      success: true,
      message: pollEnabled 
        ? 'Đã phát hành công văn & kích hoạt cuộc bình chọn lớp học thành công!'
        : 'Đã phát hành thông báo đến sinh viên thành công!',
      announcementCode: annCode,
      id: annId
    });
  } catch (err) {
    console.error('[Create Announcement Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi phát hành thông báo!', error: err.message });
  }
});

// 3. POST /api/announcements/:id/vote (Student votes)
announcementsRouter.post('/:id/vote', optionalAuth, (req, res) => {
  try {
    const student = req.user;
    let { option_index } = req.body;
    const annIdentifier = req.params.id;

    // Parse option_index if string like "opt_1" or "0"
    if (typeof option_index === 'string') {
      const match = option_index.match(/[0-9]+/);
      option_index = match ? (option_index.startsWith('opt_') ? parseInt(match[0]) - 1 : parseInt(match[0])) : 0;
    }
    option_index = Number(option_index) || 0;

    // Find announcement by code or id
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ? OR announcement_code = ?').get(annIdentifier, annIdentifier);
    if (!ann) {
      return res.status(404).json({ success: false, message: 'Cuộc khảo sát không tồn tại!' });
    }

    // Check option validity
    const opt = db.prepare('SELECT * FROM poll_options WHERE announcement_id = ? AND option_index = ?').get(ann.id, option_index);
    if (!opt) {
      return res.status(400).json({ success: false, message: 'Phương án bình chọn không hợp lệ!' });
    }

    // Check existing vote (Update if exists, or insert)
    const existingVote = db.prepare('SELECT * FROM poll_votes WHERE announcement_id = ? AND student_id = ?').get(ann.id, student.id);
    if (existingVote) {
      db.prepare(`
        UPDATE poll_votes
        SET option_index = ?, voted_at = CURRENT_TIMESTAMP
        WHERE announcement_id = ? AND student_id = ?
      `).run(option_index, ann.id, student.id);
    } else {
      db.prepare(`
        INSERT INTO poll_votes (announcement_id, option_index, student_id, student_name, student_code)
        VALUES (?, ?, ?, ?, ?)
      `).run(ann.id, option_index, student.id, student.name, student.code);
    }

    // Get updated counts
    const allVotes = db.prepare('SELECT option_index, student_id, student_name, student_code, voted_at FROM poll_votes WHERE announcement_id = ?').all(ann.id);
    const options = db.prepare('SELECT option_index, option_text FROM poll_options WHERE announcement_id = ? ORDER BY option_index ASC').all(ann.id);

    const updatedOptions = options.map(o => {
      const count = allVotes.filter(v => v.option_index === o.option_index).length;
      return {
        id: `opt_${o.option_index + 1}`,
        optionIndex: o.option_index,
        text: o.option_text,
        votes: count,
        percentage: allVotes.length > 0 ? Math.round((count / allVotes.length) * 100) : 0
      };
    });

    const votesList = allVotes.map(v => ({
      studentCode: v.student_code,
      studentName: v.student_name,
      studentEmail: '',
      optionId: `opt_${v.option_index + 1}`,
      optionIndex: v.option_index,
      votedAt: v.voted_at || new Date().toLocaleString('vi-VN')
    }));

    res.json({
      success: true,
      message: existingVote 
        ? `Đã cập nhật phương án biểu quyết mới của ${student.name}!` 
        : `Đã ghi nhận phiếu biểu quyết của ${student.name} thành công!`,
      poll: {
        totalVotes: allVotes.length,
        totalStudents: 50,
        hasVoted: true,
        userChoice: `opt_${option_index + 1}`,
        options: updatedOptions,
        votesList: votesList
      }
    });
  } catch (err) {
    console.error('[Vote Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận phiếu biểu quyết!', error: err.message });
  }
});

// 4. GET /api/announcements/:id/report (Full report of 50 students for Excel/PDF)
announcementsRouter.get('/:id/report', optionalAuth, (req, res) => {
  try {
    const annIdentifier = req.params.id;
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ? OR announcement_code = ?').get(annIdentifier, annIdentifier);
    if (!ann) {
      return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại!' });
    }

    const options = db.prepare('SELECT option_index, option_text FROM poll_options WHERE announcement_id = ? ORDER BY option_index ASC').all(ann.id);
    const votes = db.prepare('SELECT * FROM poll_votes WHERE announcement_id = ?').all(ann.id);
    const allStudents = db.prepare("SELECT id, name, code, class_id FROM users WHERE role = 'student' ORDER BY code ASC").all();

    const studentReport = allStudents.map((stu, idx) => {
      const vote = votes.find(v => v.student_id === stu.id);
      const chosenOpt = vote ? options.find(o => o.option_index === vote.option_index) : null;
      return {
        stt: idx + 1,
        studentCode: stu.code,
        studentName: stu.name,
        classId: stu.class_id || 'K26 CNTT - Lớp A',
        status: vote ? 'Đã biểu quyết' : 'Chưa phản hồi',
        choice: chosenOpt ? chosenOpt.option_text : '—',
        choiceIndex: vote ? vote.option_index : null,
        votedAt: vote ? vote.voted_at : '—'
      };
    });

    const summaryStats = options.map(opt => {
      const count = votes.filter(v => v.option_index === opt.option_index).length;
      return {
        optionIndex: opt.option_index,
        optionText: opt.option_text,
        votes: count,
        percentage: votes.length > 0 ? ((count / votes.length) * 100).toFixed(1) : '0.0'
      };
    });

    res.json({
      success: true,
      announcement: ann,
      summaryStats,
      totalStudents: allStudents.length,
      votedCount: votes.length,
      pendingCount: allStudents.length - votes.length,
      responseRate: allStudents.length > 0 ? Math.round((votes.length / allStudents.length) * 100) : 0,
      students: studentReport
    });
  } catch (err) {
    console.error('[Report Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi xuất dữ liệu báo cáo!', error: err.message });
  }
});
