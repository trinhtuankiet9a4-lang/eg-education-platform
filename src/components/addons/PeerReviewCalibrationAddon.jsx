import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  ExternalLink,
  Award,
  Sparkles,
  Sliders,
  Send,
  FileCode
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

export default function PeerReviewCalibrationAddon({ role = 'student', triggerToast }) {
  const [reviews, setReviews] = useState(() => extendedFeaturesService.getPeerReviews());
  const [activeReviewId, setActiveReviewId] = useState(reviews[1]?.reviewId || reviews[0]?.reviewId);
  const [correctness, setCorrectness] = useState(9.0);
  const [complexity, setComplexity] = useState(8.5);
  const [cleanCode, setCleanCode] = useState(9.0);
  const [commentInput, setCommentInput] = useState(
    'Thuật toán cài đặt đúng yêu cầu, cây AVL tự cân bằng tốt sau các thao tác chèn/xóa. Nên bổ sung thêm hàm hủy giải phóng bộ nhớ.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await extendedFeaturesService.fetchPeerReviews();
      if (mounted && Array.isArray(res?.reviews) && res.reviews.length > 0) {
        setReviews(res.reviews);
        setActiveReviewId(prev => (res.reviews.some(r => r.reviewId === prev) ? prev : res.reviews[1]?.reviewId || res.reviews[0]?.reviewId));
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role]);

  const activeReview = reviews.find(r => r.reviewId === activeReviewId) || reviews[0];

  const handleCompletePeerReview = async (e) => {
    e.preventDefault();
    if (!activeReview || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await extendedFeaturesService.submitPeerReview(
        activeReview.reviewId,
        { correctness, complexity, cleanCode },
        commentInput
      );
      if (!res?.success) {
        triggerToast?.(res?.message || 'Vui lòng nhập nhận xét chi tiết trước khi gửi!');
        return;
      }
      setReviews(res.reviews);
      sound.success();
      triggerToast?.(res.message || '✅ Đã gửi kết quả chấm chéo đồng cấp và tính toán hệ số hiệu chuẩn!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherCalibrateAll = async () => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    try {
      const res = await extendedFeaturesService.calibratePeerReviews();
      if (res?.reviews) {
        setReviews(res.reviews);
      }
      sound.success();
      triggerToast?.(res?.message || '⚖️ Đã hiệu chuẩn điểm toàn lớp và chốt điểm thưởng chấm chéo cho 88 sinh viên!');
    } finally {
      setIsCalibrating(false);
    }
  };

  const avgScore = Math.round(((correctness * 0.4 + complexity * 0.3 + cleanCode * 0.3) + Number.EPSILON) * 10) / 10;

  return (
    <div id="addon-peer-review" className="mt-0 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-teal-500/30 space-y-4 shadow-sm animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30">
            Chấm chéo Đồng cấp Có Hiệu chuẩn
          </span>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            {role === 'teacher'
              ? 'Điều phối & Hiệu chuẩn Điểm Chấm chéo Toàn lớp (Ẩn danh 2 chiều)'
              : 'Đánh giá Chéo Bài Thực hành Lab Theo Bộ Tiêu chí'}
          </h3>
          <p className="text-xs text-slate-500">
            Mỗi sinh viên chấm 2 bài ẩn danh theo 3 tiêu chí. Hệ thống tự động đo độ lệch so với điểm chuẩn của Giảng viên.
          </p>
        </div>

        {role === 'teacher' && (
          <button
            id="btn-calibrate-all-peer-reviews"
            type="button"
            disabled={isCalibrating}
            onClick={handleTeacherCalibrateAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
          >
            <Scale className="w-4 h-4" />
            <span>{isCalibrating ? 'Đang hiệu chuẩn...' : 'Hiệu chuẩn Tự động & Chốt điểm Chấm chéo'}</span>
          </button>
        )}
      </div>

      {/* Empty State or Main Grid: Left = Assigned Peer Submissions, Right = Interactive Rubric Grader */}
      {reviews.length === 0 ? (
        <div id="empty-peer-reviews" className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-[#00dfa2] border border-teal-500/30 flex items-center justify-center mx-auto">
            <Scale className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            Hiện chưa có bài tập nào được phân công chấm chéo đồng cấp
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {role === 'teacher'
              ? 'Chưa có bài nộp thực hành nào của lớp CNTT K26 được phân công chấm chéo. Khi sinh viên nộp bài Lab và mở đợt chấm chéo, danh sách đánh giá 2 chiều sẽ hiển thị tại đây.'
              : 'Bạn chưa được phân công bài nộp nào để chấm chéo đồng cấp. Khi lớp CNTT K26 mở đợt chấm chéo sau hạn nộp Lab, phiếu đánh giá tiêu chí sẽ hiển thị tại đây.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Danh Sách Bài Lab Được Phân Công Chấm Chéo ({reviews.length} Bài)
          </div>
          {reviews.map(r => {
            const isSelected = r.reviewId === activeReview?.reviewId;
            const cAvg = Math.round(((r.criteria.correctness * 0.4 + r.criteria.complexity * 0.3 + r.criteria.cleanCode * 0.3) * 10)) / 10;
            return (
              <div
                key={r.reviewId}
                onClick={() => {
                  setActiveReviewId(r.reviewId);
                  setCorrectness(r.criteria.correctness);
                  setComplexity(r.criteria.complexity);
                  setCleanCode(r.criteria.cleanCode);
                  setCommentInput(r.comment);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-teal-500/10 border-teal-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 hover:border-teal-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">{r.targetStudentName}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    r.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2]'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    {r.status === 'COMPLETED' ? `✓ Đã chấm (${cAvg}/10)` : '⏳ Chờ chấm chéo'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{r.repoUrl}</span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  • Đúng đắn: <b>{r.criteria.correctness}</b> | Độ phức tạp: <b>{r.criteria.complexity}</b> | Clean Code: <b>{r.criteria.cleanCode}</b>
                </div>

                <div className="text-[11px] font-bold text-teal-600 dark:text-[#00dfa2]">
                  Độ lệch hiệu chuẩn: {r.calibratedDelta}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Rubric Evaluation Form */}
        {activeReview && (
          <form onSubmit={handleCompletePeerReview} className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 dark:text-[#00dfa2]">
                  Phiếu Chấm Theo 3 Tiêu chí
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Đang đánh giá: {activeReview.targetStudentName}
                </h4>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white font-mono font-black text-sm">
                Tổng điểm: {avgScore} / 10
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>1. Tính đúng đắn của thuật toán & Xử lý biên (Trọng số 40%):</span>
                  <span className="font-mono font-black text-teal-600 dark:text-[#00dfa2]">{correctness} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={correctness}
                  onChange={e => setCorrectness(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>2. Tối ưu độ phức tạp Thời gian & Không gian Big-O (Trọng số 30%):</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{complexity} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={complexity}
                  onChange={e => setComplexity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>3. Cấu trúc Clean Code, Đặt tên biến & Chú thích (Trọng số 30%):</span>
                  <span className="font-mono font-black text-purple-600 dark:text-purple-400">{cleanCode} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={cleanCode}
                  onChange={e => setCleanCode(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nhận xét góp ý xây dựng cho bạn cùng lớp:
              </label>
              <textarea
                rows={3}
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end">
              <button
                id="btn-submit-peer-review"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang gửi...' : `Lưu & Gửi Kết Quả Chấm Chéo (${avgScore}/10)`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
      )}
    </div>
  );
}
