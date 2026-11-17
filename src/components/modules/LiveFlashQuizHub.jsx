import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, RotateCcw, Trophy, CheckCircle, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { extendedFeaturesService, resolveStudentName } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

const DEFAULT_OPTIONS = [
  'O(1) — Truy cập tức thì bằng khóa băm',
  'O(log N) — Chia đôi không gian tìm kiếm trên cây cân bằng',
  'O(N) — Duyệt tuần tự toàn bộ phần tử',
  'O(N log N) — Sắp xếp trộn MergeSort'
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const BONUS_CHOICES = [0.25, 0.5, 1.0];

export default function LiveFlashQuizHub({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [quiz, setQuiz] = useState(() => extendedFeaturesService.getFlashQuiz());
  const [selectedOpt, setSelectedOpt] = useState(1);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(DEFAULT_OPTIONS);
  const [newCorrectIndex, setNewCorrectIndex] = useState(1);
  const [newBonusScore, setNewBonusScore] = useState(0.5);
  const [timeLeft, setTimeLeft] = useState(() => {
    const initial = extendedFeaturesService.getFlashQuiz();
    if (initial?.status === 'ended' || initial?.isActive === false) return 0;
    return initial?.remainingSeconds ?? initial?.durationSec ?? 45;
  });
  const [isRunning, setIsRunning] = useState(() => {
    const initial = extendedFeaturesService.getFlashQuiz();
    return initial?.status !== 'ended' && initial?.isActive !== false && (initial?.remainingSeconds ?? initial?.durationSec ?? 45) > 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(() => !!extendedFeaturesService.getFlashQuiz()?.hasSubmitted);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);

  const mutationEpochRef = useRef(0);
  const prevQuizMetaRef = useRef({
    id: quiz?.id,
    quizId: quiz?.quizId,
    startedAt: quiz?.startedAt
  });

  const resolvedStudentName = resolveStudentName(activeStudentCode);

  // Sync with Backend API
  const syncWithBackend = async () => {
    const epochAtStart = mutationEpochRef.current;
    try {
      const live = await extendedFeaturesService.fetchFlashQuiz('K26 CNTT - Lớp A', activeStudentCode);
      if (epochAtStart !== mutationEpochRef.current) return;
      if (live) {
        const prev = prevQuizMetaRef.current;
        const isNewQuiz =
          (live.id && prev.id && live.id !== prev.id) ||
          (live.quizId && prev.quizId && live.quizId !== prev.quizId);
        const isRestartedTimer =
          Boolean(live.startedAt && prev.startedAt && live.startedAt !== prev.startedAt);
        const ended = live.status === 'ended' || live.isActive === false;

        setQuiz({ ...live });

        if (ended) {
          setTimeLeft(0);
          setIsRunning(false);
        } else if (live.remainingSeconds !== undefined) {
          setTimeLeft(live.remainingSeconds);
          if (live.remainingSeconds > 0 && (isNewQuiz || isRestartedTimer)) {
            setIsRunning(true);
          } else if (live.remainingSeconds <= 0) {
            setIsRunning(false);
          }
        }

        if (live.hasSubmitted) {
          setHasSubmitted(true);
          if (live.mySubmission) {
            const subOpt = live.mySubmission.selectedOption !== undefined
              ? live.mySubmission.selectedOption
              : live.mySubmission.selectedIndex;
            if (subOpt !== undefined && subOpt !== null) {
              setSelectedOpt(Number(subOpt));
            }
          }
        } else {
          setHasSubmitted(false);
          if (isNewQuiz || isRestartedTimer) {
            setLastSubmissionResult(null);
          }
        }

        prevQuizMetaRef.current = {
          id: live.id,
          quizId: live.quizId,
          startedAt: live.startedAt
        };
      }
    } catch (e) {
      console.warn('Flash Quiz sync error:', e.message);
    }
  };

  useEffect(() => {
    setHasSubmitted(false);
    setLastSubmissionResult(null);
    syncWithBackend();
    const pollInterval = setInterval(syncWithBackend, 3500);
    return () => clearInterval(pollInterval);
  }, [activeStudentCode]);

  // Local fluid timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const isQuizEnded = quiz.status === 'ended' || quiz.isActive === false;
  const isTimeExpired = timeLeft <= 0 || isQuizEnded;

  const handleStudentSubmitQuiz = async () => {
    if (hasSubmitted) {
      if (triggerToast) triggerToast('ℹ️ Bạn đã nộp câu trả lời cho phiên trắc nghiệm này rồi!');
      return;
    }
    if (isQuizEnded || timeLeft <= 0) {
      sound.warning();
      if (triggerToast) triggerToast('⏰ Đã hết thời gian 45 giây làm bài!');
      return;
    }

    mutationEpochRef.current += 1;
    setIsSubmitting(true);
    const durationLimit = quiz.durationSec || quiz.timeLimitSec || 45;
    const updated = await extendedFeaturesService.submitFlashQuizAnswer({
      quizId: quiz.id || quiz.quizId,
      studentCode: activeStudentCode,
      studentName: resolvedStudentName,
      selectedIndex: selectedOpt,
      timeSec: Math.max(1, Math.round((durationLimit - timeLeft) * 10) / 10)
    });
    setIsSubmitting(false);

    if (updated && updated.success === false && updated.submitError) {
      sound.warning();
      if (triggerToast) triggerToast(`⚠️ ${updated.submitError}`);
      syncWithBackend();
      return;
    }

    setHasSubmitted(true);
    if (updated) {
      setQuiz({ ...updated });
      const res = updated.serverResult;
      setLastSubmissionResult(res);

      if (res && res.is_correct) {
        sound.success();
        if (triggerToast) triggerToast(`🎉 Chính xác! Bạn đã được cộng +${res.bonus_awarded || quiz.bonusScore}đ thưởng trực tiếp vào Sổ điểm!`);
      } else if (selectedOpt === quiz.correctIndex) {
        sound.success();
        if (triggerToast) triggerToast(`🎉 Chính xác! Bạn đã được cộng +${quiz.bonusScore}đ thưởng trực tiếp vào Sổ điểm!`);
      } else {
        sound.warning();
        if (triggerToast) triggerToast('Đã ghi nhận câu trả lời của bạn.');
      }
      syncWithBackend();
    }
  };

  const handleResetTimer = async () => {
    const targetId = quiz?.id || quiz?.quizId;
    if (!targetId) return;

    mutationEpochRef.current += 1;
    setIsResetting(true);
    const res = await extendedFeaturesService.resetFlashQuizTimer(targetId);
    setIsResetting(false);

    if (res && !res.success && res.message) {
      sound.warning();
      if (triggerToast) triggerToast(`⚠️ ${res.message}`);
      return;
    }

    const updated = res?.data || extendedFeaturesService.getFlashQuiz();
    const duration = updated.remainingSeconds || updated.durationSec || updated.timeLimitSec || 45;

    setQuiz({ ...updated, isActive: true, status: 'active' });
    setTimeLeft(duration);
    setIsRunning(true);
    setHasSubmitted(false);
    setLastSubmissionResult(null);
    prevQuizMetaRef.current = {
      id: updated.id,
      quizId: updated.quizId,
      startedAt: updated.startedAt
    };

    sound.success();
    if (triggerToast) triggerToast(`⏱️ ${res?.message || `Đã đặt lại đồng hồ ${duration}s cho toàn bộ lớp!`}`);
  };

  const handleLaunchNewQuiz = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      sound.warning();
      if (triggerToast) triggerToast('⚠️ Vui lòng nhập nội dung câu hỏi Flash Quiz trước khi phát!');
      return;
    }

    mutationEpochRef.current += 1;
    const formattedOptions = newOptions.map((opt, idx) => {
      const letter = OPTION_LETTERS[idx];
      const raw = (opt || '').trim() || DEFAULT_OPTIONS[idx];
      return /^[A-D][.):]\s*/i.test(raw) ? raw : `${letter}. ${raw}`;
    });

    const updated = await extendedFeaturesService.createFlashQuiz({
      question: newQuestion.trim(),
      options: formattedOptions,
      correctIndex: Number(newCorrectIndex),
      durationSec: 45,
      bonusScore: Number(newBonusScore),
      classId: 'K26 CNTT - Lớp A'
    });

    setQuiz({ ...updated });
    setTimeLeft(updated.remainingSeconds || updated.durationSec || 45);
    setIsRunning(true);
    setHasSubmitted(false);
    setLastSubmissionResult(null);
    setSelectedOpt(Number(newCorrectIndex));
    setNewQuestion('');
    setNewOptions(DEFAULT_OPTIONS);
    prevQuizMetaRef.current = {
      id: updated.id,
      quizId: updated.quizId,
      startedAt: updated.startedAt
    };

    sound.success();
    if (triggerToast) triggerToast(`⚡ Đã phát câu hỏi Flash Quiz 45 giây (+${newBonusScore}đ) lên màn hình của toàn bộ lớp!`);
  };

  const handleEndQuizAndSync = async () => {
    if (!quiz.id && !quiz.quizId) return;
    mutationEpochRef.current += 1;
    const res = await extendedFeaturesService.endFlashQuiz(quiz.id || quiz.quizId);
    setTimeLeft(0);
    setIsRunning(false);
    setQuiz(prev => ({ ...prev, isActive: false, status: 'ended', remainingSeconds: 0 }));
    if (res && res.success) {
      sound.success();
      if (triggerToast) triggerToast(`🏆 ${res.message || 'Đã kết thúc phiên và đồng bộ điểm thưởng thành công!'}`);
    }
    syncWithBackend();
  };

  const submissionCount = Math.max(quiz.totalSubmissions || 0, quiz.responses?.length || 0);
  const totalVotes = quiz.totalVotes || quiz.responses?.length || 1;
  const fastestCorrect = (quiz.podium && quiz.podium.length > 0)
    ? quiz.podium
    : (quiz.responses?.filter(r => r.isCorrect).sort((a, b) => a.timeSec - b.timeSec) || []);

  return (
    <div id="module-live-flash-quiz" className="mt-0 space-y-4 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              Kiểm tra Nhanh 45 giây
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
              <span>Realtime SQLite & Sổ Điểm</span>
            </span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            Trắc nghiệm Phản xạ Tại lớp (+{quiz.bonusScore || 0.5}đ Thưởng Sổ điểm)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Giảng viên phát động câu hỏi phản xạ 45s — Điểm cộng được đối soát và ghi tự động vào cột điểm Thưởng Sổ điểm.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {role === 'teacher' && (
            <>
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                disabled={isTimeExpired}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-sm hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu đếm'}</span>
              </button>
              <button
                id="btn-teacher-reset-flash-quiz-timer"
                type="button"
                onClick={handleResetTimer}
                disabled={isResetting}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-sm hover:border-amber-400 transition-colors disabled:opacity-50"
                title="Đặt lại 45s"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Đặt lại 45s</span>
              </button>
              <button
                id="btn-teacher-end-and-sync-quiz"
                type="button"
                onClick={handleEndQuizAndSync}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                title="Chốt phiên và đồng bộ điểm thưởng vào Sổ điểm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chốt & Đồng bộ Sổ Điểm</span>
              </button>
            </>
          )}

          <div className={`px-3.5 py-2 rounded-xl text-white font-black text-xs flex items-center gap-2 shadow-sm ${
            isTimeExpired ? 'bg-slate-700' : timeLeft > 10 ? 'bg-rose-600' : 'bg-rose-700 animate-pulse'
          }`}>
            <Clock className={`w-4 h-4 ${isRunning && timeLeft > 0 ? 'animate-spin' : ''}`} />
            <span>
              {isQuizEnded ? 'Đã kết thúc' : timeLeft <= 0 ? 'Hết giờ (0s)' : `Còn lại: ${timeLeft}s`} • Đã nộp: {submissionCount}/50 SV
            </span>
          </div>
        </div>
      </div>

      {/* Expired / Ended Status Banner */}
      {isTimeExpired && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-bold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              {isQuizEnded
                ? 'Phiên Flash Quiz này đã chốt kết quả và đồng bộ điểm thưởng vào Sổ điểm.'
                : 'Đã hết thời gian 45 giây làm bài! Sinh viên không thể nộp thêm đáp án cho lượt này.'}
            </span>
          </div>
          {role === 'teacher' && (
            <button
              type="button"
              onClick={handleResetTimer}
              disabled={isResetting}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Phát lại 45s</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Question Card & Live Bar Chart */}
        <div className="xl:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span>{isQuizEnded ? 'Câu hỏi phiên gần nhất:' : 'Câu hỏi đang phát trực tiếp:'}</span>
              <span className="font-mono text-[10px] text-slate-400">#{quiz.quizId || `FQ-${quiz.id || 1}`}</span>
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 leading-snug">
              {quiz.question}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(quiz.options || []).map((opt, idx) => {
              const count = quiz.responses?.filter(r => r.selectedIndex === idx).length || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isCorrect = idx === quiz.correctIndex;
              const isSelected = selectedOpt === idx;
              const canSelect = role === 'student' && !hasSubmitted && !isTimeExpired;

              return (
                <div
                  key={idx}
                  onClick={() => canSelect && setSelectedOpt(idx)}
                  className={`p-3.5 rounded-2xl border-2 transition-all space-y-2 ${
                    canSelect ? 'cursor-pointer hover:border-amber-400' : 'cursor-default'
                  } ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090e1a]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                    {role === 'teacher' && (
                      <span className={isCorrect ? 'text-emerald-600 dark:text-[#00dfa2] shrink-0 font-bold ml-2' : 'text-slate-400 shrink-0 font-medium ml-2'}>
                        {count} SV ({pct}%) {isCorrect ? '✓ Đúng' : ''}
                      </span>
                    )}
                  </div>
                  {role === 'teacher' && (
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isCorrect ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {role === 'student' ? (
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Thí sinh: <strong className="text-slate-800 dark:text-slate-200">{resolvedStudentName}</strong> ({activeStudentCode})
              </span>

              {hasSubmitted ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lastSubmissionResult?.is_correct || selectedOpt === quiz.correctIndex
                      ? `Bạn đã nộp đáp án đúng! Nhận +${quiz.bonusScore || 0.5}đ thưởng vào Sổ điểm.`
                      : 'Bạn đã nộp câu trả lời thành công. Chờ Giảng viên công bố kết quả.'}
                  </span>
                </div>
              ) : (
                <button
                  id="btn-student-submit-flash-quiz"
                  type="button"
                  disabled={isSubmitting || isTimeExpired}
                  onClick={handleStudentSubmitQuiz}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-extrabold text-xs cursor-pointer shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Đang gửi...'
                    : isTimeExpired
                    ? '⏰ Đã hết thời gian nộp bài'
                    : `Gửi đáp án ngay & Nhận điểm thưởng (+${quiz.bonusScore || 0.5}đ)`}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleLaunchNewQuiz} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Soạn & Phát câu hỏi Flash Quiz mới (45s)
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Hỗ trợ chỉnh nhanh 4 đáp án, đáp án đúng & mức điểm cộng
                </span>
              </div>

              <input
                type="text"
                placeholder="Nhập câu hỏi trắc nghiệm nhanh mới để phát cho cả lớp..."
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OPTION_LETTERS.map((letter, idx) => (
                  <div key={letter} className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        newCorrectIndex === idx
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>
                    <input
                      type="text"
                      value={newOptions[idx]}
                      onChange={e => {
                        const val = e.target.value;
                        setNewOptions(prev => prev.map((item, i) => (i === idx ? val : item)));
                      }}
                      placeholder={`Phương án ${letter}...`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Đáp án đúng:</span>
                    <div className="flex items-center gap-1">
                      {OPTION_LETTERS.map((letter, idx) => (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => setNewCorrectIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-colors ${
                            newCorrectIndex === idx
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Điểm thưởng:</span>
                    <div className="flex items-center gap-1">
                      {BONUS_CHOICES.map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNewBonusScore(val)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-colors ${
                            newBonusScore === val
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          +{val}đ
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  id="btn-teacher-launch-flash-quiz"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer shrink-0 transition-colors shadow-sm"
                >
                  Phát câu hỏi mới (45s)
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Speed Podium Leaderboard */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 font-extrabold text-xs text-amber-600 dark:text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>Bảng vàng Phản xạ Nhanh & Chính xác (SQLite)</span>
          </div>

          <div className="space-y-2">
            {fastestCorrect.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                Chưa có sinh viên nào trả lời đúng trong phiên này
              </div>
            ) : (
              fastestCorrect.map((r, i) => (
                <div key={r.studentCode || i} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs ${
                      i === 0 ? 'bg-amber-500 text-white shadow-sm' :
                      i === 1 ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white' :
                      i === 2 ? 'bg-amber-700 text-white' :
                      'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>
                      #{i + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{r.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.studentCode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] font-black text-[11px]">
                      +{r.bonusAwarded || r.bonusScore || quiz.bonusScore || 0.5}đ
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.timeSec}s</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
