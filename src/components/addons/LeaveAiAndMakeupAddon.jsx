import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  UploadCloud,
  Eye,
  FileText,
  X
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

export default function LeaveAiAndMakeupAddon({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [data, setData] = useState(() => extendedFeaturesService.getLeaveAiData());
  const [activeMakeupModal, setActiveMakeupModal] = useState(null);
  const [ocrPreviewReq, setOcrPreviewReq] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [newReason, setNewReason] = useState('Khám chuyên khoa nội tổng quát tại Bệnh viện Đại học Y Dược');
  const [newProofName, setNewProofName] = useState('Giay_Kham_Benh_BV_DaiHocYDuoc_DauDo.jpg');
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionSlot, setSessionSlot] = useState('Tiết 1 - 3 (Buổi Sáng)');
  const [isTogglingConfig, setIsTogglingConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyReqId, setBusyReqId] = useState(null);
  const [isCompletingQuiz, setIsCompletingQuiz] = useState(false);

  const syncDataFromServer = async () => {
    const res = await extendedFeaturesService.fetchLeaveAiData('K26 CNTT - Lớp A');
    if (res?.requests) {
      setData({
        aiAutoApproveEnabled: Boolean(res.aiAutoApproveEnabled),
        confidenceThreshold: Number(res.confidenceThreshold || 88),
        requests: res.requests
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await extendedFeaturesService.fetchLeaveAiData('K26 CNTT - Lớp A');
      if (mounted && res?.requests) {
        setData({
          aiAutoApproveEnabled: Boolean(res.aiAutoApproveEnabled),
          confidenceThreshold: Number(res.confidenceThreshold || 88),
          requests: res.requests
        });
      }
    };
    load();
    const timer = setInterval(load, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role, activeStudentCode]);

  const handleToggleAutoApprove = async () => {
    if (isTogglingConfig) return;
    setIsTogglingConfig(true);
    try {
      const updated = await extendedFeaturesService.toggleAiAutoApprove(!data.aiAutoApproveEnabled);
      if (updated?.success === false) {
        sound.error?.();
        triggerToast?.(`⚠️ ${updated.message || 'Không thể cập nhật cấu hình AI OCR!'}`);
        return;
      }
      setData({
        aiAutoApproveEnabled: Boolean(updated.aiAutoApproveEnabled),
        confidenceThreshold: Number(updated.confidenceThreshold || 88),
        requests: updated.requests || data.requests
      });
      sound.success();
      triggerToast?.(
        updated.aiAutoApproveEnabled
          ? `🤖 Đã BẬT chế độ AI OCR tự động duyệt đơn nghỉ học có giấy khám bệnh hợp lệ (≥${updated.confidenceThreshold || 88}%) & tự động gửi Gói học bù!`
          : 'Đã chuyển sang chế độ Giảng viên duyệt đơn thủ công.'
      );
    } finally {
      setIsTogglingConfig(false);
    }
  };

  const handleApproveAndSendPack = async (reqId, status) => {
    if (busyReqId) return;
    setBusyReqId(reqId);
    try {
      const updated = await extendedFeaturesService.updateLeaveStatus(reqId, status);
      if (updated?.success === false) {
        sound.error?.();
        triggerToast?.(`⚠️ ${updated.message || 'Lỗi cập nhật trạng thái đơn nghỉ học!'}`);
        return;
      }
      setData({
        aiAutoApproveEnabled: Boolean(updated.aiAutoApproveEnabled),
        confidenceThreshold: Number(updated.confidenceThreshold || 88),
        requests: updated.requests || data.requests
      });
      sound.success();
      triggerToast?.(
        status === 'approved'
          ? '✅ Đã duyệt đơn nghỉ phép và tự động gửi Gói học bù (Slide + Bài tập ôn tập) cho sinh viên!'
          : 'Đã từ chối đơn xin nghỉ học do minh chứng không hợp lệ.'
      );
    } finally {
      setBusyReqId(null);
    }
  };

  const handleStudentSubmitAiLeave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newReason.trim()) {
      sound.error?.();
      triggerToast?.('⚠️ Vui lòng nhập lý do xin nghỉ & chẩn đoán y tế!');
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedName = extendedFeaturesService.resolveStudentName(activeStudentCode);
      const res = await extendedFeaturesService.submitStudentLeaveWithAi({
        studentCode: activeStudentCode,
        studentName: resolvedName,
        leaveDate,
        sessionSlot,
        reason: newReason.trim(),
        proofFileName: newProofName
      });

      if (!res?.success || !res?.request) {
        sound.error?.();
        triggerToast?.(`⚠️ ${res?.message || 'Không thể gửi đơn xin nghỉ!'}`);
        return;
      }

      if (res.data) {
        setData({ ...res.data });
      } else {
        await syncDataFromServer();
      }

      const created = res.request;
      sound.success();
      triggerToast?.(
        created.approvalStatus === 'approved'
          ? `🤖 AI OCR đã xác thực giấy khám bệnh (${created.aiOcrResult.confidence}%) -> Tự động DUYỆT ĐƠN và gửi Gói học bù kiến thức!`
          : '⏳ Đã gửi đơn kèm ảnh minh chứng để Giảng viên xem xét.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMakeupModal = (req) => {
    setQuizAnswers({});
    setQuizFeedback(null);
    setActiveMakeupModal(req);
  };

  const handleCompleteMakeupQuiz = async (req) => {
    if (isCompletingQuiz) return;
    const questions = req.makeupPack?.quizQuestions || [];
    if (questions.length > 0) {
      const missingCount = questions.filter(q => quizAnswers[q.id] === undefined).length;
      if (missingCount > 0) {
        setQuizFeedback({
          type: 'error',
          text: `Vui lòng chọn đáp án cho cả ${questions.length} câu hỏi kiểm tra trước khi nộp bài!`
        });
        sound.error?.();
        triggerToast?.(`⚠️ Còn ${missingCount} câu hỏi chưa được chọn đáp án!`);
        return;
      }
    }

    setIsCompletingQuiz(true);
    setQuizFeedback(null);
    try {
      const res = await extendedFeaturesService.completeMakeupPack(req.id, quizAnswers);
      if (!res?.success) {
        setQuizFeedback({
          type: 'error',
          text: res?.message || 'Chưa đạt yêu cầu bài kiểm tra học bù!'
        });
        sound.error?.();
        triggerToast?.(`⚠️ ${res?.message || 'Chưa đạt yêu cầu bài kiểm tra học bù!'}`);
        return;
      }

      setData({
        aiAutoApproveEnabled: Boolean(res.aiAutoApproveEnabled),
        confidenceThreshold: Number(res.confidenceThreshold || 88),
        requests: res.requests || data.requests
      });
      setActiveMakeupModal(null);
      setQuizAnswers({});
      sound.success();
      triggerToast?.(
        `🎉 Hoàn thành Gói học bù (${res.score}/10đ)! Hệ thống đã đồng bộ bảo toàn điểm chuyên cần & cập nhật GPA.`
      );
    } finally {
      setIsCompletingQuiz(false);
    }
  };

  return (
    <div id="addon-leave-ai-makeup" className="mt-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-teal-500/5 to-purple-500/10 border border-sky-500/30 space-y-4 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                Xác thực Minh chứng AI & Học bù
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-[#00dfa2]">
                • Tự động nhận diện dấu đỏ Bệnh viện & Giao gói học bù
              </span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
              {role === 'teacher'
                ? 'Trợ lý AI Duyệt Minh chứng Y tế & Giao Gói học bù'
                : 'Nộp Minh chứng Y tế (AI Xác thực Tức thì) & Nhận Gói học bù'}
            </h3>
          </div>
        </div>

        {role === 'teacher' && (
          <button
            id="btn-toggle-ai-auto-approve"
            type="button"
            disabled={isTogglingConfig}
            onClick={handleToggleAutoApprove}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-60 ${
              data.aiAutoApproveEnabled
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {data.aiAutoApproveEnabled
                ? `AI Tự động duyệt đơn ≥${data.confidenceThreshold}%: Đang bật`
                : 'AI Tự động duyệt đơn: Đang tắt'}
            </span>
          </button>
        )}
      </div>

      {/* Student Quick Upload with AI OCR Preview */}
      {role === 'student' && (
        <form onSubmit={handleStudentSubmitAiLeave} className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Lý do xin nghỉ & Chẩn đoán y tế
            </label>
            <input
              id="input-ai-leave-reason"
              type="text"
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Ngày xin nghỉ
            </label>
            <input
              id="input-ai-leave-date"
              type="date"
              value={leaveDate}
              onChange={e => setLeaveDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Ca / Tiết học
            </label>
            <select
              id="select-ai-session-slot"
              value={sessionSlot}
              onChange={e => setSessionSlot(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="Tiết 1 - 3 (Buổi Sáng)">Tiết 1 - 3 (Sáng)</option>
              <option value="Tiết 4 - 6 (Buổi Chiều)">Tiết 4 - 6 (Chiều)</option>
              <option value="Thực hành Lab (Tối)">Thực hành Lab</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Ảnh Minh chứng
            </label>
            <select
              id="select-student-proof-file"
              value={newProofName}
              onChange={e => setNewProofName(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="Giay_Kham_Benh_BV_DaiHocYDuoc_DauDo.jpg">📄 Giấy khám BV (Hợp lệ 95%)</option>
              <option value="Anh_Chup_Don_Thuoc_Cu_Mo.png">⚠️ Ảnh đơn thuốc cũ/mờ (48%)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              id="btn-student-upload-proof"
              type="submit"
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer h-[36px] disabled:opacity-60"
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span className="truncate">{isSubmitting ? 'Đang quét AI...' : 'Quét AI & Nộp'}</span>
            </button>
          </div>
        </form>
      )}

      {/* AI OCR Audited Requests List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data.requests.map(req => {
          const isValid = req.aiOcrResult?.verdict === 'VALID';
          return (
            <div
              key={req.id}
              id={`card-ai-ocr-${req.id}`}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {req.studentName} ({req.studentCode})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      Nghỉ: {req.date} • {req.sessionSlot}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{req.reason}</p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                    req.approvalStatus === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border-emerald-500/30'
                      : req.approvalStatus === 'rejected'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}
                >
                  {req.approvalStatus === 'approved'
                    ? `✓ Đã duyệt (${req.approvedBy || 'GV'})`
                    : req.approvalStatus === 'rejected'
                      ? '✗ Đã từ chối'
                      : '⏳ Chờ GV kiểm tra'}
                </span>
              </div>

              {/* AI OCR Scan Box */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isValid
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold gap-2">
                  <span className="flex items-center gap-1.5 truncate">
                    {isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <span className="truncate">Kết quả quét AI OCR ({req.proofFileName}):</span>
                  </span>
                  <button
                    id={`btn-view-ocr-detail-${req.id}`}
                    type="button"
                    onClick={() => setOcrPreviewReq(req)}
                    className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3 h-3" /> Xem Ảnh Quét OCR ({req.aiOcrResult?.confidence || 0}%)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] opacity-90">
                  <div>• Nơi cấp: <b>{req.aiOcrResult?.hospital}</b></div>
                  <div>• Ngày khám: <b>{req.aiOcrResult?.examDate}</b></div>
                  <div className="col-span-2">• Kết luận AI: <b>{req.aiOcrResult?.verdictLabel}</b></div>
                </div>
              </div>

              {/* Make-up Study Pack Status & Action */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>Gói học bù tự động: {req.makeupPack?.lessonTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Tài liệu: <b>{req.makeupPack?.slideFile}</b> • Trạng thái:{' '}
                    {req.makeupPack?.isCompleted ? (
                      <strong className="text-emerald-600 dark:text-[#00dfa2]">
                        Đã hoàn thành bài bù ({req.makeupPack.score}/10đ • Đã bảo toàn chuyên cần)
                      </strong>
                    ) : (
                      <strong className="text-amber-600 dark:text-amber-400">Chưa hoàn thành bài tập bù</strong>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {role === 'teacher' && req.approvalStatus === 'pending' && (
                    <>
                      <button
                        id={`btn-approve-ai-leave-${req.id}`}
                        type="button"
                        disabled={busyReqId === req.id}
                        onClick={() => handleApproveAndSendPack(req.id, 'approved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        Duyệt & Gửi Gói Học Bù
                      </button>
                      <button
                        id={`btn-reject-ai-leave-${req.id}`}
                        type="button"
                        disabled={busyReqId === req.id}
                        onClick={() => handleApproveAndSendPack(req.id, 'rejected')}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {req.approvalStatus === 'approved' && (
                    <button
                      id={`btn-open-makeup-pack-${req.id}`}
                      type="button"
                      onClick={() => openMakeupModal(req)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{req.makeupPack?.isCompleted ? 'Xem Lại Bài Học Bù' : 'Mở Học Bù & Làm Quiz'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal AI Vision OCR Bounding Boxes Preview */}
      {ocrPreviewReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0c1424] border border-sky-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                🔍 Chi tiết Quét Minh chứng AI ({ocrPreviewReq.proofFileName})
              </h4>
              <button
                type="button"
                onClick={() => setOcrPreviewReq(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex justify-between">
                <span>[Vùng nhận diện 1 - Bệnh viện]: {ocrPreviewReq.aiOcrResult?.hospital}</span>
                <span className="font-bold text-emerald-600">Khớp 99%</span>
              </div>
              <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex justify-between">
                <span>[Vùng nhận diện 2 - Họ tên SV]: {ocrPreviewReq.aiOcrResult?.patientName}</span>
                <span className="font-bold text-emerald-600">Khớp 98%</span>
              </div>
              <div className={`p-2.5 rounded-xl border-2 flex justify-between ${
                ocrPreviewReq.aiOcrResult?.dateMatched ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/15'
              }`}>
                <span>[Vùng nhận diện 3 - Ngày khám]: {ocrPreviewReq.aiOcrResult?.examDate}</span>
                <span className="font-bold">{ocrPreviewReq.aiOcrResult?.dateMatched ? 'Khớp 96%' : '⚠️ Lệch Ngày'}</span>
              </div>
              <div className={`p-2.5 rounded-xl border-2 flex justify-between ${
                ocrPreviewReq.aiOcrResult?.stampDetected ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/15'
              }`}>
                <span>[Vùng nhận diện 4 - Dấu mộc đỏ]: {ocrPreviewReq.aiOcrResult?.stampDetected ? 'Đã xác thực con dấu tròn' : 'Không tìm thấy mộc đỏ'}</span>
                <span className="font-bold">{ocrPreviewReq.aiOcrResult?.confidence}%</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                id="btn-close-ocr-detail-modal"
                type="button"
                onClick={() => setOcrPreviewReq(null)}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-extrabold cursor-pointer"
              >
                Đóng Cửa sổ Kiểm tra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Make-up Study Pack */}
      {activeMakeupModal && (
        <div id="modal-student-makeup-pack" className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  Gói học bù Kiến thức cho Sinh viên Nghỉ có phép
                </span>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                  {activeMakeupModal.makeupPack?.lessonTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveMakeupModal(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                📌 Yêu cầu của Giảng viên (ThS. Phạm Văn Thuận):
              </div>
              <p className="text-slate-600 dark:text-slate-300">{activeMakeupModal.makeupPack?.teacherRequirement}</p>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-[#00dfa2] font-bold">
                  📄 Tài liệu đính kèm: {activeMakeupModal.makeupPack?.slideFile}
                </span>
                <span className="px-3 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold">
                  🎥 Video bài giảng tóm tắt (18 phút)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Bài tập kiểm tra xác nhận đã nắm vững kiến thức buổi nghỉ:
              </div>
              {(activeMakeupModal.makeupPack?.quizQuestions || []).map((q, qIdx) => (
                <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Câu {qIdx + 1}: {q.q}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          quizAnswers[q.id] === oIdx
                            ? 'bg-indigo-500/15 border-indigo-500 text-indigo-800 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`makeup-${activeMakeupModal.id}-${q.id}`}
                          checked={quizAnswers[q.id] === oIdx}
                          onChange={() => {
                            setQuizFeedback(null);
                            setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }));
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {quizFeedback && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300">
                ⚠️ {quizFeedback.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveMakeupModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                id="btn-submit-makeup-quiz"
                type="button"
                disabled={isCompletingQuiz}
                onClick={() => handleCompleteMakeupQuiz(activeMakeupModal)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompletingQuiz ? 'Đang chấm điểm & đồng bộ...' : 'Nộp Bài Học Bù & Bảo Lưu 100% Chuyên Cần'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
