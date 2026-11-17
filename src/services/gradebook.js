import * as XLSX from 'xlsx';
import { STUDENTS_K26_A } from '../data/students.js';
import { api } from './api.js';
import { notificationService } from './notifications.js';

const GRADEBOOK_STORAGE_KEY = 'eg_gradebook_v2';
const DISPUTES_STORAGE_KEY = 'eg_grade_disputes_v2';

let memGradeStore = null;
let memDisputeStore = null;

const safeStorage = {
  get: (key) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch {
      // fallback
    }
    return key === GRADEBOOK_STORAGE_KEY ? memGradeStore : memDisputeStore;
  },
  set: (key, data) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {
      // fallback
    }
    if (key === GRADEBOOK_STORAGE_KEY) memGradeStore = data;
    else memDisputeStore = data;
  }
};

/**
 * Tính điểm chữ & GPA hệ 4 từ điểm quá trình hệ 10
 */
export function convertToGPA(score10) {
  const s = Math.round(score10 * 10) / 10;
  if (s >= 8.5) return { gpa4: 4.0, letter: 'A', label: 'Xuất sắc', color: 'text-emerald-600 bg-emerald-500/15 border-emerald-500/30' };
  if (s >= 8.0) return { gpa4: 3.5, letter: 'B+', label: 'Giỏi', color: 'text-teal-600 bg-teal-500/15 border-teal-500/30' };
  if (s >= 7.0) return { gpa4: 3.0, letter: 'B', label: 'Khá', color: 'text-sky-600 bg-sky-500/15 border-sky-500/30' };
  if (s >= 6.5) return { gpa4: 2.5, letter: 'C+', label: 'Trung bình khá', color: 'text-blue-600 bg-blue-500/15 border-blue-500/30' };
  if (s >= 5.5) return { gpa4: 2.0, letter: 'C', label: 'Trung bình', color: 'text-amber-600 bg-amber-500/15 border-amber-500/30' };
  if (s >= 5.0) return { gpa4: 1.5, letter: 'D+', label: 'Trung bình yếu', color: 'text-orange-600 bg-orange-500/15 border-orange-500/30' };
  if (s >= 4.0) return { gpa4: 1.0, letter: 'D', label: 'Đạt', color: 'text-rose-600 bg-rose-500/15 border-rose-500/30' };
  return { gpa4: 0.0, letter: 'F', label: 'Không đạt (Học lại)', color: 'text-red-700 bg-red-500/20 border-red-500/40' };
}

/**
 * Tính toán lại dòng điểm của 1 sinh viên
 * Trọng số chuẩn Đại học:
 * - Chuyên cần: 20%
 * - Bài tập / Thực hành Lab: 30%
 * - Kiểm tra giữa kỳ: 50%
 * - Điểm thưởng cộng thêm (tối đa 10)
 */
