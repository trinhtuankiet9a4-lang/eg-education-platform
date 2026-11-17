import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCode, 
  RefreshCw, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Download, 
  Check, 
  X, 
  Award, 
  Send,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { assignmentService } from '../services/assignments.js';
import { sound } from '../utils/sound.js';
import GroupProjectChecklistAddon from './addons/GroupProjectChecklistAddon';
import CodeSimilarityMossModal from './addons/CodeSimilarityMossModal';
import { SpeedGraderSnippetsBar, PeerReviewCalibrationAddon } from './addons/SpeedGraderSnippetsBar';

export default function TeacherAssignments({ triggerToast }) {
  const [assignments, setAssignments] = useState([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState(2); // Default to Lab 2
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'submitted' | 'unsubmitted' | 'graded'
  const [assignSubMode, setAssignSubMode] = useState('individual'); // 'individual' | 'group_ci' | 'moss' | 'peer'

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('2026-11-25T23:59');
  const [newWeight, setNewWeight] = useState('30');
  const [isCreating, setIsCreating] = useState(false);

  // Grading modal state
  const [activeGradingStudent, setActiveGradingStudent] = useState(null);
  const [gradeScore, setGradeScore] = useState('9.0');
  const [gradeFeedback, setGradeFeedback] = useState('Code chuẩn thuật toán, tối ưu cấu trúc dữ liệu tốt.');
  const [isGrading, setIsGrading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    if (activeAssignmentId) {
      loadSubmissions(activeAssignmentId);
    }
  }, [activeAssignmentId]);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const list = await assignmentService.getAll();
      setAssignments(list);
      if (list.length > 0 && !activeAssignmentId) {
        setActiveAssignmentId(list[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async (assignmentId) => {
    const list = await assignmentService.getSubmissions(assignmentId);
    setSubmissions(list);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      triggerToast('Vui lòng nhập tiêu đề bài Lab!', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const res = await assignmentService.createAssignment({
        title: newTitle,
        description: newDesc,
        deadline: newDeadline,
        weightPercent: parseFloat(newWeight)
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      await loadAssignments();
      if (res.assignmentId) setActiveAssignmentId(res.assignmentId);
      sound.success();
      triggerToast('Đã phát động bài thực hành Lab mới thành công đến 88 sinh viên!');
    } catch (err) {
      triggerToast('Lỗi tạo bài tập: ' + err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenGradeModal = (sub) => {
    setActiveGradingStudent(sub);
    setGradeScore(sub.score !== null && sub.score !== undefined ? sub.score.toString() : '8.5');
    setGradeFeedback(sub.teacherFeedback || 'Cài đặt thuật toán chính xác, code sạch, đáp ứng đúng yêu cầu đề bài.');
  };

  const handleConfirmGrade = async () => {
    if (!activeGradingStudent) return;
    setIsGrading(true);
    try {
      await assignmentService.gradeSubmission(activeGradingStudent.submissionId, {
        score: gradeScore,
        teacherFeedback: gradeFeedback,
        studentCode: activeGradingStudent.studentCode,
        assignmentId: activeAssignmentId
      });
      await loadSubmissions(activeAssignmentId);
      await loadAssignments();
      setActiveGradingStudent(null);
      sound.success();
      triggerToast(`Đã chấm ${gradeScore} điểm và tự động đồng bộ vào cột Lab của Sổ Điểm!`);
    } catch (err) {
      triggerToast('Lỗi chấm điểm: ' + err.message, 'error');
    } finally {
      setIsGrading(false);
    }
  };

  const handleSyncAllToGradebook = async () => {
    setIsSyncingAll(true);
    try {
      await assignmentService.syncAllToGradebook();
      await loadAssignments();
      sound.success();
      triggerToast('Đã tự động tổng hợp và đồng bộ điểm Lab của toàn bộ 88 sinh viên vào Sổ Điểm Quá Trình!');
    } catch (err) {
      triggerToast('Lỗi đồng bộ: ' + err.message, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) || assignments[0];

  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter === 'submitted' && !s.hasSubmitted) return false;
    if (statusFilter === 'unsubmitted' && s.hasSubmitted) return false;
    if (statusFilter === 'graded' && s.status !== 'graded') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return s.studentName.toLowerCase().includes(q) || s.studentCode.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Top Banner & Control Ribbon */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Trung Tâm Quản Lý Bài Tập &amp; Thực Hành Lab (IT204)
              </span>
              <span className="text-xs text-slate-500">Lớp CNTT K26 • 88 Sinh viên</span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
              Giao Bài Tập Lớn, Nhận Mã Nguồn GitHub &amp; Chấm Điểm Tự Động
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Điểm thực hành Lab chiếm <strong>30% điểm quá trình</strong>. Tự động tính trung bình theo trọng số và liên thông trực tiếp với Sổ Điểm.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-sync-lab-gradebook"
            onClick={handleSyncAllToGradebook}
            disabled={isSyncingAll}
            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-slate-700 dark:text-slate-200 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Đồng bộ điểm Lab đã chấm của toàn bộ sinh viên vào cột Lab của Sổ Điểm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Đang đồng bộ...' : 'Đồng Bộ Vào Sổ Điểm'}</span>
          </button>

          <button
            type="button"
            id="btn-create-assignment"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Giao Bài Lab Mới</span>
          </button>
        </div>
      </div>

      {/* Segmented Sub-tab Bar */}
      <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex flex-wrap gap-1.5 mb-5">
        {[
          { id: 'individual', label: '💻 Bài tập & Thực hành Lab' },
          { id: 'group_ci', label: '👥 Đồ án Nhóm (Hệ số C_i)' },
          { id: 'moss', label: '🔍 Quét Trùng lặp Code' },
          { id: 'peer', label: '⚖️ Chấm chéo Đồng cấp' }
        ].map(tab => {
          const isActive = assignSubMode === tab.id;
          return (
            <button
              key={tab.id}
              id={`subtab-teacher-assign-${tab.id}`}
              type="button"
              onClick={() => setAssignSubMode(tab.id)}
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

      {assignSubMode === 'group_ci' && (
        <GroupProjectChecklistAddon role="teacher" triggerToast={triggerToast} />
      )}
      {assignSubMode === 'moss' && (
        <CodeSimilarityMossModal triggerToast={triggerToast} />
      )}
      {assignSubMode === 'peer' && (
        <PeerReviewCalibrationAddon role="teacher" triggerToast={triggerToast} />
      )}

      {/* Assignment Empty State */}
      {assignSubMode === 'individual' && !isLoading && assignments.length === 0 && (
        <div id="empty-teacher-assignments" className="neu-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
            <FileCode className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            Hiện chưa có Bài tập &amp; Thực hành Lab nào được giao
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Lớp CNTT K26 hiện chưa có bài thực hành Lab nào. Hãy bấm nút bên dưới để tạo và giao bài tập mới cho 88 sinh viên.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Giao Bài Lab Mới</span>
          </button>
        </div>
      )}

      {/* Assignment Selector Cards */}
      {assignSubMode === 'individual' && assignments.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assignments.map(assign => {
          const isSelected = assign.id === activeAssignmentId;
          const subCount = assign.submittedCount || 0;
          const pct = Math.round((subCount / (assign.totalStudents || 88)) * 100);

          return (
            <button
              key={assign.id}
              type="button"
              id={`assignment-tab-${assign.id}`}
              onClick={() => setActiveAssignmentId(assign.id)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer relative space-y-2.5 ${
                isSelected
                  ? 'bg-purple-500/10 dark:bg-purple-950/20 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                  : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-black font-mono border border-purple-500/30">
                  {assign.assignmentCode || assign.assignment_code} • Trọng số {assign.weightPercent || assign.weight_percent}%
                </span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {assign.deadlineFormatted || (assign.deadline ? assign.deadline.slice(0, 10) : '')}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                {assign.title}
              </h4>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Tiến độ nộp bài:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    {subCount}/88 SV ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <span>Đã chấm: <strong className="text-emerald-600 dark:text-[#00dfa2]">{assign.gradedCount || 0}/88</strong></span>
                {assign.avgScore && <span>Điểm TB: <strong className="font-mono text-purple-600 dark:text-purple-400">{assign.avgScore}</strong>/10</span>}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Submissions Section for Active Assignment */}
      {assignSubMode === 'individual' && activeAssignment && (
        <div className="neu-card rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                <span>Danh Sách 88 Sinh Viên &amp; Bài Nộp: {activeAssignment.title}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeAssignment.description}
              </p>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-submission-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: `Tất cả (${submissions.length || 88})` },
                { id: 'submitted', label: `Đã nộp (${submissions.filter(s => s.hasSubmitted).length})` },
                { id: 'graded', label: `Đã chấm (${submissions.filter(s => s.status === 'graded').length})` },
                { id: 'unsubmitted', label: `Chưa nộp (${submissions.filter(s => !s.hasSubmitted).length})` }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of 50 Students */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#080d19] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Mã SV</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Trạng Thái</th>
                  <th className="p-3">Bài Nộp / Kho Mã Nguồn</th>
                  <th className="p-3">Thời Điểm Nộp</th>
                  <th className="p-3 text-center">Điểm Lab</th>
                  <th className="p-3">Lời Phê Của Thầy/Cô</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.studentCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all">
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{sub.studentCode}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{sub.studentName}</td>
                    <td className="p-3">
                      {sub.status === 'graded' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                          Đã chấm ({sub.score}/10)
                        </span>
                      ) : sub.hasSubmitted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Chờ chấm
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                          Chưa nộp
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {sub.githubRepoUrl ? (
                        <a 
                          href={sub.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline font-mono text-[11px] font-bold"
                        >
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{sub.githubRepoUrl.replace('https://github.com/', '')}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : sub.fileName ? (
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          <FileCode className="w-3.5 h-3.5 text-teal-600" />
                          <span>{sub.fileName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Trống</span>
                      )}
                    </td>

                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {sub.submittedAt || '—'}
                    </td>

                    <td className="p-3 text-center font-mono font-black text-sm">
                      {sub.score !== null && sub.score !== undefined ? (
                        <span className="text-emerald-600 dark:text-[#00dfa2]">{sub.score}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {sub.teacherFeedback || '—'}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        id={`btn-grade-student-${sub.studentCode}`}
                        onClick={() => handleOpenGradeModal(sub)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          sub.hasSubmitted
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {sub.status === 'graded' ? 'Chấm Lại' : 'Chấm Điểm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {activeGradingStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="neu-card rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0c1424] border border-purple-500/30 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Chấm Điểm Bài Thực Hành Lab
                  </h4>
                  <p className="text-xs text-slate-500">
                    {activeGradingStudent.studentName} • MSSV: <strong className="font-mono">{activeGradingStudent.studentCode}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveGradingStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submission Preview Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kho mã nguồn / Tệp:</span>
                {activeGradingStudent.githubRepoUrl ? (
                  <a
                    href={activeGradingStudent.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-bold font-mono flex items-center gap-1"
                  >
                    <span>{activeGradingStudent.githubRepoUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {activeGradingStudent.fileName || 'Không có tệp'}
                  </span>
                )}
              </div>
              {activeGradingStudent.studentNote && (
                <div className="pt-1 text-slate-600 dark:text-slate-400 italic">
                  &ldquo;{activeGradingStudent.studentNote}&rdquo;
                </div>
              )}
            </div>

            {/* Score Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Điểm số (Thang điểm 10.0):
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                id="input-grade-score"
                value={gradeScore}
                onChange={(e) => setGradeScore(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-lg font-mono font-black text-purple-700 dark:text-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Quick Feedback Chips */}
            <SpeedGraderSnippetsBar
              onApplySnippet={(sc, txt) => {
                setGradeScore(sc);
                setGradeFeedback(txt);
              }}
            />
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Gợi ý nhận xét nhanh:
              </label>
              <div className="flex flex-wrap gap-1.5 pb-2">
                {[
                  'Code chuẩn thuật toán, tối ưu tốt',
                  'Cài đặt Min-Heap chính xác O((V+E)logV)',
                  'Thiếu test case kiểm thử đồ thị âm'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setGradeFeedback(chip)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-500/20 cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                id="textarea-grade-feedback"
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Nhận xét chi tiết của Thầy/Cô gửi cho sinh viên..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveGradingStudent(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                id="btn-confirm-grade"
                onClick={handleConfirmGrade}
                disabled={isGrading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isGrading ? 'Đang lưu...' : 'Lưu Điểm & Cập Nhật Sổ Điểm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="neu-card rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0c1424] border border-purple-500/30 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Giao Bài Thực Hành Lab / Bài Tập Lớn Mới
                  </h4>
                  <p className="text-xs text-slate-500">Môn học: Cấu trúc dữ liệu &amp; Giải thuật (IT204)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề bài Lab / Đồ án *
                </label>
                <input
                  type="text"
                  id="input-assignment-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Lab 4: Bảng băm &amp; Thuật toán phân rã chuỗi Rabin-Karp..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Yêu cầu kỹ thuật &amp; Rubric chấm điểm:
                </label>
                <textarea
                  rows={3}
                  id="input-assignment-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mô tả chi tiết yêu cầu, chuẩn đầu ra và tiêu chí đánh giá..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hạn chót nộp bài *
                  </label>
                  <input
                    type="datetime-local"
                    id="input-assignment-deadline"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Trọng số cột Lab (%)
                  </label>
                  <select
                    id="input-assignment-weight"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="20">20% cột Lab</option>
                    <option value="30">30% cột Lab</option>
                    <option value="40">40% cột Lab</option>
                    <option value="50">50% cột Lab</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  id="btn-confirm-create-assignment"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Đang tạo...' : 'Phát Động Bài Lab Đến Sinh Viên'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
