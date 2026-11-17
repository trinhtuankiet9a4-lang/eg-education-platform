import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const authRouter = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'eg_education_secret_jwt_key_2026';

// Middleware to verify JWT Token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu mã phiên làm việc (Token) hợp lệ!' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ!' });
    }
    req.user = decoded;
    next();
  });
}

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập Email hoặc Mã số người dùng!' 
      });
    }

    let trimmedInput = email.trim().toLowerCase();
    if (trimmedInput === 'sinhvien.giaoduc@edu.vn') {
      trimmedInput = '26103043@sv.ttn.edu.vn';
    } else if (trimmedInput === 'giangvien.giaoduc@edu.vn') {
      trimmedInput = 'pvthuan@eg.edu.vn';
    }
    const targetRole = role || 'student';

    // Query user by email, secondary_email, code, or aliases
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? 
         OR LOWER(secondary_email) = ?
         OR LOWER(code) = ? 
         OR LOWER(code) = ?
    `).get(
      trimmedInput,
      trimmedInput,
      trimmedInput,
      trimmedInput.replace(/^hv-/i, '')
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: `Tài khoản hoặc mã số "${email}" không tồn tại trong hệ thống EG Education!` 
      });
    }

    // Check role match
    if (user.role !== targetRole) {
      const correctPortal = user.role === 'teacher' ? 'Cổng Giảng Viên' : 'Cổng Học Viên';
      return res.status(403).json({ 
        success: false, 
        message: `Tài khoản này thuộc quyền hạn ${user.role === 'teacher' ? 'Giảng Viên' : 'Học Viên'}. Vui lòng chuyển sang ${correctPortal}!` 
      });
    }

    // Verify Password (supports MSSV code, 123456, or date of birth DDMMYYYY / DD/MM/YYYY)
    const providedPass = password && password.trim() ? password.trim() : (user.role === 'teacher' ? '123456' : user.code);
    let isPasswordValid = bcrypt.compareSync(providedPass, user.password_hash);

    if (!isPasswordValid) {
      if (user.code && providedPass.toLowerCase() === user.code.toLowerCase()) {
        isPasswordValid = true;
      } else if (providedPass === '123456') {
        isPasswordValid = true;
      } else if (user.dob) {
        const cleanDob = user.dob.replace(/\D/g, ''); // e.g. 07022008
        if (providedPass === user.dob || providedPass === cleanDob) {
          isPasswordValid = true;
        }
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: `Mật khẩu không chính xác! (Mật khẩu mặc định: ${user.role === 'teacher' ? '123456' : 'Mã sinh viên ' + user.code})` 
      });
    }

    // Generate JWT Token
    const tokenPayload = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      code: user.code
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] User logged in: ${user.name} (${user.code} • ${user.email}) [${user.role}]`);

    return res.json({
      success: true,
      message: `Chào mừng ${user.name} đã đăng nhập thành công!`,
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        code: user.code,
        email: user.email,
        secondary_email: user.secondary_email,
        faculty: user.faculty,
        classId: user.class_id,
        dob: user.dob
      }
    });

  } catch (error) {
    console.error('[Auth Error]', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ nội bộ trong quá trình xác thực!',
      error: error.message 
    });
  }
});

// GET /api/auth/me (Get profile of current logged-in user)
authRouter.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, role, name, code, email, secondary_email, faculty, class_id as classId, dob, created_at 
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại!' });
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/demo-users (Reference test credentials)
authRouter.get('/demo-users', (req, res) => {
  const users = db.prepare(`
    SELECT id, role, name, code, email, faculty, class_id as classId, dob 
    FROM users
    ORDER BY role DESC, code ASC
  `).all();

  return res.json({
    success: true,
    count: users.length,
    hint: 'Mật khẩu chung cho tất cả tài khoản là: 123456 (hoặc ngày sinh)',
    users
  });
});

// GET /api/auth/students (Get list of all 50 students)
authRouter.get('/students', (req, res) => {
  const students = db.prepare(`
    SELECT id, name, code, email, dob, faculty, class_id as classId 
    FROM users 
    WHERE role = 'student'
    ORDER BY code ASC
  `).all();

  return res.json({
    success: true,
    total: students.length,
    students
  });
});
