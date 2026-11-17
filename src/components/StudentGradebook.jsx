import React, { useState, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Scale, 
  Send, 
  HelpCircle, 
  BarChart3, 
  Clock, 
  FileText, 
  Check, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { gradebookService } from '../services/gradebook.js';
import { sound } from '../utils/sound.js';
import GradeWhatIfCalculator from './addons/GradeWhatIfCalculator';
import { K26_COMPLETED_COURSES } from '../data/curriculumK26.js';

export default function StudentGradebook({ activeStudentCode, triggerToast }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState(K26_COMPLETED_COURSES[0]?.code || 'KC213013');
  const currentCourse = K26_COMPLETED_COURSES.find((c) => c.code === selectedCourseCode) || K26_COMPLETED_COURSES[0];
  const [studentGrade, setStudentGrade] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [gradeSubTab, setGradeSubTab] = useState('grades'); // 'grades' | 'whatif'

  // Form state
  const [disputeComponent, setDisputeComponent] = useState('lab');
  const [expectedScore, setExpectedScore] = useState('8.5');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeStudentCode]);

  const loadData = () => {
    const list = gradebookService.getAll();
    const myRecord = list.find(s => s.studentCode === activeStudentCode) || list[0];
    setStudentGrade(myRecord);

    const allDisputes = gradebookService.getDisputes();
    const myDisputes = allDisputes.filter(d => d.studentCode === (myRecord?.studentCode || activeStudentCode));
    setDisputes(myDisputes);
  };

  const handleSubmitDispute = (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      triggerToast('Vui lòng nhập lý do và bằng chứng đối soát thắc mắc điểm!', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      let curScore = 8.0;
      if (studentGrade) {
        if (disputeComponent === 'attendance') curScore = studentGrade.attendanceScore;
        else if (disputeComponent === 'lab') curScore = studentGrade.labScore;
        else if (disputeComponent === 'midterm') curScore = studentGrade.midtermScore;
        else if (disputeComponent === 'bonus') curScore = studentGrade.bonusScore;
      }

      gradebookService.submitDispute({
        studentCode: studentGrade?.studentCode || activeStudentCode,
        studentName: studentGrade?.studentName || 'Sinh viên',
        component: disputeComponent,
        currentScore: curScore,
        expectedScore: parseFloat(expectedScore) || 8.0,
        reason: disputeReason
      });

      setDisputeReason('');
      setIsSubmitting(false);
      loadData();
      sound.success();
      triggerToast('Đã gửi đơn thắc mắc điểm thành công! Thầy/Cô sẽ đối soát và giải đáp sớm.');
    }, 500);
  };

  if (!studentGrade) return null;

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Top Banner & Personal Academic Identity */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30">
                Sổ Điểm Học Phần Tín Chỉ Trực Tuyến
              </span>
              <span className="text-xs text-slate-500">
                Mã HP: <strong className="font-mono text-slate-700 dark:text-slate-200">{currentCourse.code}</strong> ({currentCourse.credits} Tín chỉ • {currentCourse.semester})
              </span>
              <select
                value={selectedCourseCode}
                onChange={(e) => setSelectedCourseCode(e.target.value)}
                aria-label="Chọn học phần HK 1 đã học xong"
                className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                {K26_COMPLETED_COURSES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.credits} TC)
                  </option>
                ))}
              </select>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1">
              {currentCourse.name} • Giảng viên: ThS. Phạm Văn Thuận
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sinh viên: <strong className="text-slate-800 dark:text-slate-200">{studentGrade.studentName}</strong> • MSSV: <strong className="font-mono text-slate-800 dark:text-slate-200">{studentGrade.studentCode}</strong> • Lớp: {studentGrade.classId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 shadow-sm ${studentGrade.statusBadge}`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{studentGrade.statusLabel}</span>
          </span>
        </div>
      </div>

      {/* Early Warning Banner */}
      {studentGrade.status === 'banned' && (
        <div id="alert-banner-banned" className="p-4 sm:p-5 rounded-3xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-900 dark:text-rose-200 shadow-md flex items-start gap-3.5 animate-fadeIn">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm sm:text-base text-rose-700 dark:text-rose-300 flex items-center gap-2">
              🚨 CẢNH BÁO HỌC VỤ: VƯỢT NGƯỠNG NGHỈ HỌC ({currentCourse.code})
            </h4>
            <p className="text-xs text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
              Theo đối soát dữ liệu điểm danh, bạn đã vắng <strong>{studentGrade.unexcused} buổi không phép</strong> (quá 20% tổng số 15 buổi học quy định theo Quy chế Đào tạo 43/BGDĐT). Bạn hiện <strong>KHÔNG ĐỦ ĐIỀU KIỆN DỰ THI CUỐI KỲ</strong>.
            </p>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 pt-1">
              💡 Nếu bạn có minh chứng y tế nhập viện hoặc công tác đột xuất đã được cấp phép nhưng chưa cập nhật, hãy sử dụng form <strong>Khiếu Nại / Phúc Khảo Điểm</strong> phía dưới để gửi giải trình đến Thầy/Cô.
            </p>
          </div>
        </div>
      )}

      {studentGrade.status === 'warning' && (
        <div id="alert-banner-warning" className="p-4 sm:p-5 rounded-3xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-md flex items-start gap-3.5 animate-fadeIn">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm sm:text-base text-amber-700 dark:text-amber-300 flex items-center gap-2">
              ⚠️ CẢNH BÁO NGUY CƠ: ĐIỂM QUÁ TRÌNH / CHUYÊN CẦN Ở NGƯỠNG NGUY HIỂM
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              {studentGrade.unexcused >= 3 
                ? `Bạn đã vắng ${studentGrade.unexcused} buổi học. Chỉ còn vắng thêm 1 buổi nữa bạn sẽ bị cấm thi theo quy chế.`
                : `Điểm đánh giá quá trình hiện tại của bạn là ${studentGrade.finalProcessScore.toFixed(1)} (< 4.0). Bạn có nguy cơ cao phải học lại.`}
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 pt-1">
              Đề nghị bạn tham gia đầy đủ các buổi học tiếp theo và hoàn thành các bài tập lớn Lab để cải thiện điểm số.
            </p>
          </div>
        </div>
      )}

      {/* Big Master GPA Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-teal-500/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
            KẾT QUẢ ĐÁNH GIÁ QUÁ TRÌNH HIỆN TẠI
          </span>
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="text-4xl sm:text-5xl font-black text-teal-600 dark:text-[#00dfa2] font-mono">
              {studentGrade.finalProcessScore.toFixed(1)} <span className="text-sm font-medium text-slate-400">/ 10</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-slate-700 dark:text-slate-300">
                (GPA {studentGrade.gpa4.toFixed(1)})
              </span>
              <span className={`px-3 py-1 rounded-xl text-sm font-black font-mono border ${studentGrade.letterColor}`}>
                Điểm {studentGrade.letterGrade} • {studentGrade.gradeLabel}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Công thức: Chuyên cần (20%) + Thực hành Lab (30%) + Giữa kỳ (50%) + Điểm thưởng hoạt động
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 space-y-2 min-w-[260px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Mục tiêu Học Bổng (A &ge; 8.5):</span>
            <span className="text-teal-600 dark:text-[#00dfa2]">{studentGrade.finalProcessScore >= 8.5 ? 'ĐÃ ĐẠT 🏆' : `Còn ${(8.5 - studentGrade.finalProcessScore).toFixed(1)} điểm`}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((studentGrade.finalProcessScore / 10) * 100))}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tiến độ: {Math.round((studentGrade.finalProcessScore / 10) * 100)}%</span>
            <span>Học phần: 3 Tín chỉ</span>
          </div>
        </div>
      </div>

      {/* Segmented Sub-tab Bar */}
      <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex flex-wrap gap-1.5 mb-5">
        {[
          { id: 'grades', label: '📊 Bảng điểm Cá nhân chi tiết' },
          { id: 'whatif', label: '🎯 Mô phỏng Điểm thi What-If & ĐRL' }
        ].map(tab => {
          const isActive = gradeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`subtab-student-grade-${tab.id}`}
              onClick={() => setGradeSubTab(tab.id)}
              className={
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer'
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {gradeSubTab === 'whatif' && (
        <GradeWhatIfCalculator studentGrade={studentGrade} />
      )}

      {gradeSubTab === 'grades' && (
        <div className="space-y-4">

      {/* 4 Component Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Chuyên cần */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Chuyên Cần (20%)</span>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-[#00dfa2]">
              {studentGrade.attended}/15 buổi
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {studentGrade.attendanceScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>Tỷ lệ chuyên cần: <strong>{studentGrade.attendanceRate}%</strong></div>
            <div>Vắng: {studentGrade.unexcused} không phép • {studentGrade.excused} có phép</div>
          </div>
        </div>

        {/* Card 2: Thực hành Lab */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Thực Hành / Lab (30%)</span>
            <span className="text-xs font-bold text-slate-400">Đồ Án CDIO</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {studentGrade.labScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>Bài tập lớn: Cấu trúc Cây &amp; Đồ thị</div>
            <div className="text-emerald-600 dark:text-[#00dfa2] font-semibold">Đã nộp GitHub &amp; nghiệm thu</div>
          </div>
        </div>

        {/* Card 3: Kiểm tra giữa kỳ */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Giữa Kỳ (50%)</span>
            <span className="text-xs font-bold text-slate-400">Tự Luận + Code</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {studentGrade.midtermScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>Hình thức: Viết code tại phòng máy</div>
            <div>Thời gian: 90 phút • Chấm tự động</div>
          </div>
        </div>

        {/* Card 4: Điểm thưởng hoạt động */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">Điểm Thưởng (Cộng)</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-[#00dfa2]">
            +{studentGrade.bonusScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">điểm</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>Tham gia biểu quyết công văn AI</div>
            <div>Tích cực phát biểu &amp; hỗ trợ bạn học</div>
          </div>
        </div>

      </div>

      {/* Grade Dispute / Review Submission Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Form Gửi Khiếu Nại Điểm */}
        <div className="neu-card rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-lg space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Gửi Thắc Mắc &amp; Phúc Khảo Điểm Học Phần
              </h4>
              <p className="text-xs text-slate-500">
                Thầy/Cô sẽ kiểm tra đối soát bài làm, commit code hoặc giấy phép vắng học
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitDispute} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Cột điểm cần thắc mắc:
                </label>
                <select
                  value={disputeComponent}
                  onChange={(e) => setDisputeComponent(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-teal-500"
                >
                  <option value="lab">Điểm Thực Hành / Lab (30%)</option>
                  <option value="midterm">Điểm Giữa Kỳ (50%)</option>
                  <option value="attendance">Điểm Chuyên Cần (20%)</option>
                  <option value="bonus">Điểm Thưởng Hoạt Động</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Điểm mong muốn phúc khảo:
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={expectedScore}
                  onChange={(e) => setExpectedScore(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Lý do &amp; Minh chứng đối soát chi tiết:
                </label>
                <span className="text-[10px] text-teal-600 dark:text-[#00dfa2] font-semibold">Gợi ý nhanh 1-chạm:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pb-2">
                {[
                  'Có mặt trên lớp nhưng quét QR trễ do lỗi mạng',
                  'Đã nộp bài tập lớn Lab trên GitHub đúng hạn',
                  'Có đơn xin phép y tế đã được Thầy/Cô phê duyệt'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDisputeReason(chip)}
                    className="px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-[#00dfa2] text-[10px] font-medium transition-all cursor-pointer border border-teal-500/20"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Ví dụ: Em có nộp bài tập lớn trên GitHub đúng hạn ngày 28/10, hoặc buổi học ngày 24/10 em có đơn xin phép khám bệnh đã được duyệt mã LR-003..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              id="btn-submit-grade-dispute"
              disabled={isSubmitting || !disputeReason.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi thắc mắc...' : 'Gửi Đơn Phúc Khảo Đến Giảng Viên'}</span>
            </button>
          </form>
        </div>

        {/* Lịch Sử Các Đơn Phúc Khảo Đã Gửi */}
        <div className="neu-card rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Lịch Sử Phản Hồi Khiếu Nại Của Bạn</span>
            </h4>
            <span className="text-xs text-slate-400">{disputes.length} đơn</span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {disputes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Bạn chưa gửi đơn khiếu nại điểm nào.
              </div>
            ) : (
              disputes.map(d => (
                <div key={d.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080d19] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {d.componentLabel} ({d.currentScore} ➔ <span className="text-emerald-600 font-mono">{d.expectedScore}</span>)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.status === 'pending' ? 'bg-amber-500/20 text-amber-700' : (d.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600')
                    }`}>
                      {d.status === 'pending' ? 'Đang chờ duyệt' : (d.status === 'resolved' ? '✓ Đã chấp thuận' : '✕ Từ chối')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    "{d.reason}"
                  </p>
                  {d.resolutionNote && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-[#00dfa2]">
                      <strong>Giảng viên ({d.resolvedAt}):</strong> {d.resolutionNote}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

        </div>
      )}

    </div>
  );
}
