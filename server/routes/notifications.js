import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from './auth.js';

export const notificationsRouter = express.Router();

// 1. GET /api/notifications
notificationsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const list = db.prepare(`
      SELECT * FROM notifications 
      WHERE (target_role = ? OR target_role = 'all')
        AND (target_user_id IS NULL OR target_user_id = ?)
      ORDER BY created_at DESC
      LIMIT 50
    `).all(user.role, user.id);

    const formatted = list.map(n => ({
      id: 'NOTIF-' + n.id,
      dbId: n.id,
      role: n.target_role,
      type: n.type,
      title: n.title,
      description: n.description,
      targetTab: n.target_tab,
      time: n.time_label || 'Vừa xong',
      priority: n.priority || 'normal',
      read: !!n.is_read,
      createdAt: n.created_at
    }));

    const unreadCount = formatted.filter(n => !n.read).length;

    res.json({
      success: true,
      notifications: formatted,
      unreadCount
    });
  } catch (err) {
    console.error('[Notifications GET Error]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo!', error: err.message });
  }
});

// 2. PATCH /api/notifications/:id/read (Mark as read)
notificationsRouter.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    const notifId = req.params.id.replace('NOTIF-', '');
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notifId);
    res.json({ success: true, message: 'Đã đánh dấu thông báo đã đọc' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo!', error: err.message });
  }
});

// 3. POST /api/notifications/read-all (Mark all as read)
notificationsRouter.post('/read-all', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE (target_role = ? OR target_role = 'all')
        AND (target_user_id IS NULL OR target_user_id = ?)
    `).run(user.role, user.id);

    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật tất cả thông báo!', error: err.message });
  }
});

// 4. DELETE /api/notifications (Clear all)
notificationsRouter.delete('/', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    db.prepare(`
      DELETE FROM notifications 
      WHERE (target_role = ? OR target_role = 'all')
        AND (target_user_id IS NULL OR target_user_id = ?)
    `).run(user.role, user.id);

    res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử thông báo' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa thông báo!', error: err.message });
  }
});