export function calculateStudentGradeRow(row) {
  const totalSessions = row.totalSessions || 15;
  const unexcused = Number(row.unexcused) || 0;
  const excused = Number(row.excused) || 0;
  const attended = Math.max(0, totalSessions - unexcused - excused);
  const attendanceRate = Math.round((attended / totalSessions) * 1000) / 10;

  // Tính điểm chuyên cần
  let attendanceScore = row.customAttendanceScore !== undefined
    ? Number(row.customAttendanceScore)
    : (10 - (unexcused * 2.0) - (excused * 0.5));
  attendanceScore = Math.max(0, Math.min(10, Math.round(attendanceScore * 10) / 10));

  const labScore = Math.max(0, Math.min(10, Number(row.labScore) || 0));
  const midtermScore = Math.max(0, Math.min(10, Number(row.midtermScore) || 0));
  const bonusScore = Math.max(0, Math.min(2.0, Number(row.bonusScore) || 0));

  // Điểm quá trình hệ 10
  let finalProcessScore = (attendanceScore * 0.2) + (labScore * 0.3) + (midtermScore * 0.5) + bonusScore;
  finalProcessScore = Math.max(0, Math.min(10, Math.round(finalProcessScore * 10) / 10));

  const gpaInfo = convertToGPA(finalProcessScore);

  // Xác định trạng thái học vụ
  let status = 'eligible'; // Mặc định đủ điều kiện
  let statusLabel = 'Đủ điều kiện thi';
  let statusBadge = 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border-emerald-500/30';

  if (unexcused >= 4 || attendanceRate < 80.0) {
    status = 'banned';
    statusLabel = 'CẤM THI (Vắng > 20%)';
    statusBadge = 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40 font-bold';
  } else if (unexcused === 3 || finalProcessScore < 4.0) {
    status = 'warning';
    statusLabel = unexcused === 3 ? 'Nguy cơ cấm thi (Vắng 3 buổi)' : 'Cảnh báo rớt môn (ĐGQT < 4.0)';
    statusBadge = 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold';
  } else if (finalProcessScore >= 8.5 && attendanceScore >= 9.0) {
    status = 'scholarship';
    statusLabel = 'Đạt học bổng (A)';
    statusBadge = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 font-bold';
  }

  return {
    ...row,
    totalSessions,
    attended,
    excused,
    unexcused,
    attendanceRate,
    attendanceScore,
    labScore,
    midtermScore,
    bonusScore,
    finalProcessScore,
    gpa4: gpaInfo.gpa4,
    letterGrade: gpaInfo.letter,
    gradeLabel: gpaInfo.label,
    letterColor: gpaInfo.color,
    status,
    statusLabel,
    statusBadge
  };
}

/**
 * Khởi tạo bảng điểm cơ sở theo danh sách 88 sinh viên K26 CNTT - Lớp A và số buổi nghỉ thực tế
 */
function generateInitialGradebook() {
  const students = STUDENTS_K26_A;

  return students.map((stu, idx) => {
    const unexcused = Number(stu.absences) || 0;
    const teacherNote = unexcused >= 4
      ? `Vắng ${unexcused} buổi (Cấm thi học phần)`
      : (unexcused > 0 ? `Vắng ${unexcused} buổi` : '');

    return calculateStudentGradeRow({
      stt: idx + 1,
      studentCode: stu.code,
      studentName: stu.name,
      dob: stu.dob,
      classId: stu.classId || 'K26 CNTT - Lớp A',
      subjectCode: 'IT204',
      subjectName: 'Cấu trúc dữ liệu & Giải thuật',
      credits: 3,
      totalSessions: 15,
      unexcused,
      excused: 0,
      labScore: 0,
      midtermScore: 0,
      bonusScore: 0,
      teacherNote
    });
  });
}

/**
 * Danh sách khiếu nại khởi tạo (rỗng cho đến khi sinh viên gửi yêu cầu thực tế)
 */
function generateInitialDisputes() {
  return [];
}

