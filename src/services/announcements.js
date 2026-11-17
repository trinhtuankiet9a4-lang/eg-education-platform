import * as XLSX from 'xlsx';
import { STUDENTS_K26_A } from '../data/students.js';
import { api } from './api.js';

const STORAGE_KEY = 'eg_announcements_v2';

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
  }
};

/**
 * Mẫu công văn thực tế để Giảng viên nạp thử nghiệm 1-click
 */
export const SAMPLE_DISPATCHES = [
  {
    id: 'disp_48',
    name: 'Công văn 48/QĐ-ĐHTTN: Tổ chức học bù do bão lũ (Hỏa tốc - Có Poll)',
    fileName: 'Cong_van_48_QD_DHTTN_Hoc_bu_bao_lu.pdf',
    pdfUrl: '/sample_dispatches/Cong_van_48_QD_DHTTN_Hoc_bu_bao_lu.pdf',
    badge: 'Khẩn cấp',
    text: `TRƯỜNG ĐẠI HỌC TÂY NGUYÊN
Số: 48/QĐ-ĐHTTN                                  Đắk Lắk, ngày 28 tháng 10 năm 2026

QUYẾT ĐỊNH HỎA TỐC
V/v: Điều chỉnh kế hoạch học tập và tổ chức học bù do ảnh hưởng bão lũ

Căn cứ diễn biến phức tạp của mưa bão gây ngập lụt cục bộ tại một số khu vực giảng đường và ký túc xá;
Căn cứ đề xuất của Phòng Đào tạo Đại học,

HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC TÂY NGUYÊN QUYẾT ĐỊNH:
Điều 1. Tạm dừng tổ chức các lớp học tập trung trực tiếp từ ngày 28/10/2026 đến hết ngày 31/10/2026.
Điều 2. Giảng viên phụ trách các lớp học phần chủ động phối hợp với Ban cán sự lớp tổ chức khảo sát lấy ý kiến sinh viên để thống nhất hình thức tổ chức ca học bù (học bù trực tuyến qua MS Teams/Zoom vào buổi tối, hoặc học bù trực tiếp vào cuối tuần, hoặc dồn lịch vào tuần dự trữ).
Điều 3. Toàn thể sinh viên hoàn thành bình chọn trước 18h00 ngày 02/11/2026 để Khoa tổng hợp lịch báo cáo Ban Giám hiệu./.

                                                                 HIỆU TRƯỞNG
                                                                 (Đã ký & Đóng dấu)`
  },
  {
    id: 'disp_102',
    name: 'Thông báo 102/TB-ĐHTTN: Khảo sát hình thức thi (Quan trọng - Có Poll)',
    fileName: 'Thong_bao_102_TB_Khao_sat_thi.pdf',
    pdfUrl: '/sample_dispatches/Thong_bao_102_TB_Khao_sat_thi.pdf',
    badge: 'Quan trọng',
    text: `TRƯỜNG ĐẠI HỌC TÂY NGUYÊN - PHÒNG KHẢO THÍ & ĐBCL
Số: 102/TB-KTĐBCL                                Ngày 25 tháng 10 năm 2026

THÔNG BÁO QUAN TRỌNG
V/v: Lấy ý kiến sinh viên về hình thức thi kết thúc học phần Cấu trúc dữ liệu & Giải thuật

Kính gửi: Toàn thể sinh viên lớp K26 CNTT - Lớp A.
Nhằm nâng cao chất lượng đánh giá kết quả học tập và tạo điều kiện thuận lợi nhất cho người học, Phòng Khảo thí thông báo:
1. Tổ chức khảo sát lấy ý kiến biểu quyết của sinh viên về hình thức thi cuối kỳ:
   - Phương án 1: Thi tự luận kết hợp viết code trên giấy tại phòng thi tiêu chuẩn.
   - Phương án 2: Thi thực hành lập trình trực tiếp trên máy trạm phòng Lab (chấm testcase tự động).
   - Phương án 3: Báo cáo bảo vệ đồ án / sản phẩm phần mềm theo nhóm 3 người.
2. Hạn chót biểu quyết: Trước 17h00 ngày 05/11/2026.
Đề nghị toàn thể sinh viên tham gia đầy đủ./.

                                                                 TRƯỞNG PHÒNG KHẢO THÍ`
  },
  {
    id: 'disp_89',
    name: 'Thông báo 89/TB-TCKT: Hạn nộp học phí học kỳ I (Không Poll)',
    fileName: 'Thong_bao_89_TB_Hoc_phi_HK1.pdf',
    pdfUrl: '/sample_dispatches/Thong_bao_89_TB_Hoc_phi_HK1.pdf',
    badge: 'Thông báo',
    text: `TRƯỜNG ĐẠI HỌC TÂY NGUYÊN - PHÒNG TÀI CHÍNH KẾ TOÁN
Số: 89/TB-TCKT                                   Ngày 20 tháng 10 năm 2026

THÔNG BÁO
V/v: Nhắc nhở thời hạn hoàn thành nộp học phí học kỳ I năm học 2026 - 2027

Phòng Tài chính Kế toán thông báo đến toàn thể sinh viên các khóa:
1. Thời hạn cuối cùng để hoàn thành nộp học phí học kỳ I là 17h00 ngày 10/11/2026.
2. Sinh viên nộp qua cổng thanh toán trực tuyến hoặc chuyển khoản ngân hàng theo hướng dẫn trên Cổng sinh viên.
3. Các trường hợp sinh viên khó khăn diện chính sách có đơn xin gia hạn nộp tại Phòng Công tác Sinh viên trước ngày 05/11/2026.
Thông báo này chỉ nhằm mục đích phổ biến quy chế tài chính, không phát sinh biểu quyết lấy ý kiến sinh viên./.

                                                                 TRƯỞNG PHÒNG TCKT`
  },
  {
    id: 'disp_1',
    name: 'Công văn 118: Học bù & Bảo trì phòng máy Lab',
    badge: 'Khẩn cấp',
    text: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-------------------------
BAN ĐÀO TẠO & QUẢN LÝ KHOA HỌC - HỆ THỐNG EG EDUCATION
Số: 118/CV-EGEDU                                  TP. Hồ Chí Minh, ngày 24 tháng 10 năm 2026

CÔNG VĂN HỎA TỐC
V/v: Điều chỉnh kế hoạch học tập và tổ chức ca học bù cho các lớp chuyên ngành K26 CNTT

Kính gửi: 
- Ban Giảng huấn Khoa Công nghệ Thông tin;
- Giảng viên phụ trách học phần: ThS. Phạm Văn Thuận;
- Toàn thể sinh viên lớp K26 CNTT - Lớp A.

Căn cứ vào kế hoạch bảo dưỡng định kỳ hệ thống máy trạm và nâng cấp đường truyền cáp quang nội bộ tại Tòa nhà A2 từ ngày 22/10/2026 đến 25/10/2026, Ban Đào Tạo thông báo:
1. Tạm hoãn buổi học sáng Thứ Năm (22/10) môn "Cấu trúc dữ liệu & Giải thuật" (Mã HP: IT204) để đảm bảo an toàn kỹ thuật phòng thực hành.
2. Giảng viên ThS. Phạm Văn Thuận chủ trì tổ chức lấy ý kiến biểu quyết của toàn thể 50 sinh viên trong lớp để thống nhất hình thức tổ chức ca học bù. Các phương án bao gồm:
   - Phương án 1: Học trực tiếp tại Phòng Lab 02 - Khu C (Thứ Bảy, 08:00 - 11:15).
   - Phương án 2: Học trực tuyến có ghi hình bài giảng qua Google Meet (Chủ Nhật, 19:30 - 21:45).
   - Phương án 3: Học kết hợp Hybrid (Vừa học tại lớp vừa phát sóng livestream tương tác).
3. Hạn chót biểu quyết: Trước 23h59 ngày 26/10/2026. Sau thời điểm này, hệ thống sẽ tự động tổng hợp số liệu gửi Ban Đào Tạo cấp quyền phòng học.
Đề nghị Giảng viên và Ban cán sự lớp nghiêm túc phối hợp thực hiện./.

                                                                 TRƯỞNG BAN ĐÀO TẠO
                                                                 (Đã ký & Đóng dấu)`
  },
  {
    id: 'disp_2',
    name: 'Thông tri 205: Đăng ký Đề tài Nghiên cứu Khoa học 2026',
    badge: 'Quan trọng',
    text: `HỘI ĐỒNG KHOA HỌC & CÔNG NGHỆ - EG EDUCATION
Số: 205/TB-KHCN                                  Ngày 20 tháng 10 năm 2026

THÔNG BÁO PHÁT ĐỘNG
V/v: Đăng ký đề tài Nghiên cứu Khoa học & Đổi mới Sáng tạo Sinh viên năm học 2026 - 2027

Nhằm đẩy mạnh phong trào học thuật và nghiên cứu ứng dụng công nghệ, Hội đồng Khoa học thông báo:
1. Đối tượng tham gia: Sinh viên tất cả các lớp K25, K26 thuộc các khối ngành Kỹ thuật Phần mềm, Công nghệ Thông tin, Hệ thống Thông tin.
2. Quyền lợi: Mỗi đề tài được nghiệm thu Đạt sẽ được hỗ trợ kinh phí nghiên cứu từ 15.000.000 VNĐ đến 30.000.000 VNĐ, cộng điểm rèn luyện xuất sắc và ưu tiên xét học bổng học tập.
3. Nhóm sinh viên từ 2 - 4 người, có giảng viên bộ môn bảo trợ khoa học.
4. Hạn nộp đề cương: 17h00 ngày 15/11/2026 qua cổng thông tin thư viện số EG Education.`
  },
  {
    id: 'disp_3',
    name: 'Kế hoạch 312: Khảo sát nguyện vọng phân nhóm Đồ án CDIO',
    badge: 'Khảo sát',
    text: `KHOA CÔNG NGHỆ THÔNG TIN - BỘ MÔN KỸ THUẬT PHẦN MỀM
KẾ HOẠCH PHÂN BỔ ĐỀ TÀI ĐỒ ÁN CHUYÊN NGÀNH CDIO HỌC KỲ I

Để chuẩn bị phân chia nhóm đề tài thực hành môn Cấu trúc dữ liệu & Giải thuật:
Giảng viên bộ môn khảo sát nguyện vọng định hướng công nghệ của sinh viên:
- Nhóm 1: Ứng dụng Web Fullstack & Quản trị Cơ sở dữ liệu phân tán.
- Nhóm 2: Hệ thống Trí tuệ Nhân tạo & Xử lý ngôn ngữ tự nhiên (NLP).
- Nhóm 3: Ứng dụng Di động Mobile App (Flutter / React Native).
Sinh viên chọn đúng định hướng thế mạnh để giảng viên ghép cặp và chia nhóm bài tập lớn tương ứng.`
  }
];

/**
 * Tạo danh sách phiếu bầu mẫu cho 42/50 sinh viên để có số liệu đẹp
 */
function generateSeedVotes() {
  const votes = [];
  const options = ['opt_1', 'opt_2', 'opt_3'];
  const distribution = [
    22, // opt_1 (52%)
    14, // opt_2 (33%)
    6   // opt_3 (14%)
  ]; // Total 42 votes

  let optIndex = 0;
  let countInCurrentOpt = 0;

  for (let i = 0; i < 42; i++) {
    const student = STUDENTS_K26_A[i];
    if (countInCurrentOpt >= distribution[optIndex]) {
      optIndex++;
      countInCurrentOpt = 0;
    }

    const optId = options[optIndex];
    countInCurrentOpt++;

    const minute = (10 + (i * 3) % 45).toString().padStart(2, '0');
    const hour = (8 + Math.floor(i / 15)).toString().padStart(2, '0');

    votes.push({
      studentCode: student.code,
      studentName: student.name,
      studentEmail: student.email,
      studentDob: student.dob,
      optionId: optId,
      votedAt: `24/10/2026 ${hour}:${minute}:24`
    });
  }

  return votes;
}

/**
 * Danh sách thông báo mặc định ban đầu
 */
const DEFAULT_ANNOUNCEMENTS = [];

/**
 * Service API quản lý Thông báo & Bình chọn
 */
export const announcementService = {
  // Lấy toàn bộ danh sách thông báo
  getAll: () => {
    // Background sync with real backend if token exists
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('eg_auth_token')) {
      api.announcements.getAll().then(res => {
        if (res.success && Array.isArray(res.announcements)) {
          safeStorage.set(res.announcements);
        }
      }).catch(() => {});
    }

    const data = safeStorage.get();
    if (Array.isArray(data)) return data;
    return DEFAULT_ANNOUNCEMENTS;
  },

  // Lưu danh sách thông báo
  saveAll: (list) => {
    safeStorage.set(list);
  },

  // Khôi phục dữ liệu gốc
  resetToDefault: () => {
    safeStorage.set(DEFAULT_ANNOUNCEMENTS);
    return DEFAULT_ANNOUNCEMENTS;
  },

  // AI Tóm tắt văn bản công văn & Nhận diện tự động sinh biểu quyết
  summarizeDispatch: async (rawText) => {
    // 1. Thử gọi AI Backend Endpoint trước (/api/announcements/analyze-ai)
    try {
      const res = await api.announcements.analyzeAi(rawText);
      if (res && res.success && res.analysis) {
        const a = res.analysis;
        return {
          title: a.title || 'Thông báo về kế hoạch điều chỉnh hoạt động học tập',
          dispatchNo: a.document_code || 'EG-CV-2026/01',
          urgency: a.urgency || 'normal',
          urgencyLabel: a.urgency_label || 'THÔNG BÁO CHUNG',
          badgeColor: a.urgency === 'urgent' || a.urgency === 'emergency'
            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
            : (a.urgency === 'important'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'),
          deadline: a.poll?.deadline_suggested || '23:59 hôm nay',
          readingTime: 'Rút gọn 85% nội dung (Đọc trong 30 giây)',
          mainGoal: a.summary,
          keyPoints: a.key_points || [],
          actionRequired: a.requires_poll 
            ? 'Bắt buộc toàn thể sinh viên trong danh sách lớp bỏ phiếu chọn 01 phương án trước hạn chót.' 
            : 'Sinh viên theo dõi thông báo và thực hiện đúng thời hạn quy định.',
          requires_poll: Boolean(a.requires_poll),
          poll: a.poll || null
        };
      }
    } catch (e) {
      console.warn('[AI Service] Backend AI failed, falling back to local heuristic NLP:', e.message);
    }

    // 2. Fallback sang Smart Heuristic NLP nếu offline hoặc chưa kết nối server
    await new Promise((r) => setTimeout(r, 600));

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const textLower = rawText.toLowerCase();

    // Phát hiện số công văn
    const noMatch = rawText.match(/Số:\s*([^\s\n\r]+)/i);
    const dispatchNo = noMatch ? noMatch[1].trim() : 'EG-CV-2026/' + Math.floor(100 + Math.random() * 900);

    // Phát hiện mức độ khẩn
    let urgency = 'normal';
    let urgencyLabel = 'THÔNG BÁO CHUNG';
    let badgeColor = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';

    if (textLower.includes('hỏa tốc') || textLower.includes('khẩn') || textLower.includes('ngay lập tức')) {
      urgency = 'urgent';
      urgencyLabel = 'HỎA TỐC';
      badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    } else if (textLower.includes('quan trọng') || textLower.includes('bắt buộc') || textLower.includes('chú ý')) {
      urgency = 'important';
      urgencyLabel = 'QUAN TRỌNG';
      badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }

    // Phát hiện hạn chót (Deadline)
    const dateMatch = rawText.match(/(?:trước|hạn chót|ngày|đến)\s*([0-9]{1,2}[:h][0-9]{2})?\s*(?:ngày)?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i);
    const deadline = dateMatch ? `${dateMatch[2]} ${dateMatch[1] || '23:59'}` : '28/10/2026 23:59';

    // Trích xuất tiêu đề ngắn
    let title = 'Thông báo về kế hoạch điều chỉnh hoạt động học tập';
    const vMatch = rawText.match(/V\/v:?\s*([^\n\r]+)/i);
    if (vMatch) {
      title = vMatch[1].trim();
    }

    // Trích xuất các ý chính
    const keyPoints = [];
    for (const l of lines) {
      if (/^[0-9]\.|\-|\+|\*/.test(l) && l.length > 20) {
        keyPoints.push(l.replace(/^[0-9]\.|\-|\+|\*/, '').trim());
      }
    }

    if (keyPoints.length === 0) {
      keyPoints.push('Tổ chức điều chỉnh lịch học tập và khảo sát ý kiến sinh viên.');
      keyPoints.push('Yêu cầu sinh viên tham gia đầy đủ theo quy chế đào tạo.');
      keyPoints.push(`Hạn chót phản hồi và hoàn thành trước: ${deadline}.`);
    }

    // Nhận diện nhu cầu bình chọn
    const pollKeywords = ['khảo sát', 'bình chọn', 'biểu quyết', 'lấy ý kiến', 'phương án 1', 'phương án 2'];
    const requires_poll = pollKeywords.some(kw => textLower.includes(kw));

    let poll = null;
    if (requires_poll) {
      poll = {
        question: `Lấy ý kiến biểu quyết sinh viên về ${title.toLowerCase()}:`,
        options: [
          'Học trực tiếp tại Giảng đường / Phòng Lab',
          'Học trực tuyến có ghi hình bài giảng',
          'Học kết hợp Hybrid tương tác'
        ],
        deadline_suggested: deadline
      };
    }

    return {
      title,
      dispatchNo,
      urgency,
      urgencyLabel,
      badgeColor,
      deadline,
      readingTime: 'Rút gọn 80% văn bản (Đọc trong 30 giây)',
      mainGoal: `Truyền đạt nhanh nội dung công văn ${dispatchNo} đến sinh viên lớp.`,
      keyPoints: keyPoints.slice(0, 4),
      actionRequired: requires_poll 
        ? 'Bắt buộc toàn thể sinh viên trong danh sách lớp bỏ phiếu chọn 01 phương án.' 
        : 'Sinh viên theo dõi thông báo và thực hiện đúng thời hạn quy định.',
      requires_poll,
      poll
    };
  },

  // AI Phân tích tập tin công văn tải lên (PDF, DOCX, TXT)
  analyzeFileDispatch: async (fileData) => {
    let base64 = fileData.base64 || null;
    let fileName = fileData.name || 'Cong_van_dinh_kem.pdf';
    let fileText = fileData.text || null;

    if (!base64 && fileData.file && typeof window !== 'undefined') {
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          const idx = res.indexOf(',');
          resolve(idx >= 0 ? res.slice(idx + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileData.file);
      });
    }

    try {
      const res = await api.announcements.analyzeFile(fileName, base64, fileText);
      if (res && res.success && res.analysis) {
        const a = res.analysis;
        return {
          fileName: res.fileName || fileName,
          extractedText: res.extractedText,
          title: a.title || 'Thông báo về kế hoạch điều chỉnh hoạt động học tập',
          dispatchNo: a.document_code || 'EG-CV-2026/01',
          urgency: a.urgency || 'normal',
          urgencyLabel: a.urgency_label || 'THÔNG BÁO CHUNG',
          badgeColor: a.urgency === 'urgent' || a.urgency === 'emergency'
            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
            : (a.urgency === 'important'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'),
          deadline: a.poll?.deadline_suggested || '23:59 hôm nay',
          readingTime: 'Rút gọn 85% nội dung (Đọc trong 30 giây)',
          mainGoal: a.summary,
          keyPoints: a.key_points || [],
          actionRequired: a.requires_poll 
            ? 'Bắt buộc toàn thể sinh viên trong danh sách lớp bỏ phiếu chọn 01 phương án trước hạn chót.' 
            : 'Sinh viên theo dõi thông báo và thực hiện đúng thời hạn quy định.',
          requires_poll: Boolean(a.requires_poll),
          poll: a.poll || null
        };
      }
    } catch (err) {
      console.warn('[AI File Analysis Warning] Backend analyze-file error, fallbacking:', err.message);
    }

    // Fallback: summarize directly with text if available
    return announcementService.summarizeDispatch(fileText || `Văn bản công văn đính kèm: ${fileName}`);
  },

  // Giảng viên tạo thông báo mới
  createAnnouncement: (data) => {
    const list = announcementService.getAll();
    const newId = `ANN-${Date.now().toString().slice(-6)}`;
    const sourceFileName = data.sourceFileName || data.aiSummary?.sourceFileName || null;

    const newAnnouncement = {
      id: newId,
      title: data.title,
      author: data.author || 'ThS. Phạm Văn Thuận',
      authorRole: 'Giảng viên phụ trách',
      targetClass: data.targetClass || 'K26 CNTT - Lớp A',
      subject: data.subject || 'Cấu trúc dữ liệu & Giải thuật (IT204)',
      createdAt: new Date().toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      urgency: data.urgency || 'normal',
      urgencyLabel: data.urgencyLabel || 'THÔNG BÁO',
      badgeColor: data.badgeColor || 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      deadline: data.deadline || '30/10/2026 23:59',
      rawText: data.rawText || '',
      sourceFileName,
      aiSummary: {
        ...(data.aiSummary || {}),
        sourceFileName
      },
      hasPoll: Boolean(data.hasPoll),
      poll: data.hasPoll ? {
        id: `POLL-${Date.now().toString().slice(-4)}`,
        question: data.pollQuestion,
        options: data.pollOptions.map((opt, i) => ({
          id: `opt_${i + 1}`,
          text: opt,
          votes: 0
        })),
        totalVotes: 0,
        totalStudents: 50,
        votesList: []
      } : null
    };

    list.unshift(newAnnouncement);
    announcementService.saveAll(list);

    // Sync to backend
    api.announcements.create({
      title: data.title,
      targetClass: data.targetClass,
      subject: data.subject,
      urgency: data.urgency,
      urgencyLabel: data.urgencyLabel,
      deadline: data.deadline,
      rawText: data.rawText,
      sourceFileName,
      aiSummary: data.aiSummary,
      options: data.pollOptions,
      hasPoll: data.hasPoll
    }).catch(() => {});

    return newAnnouncement;
  },

  // Sinh viên thực hiện bình chọn
  votePoll: (announcementId, optionId, user) => {
    const list = announcementService.getAll();
    const ann = list.find(a => a.id === announcementId);

    if (!ann || !ann.poll) {
      throw new Error('Cuộc bình chọn không tồn tại hoặc đã đóng!');
    }

    const poll = ann.poll;
    const studentCode = user?.code || '26103043';
    const studentName = user?.name || 'Trịnh Tuấn Kiệt';
    const studentEmail = user?.email || '26103043@sv.ttn.edu.vn';
    const studentDob = user?.dob || '01/02/2008';

    // Kiểm tra xem sinh viên này đã vote chưa
    const existingIndex = poll.votesList.findIndex(v => v.studentCode === studentCode);

    if (existingIndex >= 0) {
      // Đổi lựa chọn
      const prevOptId = poll.votesList[existingIndex].optionId;
      const prevOpt = poll.options.find(o => o.id === prevOptId);
      if (prevOpt && prevOpt.votes > 0) prevOpt.votes--;

      const newOpt = poll.options.find(o => o.id === optionId);
      if (newOpt) newOpt.votes++;

      poll.votesList[existingIndex].optionId = optionId;
      poll.votesList[existingIndex].votedAt = new Date().toLocaleString('vi-VN');
    } else {
      // Vote mới
      const newOpt = poll.options.find(o => o.id === optionId);
      if (newOpt) newOpt.votes++;
      poll.totalVotes++;

      poll.votesList.push({
        studentCode,
        studentName,
        studentEmail,
        studentDob,
        optionId,
        votedAt: new Date().toLocaleString('vi-VN')
      });
    }

    announcementService.saveAll(list);

    // Sync to backend
    let optIndex = 0;
    if (typeof optionId === 'number') optIndex = optionId;
    else if (typeof optionId === 'string') {
      const match = optionId.match(/[0-9]+/);
      optIndex = match ? parseInt(match[0]) - 1 : 0;
    }
    api.announcements.vote(announcementId, Math.max(0, optIndex)).catch(() => {});

    return ann;
  },

  // Xuất file Excel báo cáo kết quả bình chọn
  exportPollToExcel: (announcement) => {
    if (!announcement || !announcement.poll) {
      throw new Error('Thông báo không có dữ liệu bình chọn để xuất báo cáo!');
    }

    const poll = announcement.poll;
    const wb = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // SHEET 1: BÁO CÁO TỔNG HỢP (SUMMARY)
    // -------------------------------------------------------------
    const summaryRows = [
      ['HỆ THỐNG QUẢN LÝ ĐÀO TẠO THÔNG MINH - EG EDUCATION'],
      ['BÁO CÁO TỔNG HỢP KẾT QUẢ KHẢO SÁT & BIỂU QUYẾT LỚP HỌC'],
      [''],
      ['Tiêu đề thông báo:', announcement.title],
      ['Công văn tham chiếu:', announcement.aiSummary?.dispatchNo || 'N/A'],
      ['Giảng viên phụ trách:', announcement.author],
      ['Lớp áp dụng:', announcement.targetClass],
      ['Học phần:', announcement.subject || 'Cấu trúc dữ liệu & Giải thuật'],
      ['Thời gian phát hành:', announcement.createdAt],
      ['Hạn chót phản hồi:', announcement.deadline],
      ['Thời gian xuất file:', new Date().toLocaleString('vi-VN')],
      [''],
      ['CÂU HỎI KHẢO SÁT:', poll.question],
      [''],
      ['STT', 'PHƯƠNG ÁN LỰA CHỌN', 'SỐ PHIẾU BẦU', 'TỶ LỆ (%)', 'ĐÁNH GIÁ KẾT QUẢ']
    ];

    poll.options.forEach((opt, idx) => {
      const pct = poll.totalVotes > 0 ? ((opt.votes / poll.totalVotes) * 100).toFixed(1) : 0;
      const statusNote = opt.votes === Math.max(...poll.options.map(o => o.votes)) && opt.votes > 0 
        ? '>>> Phương án chiếm đa số cao nhất' 
        : 'Hợp lệ';

      summaryRows.push([
        idx + 1,
        opt.text,
        opt.votes,
        `${pct}%`,
        statusNote
      ]);
    });

    summaryRows.push(['']);
    summaryRows.push([
      'TỔNG CỘNG:',
      `Tổng số cử tri trong danh sách lớp: ${STUDENTS_K26_A.length} sinh viên`,
      poll.totalVotes,
      '100.0%',
      `Tỷ lệ phản hồi: ${((poll.totalVotes / STUDENTS_K26_A.length) * 100).toFixed(1)}% (${poll.totalVotes}/${STUDENTS_K26_A.length} SV)`
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Set column widths for Sheet 1
    wsSummary['!cols'] = [
      { wch: 8 },
      { wch: 65 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Thống Kê Tổng Hợp');

    // -------------------------------------------------------------
    // SHEET 2: DANH SÁCH CHI TIẾT 88 SINH VIÊN
    // -------------------------------------------------------------
    const detailRows = [
      ['DANH SÁCH CHI TIẾT BIỂU QUYẾT CỦA 88 SINH VIÊN CNTT K26'],
      [`Học phần: ${announcement.subject || 'Lớp CNTT K26'} • Giảng viên: ${announcement.author}`],
      [''],
      ['STT', 'MÃ SINH VIÊN', 'HỌ VÀ TÊN', 'NGÀY SINH', 'EMAIL GIÁO DỤC', 'PHƯƠNG ÁN ĐÃ CHỌN', 'THỜI GIAN GHI NHẬN', 'TRẠNG THÁI']
    ];

    STUDENTS_K26_A.forEach((stu, index) => {
      const voteRecord = poll.votesList.find(v => v.studentCode === stu.code);
      let selectedOptionText = 'Chưa tham gia biểu quyết';
      let votedTime = '---';
      let status = 'Chưa phản hồi (Cần gửi nhắc nhở)';

      if (voteRecord) {
        const opt = poll.options.find(o => o.id === voteRecord.optionId);
        selectedOptionText = opt ? opt.text : 'Đã bình chọn';
        votedTime = voteRecord.votedAt;
        status = 'Đã biểu quyết hợp lệ';
      }

      detailRows.push([
        index + 1,
        stu.code,
        stu.name,
        stu.dob,
        stu.email,
        selectedOptionText,
        votedTime,
        status
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

    // Set column widths for Sheet 2
    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 28 },
      { wch: 55 },
      { wch: 22 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi Tiết 88 Sinh Viên');

    // Tải file về máy người dùng
    const safeTitle = announcement.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
    const fileName = `EG_Bao_Cao_Binh_Chon_${safeTitle}_${Date.now().toString().slice(-4)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return fileName;
  }
};
