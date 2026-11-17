import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { STUDENTS_K26_A } from './students_data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (configurable via DB_PATH for Railway/Docker persistent volumes)
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'eg_education.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode, memory temp store, cache & foreign keys for high performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -16000;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
`);

// Initialize database schema tables
export function initDatabase() {
  console.log('[Database] Checking & initializing SQLite tables at:', DB_PATH);

  // 1. Table Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      secondary_email TEXT,
      password_hash TEXT NOT NULL,
      faculty TEXT,
      class_id TEXT,
      dob TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate columns if needed
  try { db.exec('ALTER TABLE users ADD COLUMN dob TEXT;'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN secondary_email TEXT;'); } catch {}
  try { db.exec('ALTER TABLE attendance_sessions ADD COLUMN previous_token TEXT;'); } catch {}
  try { db.exec('ALTER TABLE attendance_sessions ADD COLUMN token_interval INTEGER DEFAULT 3;'); } catch {}
  try { db.exec('ALTER TABLE attendance_records ADD COLUMN token_match_type TEXT DEFAULT "current";'); } catch {}

  // 2. Table Attendance Sessions (Phiên điểm danh phát mã QR động)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER NOT NULL,
      teacher_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      room TEXT,
      status TEXT DEFAULT 'active',
      current_token TEXT NOT NULL,
      token_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      lat REAL DEFAULT 10.7769,
      lng REAL DEFAULT 106.7009,
      radius_meters INTEGER DEFAULT 100,
      wifi_ssid TEXT DEFAULT 'EG_CAMPUS_5G',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Table Attendance Records (Lịch sử quẹt thẻ & quét QR sinh viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      status TEXT NOT NULL,
      method TEXT DEFAULT 'qr_scan',
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      device_info TEXT,
      distance_meters REAL,
      UNIQUE(session_id, student_id)
    );
  `);

  // 4. Table Leave Requests (Đơn xin nghỉ học & minh chứng y tế)
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_name TEXT DEFAULT 'Cấu trúc dữ liệu & Giải thuật (IT204)',
      leave_date TEXT NOT NULL,
      sessions_count INTEGER DEFAULT 1,
      reason_category TEXT DEFAULT 'medical',
      reason TEXT NOT NULL,
      proof_file_name TEXT DEFAULT 'Minh_chung_y_te.jpg',
      proof_url TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_id INTEGER,
      reviewer_name TEXT,
      review_note TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN subject_name TEXT DEFAULT "Cấu trúc dữ liệu & Giải thuật (IT204)";'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN reason_category TEXT DEFAULT "medical";'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN proof_file_name TEXT DEFAULT "Minh_chung_y_te.jpg";'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN session_slot TEXT DEFAULT "Tiết 1 - 3 (Buổi Sáng)";'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN proof_type TEXT DEFAULT "Giấy khám bệnh / Minh chứng";'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN ai_ocr_json TEXT;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN approved_by TEXT;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN makeup_pack_json TEXT;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN makeup_completed INTEGER DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN makeup_score REAL;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN makeup_completed_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE leave_requests ADD COLUMN attendance_restored INTEGER DEFAULT 0;'); } catch {}

  // 4b. Table System Settings (Cấu hình AI Auto-Approve & hệ thống)
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4c. Table AI Mindmaps (Sơ đồ tư duy bài giảng AI & Infographic)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_mindmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mindmap_code TEXT UNIQUE NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      title TEXT NOT NULL,
      source_file_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      published_to_class INTEGER DEFAULT 1,
      key_takeaways_json TEXT NOT NULL,
      infographic_cards_json TEXT NOT NULL,
      mindmap_tree_json TEXT NOT NULL,
      created_by TEXT DEFAULT 'ThS. Phạm Văn Thuận',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4d. Table Group Projects (Đồ án nhóm & Hệ số đóng góp C_i)
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_code TEXT UNIQUE NOT NULL,
      assignment_id INTEGER DEFAULT 2,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      group_name TEXT NOT NULL,
      project_title TEXT NOT NULL,
      repo_url TEXT,
      group_score REAL DEFAULT 9.0,
      status TEXT DEFAULT 'GRADED',
      members_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4e. Table Code MOSS Scans (Quét tương đồng mã nguồn AST)
  db.exec(`
    CREATE TABLE IF NOT EXISTS code_moss_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_code TEXT UNIQUE NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      last_scan_at TEXT NOT NULL,
      total_scanned INTEGER DEFAULT 50,
      flagged_count INTEGER DEFAULT 2,
      pairs_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4f. Table Peer Reviews (Chấm chéo đồng cấp 2 chiều có hiệu chuẩn)
  db.exec(`
    CREATE TABLE IF NOT EXISTS peer_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_code TEXT UNIQUE NOT NULL,
      assignment_id INTEGER DEFAULT 2,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      target_student_code TEXT NOT NULL,
      target_student_name TEXT NOT NULL,
      reviewer_code TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      comment TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      calibrated_delta TEXT DEFAULT 'Đang chờ chấm',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4g. Table Student DRL & At-Risk AI Records (Điểm Rèn luyện & Dự báo Nguy cơ Học vụ)
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_drl_risk_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      semester TEXT DEFAULT 'HK1 (2026-2027)',
      drl_score INTEGER DEFAULT 82,
      drl_rank TEXT DEFAULT 'Tốt',
      activities_count INTEGER DEFAULT 5,
      discipline_warning TEXT,
      risk_index INTEGER DEFAULT 12,
      risk_level TEXT DEFAULT 'SAFE',
      advisor_notified INTEGER DEFAULT 0,
      advisor_notified_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4h. Table Exit Ticket Sessions & Cold Call Picker History (Gói 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS exit_ticket_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      is_open INTEGER DEFAULT 1,
      session_title TEXT NOT NULL,
      question1 TEXT NOT NULL,
      question2 TEXT NOT NULL,
      comprehension_quiz TEXT NOT NULL,
      quiz_options_json TEXT NOT NULL,
      correct_option_index INTEGER DEFAULT 0,
      responses_json TEXT NOT NULL,
      cold_call_history_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4i. Table Live Q&A Upvote & Discussion Checkpoints (Gói 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_qa_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      questions_json TEXT NOT NULL,
      checkpoint_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4j. Table Virtual Classrooms (Phòng học Trực tuyến Tích hợp - Gói 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_classrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT UNIQUE NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      title TEXT NOT NULL,
      host_name TEXT DEFAULT 'ThS. Phạm Văn Thuận',
      is_live INTEGER DEFAULT 1,
      started_at TEXT DEFAULT '07:00',
      jitsi_room_name TEXT NOT NULL,
      screen_sharing_active INTEGER DEFAULT 1,
      active_slide_title TEXT NOT NULL,
      auto_attendance_min_minutes INTEGER DEFAULT 35,
      participants_json TEXT NOT NULL,
      chat_messages_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4k. Table Gamification Streaks, EXP, Badges & Late Pass (Gói 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gamification_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      current_streak INTEGER DEFAULT 9,
      max_streak INTEGER DEFAULT 12,
      exp_points INTEGER DEFAULT 1850,
      level INTEGER DEFAULT 8,
      level_title TEXT NOT NULL,
      late_pass_count INTEGER DEFAULT 2,
      weekly_attendance_json TEXT NOT NULL,
      badges_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Table Announcements (Công văn & khảo sát AI)
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author_id INTEGER,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      target_class TEXT NOT NULL,
      subject TEXT,
      urgency TEXT DEFAULT 'normal',
      urgency_label TEXT DEFAULT 'THÔNG BÁO',
      deadline TEXT,
      raw_text TEXT,
      ai_summary_json TEXT,
      has_poll INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Table Poll Options (Các phương án biểu quyết)
  db.exec(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      option_index INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      UNIQUE(announcement_id, option_index)
    );
  `);

  // 7. Table Poll Votes (Phiếu biểu quyết thực tế của từng sinh viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      option_index INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(announcement_id, student_id)
    );
  `);

  // 8. Table Feedbacks (Hộp thư phản hồi & giải đáp của Giảng viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_code TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      student_class TEXT NOT NULL,
      target_teacher_name TEXT NOT NULL,
      category TEXT NOT NULL,
      category_label TEXT NOT NULL,
      priority TEXT NOT NULL,
      priority_label TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reply_content TEXT,
      replied_at TEXT,
      reply_teacher_name TEXT,
      student_rating INTEGER,
      student_rating_feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Table Notifications (Trung tâm thông báo hệ thống đa tầng)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_role TEXT NOT NULL,
      target_user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_tab TEXT,
      time_label TEXT DEFAULT 'Vừa xong',
      priority TEXT DEFAULT 'normal',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Table Gradebook Records (Sổ điểm học phần đánh giá quá trình)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gradebook_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_code TEXT DEFAULT 'IT204',
      subject_name TEXT DEFAULT 'Cấu trúc dữ liệu & Giải thuật',
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      student_code TEXT NOT NULL,
      student_name TEXT NOT NULL,
      dob TEXT,
      total_sessions INTEGER DEFAULT 15,
      attended INTEGER DEFAULT 14,
      excused INTEGER DEFAULT 0,
      unexcused INTEGER DEFAULT 0,
      attendance_score REAL DEFAULT 10.0,
      lab_score REAL DEFAULT 8.0,
      midterm_score REAL DEFAULT 7.5,
      bonus_score REAL DEFAULT 0.5,
      final_process_score REAL DEFAULT 8.2,
      gpa4 REAL DEFAULT 3.5,
      letter_grade TEXT DEFAULT 'B+',
      status TEXT DEFAULT 'eligible',
      teacher_note TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(subject_code, class_id, student_code)
    );
  `);

  // 11. Table Grade Disputes (Đơn thắc mắc / khiếu nại điểm của sinh viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS grade_disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_code TEXT UNIQUE NOT NULL,
      student_code TEXT NOT NULL,
      student_name TEXT NOT NULL,
      subject_code TEXT DEFAULT 'IT204',
      component TEXT NOT NULL,
      current_score REAL,
      expected_score REAL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      resolution_note TEXT,
      resolved_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Table Assignments (Bài tập & Thực hành Lab)
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_code TEXT UNIQUE NOT NULL,
      subject_code TEXT DEFAULT 'IT204',
      subject_name TEXT DEFAULT 'Cấu trúc dữ liệu & Giải thuật',
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline DATETIME NOT NULL,
      max_score REAL DEFAULT 10.0,
      weight_percent REAL DEFAULT 30.0,
      allowed_types TEXT DEFAULT 'all',
      attached_file_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );
  `);

  // 13. Table Submissions (Bài nộp của sinh viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_code TEXT NOT NULL,
      student_name TEXT NOT NULL,
      submission_type TEXT NOT NULL DEFAULT 'github',
      file_name TEXT,
      file_url TEXT,
      github_repo_url TEXT,
      student_note TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_late INTEGER DEFAULT 0,
      status TEXT DEFAULT 'submitted',
      score REAL,
      teacher_feedback TEXT,
      graded_at DATETIME,
      graded_by TEXT,
      UNIQUE(assignment_id, student_code)
    );
  `);

  // 14. Table Lab Help Requests (Hàng đợi hỗ trợ phòng máy Lab FIFO [2.4])
  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_help_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_number TEXT NOT NULL,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      lab_name TEXT DEFAULT 'LAB-02: Cây Nhị Phân Cân Bằng AVL',
      issue_description TEXT,
      code_snippet TEXT,
      error_tags TEXT,
      status TEXT DEFAULT 'waiting',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );
  `);
  try { db.exec('ALTER TABLE lab_help_requests ADD COLUMN lab_name TEXT DEFAULT "LAB-02: Cây Nhị Phân Cân Bằng AVL";'); } catch {}
  try { db.exec('ALTER TABLE lab_help_requests ADD COLUMN code_snippet TEXT;'); } catch {}
  try { db.exec('ALTER TABLE lab_help_requests ADD COLUMN error_tags TEXT;'); } catch {}
  try { db.exec('ALTER TABLE lab_help_requests ADD COLUMN resolved_at DATETIME;'); } catch {}

  // 15. Table Flash Quizzes (Live Flash Quiz 45s tương tác giảng đường [2.3])
  db.exec(`
    CREATE TABLE IF NOT EXISTS flash_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      teacher_id INTEGER DEFAULT 1,
      title TEXT,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      time_limit_sec INTEGER DEFAULT 45,
      status TEXT DEFAULT 'active',
      bonus_points REAL DEFAULT 0.5,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { db.exec('ALTER TABLE flash_quizzes ADD COLUMN title TEXT;'); } catch {}
  try { db.exec('ALTER TABLE flash_quizzes ADD COLUMN bonus_points REAL DEFAULT 0.5;'); } catch {}

  // 16. Table Flash Quiz Submissions (Bài trả lời trắc nghiệm phản xạ của sinh viên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flash_quiz_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      student_code TEXT NOT NULL,
      selected_option INTEGER NOT NULL,
      response_time_ms INTEGER,
      is_correct INTEGER DEFAULT 0,
      bonus_awarded REAL DEFAULT 0,
      is_synced_to_gradebook INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(quiz_id, student_code)
    );
  `);
  try { db.exec('ALTER TABLE flash_quiz_submissions ADD COLUMN bonus_awarded REAL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE flash_quiz_submissions ADD COLUMN is_synced_to_gradebook INTEGER DEFAULT 0;'); } catch {}

  // Khởi tạo bảng điểm sạch cho 50 sinh viên lớp K26 CNTT - Lớp A nếu chưa có dữ liệu
  const gbCount = db.prepare('SELECT COUNT(*) as count FROM gradebook_records').get();
  if (gbCount.count === 0) {
    const insertGB = db.prepare(`
      INSERT OR IGNORE INTO gradebook_records (
        subject_code, subject_name, class_id, student_code, student_name, dob,
        total_sessions, attended, excused, unexcused,
        attendance_score, lab_score, midterm_score, bonus_score,
        final_process_score, gpa4, letter_grade, status, teacher_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    STUDENTS_K26_A.forEach((stu) => {
      const totalSessions = 15;
      const unexcused = Number(stu.absences) || 0;
      const attended = Math.max(0, totalSessions - unexcused);
      const attendanceScore = Math.max(0, Math.min(10, Math.round((10 - unexcused * 2.0) * 10) / 10));
      const finalProcessScore = Math.round(attendanceScore * 0.2 * 10) / 10;
      const status = unexcused >= 4 ? 'banned' : (unexcused === 3 ? 'warning' : 'eligible');
      const teacherNote = unexcused >= 4
        ? `Vắng ${unexcused} buổi (Cấm thi học phần)`
        : (unexcused > 0 ? `Vắng ${unexcused} buổi` : '');

      insertGB.run(
        'IT204', 'Cấu trúc dữ liệu & Giải thuật', 'K26 CNTT - Lớp A',
        stu.code, stu.name, stu.dob || '01/01/2008',
        totalSessions, attended, 0, unexcused,
        attendanceScore, 0, 0, 0,
        finalProcessScore, 0.0, '--', status, teacherNote
      );
    });
  }

  // Seed sample default admin/teacher/student accounts if empty or incomplete
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count < 10) {
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (role, name, code, email, secondary_email, password_hash, faculty, class_id, dob)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const defaultHash = bcrypt.hashSync('123456', 10);

    insertUser.run('teacher', 'ThS. Phạm Văn Thuận', 'GV001', 'pvthuan@eg.edu.vn', 'teacher@eg.edu.vn', defaultHash, 'Khoa Công Nghệ Thông Tin', 'K26 CNTT - Lớp A', '15/08/1985');
    STUDENTS_K26_A.forEach(stu => {
      insertUser.run(
        'student',
        stu.name,
        stu.code,
        `${stu.code}@sv.ttn.edu.vn`,
        stu.code === '26103001' ? 'student@eg.edu.vn' : `${stu.code}@eg.edu.vn`,
        defaultHash,
        'Khoa Công Nghệ Thông Tin',
        'K26 CNTT - Lớp A',
        stu.dob || '01/01/2008'
      );
    });
  }

  // Seed System Settings for AI Leave Auto-Approve
  db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value_json)
    VALUES ('leave_ai_config', ?)
  `).run(JSON.stringify({ aiAutoApproveEnabled: true, confidenceThreshold: 88 }));

  // Khởi tạo phiên quét MOSS AST sạch nếu chưa có
  const mossCount = db.prepare('SELECT COUNT(*) as count FROM code_moss_scans').get();
  if (mossCount.count === 0) {
    db.prepare(`
      INSERT INTO code_moss_scans (
        scan_code, class_id, last_scan_at, total_scanned, flagged_count, pairs_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('MOSS-SCAN-01', 'K26 CNTT - Lớp A', 'Chưa quét', 0, 0, '[]');
  }

  // Seed System Settings for CTSV DRL Sync Meta
  db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value_json)
    VALUES ('drl_risk_meta', ?)
  `).run(JSON.stringify({
    syncSource: 'Hệ thống Quản lý Công tác Sinh viên (CTSV - Trường ĐH)',
    lastSyncedAt: '10/11/2026 07:00'
  }));

  // Khởi tạo hồ sơ ĐRL & cảnh báo sạch cho 50 sinh viên lớp K26 CNTT - Lớp A nếu chưa có
  const drlCount = db.prepare('SELECT COUNT(*) as count FROM student_drl_risk_records').get();
  if (drlCount.count === 0) {
    const insertDrl = db.prepare(`
      INSERT OR IGNORE INTO student_drl_risk_records (
        student_code, student_name, class_id, semester,
        drl_score, drl_rank, activities_count, discipline_warning,
        risk_index, risk_level, advisor_notified
      ) VALUES (?, ?, ?, 'HK1 (2026-2027)', ?, ?, ?, ?, ?, ?, ?)
    `);

    STUDENTS_K26_A.forEach((stu) => {
      const unexcused = Number(stu.absences) || 0;
      const disciplineWarning = unexcused >= 4
        ? `Vắng ${unexcused} buổi (Cấm thi >20%)`
        : (unexcused === 3 ? 'Cảnh báo học vụ (Vắng 3 buổi)' : null);
      const riskIndex = unexcused >= 4 ? Math.min(98, 70 + unexcused * 2) : (unexcused === 3 ? 58 : unexcused * 10);
      const riskLevel = riskIndex >= 70 ? 'CRITICAL' : (riskIndex >= 31 ? 'WATCH' : 'SAFE');

      insertDrl.run(
        stu.code,
        stu.name,
        'K26 CNTT - Lớp A',
        0,
        'Chưa xét',
        0,
        disciplineWarning,
        riskIndex,
        riskLevel,
        0
      );
    });
  }

  // Khởi tạo phiên Exit Ticket & Cold Call sạch nếu trống
  const exitCount = db.prepare('SELECT COUNT(*) as count FROM exit_ticket_sessions').get();
  if (exitCount.count === 0) {
    db.prepare(`
      INSERT INTO exit_ticket_sessions (
        session_code, class_id, is_open, session_title, question1, question2,
        comprehension_quiz, quiz_options_json, correct_option_index,
        responses_json, cold_call_history_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'EXIT-IT204-W10',
      'K26 CNTT - Lớp A',
      1,
      'Phiếu Xác Nhận Cuối Buổi (Exit Ticket)',
      '1. Khái niệm hoặc thuật toán nào trong buổi học hôm nay bạn nắm vững nhất?',
      '2. Phần kiến thức nào bạn còn thấy mơ hồ, cần Giảng viên giải thích thêm ở đầu buổi sau?',
      'Trong cây AVL, thao tác chèn 1 phần tử mới tốn tối đa bao nhiêu phép xoay (Rotation)?',
      JSON.stringify(['Tối đa 1 phép xoay (Đơn hoặc Kép)', 'Tối đa O(log N) phép xoay', 'Tối đa N phép xoay']),
      0,
      '[]',
      '[]'
    );
  }

  // Khởi tạo phiên Hỏi đáp Live & Thảo luận sạch nếu trống
  const qaCount = db.prepare('SELECT COUNT(*) as count FROM live_qa_sessions').get();
  if (qaCount.count === 0) {
    db.prepare(`
      INSERT INTO live_qa_sessions (
        session_code, class_id, questions_json, checkpoint_json
      ) VALUES (?, ?, ?, ?)
    `).run(
      'QA-IT204-W10',
      'K26 CNTT - Lớp A',
      '[]',
      JSON.stringify({
        topicId: 'CHK-W10',
        title: 'Thảo luận 2 giai đoạn (Post-Before-View)',
        prompt: 'Giảng viên cập nhật câu hỏi thảo luận trọng tâm của buổi học tại đây.',
        posts: []
      })
    );
  }

  // Khởi tạo phòng học trực tuyến sạch nếu trống
  const vcCount = db.prepare('SELECT COUNT(*) as count FROM virtual_classrooms').get();
  if (vcCount.count === 0) {
    db.prepare(`
      INSERT INTO virtual_classrooms (
        room_id, class_id, title, host_name, is_live, started_at, jitsi_room_name,
        screen_sharing_active, active_slide_title, auto_attendance_min_minutes,
        participants_json, chat_messages_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'EG-IT204-K26CNTTA',
      'K26 CNTT - Lớp A',
      'Phòng Học Trực Tuyến Tích Hợp — Cấu Trúc Dữ Liệu & Giải Thuật (IT204)',
      'ThS. Phạm Văn Thuận',
      1,
      '',
      'EGEducation_IT204_K26CNTTA_LiveRoom',
      0,
      'Chưa chia sẻ slide bài giảng',
      35,
      '[]',
      '[]'
    );
  }

  // Khởi tạo hồ sơ Gamification sạch cho 50 sinh viên lớp K26 CNTT - Lớp A nếu trống
  const gamCount = db.prepare('SELECT COUNT(*) as count FROM gamification_profiles').get();
  if (gamCount.count === 0) {
    const baseBadges = [
      { id: 'B1', name: 'Ngôi Sao Đúng Giờ (Punctual Star)', desc: 'Điểm danh QR trong 2 phút đầu 5 buổi liên tiếp', icon: 'Flame', unlocked: false, rewardExp: 300 },
      { id: 'B2', name: 'Chiến Thần Nộp Sớm (Early Bird)', desc: 'Nộp bài Lab trước hạn chót ít nhất 24 giờ', icon: 'Zap', unlocked: false, rewardExp: 400 },
      { id: 'B3', name: 'Thủ Lĩnh Gánh Team (Fair Leader)', desc: 'Đạt hệ số đóng góp nhóm C_i ≥ 1.05', icon: 'Award', unlocked: false, rewardExp: 500 },
      { id: 'B4', name: 'Thợ Săn Bug Phòng Lab', desc: 'Hỗ trợ bạn cùng lớp giải quyết 3 câu hỏi trên Q&A', icon: 'Shield', unlocked: false, rewardExp: 350 },
      { id: 'B5', name: 'Chuỗi Bất Bại 15 Tuần', desc: 'Đi học đầy đủ 100% số buổi toàn học kỳ', icon: 'Crown', unlocked: false, rewardExp: 1000 }
    ];

    const insertGam = db.prepare(`
      INSERT OR IGNORE INTO gamification_profiles (
        student_code, student_name, class_id, current_streak, max_streak,
        exp_points, level, level_title, late_pass_count, weekly_attendance_json, badges_json
      ) VALUES (?, ?, 'K26 CNTT - Lớp A', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    STUDENTS_K26_A.forEach((stu) => {
      insertGam.run(
        stu.code,
        stu.name,
        0,
        0,
        0,
        1,
        'Tân Binh Giải Thuật',
        1,
        JSON.stringify([false, false, false, false, false]),
        JSON.stringify(baseBadges)
      );
    });
  }

  // 4k. Table Course Materials (Kho Học Liệu & Bài Giảng Trực Tuyến - trống ban đầu, giảng viên tự tải lên)
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Giáo Trình',
      category_key TEXT DEFAULT 'book',
      faculty TEXT DEFAULT 'it',
      class_id TEXT DEFAULT 'K26 CNTT - Lớp A',
      access_scope TEXT DEFAULT 'Công khai toàn hệ thống',
      license TEXT DEFAULT 'CC BY-NC',
      pages_label TEXT DEFAULT '45 trang',
      downloads_count INTEGER DEFAULT 0,
      file_name TEXT,
      file_size_label TEXT,
      file_mime TEXT,
      description TEXT,
      toc_json TEXT DEFAULT '[]',
      extracted_preview TEXT,
      uploaded_by TEXT DEFAULT 'ThS. Phạm Văn Thuận',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Không tự sinh học liệu mẫu có số lượt tải ảo; giảng viên chủ động đăng tải khi sử dụng thực tế.
  db.prepare('SELECT COUNT(*) as count FROM course_materials').get();

  // Create composite B-Tree indexes for sub-millisecond query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role_code ON users(role, code);
    CREATE INDEX IF NOT EXISTS idx_att_sessions_status ON attendance_sessions(status, class_id);
    CREATE INDEX IF NOT EXISTS idx_att_records_session_stu ON attendance_records(session_id, student_code);
    CREATE INDEX IF NOT EXISTS idx_leave_status_student ON leave_requests(status, student_id, student_code);
    CREATE INDEX IF NOT EXISTS idx_leave_code_class ON leave_requests(request_code, class_id, status);
    CREATE INDEX IF NOT EXISTS idx_ai_mindmaps_class ON ai_mindmaps(class_id, published_to_class);
    CREATE INDEX IF NOT EXISTS idx_course_materials_class ON course_materials(class_id, category_key);
    CREATE INDEX IF NOT EXISTS idx_group_projects_class ON group_projects(class_id, group_code);
    CREATE INDEX IF NOT EXISTS idx_peer_reviews_class ON peer_reviews(class_id, review_code);
    CREATE INDEX IF NOT EXISTS idx_drl_risk_lookup ON student_drl_risk_records(class_id, risk_level, student_code);
    CREATE INDEX IF NOT EXISTS idx_exit_ticket_class ON exit_ticket_sessions(class_id, session_code);
    CREATE INDEX IF NOT EXISTS idx_live_qa_class ON live_qa_sessions(class_id, session_code);
    CREATE INDEX IF NOT EXISTS idx_virtual_room_class ON virtual_classrooms(class_id, room_id);
    CREATE INDEX IF NOT EXISTS idx_gamification_stu ON gamification_profiles(class_id, student_code);
    CREATE INDEX IF NOT EXISTS idx_announcements_class ON announcements(target_class, created_at);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_filter ON feedbacks(status, category, student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, target_user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_gradebook_lookup ON gradebook_records(subject_code, class_id, student_code);
    CREATE INDEX IF NOT EXISTS idx_submissions_assign_stu ON submissions(assignment_id, student_code, status);
    CREATE INDEX IF NOT EXISTS idx_lab_queue_status_class ON lab_help_requests(class_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_flash_quiz_class_status ON flash_quizzes(class_id, status);
    CREATE INDEX IF NOT EXISTS idx_flash_subs_quiz_correct ON flash_quiz_submissions(quiz_id, is_correct, response_time_ms);
  `);

  console.log('[Database] Schema & B-Tree indexes initialized successfully (WAL mode enabled).');
}
