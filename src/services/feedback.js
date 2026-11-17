import * as XLSX from 'xlsx';
import { api } from './api.js';

const STORAGE_KEY = 'eg_student_feedbacks_v1';

let memStore = null;
const safeStorage = {
  get: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : null;
      }
    } catch {
      // Fallback
    }
    return memStore;
  },
  set: (data) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Fallback
    }
    memStore = data;
    // Dispatch custom event for cross-component reactive synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eg_feedback_updated', { detail: data }));
    }
  }
};

/**
 * Danh sách Giảng viên Hướng dẫn & Cố vấn học tập có thể nhận phản hồi
 */
export const ADVISOR_TEACHERS = [
  {
    code: 'GV-089',
    name: 'ThS. Phạm Văn Thuận',
    title: 'Cố vấn học tập K26 CNTT & Giảng viên phụ trách bộ môn',
    faculty: 'Khoa Công Nghệ Thông Tin',
    email: 'pvthuan@eg.edu.vn',
    office: 'Phòng C.302 - Tòa nhà Công Nghệ',
    avatar: '👨‍🏫',
    subject: 'Cấu trúc dữ liệu & Giải thuật (IT204)'
  },
  {
    code: 'GV-042',
    name: 'TS. Lê Hoàng Mai',
    title: 'Trưởng ban Đào tạo CDIO & Giảng viên CNPM',
    faculty: 'Khoa Kỹ Thuật Phần Mềm',
    email: 'mai.le@eg.edu.vn',
    office: 'Phòng A.105 - Tòa nhà Điều Hành',
    avatar: '👩‍🏫',
    subject: 'Quy trình Phát triển Phần mềm CDIO'
  },
  {
    code: 'GV-105',
    name: 'ThS. Nguyễn Văn Toàn',
    title: 'Giảng viên Bộ môn Lập trình Web & Di Động',
    faculty: 'Khoa Công Nghệ Thông Tin',
    email: 'toan.nguyen@eg.edu.vn',
    office: 'Phòng Lab 02 - Khu Máy Tính',
    avatar: '👨‍💻',
    subject: 'Lập trình Web & Di động Nâng cao'
  }
];

/**
 * Danh mục loại phản hồi
 */
export const FEEDBACK_CATEGORIES = [
  { id: 'advisory', label: 'Tư vấn Đồ án & Khóa luận', color: 'teal' },
  { id: 'curriculum', label: 'Góp ý Bài giảng & Giáo trình', color: 'indigo' },
  { id: 'schedule', label: 'Nguyện vọng Lịch học & Thi cử', color: 'sky' },
  { id: 'facility', label: 'Cơ sở vật chất & Phòng Lab', color: 'purple' },
  { id: 'academic', label: 'Điểm rèn luyện & Học bổng', color: 'emerald' },
  { id: 'general', label: 'Ý kiến / Đề xuất chung', color: 'amber' }
];

/**
 * Mức độ ưu tiên
 */
export const FEEDBACK_PRIORITIES = [
  { 
    id: 'normal', 
    label: 'Bình thường', 
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' 
  },
  { 
    id: 'high', 
    label: 'Cần giải đáp sớm', 
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' 
  },
  { 
    id: 'urgent', 
    label: 'Khẩn cấp', 
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' 
  }
];

/**
 * Dữ liệu phản hồi mẫu khởi tạo
 */
const INITIAL_FEEDBACKS = [];

