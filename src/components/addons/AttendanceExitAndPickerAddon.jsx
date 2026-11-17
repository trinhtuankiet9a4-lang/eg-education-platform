import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Shuffle,
  Award,
  RotateCcw,
  Users,
  Search,
  Clock,
  Sparkles,
  Target,
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { STUDENTS_K26_A } from '../../data/students.js';
import { sound } from '../../utils/sound.js';
import ClassroomChalkThrowGame from './ClassroomChalkThrowGame';

const WHEEL_COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#84cc16', // lime-500
  '#e11d48', // rose-600
  '#0ea5e9', // sky-500
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeWedge(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function formatShortWheelLabel(stu) {
  const parts = String(stu.name || '').trim().split(/\s+/);
  const lastName = parts[parts.length - 1] || '';
  const codeTail = String(stu.code || '').slice(-4);
  return `${lastName} (${codeTail})`;
}

export default function AttendanceExitAndPickerAddon({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [exitData, setExitData] = useState(() => extendedFeaturesService.getExitTicketData());
  const [ans1, setAns1] = useState('');
  const [ans2, setAns2] = useState('');
  const [selectedQuizOpt, setSelectedQuizOpt] = useState(0);
  const [pickedStudent, setPickedStudent] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerMode, setPickerMode] = useState('chalk_game'); // 'chalk_game' | 'wheel'
  const [pendingTargetStudent, setPendingTargetStudent] = useState(null);
  const pickerModeRef = useRef(pickerMode);
  pickerModeRef.current = pickerMode;

  // Vòng quay trực quan SVG Wheel state
  const SLICE_COUNT = 12;
  const SLICE_ANGLE = 360 / SLICE_COUNT;
  const [wheelStudents, setWheelStudents] = useState(() => STUDENTS_K26_A.slice(0, SLICE_COUNT));
  const [wheelRotation, setWheelRotation] = useState(0);
  const spinTimeoutRef = useRef(null);

  // Bộ lọc Phiếu Kiểm Tra Hiểu Bài theo sĩ số thực tế 88 SV
  const [ticketTab, setTicketTab] = useState('submitted'); // 'submitted' | 'pending'
  const [ticketSearch, setTicketSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const res = await extendedFeaturesService.fetchExitTicketData();
      if (!cancelled && res?.data) {
        setExitData({ ...res.data });
      }
    };
    loadData();
    const timer = setInterval(loadData, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const handleSpinColdCall = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    try {
      const res = await extendedFeaturesService.spinColdCall();
      const chosen = res?.chosen || {};
      const displayCode = chosen.studentCode || chosen.code || STUDENTS_K26_A[0].code;
      const displayName = chosen.fullName || chosen.studentName || chosen.name || extendedFeaturesService.resolveStudentName(displayCode);

      setPendingTargetStudent({ studentCode: displayCode, fullName: displayName });

      // Xếp sinh viên được chọn vào 1 múi ngẫu nhiên trên bánh xe 12 múi
      const winnerIdx = Math.floor(Math.random() * SLICE_COUNT);
      const otherCandidates = STUDENTS_K26_A.filter((s) => s.code !== displayCode);
      const shuffledOthers = [...otherCandidates].sort(() => Math.random() - 0.5).slice(0, SLICE_COUNT - 1);
      const nextWheel = [];
      let otherPtr = 0;
      for (let i = 0; i < SLICE_COUNT; i++) {
        if (i === winnerIdx) {
          nextWheel.push({ code: displayCode, name: displayName });
        } else {
          nextWheel.push(shuffledOthers[otherPtr++] || STUDENTS_K26_A[i]);
        }
      }
      setWheelStudents(nextWheel);

      // Tính góc quay sao cho múi winnerIdx dừng thẳng dưới kim chỉ ở đỉnh 12h (góc 0deg)
      const alignDeg = (360 - winnerIdx * SLICE_ANGLE) % 360;
      const jitter = Math.round((Math.random() - 0.5) * 12); // ±6° bên trong múi 30°
      const baseSpins = Math.ceil((wheelRotation + 1800) / 360) * 360;
      const nextRot = baseSpins + alignDeg + jitter;
      setWheelRotation(nextRot);

      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = setTimeout(() => {
        if (res?.data) {
          setExitData({ ...res.data });
        }
        setPickedStudent({ ...chosen, fullName: displayName, studentCode: displayCode });
        setPendingTargetStudent(null);
        setIsSpinning(false);
        sound.success();
        triggerToast?.(
          pickerModeRef.current === 'chalk_game'
            ? `🎯 Thầy đã ném phấn trúng SV: ${displayName} (${displayCode}) (+0.25đ)!`
            : (res?.message || `🎯 Vòng quay đã dừng ở SV: ${displayName} (${displayCode}) (+0.25đ)!`)
        );
      }, 3000);
    } catch {
      setPendingTargetStudent(null);
      setIsSpinning(false);
      triggerToast?.(
        pickerModeRef.current === 'chalk_game'
          ? 'Không thể thực hiện ném phấn lúc này!'
          : 'Không thể thực hiện vòng quay lúc này!',
        'error'
      );
    }
  };

  const handleResetAllExitData = async () => {
    if (isSpinning) return;
    const res = await extendedFeaturesService.resetExitTicketData();
    if (res?.data) {
      setExitData({ ...res.data });
    }
    setPickedStudent(null);
    setPendingTargetStudent(null);
    triggerToast?.('Đã làm mới lịch sử gọi tên & phiếu kiểm tra hiểu bài!');
  };

  const handleSubmitExitTicket = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const studentName = extendedFeaturesService.resolveStudentName(activeStudentCode);
      const res = await extendedFeaturesService.submitExitTicket({
        studentCode: activeStudentCode,
        studentName,
        ans1,
        ans2,
        selectedOption: selectedQuizOpt,
      });
      if (res?.success === false) {
        triggerToast?.(res.message || 'Vui lòng nhập đầy đủ phản hồi trước khi nộp!', 'error');
        return;
      }
      if (res?.data) {
        setExitData({ ...res.data });
      }
      sound.success();
      triggerToast?.(
        res?.message || '🎫 Đã nộp Phiếu xác nhận cuối buổi thành công! Hệ thống đã ghi nhận điểm danh ra về hợp lệ.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalClassStudents = STUDENTS_K26_A.length; // 88 sinh viên thực tế
  const responses = exitData.responses || [];
  const coldCallHistory = exitData.coldCallHistory || [];
  const myExitResponse = responses.find(r => r.studentCode === activeStudentCode);

  const submittedCodes = useMemo(() => new Set(responses.map(r => r.studentCode)), [responses]);
  const unsubmittedStudents = useMemo(
    () => STUDENTS_K26_A.filter(s => !submittedCodes.has(s.code)),
    [submittedCodes]
  );

  const filteredUnsubmitted = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return unsubmittedStudents;
    return unsubmittedStudents.filter(
      s => s.name.toLowerCase().includes(q) || s.code.includes(q)
    );
  }, [unsubmittedStudents, ticketSearch]);

  const filteredSubmitted = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter(
      r => (r.studentName || '').toLowerCase().includes(q) || (r.studentCode || '').includes(q)
    );
  }, [responses, ticketSearch]);

  const submittedPct = totalClassStudents > 0 ? Math.round((responses.length / totalClassStudents) * 100) : 0;

  return (
    <div id="addon-exit-ticket-and-picker" className="mt-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 border border-emerald-500/30 space-y-4 shadow-sm">
      {role === 'teacher' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Teacher Cold-Call Picker: 2D Chalk Throw Game or Classic Wheel (Col 7) */}
          <div className="xl:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {pickerMode === 'chalk_game'
                    ? `Ném Phấn Gọi Tên 2D (${totalClassStudents}/100 chỗ)`
                    : `Vòng quay Gọi tên Trực quan (${totalClassStudents} SV)`}
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                  {pickerMode === 'chalk_game'
                    ? 'Giảng Đường 2D • Thầy Ném Phấn Gọi Tên'
                    : 'Vòng Quay Ngẫu Nhiên Có Trọng Số'}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetAllExitData}
                  disabled={isSpinning}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
                  title="Làm mới lịch sử gọi tên & phiếu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-spin-cold-call"
                  type="button"
                  disabled={isSpinning}
                  onClick={handleSpinColdCall}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {pickerMode === 'chalk_game' ? (
                    <Target className={`w-4 h-4 ${isSpinning ? 'animate-pulse' : ''}`} />
                  ) : (
                    <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  )}
                  <span>
                    {isSpinning
                      ? (pickerMode === 'chalk_game' ? 'Đang ném phấn...' : 'Đang quay...')
                      : (pickerMode === 'chalk_game' ? 'Ném Phấn Gọi Tên' : 'Quay gọi Sinh viên')}
                  </span>
                </button>
              </div>
            </div>

            {/* Sleek Mode Toggle Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPickerMode('chalk_game')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    pickerMode === 'chalk_game'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {`🎯 Game Ném Phấn 2D (${totalClassStudents}/100 chỗ)`}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode('wheel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    pickerMode === 'wheel'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🎡 Vòng Quay Cổ Điển
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn ngẫu nhiên từ <strong>{totalClassStudents} SV lớp CNTT K26</strong> (loại trừ diện cấm thi/đã gọi gần đây).
              </p>
            </div>

            {pickerMode === 'chalk_game' ? (
              <ClassroomChalkThrowGame
                students={STUDENTS_K26_A}
                maxSeats={100}
                isThrowing={isSpinning}
                targetStudent={pendingTargetStudent}
                pickedStudent={pickedStudent}
                onTriggerThrow={handleSpinColdCall}
                onReset={handleResetAllExitData}
              />
            ) : (
              <>
                {/* Bánh xe vòng quay tròn SVG + Kim chỉ đỉnh 12h */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-72 h-72 sm:w-80 sm:h-80 select-none">
                    {/* Kim chỉ vị trí trúng thưởng (ở đỉnh 12 giờ) */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 drop-shadow-md">
                      <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-rose-600" />
                    </div>

                    {/* Vòng viền ngoài bánh xe */}
                    <div className="w-full h-full rounded-full p-2 bg-gradient-to-br from-slate-200 via-amber-200 to-slate-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 shadow-xl border-2 border-amber-400/60">
                      <svg
                        viewBox="0 0 320 320"
                        className="w-full h-full rounded-full"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transition: isSpinning
                            ? 'transform 3s cubic-bezier(0.12, 0.85, 0.14, 1)'
                            : 'transform 0.3s ease-out',
                        }}
                      >
                        {wheelStudents.map((stu, idx) => {
                          const midDeg = idx * SLICE_ANGLE - 90;
                          const startDeg = midDeg - SLICE_ANGLE / 2;
                          const endDeg = midDeg + SLICE_ANGLE / 2;
                          const color = WHEEL_COLORS[idx % WHEEL_COLORS.length];

                          return (
                            <g key={`${stu.code}-${idx}`}>
                              <path
                                d={describeWedge(160, 160, 156, startDeg, endDeg)}
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth="2"
                              />
                              <text
                                x="252"
                                y="160"
                                fill="#ffffff"
                                fontSize="10"
                                fontWeight="800"
                                textAnchor="middle"
                                dominantBaseline="central"
                                transform={`rotate(${midDeg} 160 160)`}
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
                              >
                                {formatShortWheelLabel(stu)}
                              </text>
                            </g>
                          );
                        })}
                        {/* Vòng tâm */}
                        <circle cx="160" cy="160" r="32" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
                      </svg>
                    </div>

                    {/* Nút QUAY đặt ngay giữa tâm vòng quay */}
                    <button
                      type="button"
                      onClick={handleSpinColdCall}
                      disabled={isSpinning}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 hover:brightness-110 text-white font-black text-[11px] tracking-wider shadow-lg border-2 border-white flex items-center justify-center cursor-pointer disabled:opacity-75 transition-transform active:scale-95"
                      title="Bấm để quay vòng quay chọn sinh viên"
                    >
                      {isSpinning ? '...' : 'QUAY'}
                    </button>
                  </div>
                </div>

                {pickedStudent && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 animate-fadeIn">
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Trúng thưởng gọi tên: {pickedStudent.fullName} ({pickedStudent.studentCode})</span>
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Trả lời đúng được cộng +0.25đ vào Sổ Điểm (Lưu SQLite)!
                      </div>
                    </div>
                    <Award className="w-6 h-6 text-amber-500 shrink-0" />
                  </div>
                )}
              </>
            )}

            {coldCallHistory.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lịch sử gọi tên gần nhất ({coldCallHistory.length} lượt)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {coldCallHistory.slice(0, 6).map((item, idx) => (
                    <span
                      key={item.id || `${item.studentCode}-${idx}`}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-800 dark:text-amber-300"
                    >
                      {item.studentName} ({item.studentCode}) {item.bonus ? `• ${item.bonus}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Teacher Exit Ticket Responses Monitor - Synchronized with 88 real students (Col 5) */}
          <div className="xl:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2]">
                  Phiếu Xác nhận Cuối buổi
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                  Phiếu Kiểm tra Hiểu bài Cuối giờ ({responses.length}/{totalClassStudents} Đã nộp)
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] text-[10px] font-black shrink-0">
                Sĩ số thật: {totalClassStudents} SV
              </span>
            </div>

            {/* Thanh tiến độ đối chiếu đủ 88 sinh viên */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2]" />
                  Tiến độ nộp phiếu lớp CNTT K26:
                </span>
                <span className="text-emerald-600 dark:text-[#00dfa2]">
                  {responses.length}/{totalClassStudents} SV ({submittedPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${submittedPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Đã nộp: <strong className="text-emerald-600 dark:text-[#00dfa2]">{responses.length} SV</strong></span>
                <span>Chưa nộp: <strong className="text-amber-600 dark:text-amber-400">{totalClassStudents - responses.length} SV</strong></span>
              </div>
            </div>

            {/* Bộ lọc xem Đã nộp vs Chưa nộp (trong 88 SV) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTicketTab('submitted')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    ticketTab === 'submitted'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Đã nộp ({responses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    ticketTab === 'pending'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Chưa nộp ({totalClassStudents - responses.length})
                </button>
              </div>

              <div className="relative flex-1 sm:max-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Tìm tên / MSSV..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ticketTab === 'submitted' ? (
                filteredSubmitted.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                    Chưa có sinh viên nào nộp phiếu kiểm tra hiểu bài cuối giờ (0/{totalClassStudents}).
                  </div>
                ) : (
                  filteredSubmitted.map((r, i) => (
                    <div key={r.studentCode || i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{r.studentName} ({r.studentCode})</span>
                        <span className="text-emerald-600 dark:text-[#00dfa2]">✓ Đã nộp {r.submittedAt}</span>
                      </div>
                      <div className="text-slate-500 truncate mt-0.5">Phản hồi: "{r.ans2 || r.ans1 || 'Đã hoàn thành'}"</div>
                    </div>
                  ))
                )
              ) : filteredUnsubmitted.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                  Không có sinh viên chưa nộp nào khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                filteredUnsubmitted.map((stu) => (
                  <div key={stu.code} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{stu.name}</span>
                      <span className="ml-1.5 font-mono text-slate-500">({stu.code})</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] shrink-0">
                      <Clock className="w-3 h-3" /> Chưa nộp
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Student Exit Ticket Form */
        <form onSubmit={handleSubmitExitTicket} className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2]">
                Phiếu Xác nhận Cuối buổi ({responses.length}/{totalClassStudents} Đã nộp)
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                Hoàn thành Phản hồi Cuối giờ để Xác nhận Điểm danh Ra về
              </h4>
            </div>
            {myExitResponse && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] text-xs font-extrabold">
                ✓ Đã xác nhận ra về ({myExitResponse.submittedAt})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {exitData.question1}
              </label>
              <input
                type="text"
                value={ans1}
                onChange={e => setAns1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {exitData.question2}
              </label>
              <input
                type="text"
                value={ans2}
                onChange={e => setAns2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Câu hỏi nhanh: <b>{exitData.ComprehensionQuiz}</b>
            </div>
            <button
              id="btn-submit-exit-ticket"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi phiếu...' : 'Nộp Phiếu Cuối giờ & Hoàn tất Điểm danh'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
