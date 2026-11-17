import React, { useState, useEffect } from 'react';
import { ThumbsUp, Lock, Unlock, Trash2, Edit3, Search, CheckCircle2 } from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

export default function LiveQaAndCheckpointsAddon({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [qaData, setQaData] = useState(() => extendedFeaturesService.getQaCheckpointsData());
  const [newQuestion, setNewQuestion] = useState('');
  const [checkpointInput, setCheckpointInput] = useState('');
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [qaFilter, setQaFilter] = useState('all'); // 'all' | 'unanswered' | 'answered'
  const [qaSearch, setQaSearch] = useState('');
  const [isEditingCheckpoint, setIsEditingCheckpoint] = useState(false);
  const [checkpointTitleDraft, setCheckpointTitleDraft] = useState('');
  const [checkpointPromptDraft, setCheckpointPromptDraft] = useState('');

  const isTeacher = role === 'teacher';
  const hasPostedCheckpoint =
    isTeacher || (qaData.checkpoint?.posts || []).some(p => p.studentCode === activeStudentCode);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const res = await extendedFeaturesService.fetchQaCheckpointsData();
      if (!cancelled && res?.data) {
        setQaData({ ...res.data });
      }
    };
    loadData();
    const timer = setInterval(loadData, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleUpvote = async (qId) => {
    const res = await extendedFeaturesService.upvoteQuestion(qId, activeStudentCode);
    if (res?.data) {
      setQaData({ ...res.data });
    }
    sound.success();
  };

  const handleAskAnonymous = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const res = await extendedFeaturesService.askQuestion({
      studentCode: activeStudentCode,
      text: newQuestion,
      isAnonymous: true,
    });
    if (res?.success === false) {
      triggerToast?.(res.message || 'Không thể gửi câu hỏi lúc này.', 'error');
      return;
    }
    if (res?.data) {
      setQaData({ ...res.data });
    }
    setNewQuestion('');
    sound.success();
    triggerToast?.(res?.message || '🙋 Đã gửi câu hỏi ẩn danh lên bảng Q&A giảng đường!');
  };

  const handleReplySubmit = async (e, qId) => {
    e.preventDefault();
    const draft = (replyDrafts[qId] || '').trim();
    if (!draft) return;
    const res = await extendedFeaturesService.replyQuestion(qId, draft);
    if (res?.success === false) {
      triggerToast?.(res.message || 'Không thể gửi câu trả lời!', 'error');
      return;
    }
    if (res?.data) {
      setQaData({ ...res.data });
    }
    setReplyDrafts(prev => ({ ...prev, [qId]: '' }));
    setOpenReplyId(null);
    sound.success();
    triggerToast?.(res?.message || '✅ Đã lưu giải đáp của Giảng viên vào câu hỏi!');
  };

  const handleDeleteQuestion = async (qId) => {
    const res = await extendedFeaturesService.deleteQuestion(qId);
    if (res?.success === false) {
      triggerToast?.(res.message || 'Không thể xóa câu hỏi!', 'error');
      return;
    }
    if (res?.data) {
      setQaData({ ...res.data });
    }
    sound.success();
    triggerToast?.(res?.message || '🗑️ Đã xóa câu hỏi khỏi bảng Q&A!');
  };

  const handleSaveCheckpointPrompt = async (e) => {
    e.preventDefault();
    if (!checkpointTitleDraft.trim() || !checkpointPromptDraft.trim()) {
      triggerToast?.('Vui lòng nhập đầy đủ tiêu đề và nội dung câu hỏi thảo luận!', 'error');
      return;
    }
    const res = await extendedFeaturesService.updateCheckpointPrompt({
      title: checkpointTitleDraft.trim(),
      prompt: checkpointPromptDraft.trim()
    });
    if (res?.success === false) {
      triggerToast?.(res.message || 'Không thể cập nhật câu hỏi thảo luận!', 'error');
      return;
    }
    if (res?.data) {
      setQaData({ ...res.data });
    }
    setIsEditingCheckpoint(false);
    sound.success();
    triggerToast?.(res?.message || '✅ Đã cập nhật chủ đề Điểm dừng Thảo luận!');
  };

  const handleSubmitCheckpoint = async (e) => {
    e.preventDefault();
    if (!checkpointInput.trim()) return;
    const studentName = extendedFeaturesService.resolveStudentName(activeStudentCode);
    const res = await extendedFeaturesService.submitCheckpointPost({
      studentCode: activeStudentCode,
      studentName,
      content: checkpointInput,
    });
    if (res?.success === false) {
      triggerToast?.(res.message || 'Không thể đăng bài thảo luận!', 'error');
      return;
    }
    if (res?.data) {
      setQaData({ ...res.data });
    }
    setCheckpointInput('');
    sound.success();
    triggerToast?.(res?.message || '🔓 Đã đăng bài thảo luận của bạn! Toàn bộ bài thảo luận của cả lớp đã được mở khóa.');
  };

  const allQuestions = qaData.questions || [];
  const answeredCount = allQuestions.filter(q => q.isAnswered || Boolean(q.teacherReply)).length;
  const unansweredCount = allQuestions.length - answeredCount;

  const displayedQuestions = allQuestions.filter(q => {
    if (isTeacher) {
      const hasReply = q.isAnswered || Boolean(q.teacherReply);
      if (qaFilter === 'unanswered' && hasReply) return false;
      if (qaFilter === 'answered' && !hasReply) return false;
      if (qaSearch.trim()) {
        const term = qaSearch.toLowerCase();
        const matchQ = (q.question || '').toLowerCase().includes(term);
        const matchAuthor = (q.authorName || '').toLowerCase().includes(term);
        const matchReply = (q.teacherReply || '').toLowerCase().includes(term);
        if (!matchQ && !matchAuthor && !matchReply) return false;
      }
    }
    return true;
  });

  return (
    <div id="addon-live-qa-checkpoints" className="mt-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Live Anonymous Q&A Board (Role-separated) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-teal-500/30 space-y-3.5 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]">
            {isTeacher ? 'Điều phối Hỏi đáp Ẩn danh Lớp học' : 'Hỏi đáp Ẩn danh & Bình chọn'}
          </span>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            {isTeacher
              ? 'Bảng Điều phối & Giải đáp Câu hỏi Ẩn danh Của Sinh viên'
              : 'Bảng Hỏi đáp Giảng đường Ẩn danh (Bấm 👍 để ưu tiên)'}
          </h3>
        </div>

        {/* Student-only Ask Form (Never shown to teachers) */}
        {!isTeacher ? (
          <form onSubmit={handleAskAnonymous} className="flex gap-2">
            <input
              type="text"
              placeholder="Đặt câu hỏi ẩn danh cho Giảng viên ngay trong tiết học..."
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
            >
              Hỏi Ẩn Danh
            </button>
          </form>
        ) : (
          /* Teacher Moderation Filter & Search Bar */
          <div id="teacher-qa-moderation-bar" className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-qa-filter-all"
                type="button"
                onClick={() => setQaFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qaFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả ({allQuestions.length})
              </button>
              <button
                id="btn-qa-filter-unanswered"
                type="button"
                onClick={() => setQaFilter('unanswered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qaFilter === 'unanswered'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                }`}
              >
                Chờ giải đáp ({unansweredCount})
              </button>
              <button
                id="btn-qa-filter-answered"
                type="button"
                onClick={() => setQaFilter('answered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qaFilter === 'answered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-[#00dfa2] hover:bg-emerald-500/25'
                }`}
              >
                Đã giải đáp ({answeredCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="input-qa-teacher-search"
                type="text"
                placeholder="Lọc tìm câu hỏi của sinh viên..."
                value={qaSearch}
                onChange={e => setQaSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {displayedQuestions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              Không có câu hỏi nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            displayedQuestions.map(q => {
              const isSolved = q.isAnswered || Boolean(q.teacherReply);
              return (
                <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{q.authorName} • {q.createdAt}</span>
                        {isTeacher && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSolved
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}>
                            {isSolved ? '✓ Đã giải đáp' : '⏳ Chờ giải đáp'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{q.question}</p>
                    </div>

                    {isTeacher ? (
                      <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 text-[11px] font-black flex items-center gap-1 shrink-0">
                        👍 {q.upvotes} lượt ưu tiên
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpvote(q.id)}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{q.upvotes}</span>
                      </button>
                    )}
                  </div>

                  {q.teacherReply && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-900 dark:text-emerald-200">
                      <b>Giảng viên giải đáp:</b> {q.teacherReply}
                    </div>
                  )}

                  {isTeacher && (
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      {openReplyId === q.id ? (
                        <form onSubmit={e => handleReplySubmit(e, q.id)} className="flex gap-2 w-full">
                          <input
                            type="text"
                            placeholder="Nhập giải đáp chính thức của Giảng viên..."
                            value={replyDrafts[q.id] || ''}
                            onChange={e => setReplyDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-500/40 text-[11px]"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                          >
                            Lưu
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenReplyId(q.id);
                              setReplyDrafts(prev => ({ ...prev, [q.id]: q.teacherReply || prev[q.id] || '' }));
                            }}
                            className="text-[11px] font-bold text-teal-700 dark:text-[#00dfa2] hover:underline cursor-pointer"
                          >
                            {q.teacherReply ? '✏️ Chỉnh sửa giải đáp' : '💬 Giải đáp câu hỏi này'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Xóa câu hỏi spam / không hợp lệ"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>🗑️ Xóa</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Discussion Checkpoints (Post-Before-View) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-purple-500/30 space-y-3.5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-800 dark:text-purple-300">
              Điểm dừng Thảo luận Lớp học
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
              {qaData.checkpoint.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isTeacher && (
              <button
                id="btn-edit-checkpoint-prompt"
                type="button"
                onClick={() => {
                  setCheckpointTitleDraft(qaData.checkpoint.title || '');
                  setCheckpointPromptDraft(qaData.checkpoint.prompt || '');
                  setIsEditingCheckpoint(!isEditingCheckpoint);
                }}
                className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>✏️ Đổi câu hỏi thảo luận</span>
              </button>
            )}
            {hasPostedCheckpoint ? (
              <Unlock className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            )}
          </div>
        </div>

        {isTeacher && isEditingCheckpoint ? (
          <form onSubmit={handleSaveCheckpointPrompt} className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề điểm dừng thảo luận
              </label>
              <input
                type="text"
                value={checkpointTitleDraft}
                onChange={e => setCheckpointTitleDraft(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#090e1a] border border-purple-500/40 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Câu hỏi gợi mở cho sinh viên
              </label>
              <textarea
                rows={2}
                value={checkpointPromptDraft}
                onChange={e => setCheckpointPromptDraft(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-[#090e1a] border border-purple-500/40 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingCheckpoint(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Chủ Đề
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400">{qaData.checkpoint.prompt}</p>
        )}

        {!hasPostedCheckpoint && (
          <form onSubmit={handleSubmitCheckpoint} className="space-y-2">
            <textarea
              rows={2}
              placeholder="Nhập lập luận của riêng bạn để mở khóa xem câu trả lời của cả lớp..."
              value={checkpointInput}
              onChange={e => setCheckpointInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs"
            />
            <button
              id="btn-unlock-checkpoint-discussion"
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold cursor-pointer"
            >
              Đăng Lập Luận Cá Nhân & Mở Khóa Thảo Luận Lớp
            </button>
          </form>
        )}

        {isTeacher && (
          <div className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300">
            Danh sách lập luận sinh viên đã nộp ({(qaData.checkpoint?.posts || []).length} bài)
          </div>
        )}

        <div className="space-y-2">
          {hasPostedCheckpoint ? (
            (qaData.checkpoint?.posts || []).map(p => (
              <div key={p.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">{p.studentName} ({p.studentCode})</div>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{p.content}</p>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center text-xs font-bold text-amber-800 dark:text-amber-300">
              🔒 Đang ẩn {(qaData.checkpoint?.posts || []).length} bài thảo luận của bạn cùng lớp. Hãy đăng ý kiến của bạn trước để tránh sao chép ý tưởng!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
