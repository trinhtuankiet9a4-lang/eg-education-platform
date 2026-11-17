import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  FileCode, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Award, 
  Sparkles,
  UploadCloud,
  FileCheck2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { assignmentService } from '../services/assignments.js';
import { sound } from '../utils/sound.js';
import GroupProjectChecklistAddon from './addons/GroupProjectChecklistAddon';
import { PeerReviewCalibrationAddon } from './addons/SpeedGraderSnippetsBar';

export default function StudentAssignments({ activeStudentCode, triggerToast }) {
  const [assignments, setAssignments] = useState([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState(2); // Default to Lab 2
  const [submissions, setSubmissions] = useState([]);
  const [submissionsByAssign, setSubmissionsByAssign] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Form submission state
  const [submissionType, setSubmissionType] = useState('github'); // 'github' | 'file'
  const [githubUrl, setGithubUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentAssignSubMode, setStudentAssignSubMode] = useState('individual'); // 'individual' | 'group_ci' | 'peer'

  useEffect(() => {
    loadData();
  }, [activeStudentCode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await assignmentService.getAll();
      setAssignments(list);
      const targetId = activeAssignmentId || (list[0] && list[0].id);
      if (targetId && !activeAssignmentId) {
        setActiveAssignmentId(targetId);
      }

      const map = {};
      await Promise.all(
        list.map(async (a) => {
          const subs = await assignmentService.getSubmissions(a.id);
          map[a.id] = subs;
        })
      );
      setSubmissionsByAssign(map);
      if (targetId && map[targetId]) {
        setSubmissions(map[targetId]);
        const mySub = map[targetId].find(s => s.studentCode === activeStudentCode);
        if (mySub && mySub.hasSubmitted) {
          setGithubUrl(mySub.githubRepoUrl || '');
          setFileName(mySub.fileName || '');
          setStudentNote(mySub.studentNote || '');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAssignment = async (assignId) => {
    setActiveAssignmentId(assignId);
    const subs = await assignmentService.getSubmissions(assignId);
    setSubmissions(subs);
    setSubmissionsByAssign(prev => ({ ...prev, [assignId]: subs }));

    // If student has already submitted, pre-fill form
    const mySub = subs.find(s => s.studentCode === activeStudentCode);
    if (mySub && mySub.hasSubmitted) {
      setGithubUrl(mySub.githubRepoUrl || '');
      setFileName(mySub.fileName || '');
      setStudentNote(mySub.studentNote || '');
    } else {
      setGithubUrl(`https://github.com/sv-${activeStudentCode}/it204-lab`);
      setFileName('');
      setStudentNote('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionType === 'github' && !githubUrl.trim()) {
      triggerToast('Vui lòng nhập đường dẫn kho mã nguồn GitHub!', 'error');
      return;
    }
    if (submissionType === 'file' && !fileName.trim()) {
      triggerToast('Vui lòng nhập tên tệp hoặc chọn file nén mã nguồn!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignmentService.submitAssignment(activeAssignmentId, {
        studentCode: activeStudentCode,
        studentName: 'Sinh viên',
        submissionType,
        fileName: submissionType === 'file' ? fileName : null,
        githubRepoUrl: submissionType === 'github' ? githubUrl : null,
        studentNote
      });

      await handleSelectAssignment(activeAssignmentId);
      sound.success();
      triggerToast('Nộp bài thực hành Lab thành công! Bài làm đã được ghi nhận trên hệ thống.');
    } catch (err) {
      triggerToast('Lỗi nộp bài: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) || assignments[0];
  const mySubmission = submissions.find(s => s.studentCode === activeStudentCode);

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Cổng Nộp Bài Thực Hành &amp; Đồ Án Lab (IT204)
              </span>
              <span className="text-xs text-slate-500">Mã HP: IT204 • Điểm Lab chiếm 30% ĐGQT</span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
              Bài Tập Lớn, Đồ Án CDIO &amp; Đánh Giá Năng Lực Lập Trình
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sinh viên có thể nộp bằng <strong>kho mã nguồn GitHub</strong> hoặc tệp nén <strong>.zip / .rar</strong>. Kết quả chấm sẽ tự động liên thông vào Sổ Điểm.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Sub-tab Bar */}
      <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex flex-wrap gap-1.5 mb-5">
        {[
          { id: 'individual', label: '💻 Bài tập & Thực hành Lab' },
          { id: 'group_ci', label: '👥 Đồ án Nhóm (Hệ số C_i)' },
          { id: 'peer', label: '⚖️ Chấm chéo Đồng cấp' }
        ].map(tab => {
          const isActive = studentAssignSubMode === tab.id;
          return (
            <button
              key={tab.id}
              id={`subtab-student-assign-${tab.id}`}
              type="button"
              onClick={() => setStudentAssignSubMode(tab.id)}
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

      {studentAssignSubMode === 'group_ci' && (
        <GroupProjectChecklistAddon role="student" activeStudentCode={activeStudentCode} triggerToast={triggerToast} />
      )}
      {studentAssignSubMode === 'peer' && (
        <PeerReviewCalibrationAddon role="student" triggerToast={triggerToast} />
      )}

      {/* Assignment Empty State */}
      {studentAssignSubMode === 'individual' && !isLoading && assignments.length === 0 && (
        <div id="empty-student-assignments" className="neu-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
            <FileCode className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            Hiện chưa có Bài tập &amp; Thực hành Lab nào được giao
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Giảng viên chưa đăng tải bài tập thực hành Lab mới cho lớp CNTT K26. Khi có bài giao mới, đề bài, hạn chót và biểu mẫu nộp bài sẽ hiển thị tại đây.
          </p>
        </div>
      )}

      {/* Assignment Selection Cards */}
      {studentAssignSubMode === 'individual' && assignments.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assignments.map(assign => {
          const isSelected = assign.id === activeAssignmentId;
          const subsForCard = submissionsByAssign[assign.id] || (isSelected ? submissions : []);
          const mySubForAssign = subsForCard.find(s => s.studentCode === activeStudentCode);
          const hasSubmitted = mySubForAssign?.hasSubmitted;
          const isGraded = mySubForAssign?.status === 'graded';

          return (
            <button
              key={assign.id}
              type="button"
              id={`student-lab-tab-${assign.id}`}
              onClick={() => handleSelectAssignment(assign.id)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer space-y-2.5 relative ${
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
                  <Clock className="w-3 h-3" /> Hạn: {assign.deadlineFormatted || (assign.deadline ? assign.deadline.slice(0, 10) : '')}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                {assign.title}
              </h4>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {isGraded ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-[#00dfa2] font-black">
                    <Award className="w-3.5 h-3.5" />
                    Đã chấm: {mySubForAssign.score}/10
                  </span>
                ) : hasSubmitted ? (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã nộp bài (Chờ chấm)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Chưa nộp bài
                  </span>
                )}
                <span className="text-[11px] text-slate-400">Tối đa: 10đ</span>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Main Working Area: Details & Submission Form */}
      {studentAssignSubMode === 'individual' && activeAssignment && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Requirements & Teacher Feedback */}
          <div className="lg:col-span-5 space-y-4">
            <div className="neu-card rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-md space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-black font-mono">
                {activeAssignment.assignmentCode || activeAssignment.assignment_code}
              </span>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {activeAssignment.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeAssignment.description}
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hạn chót nộp bài:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {activeAssignment.deadlineFormatted || activeAssignment.deadline}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trọng số cột thực hành:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    {activeAssignment.weightPercent || activeAssignment.weight_percent}% điểm Lab
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hình thức nộp:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">GitHub Repo hoặc File Zip</span>
                </div>
              </div>
            </div>

            {/* If Already Graded: Show Teacher Feedback */}
            {mySubmission && mySubmission.status === 'graded' && (
              <div className="neu-card rounded-3xl p-5 sm:p-6 border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-sky-500/10 shadow-md space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-[#00dfa2] flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    KẾT QUẢ ĐÁNH GIÁ CỦA THẦY/CÔ
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-[#00dfa2]">
                    {mySubmission.score} <span className="text-xs font-normal text-slate-400">/ 10</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#0c1424]/80 border border-emerald-500/20 text-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">Lời phê của ThS. Phạm Văn Thuận:</span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium italic">
                    &ldquo;{mySubmission.teacherFeedback || 'Bài làm đạt yêu cầu, nắm vững kiến thức thuật toán.'}&rdquo;
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Chấm ngày: {mySubmission.gradedAt || 'Gần đây'}</span>
                  <span className="text-emerald-700 dark:text-[#00dfa2] font-semibold">Đã tự động cập nhật vào Sổ Điểm</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Submission Form */}
          <div className="lg:col-span-7">
            <div className="neu-card rounded-3xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-purple-600" />
                  <span>Biểu Mẫu Nộp Bài Thực Hành Trực Tuyến</span>
                </h4>
                {mySubmission && mySubmission.hasSubmitted && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                    Đã nộp: {mySubmission.submittedAt}
                  </span>
                )}
              </div>

              {/* Submission Type Switcher */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSubmissionType('github')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    submissionType === 'github'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FolderGit2 className="w-4 h-4" />
                  <span>Kho Mã Nguồn GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmissionType('file')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    submissionType === 'file'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Tệp Nén Mã Nguồn (.zip, .pdf)</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {submissionType === 'github' ? (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Đường dẫn Repository GitHub công khai *
                    </label>
                    <input
                      type="url"
                      id="input-student-github-url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username/project-repo"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Đảm bảo repository ở chế độ Public để Thầy/Cô có thể clone và kiểm thử mã nguồn.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Tệp nén mã nguồn / Báo cáo (.zip, .rar, .pdf) *
                    </label>
                    <input
                      type="text"
                      id="input-student-file-name"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="VD: Lab2_26103043_Dijkstra_MinHeap.zip"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                )}

                {/* Quick note chips */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Ghi chú nộp bài &amp; Kết quả kiểm thử:
                    </label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Gợi ý nhanh 1-chạm:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {[
                      'Đã cài đặt thuật toán & vượt qua 10/10 test case',
                      'Cài đặt Min-Heap tùy biến, tối ưu bộ nhớ',
                      'Có video demo kèm trong file README'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStudentNote(chip)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-500/20 cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    id="textarea-student-note"
                    value={studentNote}
                    onChange={(e) => setStudentNote(e.target.value)}
                    placeholder="Mô tả các tính năng đã hoàn thiện, hướng dẫn chạy chương trình hoặc lưu ý..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-student-submit-assignment"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang gửi bài...' : (mySubmission && mySubmission.hasSubmitted ? 'Cập Nhật / Nộp Lại Bài Làm' : 'Xác Nhận Nộp Bài Thực Hành')}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
