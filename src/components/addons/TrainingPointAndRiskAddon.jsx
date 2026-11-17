import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Award,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Mail,
  X
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

const SPOTLIGHT_CODES = ['26103043', '26103028', '26103011', '26103008', '26103004'];

export default function TrainingPointAndRiskAddon({ gradeList = [], triggerToast }) {
  const [drlData, setDrlData] = useState(() => extendedFeaturesService.getDrlAndRiskData());
  const [showRiskDrawer, setShowRiskDrawer] = useState(true);
  const [advisorModalStudent, setAdvisorModalStudent] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await extendedFeaturesService.fetchDrlAndRiskData();
      if (mounted && res?.data) {
        setDrlData(res.data);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleSyncSchoolDrl = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await extendedFeaturesService.syncSchoolDrl();
      if (res?.data) {
        setDrlData(res.data);
      }
      sound.success();
      triggerToast?.(res?.message || '🏛️ Đã đồng bộ dữ liệu Điểm Rèn Luyện (ĐRL) mới nhất của 50 sinh viên từ Cổng Công tác Sinh viên Nhà trường!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmSendAdvisorEmail = async () => {
    if (!advisorModalStudent || isNotifying) return;
    setIsNotifying(true);
    try {
      const res = await extendedFeaturesService.notifyAdvisorForStudent(advisorModalStudent.studentCode);
      if (res?.data) {
        setDrlData(res.data);
      }
      sound.warning();
      triggerToast?.(res?.message || `📨 Đã gửi Hồ sơ Cảnh báo sớm (GPA + ĐRL ${advisorModalStudent.drl.drlScore}/100) của SV ${advisorModalStudent.studentName} tới Cố vấn học tập & Phòng CTSV!`);
      setAdvisorModalStudent(null);
    } finally {
      setIsNotifying(false);
    }
  };

  const gradeMap = new Map((gradeList || []).map(g => [g.studentCode, g]));
  const sampleStudents = SPOTLIGHT_CODES.map((code, idx) => {
    const fromDrl = drlData?.records?.[code] || extendedFeaturesService.getStudentDrlRecord(code, idx);
    const fromGrade = gradeMap.get(code);
    return {
      studentCode: code,
      studentName: fromDrl?.studentName || fromGrade?.studentName || `Sinh viên ${code}`,
      finalProcessScore: fromGrade?.finalProcessScore ?? fromDrl?.finalProcessScore ?? 7.5,
      drl: fromDrl
    };
  });

  const allRecords = drlData?.list || Object.values(drlData?.records || {});
  const totalCount = drlData?.summary?.total ?? (allRecords.length || 50);
  const safeCount = drlData?.summary?.safeCount ?? allRecords.filter(r => r.riskLevel === 'SAFE').length;
  const watchCount = drlData?.summary?.watchCount ?? allRecords.filter(r => r.riskLevel === 'WATCH').length;
  const criticalCount = drlData?.summary?.criticalCount ?? allRecords.filter(r => r.riskLevel === 'CRITICAL').length;

  return (
    <div id="addon-drl-and-risk" className="mt-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-amber-500/5 to-rose-500/10 border border-teal-500/30 space-y-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30">
              Điểm Rèn luyện & Dự báo Nguy cơ Học vụ
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Nguồn: {drlData.syncSource} • Cập nhật: {drlData.lastSyncedAt}
            </span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            Đối chiếu Kép: Học lực (GPA) × Điểm Rèn luyện (ĐRL) & Chỉ số Cảnh báo Sớm
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-sync-school-drl"
            type="button"
            disabled={isSyncing}
            onClick={handleSyncSchoolDrl}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-teal-500/40 text-xs font-extrabold text-teal-700 dark:text-[#00dfa2] flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ ĐRL Từ Trường'}</span>
          </button>
          <button
            id="btn-open-risk-predictor"
            type="button"
            onClick={() => setShowRiskDrawer(!showRiskDrawer)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showRiskDrawer ? 'Thu Gọn Ma Trận Rủi Ro' : 'Mở Ma Trận Dự Báo Rủi Ro'}</span>
          </button>
        </div>
      </div>

      {/* Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sampleStudents.map(stu => {
          const isCritical = stu.drl.riskLevel === 'CRITICAL';
          const isWatch = stu.drl.riskLevel === 'WATCH';
          return (
            <div
              key={stu.studentCode}
              className={`p-3.5 rounded-2xl border space-y-2 transition-all ${
                isCritical
                  ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                  : isWatch
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{stu.studentName}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                  ĐRL: {stu.drl.drlScore}/100
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Xếp loại: <b>{stu.drl.drlRank}</b></span>
                <span className={`font-extrabold ${isCritical ? 'text-rose-600 dark:text-rose-400' : isWatch ? 'text-amber-600' : 'text-emerald-600 dark:text-[#00dfa2]'}`}>
                  Rủi ro: {stu.drl.riskIndex}%
                </span>
              </div>
              {/* Visual Risk Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${isCritical ? 'bg-rose-500' : isWatch ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${stu.drl.riskIndex}%` }}
                />
              </div>
              {(isCritical || isWatch) && (
                <button
                  type="button"
                  onClick={() => setAdvisorModalStudent(stu)}
                  className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Mail className="w-3 h-3" /> {stu.drl.advisorNotified ? 'Đã báo CVHT (Gửi lại)' : 'Soạn Thư Báo Cố Vấn'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Multi-dimensional At-Risk Matrix Drawer */}
      {showRiskDrawer && (
        <div id="drawer-risk-predictor-matrix" className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-rose-500/30 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Công thức Chỉ số Nguy cơ Học vụ AI (0–100%):</span>
            </div>
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">
              Nguy cơ = 35%(Vắng học) + 25%(Trễ hạn Lab) + 25%(Đà sụt điểm) + 15%(ĐRL &lt; 60)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="font-black text-emerald-700 dark:text-[#00dfa2]">🟢 Nhóm An toàn (Nguy cơ 0–30%)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{safeCount}/{totalCount} Sinh viên • Chuyên cần tốt, ĐRL ≥ 75, đủ chuẩn xét học bổng.</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="font-black text-amber-700 dark:text-amber-300">🟡 Nhóm Cần chú ý (Nguy cơ 31–69%)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{watchCount}/{totalCount} Sinh viên • Bắt đầu nộp bài Lab muộn hoặc ĐRL mức Trung bình.</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="font-black text-rose-700 dark:text-rose-300">🔴 Nhóm Báo động đỏ (Nguy cơ ≥ 70%)</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{criticalCount}/{totalCount} Sinh viên • Nguy cơ rớt môn & bị kỷ luật ĐRL nếu không can thiệp trước tuần 12.</div>
            </div>
          </div>
        </div>
      )}

      {/* Advisor Email Draft Modal */}
      {advisorModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1424] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                📨 Dự Thảo Hồ Sơ Cảnh Báo Gửi Cố Vấn Học Tập
              </h4>
              <button
                type="button"
                onClick={() => setAdvisorModalStudent(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs space-y-2 leading-relaxed">
              <div><b>Kính gửi:</b> Ban Cố vấn Học tập Khoa CNTT & Phòng Công tác Sinh viên</div>
              <div><b>Sinh viên cần hỗ trợ khẩn:</b> {advisorModalStudent.studentName} ({advisorModalStudent.studentCode})</div>
              <div><b>Điểm Rèn Luyện hiện tại:</b> {advisorModalStudent.drl.drlScore}/100 (Xếp loại: {advisorModalStudent.drl.drlRank})</div>
              <div><b>Chỉ số nguy cơ học vụ AI:</b> <span className="text-rose-600 font-black">{advisorModalStudent.drl.riskIndex}%</span> — {advisorModalStudent.drl.disciplineWarning || 'Vắng học & Điểm Lab thấp'}</div>
              <div><b>Đề xuất của Giảng viên bộ môn:</b> Phối hợp nhắc nhở và hướng dẫn sinh viên hoàn thành các Gói học bù trước kỳ thi cuối kỳ.</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdvisorModalStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isNotifying}
                onClick={handleConfirmSendAdvisorEmail}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-extrabold cursor-pointer shadow-md"
              >
                {isNotifying ? 'Đang gửi...' : 'Phát Lệnh Cảnh Báo Tới Cố Vấn Học Tập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