export const gradebookService = {
  /**
   * Lấy toàn bộ danh sách điểm (đồng bộ nền từ SQLite backend nếu khả dụng)
   */
  getAll: () => {
    let stored = safeStorage.get(GRADEBOOK_STORAGE_KEY);
    if (!stored || !Array.isArray(stored) || stored.length !== STUDENTS_K26_A.length) {
      stored = generateInitialGradebook();
      safeStorage.set(GRADEBOOK_STORAGE_KEY, stored);
    }
    return stored;
  },

  /**
   * Tải bảng điểm mới nhất từ SQLite Backend và chuẩn hóa lưu local cache
   */
  fetchFromBackend: async (classId = 'K26 CNTT - Lớp A', subjectCode = 'IT204') => {
    try {
      const res = await api.gradebook.getAll(subjectCode, classId);
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const localMap = new Map((safeStorage.get(GRADEBOOK_STORAGE_KEY) || []).map(s => [s.studentCode, s]));
        const normalized = res.data.map((r, idx) => {
          const existing = localMap.get(r.studentCode || r.student_code);
          return calculateStudentGradeRow({
            ...(existing || {}),
            stt: r.stt || idx + 1,
            studentCode: r.studentCode || r.student_code,
            studentName: r.studentName || r.student_name,
            dob: r.dob || existing?.dob || '01/01/2008',
            classId: r.classId || r.class_id || classId,
            subjectCode: r.subjectCode || r.subject_code || subjectCode,
            subjectName: r.subjectName || r.subject_name || 'Cấu trúc dữ liệu & Giải thuật',
            totalSessions: Number(r.totalSessions || r.total_sessions || 15),
            excused: Number(r.excused || 0),
            unexcused: Number(r.unexcused || 0),
            labScore: Number(r.labScore ?? r.lab_score ?? 0),
            midtermScore: Number(r.midtermScore ?? r.midterm_score ?? 0),
            bonusScore: Number(r.bonusScore ?? r.bonus_score ?? 0),
            teacherNote: r.teacherNote ?? r.teacher_note ?? existing?.teacherNote ?? ''
          });
        });
        safeStorage.set(GRADEBOOK_STORAGE_KEY, normalized);
        return normalized;
      }
    } catch {
      // Fallback safely to cached storage
    }
    return gradebookService.getAll();
  },

  /**
   * Cập nhật điểm hoặc ghi chú học vụ của 1 sinh viên (inline edit)
   */
  updateStudentGrade: (studentCode, field, value) => {
    const list = gradebookService.getAll();
    const updated = list.map(item => {
      if (item.studentCode !== studentCode) return item;
      let parsed;
      if (field === 'teacherNote') {
        parsed = String(value ?? '');
      } else {
        const numVal = parseFloat(value);
        parsed = isNaN(numVal) ? value : numVal;
      }
      const newRaw = {
        ...item,
        [field]: parsed
      };
      if (field === 'attendanceScore' && typeof parsed === 'number') {
        newRaw.customAttendanceScore = parsed;
        newRaw.unexcused = Math.max(0, Math.floor((10 - parsed) / 2));
      }
      return calculateStudentGradeRow(newRaw);
    });

    safeStorage.set(GRADEBOOK_STORAGE_KEY, updated);
    const updatedRow = updated.find(s => s.studentCode === studentCode);

    if (updatedRow) {
      api.gradebook.updateStudent(studentCode, {
        unexcused: updatedRow.unexcused,
        excused: updatedRow.excused,
        lab_score: updatedRow.labScore,
        midterm_score: updatedRow.midtermScore,
        bonus_score: updatedRow.bonusScore,
        teacher_note: updatedRow.teacherNote
      }).catch(() => {});
    }

    return updatedRow;
  },

  /**
   * Tự động đồng bộ điểm chuyên cần từ ca Điểm danh QR & Biểu quyết
   */
  syncFromAttendanceAndPolls: () => {
    const currentList = gradebookService.getAll();

    // Check announcement votes in localStorage to award engagement bonus
    let activeVoters = new Set();
    try {
      const annRaw = localStorage.getItem('eg_announcements_v2');
      if (annRaw) {
        const announcements = JSON.parse(annRaw);
        if (Array.isArray(announcements)) {
          announcements.forEach(ann => {
            if (ann.poll && Array.isArray(ann.poll.votes)) {
              ann.poll.votes.forEach(v => {
                if (v.studentCode) activeVoters.add(v.studentCode);
              });
            }
          });
        }
      }
    } catch {}

    const synced = currentList.map(item => {
      let bonusScore = item.bonusScore || 0;
      if (activeVoters.has(item.studentCode)) {
        bonusScore = Math.min(2.0, Math.max(bonusScore, bonusScore + 0.5));
      }
      return calculateStudentGradeRow({
        ...item,
        bonusScore
      });
    });

    safeStorage.set(GRADEBOOK_STORAGE_KEY, synced);
    return synced;
  },

  /**
   * Phát lệnh cảnh báo sớm học vụ đến sinh viên diện Cấm thi và Nguy cơ
   */
  broadcastWarnings: (teacherName = 'ThS. Phạm Văn Thuận') => {
    const list = gradebookService.getAll();
    const banned = list.filter(s => s.status === 'banned');
    const warning = list.filter(s => s.status === 'warning');
    const totalWarned = banned.length + warning.length;

    banned.forEach(s => {
      notificationService.addNotification({
        role: 'student',
        targetStudentCode: s.studentCode,
        title: '🚨 CẢNH BÁO CẤM THI: Vi phạm số tiết vắng',
        description: `${teacherName} thông báo: Bạn đã vắng ${s.unexcused} buổi không phép (quá 20% quy định), hiện không đủ điều kiện dự thi cuối kỳ môn Cấu trúc dữ liệu (IT204). Vui lòng gửi khiếu nại hoặc nộp minh chứng ngay.`,
        targetTab: 'gradebook',
        type: 'gradebook',
        priority: 'urgent'
      });
    });

    warning.forEach(s => {
      notificationService.addNotification({
        role: 'student',
        targetStudentCode: s.studentCode,
        title: '⚠️ CẢNH BÁO HỌC VỤ: Nguy cơ cấm thi / rớt môn',
        description: `${teacherName} nhắc nhở: Bạn hiện có ${s.unexcused} buổi vắng hoặc ĐGQT hiện tại (${s.finalProcessScore}) dưới 4.0. Hãy đi học chuyên cần và nộp đầy đủ bài Lab.`,
        targetTab: 'gradebook',
        type: 'gradebook',
        priority: 'high'
      });
    });

    notificationService.addNotification({
      role: 'teacher',
      title: 'Đã phát cảnh báo học vụ tự động',
      description: `Hệ thống đã gửi thông báo cảnh báo sớm đến ${totalWarned} sinh viên (Cấm thi: ${banned.length}, Nguy cơ: ${warning.length}).`,
      targetTab: 'gradebook',
      type: 'gradebook',
      priority: 'normal'
    });

    return { totalWarned, bannedCount: banned.length, warningCount: warning.length };
  },

  /**
   * Tính toán các chỉ số thống kê phổ điểm lớp học
   */
  calculateAnalytics: (gradeList) => {
    const list = gradeList || gradebookService.getAll();
    const total = list.length || 50;

    const distribution = {
      'A': list.filter(s => s.letterGrade === 'A').length,
      'B+': list.filter(s => s.letterGrade === 'B+').length,
      'B': list.filter(s => s.letterGrade === 'B').length,
      'C+': list.filter(s => s.letterGrade === 'C+').length,
      'C': list.filter(s => s.letterGrade === 'C').length,
      'D+': list.filter(s => s.letterGrade === 'D+').length,
      'D': list.filter(s => s.letterGrade === 'D').length,
      'F': list.filter(s => s.letterGrade === 'F').length
    };

    const bannedCount = list.filter(s => s.status === 'banned').length;
    const warningCount = list.filter(s => s.status === 'warning').length;
    const scholarshipCount = list.filter(s => s.status === 'scholarship').length;
    const eligibleCount = list.filter(s => s.status !== 'banned').length;

    const sumScore10 = list.reduce((acc, cur) => acc + (cur.finalProcessScore || 0), 0);
    const avgScore10 = total > 0 ? (sumScore10 / total).toFixed(2) : '0.00';

    const sumGpa = list.reduce((acc, cur) => acc + (cur.gpa4 || 0), 0);
    const avgGpa = total > 0 ? (sumGpa / total).toFixed(2) : '0.00';

    const passRate = total > 0 ? (((total - distribution['F'] - bannedCount) / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      avgScore10,
      avgGpa,
      passRate,
      bannedCount,
      warningCount,
      scholarshipCount,
      eligibleCount,
      distribution
    };
  },

  /**
   * Lấy danh sách khiếu nại điểm
   */
  getDisputes: () => {
    let stored = safeStorage.get(DISPUTES_STORAGE_KEY);
    if (!stored || !Array.isArray(stored)) {
      stored = generateInitialDisputes();
      safeStorage.set(DISPUTES_STORAGE_KEY, stored);
    }
    return stored;
  },

  /**
   * Sinh viên nộp đơn thắc mắc / khiếu nại điểm
   */
  submitDispute: ({ studentCode, studentName, component, currentScore, expectedScore, reason }) => {
    const disputes = gradebookService.getDisputes();
    const newId = `DISP-${Date.now().toString().slice(-4)}`;
    
    let componentLabel = 'Điểm Đánh Giá';
    if (component === 'attendance') componentLabel = 'Điểm Chuyên Cần';
    else if (component === 'lab') componentLabel = 'Điểm Thực Hành / Lab';
    else if (component === 'midterm') componentLabel = 'Điểm Giữa Kỳ';
    else if (component === 'bonus') componentLabel = 'Điểm Thưởng / Hoạt Động';

    const now = new Date();
    const submittedAt = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const newRecord = {
      id: newId,
      studentCode,
      studentName,
      subjectCode: 'IT204',
      component,
      componentLabel,
      currentScore: Number(currentScore) || 0,
      expectedScore: Number(expectedScore) || 0,
      reason,
      status: 'pending',
      submittedAt,
      resolutionNote: null
    };

    const updated = [newRecord, ...disputes];
    safeStorage.set(DISPUTES_STORAGE_KEY, updated);

    api.gradebook.submitDispute({
      studentCode,
      studentName,
      subjectCode: 'IT204',
      component,
      currentScore: Number(currentScore) || 0,
      expectedScore: Number(expectedScore) || 0,
      reason
    }).catch(() => {});

    return newRecord;
  },

  /**
   * Giảng viên xử lý khiếu nại điểm
   */
  resolveDispute: (disputeId, { action, resolutionNote, newScore }) => {
    const disputes = gradebookService.getDisputes();
    let targetDispute = null;

    const updatedDisputes = disputes.map(d => {
      if (d.id !== disputeId) return d;
      const now = new Date();
      targetDispute = {
        ...d,
        status: action === 'approve' ? 'resolved' : 'rejected',
        resolutionNote,
        resolvedAt: `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      };
      return targetDispute;
    });

    safeStorage.set(DISPUTES_STORAGE_KEY, updatedDisputes);

    api.gradebook.resolveDispute(disputeId, {
      action,
      resolutionNote,
      newScore
    }).catch(() => {});

    // Nếu chấp thuận và có điểm mới, cập nhật thẳng vào sổ điểm
    if (action === 'approve' && targetDispute && newScore !== undefined) {
      let fieldName = 'labScore';
      if (targetDispute.component === 'attendance') fieldName = 'attendanceScore';
      else if (targetDispute.component === 'midterm') fieldName = 'midtermScore';
      else if (targetDispute.component === 'bonus') fieldName = 'bonusScore';

      gradebookService.updateStudentGrade(targetDispute.studentCode, fieldName, newScore);
    }

    return targetDispute;
  },

  /**
   * Xuất Sổ Điểm Quá Trình Ra File Excel Chuẩn Bộ GD&ĐT
   */
  exportGradebookToExcel: ({
    subjectName = 'Cấu trúc dữ liệu & Giải thuật (IT204)',
    className = 'K26 CNTT - Lớp A',
    teacherName = 'ThS. Phạm Văn Thuận',
    credits = 3
  } = {}) => {
    const list = gradebookService.getAll();
    const analytics = gradebookService.calculateAnalytics(list);
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');

    // Header hành chính
    const rows = [
      ['BỘ GIÁO DỤC VÀ ĐÀO TẠO', '', '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
      ['TRƯỜNG ĐẠI HỌC TÂY NGUYÊN', '', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc'],
      ['KHOA CÔNG NGHỆ THÔNG TIN', '', '', '', '', '', '', '', '', '', '', '-------------------'],
      [''],
      ['BẢNG ĐIỂM ĐÁNH GIÁ QUÁ TRÌNH HỌC PHẦN (TÍN CHỈ)'],
      [`Học kỳ I - Năm học 2026 - 2027 • Ngày xuất: ${dateStr}`],
      [''],
      [`Học phần: ${subjectName}`, '', '', `Số tín chỉ: ${credits}`, '', '', `Lớp: ${className}`, '', '', `Giảng viên phụ trách: ${teacherName}`],
      ['Trọng số đánh giá: Chuyên cần (20%) • Thực hành/Lab (30%) • Giữa kỳ (50%) • Điểm quá trình tối đa 10'],
      [''],
      // Tiêu đề các cột dữ liệu
      [
        'STT',
        'Mã Sinh Viên',
        'Họ và Tên',
        'Ngày Sinh',
        'Số Tiết Vắng',
        'Điểm Chuyên Cần (20%)',
        'Điểm Thực Hành/Lab (30%)',
        'Điểm Giữa Kỳ (50%)',
        'Điểm Thưởng Hoạt Động',
        'ĐIỂM QUÁ TRÌNH (Hệ 10)',
        'Quy Đổi Hệ 4 (GPA)',
        'Điểm Chữ',
        'Tình Trạng Dự Thi',
        'Ghi Chú Học Vụ'
      ]
    ];

    // Thêm từng dòng sinh viên
    list.forEach((s) => {
      rows.push([
        s.stt,
        s.studentCode,
        s.studentName,
        s.dob || '01/01/2008',
        `${s.unexcused} KP / ${s.excused} CP`,
        s.attendanceScore,
        s.labScore,
        s.midtermScore,
        s.bonusScore,
        s.finalProcessScore,
        s.gpa4,
        s.letterGrade,
        s.statusLabel,
        s.teacherNote || ''
      ]);
    });

    // Thêm bảng thống kê cuối trang
    rows.push(['']);
    rows.push(['THỐNG KÊ PHỔ ĐIỂM TOÀN LỚP:']);
    rows.push([`Sĩ số: ${analytics.total} SV`, `Điểm TB Hệ 10: ${analytics.avgScore10}`, `GPA TB: ${analytics.avgGpa}`, `Tỷ lệ Đạt: ${analytics.passRate}%`]);
    rows.push([`Đạt học bổng: ${analytics.scholarshipCount} SV`, `Cảnh báo học tập: ${analytics.warningCount} SV`, `Cấm thi: ${analytics.bannedCount} SV`]);
    rows.push(['']);
    rows.push(['', '', '', 'XÁC NHẬN CỦA BỘ MÔN', '', '', '', '', '', '', '', 'GIẢNG VIÊN PHỤ TRÁCH']);
    rows.push(['', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '', '', '(Ký và ghi rõ họ tên)']);
    rows.push(['']);
    rows.push(['']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', teacherName]);

    // Tạo Worksheet và Workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Căn chỉnh độ rộng cột
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // MSSV
      { wch: 25 }, // Họ tên
      { wch: 12 }, // Ngày sinh
      { wch: 16 }, // Tiết vắng
      { wch: 14 }, // CC
      { wch: 14 }, // Lab
      { wch: 14 }, // Giữa kỳ
      { wch: 14 }, // Thưởng
      { wch: 16 }, // Quá trình
      { wch: 12 }, // Hệ 4
      { wch: 10 }, // Điểm chữ
      { wch: 22 }, // Trạng thái
      { wch: 30 }  // Ghi chú
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'So_Diem_Qua_Trinh');

    const fileName = `Bang_Diem_Qua_Trinh_${className.replace(/\s+/g, '_')}_IT204.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
  }
};
