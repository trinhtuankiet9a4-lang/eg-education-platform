import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Download, 
  Search, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Scale, 
  MessageSquare, 
  Sparkles, 
  ArrowUpDown, 
  UserCheck, 
  Sliders, 
  HelpCircle,
  FileCheck2,
  AlertCircle,
  BarChart3,
  X,
  Check
} from 'lucide-react';
import { gradebookService } from '../services/gradebook.js';
import { sound } from '../utils/sound.js';
import TrainingPointAndRiskAddon from './addons/TrainingPointAndRiskAddon';
import { extendedFeaturesService } from '../services/extendedFeatures.js';
import { K26_COMPLETED_COURSES } from '../data/curriculumK26.js';

export default function TeacherGradebook({ triggerToast }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState(K26_COMPLETED_COURSES[0]?.code || 'KC213013');
  const currentCourse = K26_COMPLETED_COURSES.find((c) => c.code === selectedCourseCode) || K26_COMPLETED_COURSES[0];
  const [gradeList, setGradeList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'eligible' | 'warning' | 'banned' | 'scholarship'
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Sub-tab state
  const [gradeSubTab, setGradeSubTab] = useState('scores'); // 'scores' | 'drl_risk' | 'disputes'

  // Dispute modal state
  const [disputes, setDisputes] = useState([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [activeDispute, setActiveDispute] = useState(null);
  const [disputeResolutionNote, setDisputeResolutionNote] = useState('');
  const [disputeApprovedScore, setDisputeApprovedScore] = useState('');

  // Load initial data (local instant render + SQLite backend sync)
  useEffect(() => {
    loadGradebookData();
    let cancelled = false;
    gradebookService.fetchFromBackend().then((syncedList) => {
      if (!cancelled && Array.isArray(syncedList) && syncedList.length > 0) {
        setGradeList(syncedList);
        setAnalytics(gradebookService.calculateAnalytics(syncedList));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadGradebookData = () => {
    const list = gradebookService.getAll();
    setGradeList(list);
    const stats = gradebookService.calculateAnalytics(list);
    setAnalytics(stats);
    const disp = gradebookService.getDisputes();
    setDisputes(disp);
  };

  // Handle Inline Grade Update
  const handleCellChange = (studentCode, field, value) => {
    const updatedStudent = gradebookService.updateStudentGrade(studentCode, field, value);
    const newList = gradeList.map(s => s.studentCode === studentCode ? updatedStudent : s);
    setGradeList(newList);
    setAnalytics(gradebookService.calculateAnalytics(newList));
  };

  // Sync from Attendance & Polls
  const handleSyncFromAttendance = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const synced = gradebookService.syncFromAttendanceAndPolls();
      setGradeList(synced);
      setAnalytics(gradebookService.calculateAnalytics(synced));
      setIsSyncing(false);
      sound.success();
      triggerToast('Đã tự động đồng bộ số liệu Chuyên cần QR & Biểu quyết vào sổ điểm!');
    }, 600);
  };

  // Broadcast Early Warning Notifications
  const handleBroadcastWarnings = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      const res = gradebookService.broadcastWarnings('ThS. Phạm Văn Thuận');
      setIsBroadcasting(false);
      sound.warning();
      triggerToast(`Đã phát lệnh cảnh báo sớm đến ${res.totalWarned} sinh viên (Cấm thi: ${res.bannedCount}, Nguy cơ: ${res.warningCount})!`);
    }, 600);
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const fileName = gradebookService.exportGradebookToExcel({
        subjectName: `${currentCourse.name} (${currentCourse.code})`,
        className: 'K26 CNTT - Lớp A',
        teacherName: 'ThS. Phạm Văn Thuận',
        credits: currentCourse.credits
      });
      sound.success();
      triggerToast(`Đã xuất Sổ điểm đánh giá quá trình thành công: ${fileName}!`);
    } catch (err) {
      triggerToast('Lỗi khi xuất file Excel: ' + err.message, 'error');
    }
  };

  // Resolve Dispute
  const handleResolveDisputeAction = (disputeId, action) => {
    try {
      const newScoreNum = disputeApprovedScore !== '' ? parseFloat(disputeApprovedScore) : undefined;
      const res = gradebookService.resolveDispute(disputeId, {
        action,
        resolutionNote: disputeResolutionNote || (action === 'approve' ? 'Giảng viên đã kiểm tra lại bài nộp và chấp thuận cập nhật điểm.' : 'Giảng viên giữ nguyên kết quả đánh giá ban đầu.'),
        newScore: newScoreNum
      });

      // Reload
      loadGradebookData();
      setActiveDispute(null);
      setDisputeResolutionNote('');
      setDisputeApprovedScore('');
      sound.success();
      triggerToast(action === 'approve' ? 'Đã chấp thuận khiếu nại và tự động điều chỉnh điểm số!' : 'Đã từ chối khiếu nại điểm!');
    } catch (err) {
      triggerToast('Lỗi xử lý khiếu nại: ' + err.message, 'error');
    }
  };

  // Filtered Students
  const filteredStudents = gradeList.filter(stu => {
    if (statusFilter !== 'all' && stu.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return stu.studentName.toLowerCase().includes(q) || stu.studentCode.includes(q);
    }
    return true;
  });

  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;

  const renderDisputesList = () => (
    <div className="space-y-4">
      {disputes.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          Không có đơn thắc mắc/khiếu nại nào từ sinh viên.
        </div>
      ) : (
        disputes.map((disp) => {
          const isPending = disp.status === 'pending';
          const isCurrentActive = activeDispute?.id === disp.id;

          return (
            <div
              key={disp.id}
              className={`p-4 rounded-2xl border transition-all ${
                isPending
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d19]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                    {disp.id}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {disp.studentName} ({disp.studentCode})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-[#00dfa2]">
                    {disp.componentLabel}
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                  isPending ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : (disp.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2]' : 'bg-rose-500/20 text-rose-600')
                }`}>
                  {isPending ? 'Chờ Giảng viên duyệt' : (disp.status === 'resolved' ? 'Đã duyệt & điều chỉnh' : 'Đã từ chối')}
                </span>
              </div>

              <div className="pt-2 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span>Điểm hiện tại: <strong className="text-slate-900 dark:text-white font-mono">{disp.currentScore}</strong></span>
                  <span>Điểm đề xuất: <strong className="text-emerald-600 font-mono">{disp.expectedScore}</strong></span>
                  <span>Thời gian gửi: {disp.submittedAt}</span>
                </div>
                <p className="p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed">
                  <strong>Lý do sinh viên nêu:</strong> &ldquo;{disp.reason}&rdquo;
                </p>
              </div>

              {/* Result Note if resolved */}
              {disp.resolutionNote && (
                <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-[#00dfa2]">
                  <strong>Kết luận của Giảng viên ({disp.resolvedAt}):</strong> {disp.resolutionNote}
                </div>
              )}

              {/* Action buttons if pending */}
              {isPending && (
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDispute(disp);
                      setDisputeApprovedScore(disp.expectedScore.toString());
                      setDisputeResolutionNote(`Chấp thuận phúc khảo bài tập Lab, cập nhật điểm từ ${disp.currentScore} thành ${disp.expectedScore}.`);
                    }}
                    className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isCurrentActive ? 'Đang mở khung xử lý...' : 'Xử lý khiếu nại này'}</span>
                  </button>
                </div>
              )}

              {/* Active Resolution Box */}
              {isCurrentActive && (
                <div className="mt-3 p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border-2 border-emerald-500/40 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Điểm số sau điều chỉnh (hệ 10):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={disputeApprovedScore}
                        onChange={(e) => setDisputeApprovedScore(e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Phản hồi kết luận của Giảng viên:
                      </label>
                      <input
                        type="text"
                        value={disputeResolutionNote}
                        onChange={(e) => setDisputeResolutionNote(e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolveDisputeAction(disp.id, 'reject')}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/50 text-rose-600 text-xs font-bold hover:bg-rose-50 cursor-pointer"
                    >
                      Từ chối khiếu nại
                    </button>
                    <button
                      type="button"
                      id={`btn-approve-dispute-${disp.id}`}
                      onClick={() => handleResolveDisputeAction(disp.id, 'approve')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Chấp thuận &amp; Cập nhật Sổ điểm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Top Banner & Subject Metadata */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-800 dark:text-[#00dfa2] border border-emerald-500/30">
                Sổ Điểm Đánh Giá Quá Trình Học Phần (Tín Chỉ)
              </span>
              <span className="text-xs text-slate-500">Học kỳ I (HK 1) • Chính quy 2025 - 2026</span>
              <select
                value={selectedCourseCode}
                onChange={(e) => setSelectedCourseCode(e.target.value)}
                aria-label="Chọn học phần HK 1"
                className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {K26_COMPLETED_COURSES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.credits} TC)
                  </option>
                ))}
              </select>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1">
              {currentCourse.name} ({currentCourse.code} • {currentCourse.credits} TC) • Lớp K26 CNTT - Lớp A
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Trọng số chuẩn Bộ GD&amp;ĐT: Chuyên cần (20%) • Thực hành/Lab (30%) • Giữa kỳ (50%) • Điểm quá trình tối đa 10.0
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-sync-gradebook"
            onClick={handleSyncFromAttendance}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-slate-700 dark:text-slate-200 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Đồng bộ tự động số buổi vắng và điểm chuyên cần từ các ca điểm danh QR"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Điểm Danh QR'}</span>
          </button>

          <button
            type="button"
            id="btn-open-disputes-modal"
            onClick={() => setShowDisputeModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm relative"
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>Khiếu Nại Điểm ({disputes.length})</span>
            {pendingDisputesCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse absolute -top-1 -right-1" />
            )}
          </button>

          <button
            type="button"
            id="btn-broadcast-early-warning"
            onClick={handleBroadcastWarnings}
            disabled={isBroadcasting}
            className="px-3.5 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Tự động phát lệnh cảnh báo sớm đến tất cả sinh viên diện Cấm thi và Nguy cơ rớt môn"
          >
            <AlertTriangle className={`w-3.5 h-3.5 text-rose-600 ${isBroadcasting ? 'animate-bounce' : ''}`} />
            <span>{isBroadcasting ? 'Đang gửi...' : `Phát Cảnh Báo Sớm (${(analytics?.bannedCount || 0) + (analytics?.warningCount || 0)})`}</span>
          </button>

          <button
            type="button"
            id="btn-export-gradebook-excel"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Chuẩn Mẫu</span>
          </button>
        </div>
      </div>

      {/* Segmented Sub-tab Bar */}
      <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex flex-wrap gap-1.5 mb-5">
        {[
          { id: 'scores', label: '📊 Bảng điểm Học phần 88 SV' },
          { id: 'drl_risk', label: '🏅 Điểm Rèn luyện & Dự báo Rủi ro AI' },
          { id: 'disputes', label: '⚖️ Giải quyết Phúc khảo Điểm', badge: pendingDisputesCount }
        ].map(tab => {
          const isActive = gradeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`subtab-teacher-grade-${tab.id}`}
              onClick={() => setGradeSubTab(tab.id)}
              className={
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2'
              }
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badge > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {gradeSubTab === 'drl_risk' && (
        <TrainingPointAndRiskAddon role="teacher" gradeList={gradeList} triggerToast={triggerToast} />
      )}

      {gradeSubTab === 'disputes' && (
        <div id="panel-teacher-disputes" className="neu-card rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-sm space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Hội Đồng Tiếp Nhận &amp; Xử Lý Khiếu Nại Điểm Học Phần
                </h4>
                <p className="text-xs text-slate-500">
                  Đối soát minh chứng học tập và điều chỉnh trực tiếp điểm vào hệ thống
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingDisputesCount > 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  {pendingDisputesCount} đơn chờ xử lý
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                  Đã xử lý hết
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Tổng {disputes.length} đơn
              </span>
            </div>
          </div>

          {renderDisputesList()}
        </div>
      )}

      {gradeSubTab === 'scores' && (
        <div className="space-y-4">

      {/* Analytics KPI Ribbon */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">Sĩ Số Học Phần</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {analytics.total} <span className="text-xs font-medium text-slate-400">SV</span>
            </div>
            <span className="text-[10px] text-teal-600 dark:text-[#00dfa2] font-semibold mt-0.5 block">100% Đã vào điểm</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">Điểm TB Quá Trình</span>
            <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-[#00dfa2] mt-1 font-mono">
              {analytics.avgScore10} <span className="text-xs font-medium text-slate-400">/ 10</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">GPA TB: {analytics.avgGpa} / 4.0</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">Tỷ Lệ Đủ ĐK Thi</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {analytics.passRate}%
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{analytics.eligibleCount}/{analytics.total} sinh viên</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Cấm Thi (Vắng &gt; 20%)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {analytics.bannedCount} <span className="text-xs font-medium text-rose-400">SV</span>
            </div>
            <span className="text-[10px] text-rose-600/80 mt-0.5 block font-semibold">Tự động khóa điểm thi</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Cảnh Báo Rớt Môn
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              {analytics.warningCount} <span className="text-xs font-medium text-amber-500">SV</span>
            </div>
            <span className="text-[10px] text-amber-700/80 mt-0.5 block font-semibold">Điểm quá trình &lt; 4.0</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-400 block flex items-center gap-1">
              <Award className="w-3 h-3" /> Dự Kiến Học Bổng
            </span>
            <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
              {analytics.scholarshipCount} <span className="text-xs font-medium text-purple-400">SV</span>
            </div>
            <span className="text-[10px] text-purple-700/80 mt-0.5 block font-semibold">Điểm quá trình &ge; 8.5 (A)</span>
          </div>
        </div>
      )}

      {/* Grade Distribution Visualization */}
      {analytics && (
        <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>Phổ Điểm Chữ Toàn Lớp (Thang Tín Chỉ Đại Học)</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Công thức: Chuyên cần 20% + Thực hành 30% + Giữa kỳ 50% + Điểm thưởng
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
            {[
              { grade: 'A', score: '8.5 - 10', count: analytics.distribution['A'], color: 'bg-emerald-500 text-white' },
              { grade: 'B+', score: '8.0 - 8.4', count: analytics.distribution['B+'], color: 'bg-teal-500 text-white' },
              { grade: 'B', score: '7.0 - 7.9', count: analytics.distribution['B'], color: 'bg-sky-500 text-white' },
              { grade: 'C+', score: '6.5 - 6.9', count: analytics.distribution['C+'], color: 'bg-blue-500 text-white' },
              { grade: 'C', score: '5.5 - 6.4', count: analytics.distribution['C'], color: 'bg-amber-500 text-white' },
              { grade: 'D+', score: '5.0 - 5.4', count: analytics.distribution['D+'], color: 'bg-orange-500 text-white' },
              { grade: 'D', score: '4.0 - 4.9', count: analytics.distribution['D'], color: 'bg-rose-500 text-white' },
              { grade: 'F', score: '< 4.0', count: analytics.distribution['F'], color: 'bg-red-600 text-white' }
            ].map(item => {
              const pct = analytics.total > 0 ? Math.round((item.count / analytics.total) * 100) : 0;
              return (
                <div key={item.grade} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{item.grade}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${item.color}`}>
                      {item.count} SV
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{pct}%</div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color.split(' ')[0]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="neu-card rounded-3xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-gradebook-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo họ tên hoặc MSSV..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Lọc:
          </span>
          {[
            { id: 'all', label: 'Tất cả (50)' },
            { id: 'eligible', label: 'Đủ ĐK Thi' },
            { id: 'scholarship', label: 'Học Bổng (A)' },
            { id: 'warning', label: 'Cảnh Báo' },
            { id: 'banned', label: '🔴 CẤM THI' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              id={`filter-grade-${f.id}`}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Excel-like Gradebook Grid */}
      <div className="neu-card rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Danh Sách Điểm 88 Sinh Viên • Lớp CNTT K26
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30">
              Hiển thị {filteredStudents.length} sinh viên
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-3">
            <span>💡 Click trực tiếp vào ô điểm để sửa (Auto-calculate)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Tự động khóa thi nếu vắng &gt; 20%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1520px] text-left border-collapse" id="gradebook-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#080d19] border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-28">MSSV</th>
                <th className="py-3 px-4 w-48">Họ và Tên</th>
                <th className="py-3 px-3 text-center w-28">Chuyên Cần</th>
                <th className="py-3 px-3 text-center w-24">CC (20%)</th>
                <th className="py-3 px-3 text-center w-24">Lab (30%)</th>
                <th className="py-3 px-3 text-center w-24">Giữa Kỳ (50%)</th>
                <th className="py-3 px-3 text-center w-20">Thưởng</th>
                <th className="py-3 px-3 text-center w-28 bg-emerald-500/10 text-emerald-800 dark:text-[#00dfa2]">QUÁ TRÌNH</th>
                <th className="py-3 px-2 text-center w-16">Hệ 4</th>
                <th className="py-3 px-2 text-center w-16">Điểm Chữ</th>
                <th id="col-header-drl" className="py-3 px-3 text-center w-28 bg-teal-500/10 text-teal-800 dark:text-[#00dfa2]">ĐRL (100)</th>
                <th className="py-3 px-3 text-center w-36">Tình Trạng</th>
                <th id="col-header-academic-note" className="py-3 px-3 min-w-[330px] w-80 text-left whitespace-nowrap">Ghi Chú Học Vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredStudents.map((stu) => {
                const isBanned = stu.status === 'banned';
                const isScholarship = stu.status === 'scholarship';
                const isWarning = stu.status === 'warning';

                return (
                  <tr 
                    key={stu.studentCode}
                    className={`transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                      isBanned ? 'bg-rose-500/5' : (isScholarship ? 'bg-purple-500/5' : '')
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {stu.stt}
                    </td>

                    {/* MSSV */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stu.studentCode}
                    </td>

                    {/* Họ và Tên */}
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{stu.studentName}</span>
                        {isScholarship && <Award className="w-3.5 h-3.5 text-purple-600 shrink-0" title="Đạt học bổng" />}
                        {isBanned && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" title="Cấm thi" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">NS: {stu.dob || '01/01/2008'}</div>
                    </td>

                    {/* Chuyên Cần Buổi Vắng */}
                    <td className="py-3 px-3 text-center">
                      <div className="text-[11px] font-mono font-bold">
                        {stu.attended}/15 buổi
                      </div>
                      <div className={`text-[10px] font-semibold ${isBanned ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        {stu.unexcused > 0 ? `${stu.unexcused} KP` : ''} {stu.excused > 0 ? `${stu.excused} CP` : ''}
                        {stu.unexcused === 0 && stu.excused === 0 ? '✓ Đầy đủ' : ''}
                      </div>
                    </td>

                    {/* Điểm Chuyên cần (20%) - Tự động tính */}
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-800 dark:text-slate-200">
                      <span className={`px-2 py-1 rounded-lg ${stu.attendanceScore < 5 ? 'bg-rose-500/20 text-rose-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {stu.attendanceScore.toFixed(1)}
                      </span>
                    </td>

                    {/* Điểm Lab/BT (30%) - Editable */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        id={`input-lab-${stu.studentCode}`}
                        min="0"
                        max="10"
                        step="0.5"
                        value={stu.labScore}
                        onChange={(e) => handleCellChange(stu.studentCode, 'labScore', e.target.value)}
                        className="w-16 p-1.5 text-center font-mono font-bold rounded-lg bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Điểm Giữa kỳ (50%) - Editable */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        id={`input-midterm-${stu.studentCode}`}
                        min="0"
                        max="10"
                        step="0.5"
                        value={stu.midtermScore}
                        onChange={(e) => handleCellChange(stu.studentCode, 'midtermScore', e.target.value)}
                        className="w-16 p-1.5 text-center font-mono font-bold rounded-lg bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 dark:text-white"
                      />
                    </td>

                    {/* Điểm Thưởng - Editable */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        id={`input-bonus-${stu.studentCode}`}
                        min="0"
                        max="2"
                        step="0.5"
                        value={stu.bonusScore}
                        onChange={(e) => handleCellChange(stu.studentCode, 'bonusScore', e.target.value)}
                        className="w-14 p-1.5 text-center font-mono font-bold rounded-lg bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-xs text-teal-600 dark:text-[#00dfa2]"
                      />
                    </td>

                    {/* ĐIỂM QUÁ TRÌNH (Hệ 10) - Auto Weighted */}
                    <td className="py-3 px-3 text-center bg-emerald-500/5">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
                        isBanned
                          ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                          : (isScholarship ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40' : 'bg-emerald-500/15 text-emerald-800 dark:text-[#00dfa2] border-emerald-500/30')
                      }`}>
                        {stu.finalProcessScore.toFixed(1)}
                      </span>
                    </td>

                    {/* GPA Hệ 4 */}
                    <td className="py-3 px-2 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300">
                      {stu.gpa4.toFixed(1)}
                    </td>

                    {/* Điểm Chữ */}
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs border ${stu.letterColor}`}>
                        {stu.letterGrade}
                      </span>
                    </td>

                    {/* Điểm Rèn Luyện ĐRL (Thang 100 - Đồng bộ từ Nhà trường) */}
                    <td className="py-3 px-2 text-center bg-teal-500/5">
                      {(() => {
                        const drlRec = extendedFeaturesService.getStudentDrlRecord(stu.studentCode, stu.stt || 0);
                        return (
                          <div className="flex flex-col items-center">
                            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${
                              drlRec.drlScore >= 80
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border-emerald-500/30'
                                : drlRec.drlScore >= 65
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            }`}>
                              {drlRec.drlScore}/100
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">{drlRec.drlRank}</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Tình Trạng Dự Thi */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${stu.statusBadge}`}>
                        {stu.statusLabel}
                      </span>
                    </td>

                    {/* Ghi Chú Học Vụ */}
                    <td className="py-3 px-3 min-w-[330px] w-80">
                      <input
                        type="text"
                        value={stu.teacherNote || ''}
                        onChange={(e) => handleCellChange(stu.studentCode, 'teacherNote', e.target.value)}
                        placeholder="Nhập ghi chú học vụ..."
                        title={stu.teacherNote || ''}
                        className="min-w-[305px] w-full px-2.5 py-1.5 rounded-lg bg-slate-50/80 dark:bg-[#090e1a]/80 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-[#0c1424] focus:border-emerald-500 text-xs font-medium text-slate-700 dark:text-slate-200"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* MODAL: Quản Lý & Xử Lý Khiếu Nại Điểm Của Sinh Viên */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Hội Đồng Tiếp Nhận &amp; Xử Lý Khiếu Nại Điểm Học Phần
                  </h4>
                  <p className="text-xs text-slate-500">
                    Đối soát minh chứng học tập và điều chỉnh trực tiếp điểm vào hệ thống
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderDisputesList()}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
