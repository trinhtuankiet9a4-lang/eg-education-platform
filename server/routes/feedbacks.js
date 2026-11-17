import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';

export const feedbackRouter = express.Router();

// 1. GET /api/feedbacks
feedbackRouter.get('/', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const { status, category, search } = req.query;

    let query = 'SELECT * FROM feedbacks';
    const params = [];
    const conditions = [];

    if (user.role === 'student') {
      conditions.push('student_id = ?');
      params.push(user.id);
    }

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(student_name) LIKE ? OR LOWER(student_code) LIKE ?)');
      params.push(term, term, term, term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const list = db.prepare(query).all(...params);

    const formatted = list.map(f => {
      let priorityBadge = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';
      if (f.priority === 'urgent') priorityBadge = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      else if (f.priority === 'high') priorityBadge = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';

      return {
        id: f.feedback_code,
        dbId: f.id,
        studentId: f.student_id,
        studentName: f.student_name,
        studentCode: f.student_code,
        studentClass: f.student_class,
        targetTeacherName: f.target_teacher_name,
        category: f.category,
        categoryLabel: f.category_label,
        priority: f.priority,
        priorityLabel: f.priority_label,
        priorityBadge,
        title: f.title,
        content: f.content,
        isAnonymous: !!f.is_anonymous,
        status: f.status,
        createdAt: f.created_at,
        reply: f.reply_content ? {
          content: f.reply_content,
          repliedAt: f.replied_at,
          teacherName: f.reply_teacher_name
        } : null,
        studentRating: f.student_rating,
        studentRatingFeedback: f.student_rating_feedback
      };
    });

    const pendingCount = formatted.filter(f => f.status === 'pending').length;
    const resolvedCount = formatted.filter(f => f.status === 'resolved').length;

    res.json({
      success: true,
      feedbacks: formatted,
      stats: {
        total: formatted.length,
        pendingCount,
        resolvedCount
      }
    });
  } catch (err) {
    console.error('[Feedback GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách phản hồi!', error: err.message });
  }
});

// 2. POST /api/feedbacks (Student submits feedback)
feedbackRouter.post('/', authenticateToken, (req, res) => {
  try {
    const student = req.user;
    const { target_teacher_name, category, category_label, priority, priority_label, title, content, is_anonymous } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi!' });
    }

    const fbCode = 'FB-2026-' + Math.floor(100 + Math.random() * 900);

    const insert = db.prepare(`
      INSERT INTO feedbacks (
        feedback_code, student_id, student_name, student_code, student_class, target_teacher_name, category, category_label, priority, priority_label, title, content, is_anonymous, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      fbCode,
      student.id,
      student.name,
      student.code,
      student.classId || 'K26 CNTT - Lớp A',
      target_teacher_name || 'ThS. Phạm Văn Thuận',
      category || 'general',
      category_label || 'Ý kiến chung',
      priority || 'normal',
      priority_label || 'Bình thường',
      title,
      content,
      is_anonymous ? 1 : 0
    );

    const created = db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(insert.lastInsertRowid);

    // Notify teacher
    db.prepare(`
      INSERT INTO notifications (target_role, type, title, description, target_tab, priority)
      VALUES ('teacher', 'feedback', ?, ?, 'feedback', ?)
    `).run(
      `Ý kiến phản hồi mới: "${title.slice(0, 40)}..."`,
      `${is_anonymous ? 'Một sinh viên ẩn danh' : student.name} vừa gửi câu hỏi tới bạn. Phân loại: ${category_label || 'Ý kiến chung'}.`,
      priority === 'urgent' ? 'urgent' : 'high'
    );

    res.json({
      success: true,
      message: 'Ý kiến phản hồi của bạn đã được chuyển tới Giảng viên hướng dẫn thành công!',
      feedback: created
    });
  } catch (err) {
    console.error('[Feedback Submit Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi phản hồi!', error: err.message });
  }
});

// 3. POST /api/feedbacks/:id/reply (Teacher replies)
feedbackRouter.post('/:id/reply', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Chỉ giảng viên mới có quyền trả lời phản hồi!' });
    }

    const { reply_content } = req.body;
    if (!reply_content || !reply_content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung câu trả lời không được để trống!' });
    }

    const fbIdentifier = req.params.id;
    const fb = db.prepare('SELECT * FROM feedbacks WHERE id = ? OR feedback_code = ?').get(fbIdentifier, fbIdentifier);
    if (!fb) {
      return res.status(404).json({ success: false, message: 'Phản hồi không tồn tại!' });
    }

    const nowStr = new Date().toLocaleString('vi-VN', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    db.prepare(`
      UPDATE feedbacks 
      SET status = 'resolved', reply_content = ?, replied_at = ?, reply_teacher_name = ?
      WHERE id = ?
    `).run(reply_content.trim(), nowStr, req.user.name, fb.id);

    // Notify student
    db.prepare(`
      INSERT INTO notifications (target_role, target_user_id, type, title, description, target_tab, priority)
      VALUES ('student', ?, 'feedback', 'Giảng viên đã giải đáp phản hồi của bạn', ?, 'feedback', 'high')
    `).run(
      fb.student_id,
      `Thầy ${req.user.name} đã giải đáp câu hỏi "${fb.title.slice(0, 35)}...". Bấm để xem chi tiết và đánh giá sao.`
    );

    const updated = db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(fb.id);

    res.json({
      success: true,
      message: 'Đã gửi câu trả lời và thông báo tới sinh viên thành công!',
      feedback: updated
    });
  } catch (err) {
    console.error('[Feedback Reply Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi câu trả lời!', error: err.message });
  }
});

// 4. POST /api/feedbacks/:id/rate (Student rates reply)
feedbackRouter.post('/:id/rate', authenticateToken, (req, res) => {
  try {
    const { rating, feedback_comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao!' });
    }

    const fbIdentifier = req.params.id;
    const fb = db.prepare('SELECT * FROM feedbacks WHERE id = ? OR feedback_code = ?').get(fbIdentifier, fbIdentifier);
    if (!fb) {
      return res.status(404).json({ success: false, message: 'Phản hồi không tồn tại!' });
    }

    db.prepare(`
      UPDATE feedbacks 
      SET student_rating = ?, student_rating_feedback = ?
      WHERE id = ?
    `).run(rating, feedback_comment || null, fb.id);

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá chất lượng giải đáp của Giảng viên!'
    });
  } catch (err) {
    console.error('[Feedback Rate Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi lưu đánh giá!', error: err.message });
  }
});
