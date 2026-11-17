import React, { useState, useEffect } from 'react';
import { Flame, Award, Zap, Shield, Ticket, CheckCircle2 } from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

export default function GamificationStreakHub({ activeStudentCode = '26103043', triggerToast }) {
  const [profile, setProfile] = useState(() => extendedFeaturesService.getGamificationProfile(activeStudentCode));
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(extendedFeaturesService.getGamificationProfile(activeStudentCode));
    const loadProfile = async () => {
      const res = await extendedFeaturesService.fetchGamificationProfile(activeStudentCode);
      if (!cancelled && res?.profile) {
        setProfile({ ...res.profile });
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [activeStudentCode]);

  const handleRedeemLatePass = async () => {
    if (isRedeeming) return;
    if (profile.expPoints < 500) {
      triggerToast?.('Bạn cần tối thiểu 500 EXP để đổi Vé miễn trừ đi trễ!', 'error');
      return;
    }
    setIsRedeeming(true);
    try {
      const res = await extendedFeaturesService.redeemLatePass(activeStudentCode);
      if (res?.success === false) {
        triggerToast?.(res.message || 'Không đủ EXP để đổi Vé Miễn trừ Đi trễ!', 'error');
        return;
      }
      if (res?.profile) {
        setProfile({ ...res.profile });
      }
      sound.success();
      triggerToast?.(
        res?.message || '🎟️ Đổi thành công 1 Vé Miễn trừ Đi trễ! Vé sẽ tự động áp dụng nếu bạn quét QR trễ dưới 15 phút.'
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div id="module-gamification-streaks" className="mt-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-emerald-500/15 border border-amber-500/30 space-y-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex flex-col items-center justify-center shadow-lg shrink-0">
            <Flame className="w-5 h-5 fill-white" />
            <span className="text-[10px] font-black">{profile.currentStreak} Buổi</span>
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              Chuỗi Chuyên cần & Huy hiệu Thành tích
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
              Chuỗi Chuyên cần 🔥 {profile.currentStreak} Buổi Liên tiếp • Cấp {profile.level}: {profile.levelTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Điểm kinh nghiệm tích lũy: <strong className="text-amber-600 dark:text-amber-400">{profile.expPoints} EXP</strong> • Đang sở hữu: <strong className="text-emerald-600 dark:text-[#00dfa2]">{profile.latePassCount} Vé Miễn trừ Đi trễ</strong>
            </p>
          </div>
        </div>

        <button
          id="btn-redeem-late-pass"
          type="button"
          disabled={isRedeeming}
          onClick={handleRedeemLatePass}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
        >
          <Ticket className="w-4 h-4" />
          <span>{isRedeeming ? 'Đang đổi vé...' : 'Đổi Vé Miễn trừ Đi trễ (-500 EXP)'}</span>
        </button>
      </div>

      {/* Unlocked Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {profile.badges.map(b => (
          <div
            key={b.id}
            className={`p-3.5 rounded-2xl border space-y-1.5 ${
              b.unlocked
                ? 'bg-white dark:bg-[#0c1424] border-amber-500/40 shadow-sm'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <Award className={`w-5 h-5 ${b.unlocked ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">+{b.rewardExp} EXP</span>
            </div>
            <div className="font-extrabold text-xs text-slate-900 dark:text-white">{b.name}</div>
            <p className="text-[11px] text-slate-500">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
