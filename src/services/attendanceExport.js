import * as XLSX from 'xlsx';

/**
 * Attendance Export Service for EG Education Platform
 * Generates official University-standard Attendance Minutes in Microsoft Excel (.xlsx) format
 */

export const attendanceExportService = {
  /**
   * Export Full Class Attendance Sheet to Excel
   * @param {Object} params
   * @param {Object} params.session Active attendance session info
   * @param {Array} params.students Merged student roster (all 91 students)
   * @param {string} params.className Class ID (e.g. 'K26 CNTT - Lớp A')
   * @param {string} params.subjectName Course Name
   * @param {string} params.teacherName Teacher Name
   * @param {string} params.room Room ID
   * @returns {string} Downloaded filename
   */
  exportAttendanceToExcel: ({
    session,
    students = [],
    className = 'K26 CNTT - Lớp A',
    subjectName = 'Cấu trúc dữ liệu & Giải thuật (IT204)',
    teacherName = 'ThS. Phạm Văn Thuận',
    room = 'Phòng Lab 02 - Tòa A3'
  }) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Compute metrics
    const total = students.length || 88;
    const presentList = students.filter(s => s.status === 'valid' || s.status === 'present');
    const absentList = students.filter(s => s.status === 'absent');
    const pendingList = students.filter(s => s.status === 'pending' || s.status === 'late');
    const excusedList = students.filter(s => s.status === 'excused');

    const presentCount = presentList.length;
    const absentCount = absentList.length;
    const pendingCount = pendingList.length;
    const excusedCount = excusedList.length;
    const rate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

    // Header & Administrative Block
    const rows = [
      ['BỘ GIÁO DỤC VÀ ĐÀO TẠO', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
      ['TRƯỜNG ĐẠI HỌC TÂY NGUYÊN', '', '', '', 'Độc lập - Tự do - Hạnh phúc'],
      ['KHOA CÔNG NGHỆ THÔNG TIN', '', '', '', '-------------------'],
      [''],
      ['BIÊN BẢN ĐIỂM DANH HỌC PHẦN GIẢNG ĐƯỜNG (DYNAMIC QR CODE)'],
      [`Hệ thống kiểm soát chuyên cần thời gian thực • Công nghệ Sliding Window Token`],
      [''],
      ['THÔNG TIN HỌC PHẦN & CA HỌC:'],
      ['Học phần:', subjectName, '', 'Giảng viên phụ trách:', teacherName],
      ['Lớp học phần:', className, '', 'Phòng học / Giảng đường:', room],
      ['Ngày điểm danh:', dateFormatted, '', 'Thời gian xuất biên bản:', timeFormatted],
      ['Mã phiên điểm danh:', session?.session_code || session?.id || 'SES-2026-IT204', '', 'Trạng thái phiên:', session?.status === 'closed' ? 'ĐÃ KHÓA SỔ (Finalized)' : 'Đang diễn ra (Active)'],
      ['Chu kỳ đổi mã Dynamic:', `${session?.token_interval || 3} giây / lần`, '', 'Trạm Wi-Fi định danh:', session?.wifi_ssid || 'EG_SmartCampus_Hall_A2'],
      [''],
      ['TỔNG HỢP SỐ LIỆU CHUYÊN CẦN:'],
      ['Tổng số sinh viên trong danh sách:', `${total} sinh viên`, '', 'Tỷ lệ có mặt:', `${rate}%`],
      ['Sinh viên có mặt hợp lệ:', `${presentCount} sinh viên`, '', 'Sinh viên vắng mặt:', `${absentCount} sinh viên`],
      ['Sinh viên cần duyệt (đến trễ):', `${pendingCount} sinh viên`, '', 'Sinh viên có phép:', `${excusedCount} sinh viên`],
      [''],
      [
        'STT',
        'Mã Sinh Viên',
        'Họ Và Tên Sinh Viên',
        'Email Sinh Viên',
        'Trạng Thái',
        'Thời Gian Quét',
        'Khoảng Cách GPS',
        'Trạm Wi-Fi Kết Nối',
        'Phương Thức',
        'Khớp Token',
        'Ghi Chú Xác Thực'
      ]
    ];

    // Student detail rows (All 91 students)
    students.forEach((s, idx) => {
      let statusLabel = 'Vắng mặt';
      if (s.status === 'valid' || s.status === 'present') {
        statusLabel = 'Có mặt (Hợp lệ)';
      } else if (s.status === 'pending' || s.status === 'late') {
        statusLabel = 'Cần duyệt (Đến trễ)';
      } else if (s.status === 'excused') {
        statusLabel = 'Có phép (Miễn điểm danh)';
      }

      let methodLabel = '--';
      if (s.isLiveDb || s.status === 'valid') {
        methodLabel = 'Dynamic QR Mobile';
      }

      let tokenMatch = '--';
      if (s.tokenMatchType === 'current') {
        tokenMatch = 'Mã hiện hành (3s)';
      } else if (s.tokenMatchType === 'grace_period') {
        tokenMatch = 'Cửa sổ trượt (+3s)';
      }

      let note = 'Chưa quét mã';
      if (s.status === 'valid') {
        note = 'Đã đối soát GPS & Token hợp lệ';
      } else if (s.status === 'pending') {
        note = 'Quét mã sau giờ quy định';
      } else if (s.status === 'absent') {
        note = 'Không có mặt tại phòng học';
      }

      rows.push([
        idx + 1,
        s.id || s.code || '',
        s.name || '',
        s.email || `${s.id || s.code}@sv.ttn.edu.vn`,
        statusLabel,
        s.time || '--:--:--',
        s.dist || '--',
        s.wifi || '--',
        methodLabel,
        tokenMatch,
        note
      ]);
    });

    // Signature Block at the end
    rows.push(
      [''],
      ['', '', '', '', `Đắk Lắk, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`],
      ['ĐẠI DIỆN LỚP TRƯỞNG', '', '', '', 'GIẢNG VIÊN PHỤ TRÁCH HỌC PHẦN'],
      ['(Ký và ghi rõ họ tên)', '', '', '', '(Ký và ghi rõ họ tên)'],
      [''],
      [''],
      [''],
      ['Trịnh Tuấn Kiệt', '', '', '', teacherName]
    );

    // Create workbook and sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set Column Widths for readability in Excel
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã SV
      { wch: 28 }, // Họ và Tên
      { wch: 30 }, // Email
      { wch: 22 }, // Trạng Thái
      { wch: 16 }, // Thời Gian Quét
      { wch: 18 }, // Khoảng Cách GPS
      { wch: 25 }, // Trạm Wi-Fi
      { wch: 20 }, // Phương Thức
      { wch: 22 }, // Khớp Token
      { wch: 32 }  // Ghi Chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Bien_Ban_Diem_Danh');

    // Generate clean filename
    const cleanClass = className.replace(/[^a-zA-Z0-9]/g, '_');
    const fileTimestamp = now.toISOString().slice(0, 10);
    const fileName = `Bien_Ban_Diem_Danh_${cleanClass}_${fileTimestamp}.xlsx`;

    // Trigger download
    XLSX.writeFile(wb, fileName);
    return fileName;
  },

  /**
   * Export Executive Dashboard Summary Report to Microsoft Excel (.xlsx) with 3 Sheets
   */
  exportExecutiveReportToExcel: ({
    timeframe = 'week',
    timeframeLabel = 'Tuần này',
    teacherName = 'ThS. Phạm Văn Thuận',
    currentClass = {},
    classes = [],
    students = [],
    pendingLeaveCount = 0
  } = {}) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const wb = XLSX.utils.book_new();

    const total = students.length;
    const zeroAbs = students.filter(s => (Number(s.absences) || 0) === 0).length;
    const oneTwoAbs = students.filter(s => { const a = Number(s.absences) || 0; return a === 1 || a === 2; }).length;
    const warnAbs = students.filter(s => (Number(s.absences) || 0) === 3).length;
    const bannedAbs = students.filter(s => (Number(s.absences) || 0) >= 4).length;
    const eligible = total - bannedAbs;
    const eligiblePct = total > 0 ? ((eligible / total) * 100).toFixed(1) : '0.0';
    const totalAbsSessions = students.reduce((sum, s) => sum + (Number(s.absences) || 0), 0);
    const liveValid = students.filter(s => s.status === 'valid' || s.status === 'present').length;

    // Sheet 1: Real KPI & Ktra Absence Breakdown
    const overviewRows = [
      ['BỘ GIÁO DỤC VÀ ĐÀO TẠO', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
      ['TRƯỜNG ĐẠI HỌC TÂY NGUYÊN — KHOA CNTT', '', '', 'Độc lập - Tự do - Hạnh phúc'],
      [''],
      ['BÁO CÁO THỐNG KÊ CHUYÊN CẦN LỚP HỌC (EG EDUCATION)'],
      [`Kỳ thống kê: ${timeframeLabel} (${timeframe})`, '', `Ngày xuất: ${dateFormatted} ${timeFormatted}`],
      [`Giảng viên báo cáo: ${teacherName}`, '', `Lớp đang chọn: ${currentClass.className || 'K26 CNTT - Lớp A'}`],
      [''],
      ['1. CHỈ SỐ THỰC TẾ TỪ DANH SÁCH LỚP EXCEL & SQLITE'],
      ['Chỉ tiêu đánh giá', 'Giá trị thực tế', 'Chi tiết', 'Ghi chú'],
      ['Tổng sĩ số lớp', `${total} SV`, `${eligible} SV đủ điều kiện dự thi (${eligiblePct}%)`, 'Quy chế: Vắng < 4 buổi'],
      ['Sinh viên đi đầy đủ (0 buổi nghỉ)', `${zeroAbs} SV`, `${total > 0 ? ((zeroAbs / total) * 100).toFixed(1) : '0.0'}%`, 'Cột Ktra = 0'],
      ['Sinh viên nghỉ 1–2 buổi', `${oneTwoAbs} SV`, `${total > 0 ? ((oneTwoAbs / total) * 100).toFixed(1) : '0.0'}%`, 'Trong ngưỡng an toàn'],
      ['Sinh viên cảnh báo (3 buổi nghỉ)', `${warnAbs} SV`, `${total > 0 ? ((warnAbs / total) * 100).toFixed(1) : '0.0'}%`, 'Cột Ktra = 3'],
      ['Sinh viên cấm thi (≥ 4 buổi nghỉ)', `${bannedAbs} SV`, `${total > 0 ? ((bannedAbs / total) * 100).toFixed(1) : '0.0'}%`, 'Vượt ngưỡng > 20%'],
      ['Tổng lượt nghỉ tích lũy (cột Ktra)', `${totalAbsSessions} buổi`, `Đơn nghỉ chờ duyệt: ${pendingLeaveCount}`, `Ca QR hiện tại: ${liveValid}/${total} có mặt`]
    ];

    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    wsOverview['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 38 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Tong_Quan_Dieu_Hanh');

    // Sheet 2: Teaching Classes Summary
    const classRows = [
      ['DANH SÁCH CÁC LỚP HỌC PHẦN PHỤ TRÁCH'],
      ['Mã lớp', 'Mã HP', 'Tên Học Phần', 'Lớp / Khóa', 'Phòng học', 'Lịch học', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ chuyên cần']
    ];
    classes.forEach((cls) => {
      classRows.push([
        cls.id,
        cls.code,
        cls.subject,
        cls.className,
        cls.room,
        cls.schedule,
        cls.studentsCount,
        cls.presentCount,
        cls.absentCount,
        cls.attendanceRate
      ]);
    });
    const wsClasses = XLSX.utils.aoa_to_sheet(classRows);
    wsClasses['!cols'] = [
      { wch: 14 }, { wch: 10 }, { wch: 38 }, { wch: 24 },
      { wch: 22 }, { wch: 34 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Lop_Hoc_Phu_Trach');

    // Sheet 3: Current Class Student Attendance Feed
    const studentRows = [
      [`CHI TIẾT ĐIỂM DANH & SỐ BUỔI NGHỈ (KTRA) LỚP ${currentClass.className || 'K26 CNTT - Lớp A'} (${students.length} SV)`],
      ['STT', 'MSSV', 'Họ và Tên', 'Số buổi nghỉ (Ktra)', 'Trạng thái ca QR', 'Thời gian quét', 'Khoảng cách GPS', 'Trạm Wi-Fi']
    ];
    students.forEach((s, idx) => {
      const statusText =
        s.status === 'valid' || s.status === 'present'
          ? 'Có mặt (Hợp lệ)'
          : s.status === 'excused'
          ? 'Có phép'
          : s.status === 'pending' || s.status === 'late'
          ? 'Cần duyệt'
          : 'Chưa điểm danh';
      studentRows.push([
        idx + 1,
        s.id || s.code || '',
        s.name || '',
        Number(s.absences) || 0,
        statusText,
        s.time || '--:--:--',
        s.dist || 'Chưa quét mã',
        s.wifi || '--'
      ]);
    });
    const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
    wsStudents['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Chi_Tiet_Chuyen_Can');

    const fileTimestamp = now.toISOString().slice(0, 10);
    const fileName = `Bao_Cao_Dieu_Hanh_Dao_Tao_EG_Education_${fileTimestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
  }
};