export const feedbackService = {
  /**
   * Lấy toàn bộ danh sách phản hồi
   */
  getAll: () => {
    // Background sync with real backend if token exists
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('eg_auth_token')) {
      api.feedbacks.getAll().then(res => {
        if (res.success && Array.isArray(res.feedbacks)) {
          safeStorage.set(res.feedbacks);
        }
      }).catch(() => {});
    }

    let list = safeStorage.get();
    if (!list || !Array.isArray(list)) {
      list = INITIAL_FEEDBACKS;
    }
    return list;
  },

  /**
   * Lấy phản hồi theo mã giảng viên
   */
  getByTeacher: (teacherCode) => {
    const list = feedbackService.getAll();
    if (!teacherCode) return list;
    return list.filter(f => f.targetTeacherCode === teacherCode);
  },

  /**
   * Lấy phản hồi do sinh viên cụ thể gửi
   */
  getByStudent: (studentCode) => {
    const list = feedbackService.getAll();
    if (!studentCode) return list;
    return list.filter(f => f.studentCode === studentCode);
  },

  /**
   * Sinh viên tạo phản hồi mới gửi cho giảng viên
   */
  createFeedback: ({
    student,
    targetTeacherCode,
    category,
    priority,
    title,
    content,
    isAnonymous,
    attachments = []
  }) => {
    const list = feedbackService.getAll();
    const teacher = ADVISOR_TEACHERS.find(t => t.code === targetTeacherCode) || ADVISOR_TEACHERS[0];
    const cat = FEEDBACK_CATEGORIES.find(c => c.id === category) || FEEDBACK_CATEGORIES[0];
    const pri = FEEDBACK_PRIORITIES.find(p => p.id === priority) || FEEDBACK_PRIORITIES[0];

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newId = `FB-2026-${String(list.length + 1).padStart(3, '0')}`;

    const newFeedback = {
      id: newId,
      studentCode: student?.code || '26103043',
      studentName: student?.name || 'Trịnh Tuấn Kiệt',
      studentRoleTitle: student?.cadreTitle || student?.roleTitle || 'Sinh Viên',
      studentClass: student?.class || student?.classId || 'K26 CNTT - Lớp A',
      studentEmail: student?.email || `${student?.code || '26103043'}@sv.ttn.edu.vn`,
      isAnonymous: Boolean(isAnonymous),

      targetTeacherCode: teacher.code,
      targetTeacherName: teacher.name,
      subject: teacher.subject,

      category: cat.id,
      categoryLabel: cat.label,
      priority: pri.id,
      priorityLabel: pri.label,
      priorityBadge: pri.badge,

      title: title.trim(),
      content: content.trim(),

      status: 'pending',
      statusLabel: 'Chờ giảng viên phản hồi',

      createdAt: dateStr,
      updatedAt: dateStr,
      reply: null,
      studentRating: null,
      studentRatingFeedback: null,
      attachments: attachments || []
    };

    const updated = [newFeedback, ...list];
    safeStorage.set(updated);

    // Sync to backend
    api.feedbacks.submit({
      targetTeacherName: teacher.name,
      category: cat.id,
      categoryLabel: cat.label,
      priority: pri.id,
      priorityLabel: pri.label,
      title: title.trim(),
      content: content.trim(),
      isAnonymous: Boolean(isAnonymous)
    }).catch(() => {});

    return newFeedback;
  },

  /**
   * Giảng viên trả lời phản hồi của sinh viên
   */
  replyFeedback: (feedbackId, replyContent, teacherName = 'ThS. Phạm Văn Thuận', teacherCode = 'GV-089') => {
    const list = feedbackService.getAll();
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updated = list.map(f => {
      if (f.id !== feedbackId) return f;
      return {
        ...f,
        status: 'resolved',
        statusLabel: 'Giảng viên đã giải đáp',
        updatedAt: dateStr,
        reply: {
          teacherCode,
          teacherName,
          content: replyContent.trim(),
          repliedAt: dateStr,
          aiSuggested: false
        }
      };
    });

    safeStorage.set(updated);

    // Sync to backend
    api.feedbacks.reply(feedbackId, replyContent.trim()).catch(() => {});

    return updated.find(f => f.id === feedbackId);
  },

  /**
   * Sinh viên đánh giá mức độ hài lòng với câu trả lời của Giảng viên
   */
  rateFeedback: (feedbackId, rating, feedbackNote = '') => {
    const list = feedbackService.getAll();
    const updated = list.map(f => {
      if (f.id !== feedbackId) return f;
      return {
        ...f,
        studentRating: rating,
        studentRatingFeedback: feedbackNote.trim()
      };
    });
    safeStorage.set(updated);

    // Sync to backend
    api.feedbacks.rate(feedbackId, rating, feedbackNote.trim()).catch(() => {});
  },

  /**
   * AI Gợi ý câu trả lời nhanh cho Giảng viên (Smart AI Reply Assistant)
   */
  suggestAiReply: (feedback) => {
    const studentCall = feedback.isAnonymous ? 'Em sinh viên thân mến' : `Chào em ${feedback.studentName}`;
    
    if (feedback.category === 'advisory') {
      return `${studentCall}, Thầy đã đọc kỹ thắc mắc về đề tài/học phần của em. Đây là hướng tiếp cận rất tốt và bám sát thực tiễn! Về vấn đề kỹ thuật này, Thầy gợi ý em nên phân rã bài toán thành các module độc lập và viết kiểm thử đơn vị (Unit Test). Chiều Thứ Sáu này từ 14h00 đến 16h30 Thầy có mặt tại Văn phòng Bộ môn C.302, em và nhóm có thể ghé gặp Thầy để trao đổi cụ thể hơn nhé. Chúc em học tốt!`;
    }
    
    if (feedback.category === 'curriculum') {
      return `${studentCall}, Thầy rất hoan nghênh tinh thần chủ động tìm hiểu sâu của em! Tài liệu về nội dung này Thầy đã tổng hợp vào thư mục Học liệu số trên hệ thống EG Education. Ngoài ra, Thầy gửi kèm link repository GitHub tham khảo chuẩn cấu trúc clean architecture. Em có thể clone về chạy thử và đặt câu hỏi ở buổi học tới nhé.`;
    }

    if (feedback.category === 'facility') {
      return `${studentCall}, cảm ơn em đã kịp thời phản ánh về tình trạng thiết bị phòng thực hành. Thầy đã chuyển ngay thông tin đến Đội Kỹ thuật CNTT để tiến hành bấm lại đầu dây cáp mạng và bảo trì hệ thống switch trong hôm nay. Đảm bảo buổi thực hành tiếp theo của lớp sẽ thông suốt.`;
    }

    return `${studentCall}, Thầy ghi nhận ý kiến phản hồi rất xây dựng của em! Vấn đề này Ban Giảng huấn sẽ xem xét và có phương án hỗ trợ kịp thời cho cả lớp. Nếu cần thêm thông tin gì khẩn cấp, em cứ nhắn trực tiếp hoặc gặp Thầy sau giờ học nhé.`;
  },

  /**
   * Xuất danh sách phản hồi ra file Excel (.xlsx) chuẩn
   */
  exportFeedbacksToExcel: (feedbacks, teacherName = 'ThS. Phạm Văn Thuận') => {
    const list = feedbacks || feedbackService.getAll();

    // Sheet 1: Tổng hợp KPI
    const totalCount = list.length;
    const resolvedCount = list.filter(f => f.status === 'resolved').length;
    const pendingCount = list.filter(f => f.status === 'pending').length;
    const ratedList = list.filter(f => f.studentRating);
    const avgRating = ratedList.length > 0 
      ? (ratedList.reduce((acc, curr) => acc + curr.studentRating, 0) / ratedList.length).toFixed(1)
      : '5.0';

    const summaryData = [
      ['HỆ THỐNG GIÁO DỤC EG EDUCATION — BÁO CÁO PHẢN HỒI & TƯ VẤN SINH VIÊN'],
      ['Thời gian xuất báo cáo:', new Date().toLocaleString('vi-VN')],
      ['Giảng viên phụ trách:', teacherName],
      ['Tổng số phản hồi nhận được:', totalCount],
      ['Đã giải quyết / Trả lời:', resolvedCount],
      ['Đang chờ xử lý:', pendingCount],
      ['Điểm đánh giá hài lòng trung bình:', `${avgRating} / 5.0 ⭐ (${ratedList.length} lượt đánh giá)`],
      [''],
      ['DANH MỤC THỐNG KÊ', 'SỐ LƯỢNG', 'TỶ LỆ %'],
      ...FEEDBACK_CATEGORIES.map(c => {
        const count = list.filter(f => f.category === c.id).length;
        const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
        return [c.label, count, `${pct}%`];
      })
    ];

    // Sheet 2: Danh sách chi tiết
    const detailHeaders = [
      'Mã Phản Hồi',
      'Thời Gian Gửi',
      'Mã Sinh Viên',
      'Họ Và Tên',
      'Lớp',
      'Ẩn Danh?',
      'Giảng Viên Nhận',
      'Môn Học',
      'Danh Mục',
      'Mức Độ Ưu Tiên',
      'Tiêu Đề Phản Hồi',
      'Nội Dung Chi Tiết',
      'Trạng Thái',
      'Nội Dung Trả Lời Của Giảng Viên',
      'Thời Gian Giảng Viên Trả Lời',
      'Đánh Giá Của SV (1-5 Sao)',
      'Nhận Xét Của SV'
    ];

    const detailRows = list.map(f => [
      f.id,
      f.createdAt,
      f.isAnonymous ? 'ẨN DANH' : f.studentCode,
      f.isAnonymous ? 'Sinh viên ẩn danh' : f.studentName,
      f.studentClass,
      f.isAnonymous ? 'Có' : 'Không',
      f.targetTeacherName,
      f.subject,
      f.categoryLabel,
      f.priorityLabel,
      f.title,
      f.content,
      f.statusLabel,
      f.reply ? f.reply.content : 'Chưa phản hồi',
      f.reply ? f.reply.repliedAt : 'N/A',
      f.studentRating ? `${f.studentRating} Sao` : 'Chưa đánh giá',
      f.studentRatingFeedback || ''
    ]);

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan & KPI');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Danh Sách Chi Tiết 88 SV');

    const fileName = `Bao_Cao_Phan_Hoi_Sinh_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
  },

  /**
   * Reset về dữ liệu mẫu
   */
  resetToDefault: () => {
    safeStorage.set(INITIAL_FEEDBACKS);
    return INITIAL_FEEDBACKS;
  }
};
