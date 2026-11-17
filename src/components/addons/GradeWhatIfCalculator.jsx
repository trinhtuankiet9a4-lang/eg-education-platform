import React, { useState, useEffect } from 'react';
import { Sliders, Award, Sparkles, ShieldCheck } from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';

export default function GradeWhatIfCalculator({ studentGrade }) {
  const [whatIfFinalScore, setWhatIfFinalScore] = useState(8.5);
  const targetCode = studentGrade?.studentCode || '26103043';
  const [drlInfo, setDrlInfo] = useState(() => extendedFeaturesService.getStudentDrlRecord(targetCode));

  useEffect(() => {
    setDrlInfo(extendedFeaturesService.getStudentDrlRecord(targetCode));
    let mounted = true;
    extendedFeaturesService.fetchDrlAndRiskData().then(res => {
      if (mounted && res?.data?.records?.[targetCode]) {
        setDrlInfo(res.data.records[targetCode]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [targetCode]);

  const att = Number(studentGrade?.attendanceScore ?? 10);
  const lab = Number(studentGrade?.labScore ?? 9.5);
  const mid = Number(studentGrade?.midtermScore ?? 8.5);
  const bonus = Number(studentGrade?.bonusScore ?? 0.5);

  // Formula: 10% Att + 20% Lab + 20% Mid + 50% Final + Bonus (capped at 10)
  const processScore = att * 0.1 + lab * 0.2 + mid * 0.2;
  const projectedTotal = Math.min(10, Math.round((processScore + whatIfFinalScore * 0.5 + bonus * 0.1) * 10) / 10);
  const letterGrade =
    projectedTotal >= 8.5 ? 'A (Giỏi / Xuất sắc)' :
    projectedTotal >= 7.0 ? 'B (Khá)' :
    projectedTotal >= 5.5 ? 'C (Trung bình)' :
    projectedTotal >= 4.0 ? 'D (Qua môn)' : 'F (Học lại)';

  const minFinalForA = Math.max(0, Math.min(10, Math.ceil(((8.5 - processScore) / 0.5) * 10) / 10));

  return (
    <div id="card-what-if-calculator" className="mt-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Student ĐRL Card from University */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-teal-500/30 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]">
            Điểm Rèn luyện Đồng bộ Từ Nhà trường
          </span>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-[#00dfa2]">
            Xếp loại: {drlInfo.drlRank}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 gap-3">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              Điểm Rèn luyện Học kỳ I (2026–2027)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Đã tham gia {drlInfo.activitiesCount} hoạt động học thuật & phong trào Khoa CNTT. {drlInfo.drlScore >= 80 ? 'Đủ điều kiện xét Học bổng Khuyến khích học tập.' : 'Cần tích lũy thêm hoạt động để đạt chuẩn Học bổng.'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col items-center justify-center shrink-0">
            <span className="text-xl font-black text-emerald-600 dark:text-[#00dfa2]">{drlInfo.drlScore}</span>
            <span className="text-[9px] font-bold text-slate-500">/100 ĐRL</span>
          </div>
        </div>
      </div>

      {/* Right: What-If Final Exam Simulator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-teal-500/10 border border-indigo-500/30 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
            Mô phỏng Điểm thi Cuối kỳ
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
            Cần tối thiểu <b>{minFinalForA}đ</b> cuối kỳ để đạt điểm A
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">
              Kéo chọn Điểm thi Cuối kỳ Giả định (Trọng số 50%):
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-mono text-sm font-black">
              {whatIfFinalScore.toFixed(1)} / 10
            </span>
          </div>
          <input
            id="input-what-if-final-score"
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={whatIfFinalScore}
            onChange={e => setWhatIfFinalScore(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Tổng kết dự kiến: <strong className="text-base font-black text-slate-900 dark:text-white">{projectedTotal}/10</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-[#00dfa2] font-extrabold border border-emerald-500/30">
              Xếp loại chữ dự kiến: {letterGrade}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
