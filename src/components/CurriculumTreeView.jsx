import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  Search,
  Layers,
  ArrowRight,
  GitBranch,
  Info,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';
import {
  CURRICULUM_METADATA,
  CURRICULUM_SEMESTERS,
  K26_COMPLETED_COURSES,
  CURRICULUM_LEGEND,
} from '../data/curriculumK26';

/**
 * Component hiển thị Cây Tiến Trình Đào Tạo Ngành Công Nghệ Thông Tin (HK 1 - HK 8)
 * Kèm bộ 3 biểu đồ trực quan tiến độ học tập cho Sinh viên lớp CNTT K26 (không dữ liệu ảo).
 */
export default function CurriculumTreeView({ classLabel }) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'completed' | 'hk1' | 'upcoming' | 'HK1'..'HK8'
  const [searchQuery, setSearchQuery] = useState('');

  // Tính toán thống kê tiến độ thực tế trực tiếp từ CURRICULUM_SEMESTERS
  const progressStats = useMemo(() => {
    const perSemester = CURRICULUM_SEMESTERS.map((sem) => {
      let totalCredits = 0;
      let completedCredits = 0;
      let activeCredits = 0;
      let upcomingCredits = 0;
      let completedCount = 0;
      let activeCount = 0;

      sem.courses.forEach((c) => {
        const tc = Number(c.credits) || 0;
        totalCredits += tc;
        if (c.status === 'completed') {
          completedCredits += tc;
          completedCount += 1;
        } else if (c.status === 'hk1_remaining') {
          activeCredits += tc;
          activeCount += 1;
        } else {
          upcomingCredits += tc;
        }
      });

      return {
        id: sem.id,
        code: sem.code,
        title: sem.title,
        totalCredits,
        completedCredits,
        activeCredits,
        upcomingCredits,
        totalCourses: sem.courses.length,
        completedCount,
        activeCount,
      };
    });

    const hk1 = perSemester.find((s) => s.id === 'HK1') || {
      totalCredits: 15,
      completedCredits: 10,
      activeCredits: 5,
      totalCourses: 7,
      completedCount: 5,
      activeCount: 2,
    };

    const totalProgramCredits = perSemester.reduce((acc, s) => acc + s.totalCredits, 0);
    const totalCompletedCredits = perSemester.reduce((acc, s) => acc + s.completedCredits, 0);
    const totalActiveCredits = perSemester.reduce((acc, s) => acc + s.activeCredits, 0);
    const totalUpcomingCredits = perSemester.reduce((acc, s) => acc + s.upcomingCredits, 0);
    const totalProgramBlocks = perSemester.reduce((acc, s) => acc + s.totalCourses, 0);
    const totalCompletedBlocks = perSemester.reduce((acc, s) => acc + s.completedCount, 0);
    const totalActiveBlocks = perSemester.reduce((acc, s) => acc + s.activeCount, 0);
    const maxSemCredits = Math.max(...perSemester.map((s) => s.totalCredits), 1);

    const hk1CompletedPct = hk1.totalCredits > 0 ? (hk1.completedCredits / hk1.totalCredits) * 100 : 0;
    const hk1ActivePct = hk1.totalCredits > 0 ? (hk1.activeCredits / hk1.totalCredits) * 100 : 0;
    const overallCompletedPct =
      totalProgramCredits > 0 ? (totalCompletedCredits / totalProgramCredits) * 100 : 0;
    const overallActivePct =
      totalProgramCredits > 0 ? (totalActiveCredits / totalProgramCredits) * 100 : 0;
    const overallUpcomingPct = Math.max(0, 100 - overallCompletedPct - overallActivePct);

    return {
      perSemester,
      hk1,
      maxSemCredits,
      totalProgramCredits,
      totalCompletedCredits,
      totalActiveCredits,
      totalUpcomingCredits,
      totalProgramBlocks,
      totalCompletedBlocks,
      totalActiveBlocks,
      hk1CompletedPct,
      hk1ActivePct,
      overallCompletedPct,
      overallActivePct,
      overallUpcomingPct,
    };
  }, []);

  const filteredSemesters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return CURRICULUM_SEMESTERS.filter((sem) => {
      if (filterMode.startsWith('HK')) return sem.id === filterMode;
      if (filterMode === 'completed' && sem.id !== 'HK1') return false;
      if (filterMode === 'hk1' && sem.id !== 'HK1') return false;
      if (filterMode === 'upcoming' && sem.id === 'HK1') return false;
      return true;
    })
      .map((sem) => {
        const courses = sem.courses.filter((course) => {
          if (filterMode === 'completed' && course.status !== 'completed') return false;

          if (!q) return true;
          const matchMain =
            course.code.toLowerCase().includes(q) ||
            course.name.toLowerCase().includes(q) ||
            (course.alternative && course.alternative.toLowerCase().includes(q)) ||
            (course.scheduleNote && course.scheduleNote.toLowerCase().includes(q));
          const matchOptions =
            Array.isArray(course.options) &&
            course.options.some(
              (opt) =>
                opt.code.toLowerCase().includes(q) ||
                opt.name.toLowerCase().includes(q)
            );
          return matchMain || matchOptions;
        });

        return { ...sem, courses };
      })
      .filter((sem) => sem.courses.length > 0);
  }, [filterMode, searchQuery]);

  const getCourseCardStyle = (course) => {
    if (course.status === 'completed') {
      return 'bg-emerald-50/95 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500/60 shadow-sm ring-1 ring-emerald-400/30';
    }
    if (course.status === 'hk1_remaining') {
      return 'bg-amber-50/90 dark:bg-amber-950/25 border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-400/20';
    }
    switch (course.category) {
      case 'chinh-tri':
        return 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30';
      case 'ngoai-ngu':
        return 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-500/30';
      case 'ai-du-lieu':
        return 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-500/30';
      case 'mang-ht':
        return 'bg-cyan-50/70 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-500/30';
      case 'chuyen-nganh':
      case 'chuyen-de':
      case 'tot-nghiep':
        return 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-500/30';
      default:
        return 'bg-white dark:bg-[#0f192e] border-slate-200 dark:border-slate-700/80';
    }
  };

  const getStatusBadge = (course) => {
    if (course.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3" />
          Đã học xong
        </span>
      );
    }
    if (course.status === 'hk1_remaining') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          Đang học (TKB)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Chưa học
      </span>
    );
  };

  // Tham số hình học SVG Donut (bán kính 42, chu vi 2 * PI * 42)
  const r = 42;
  const c = 2 * Math.PI * r;
  const hk1CompletedArc = (progressStats.hk1CompletedPct / 100) * c;
  const hk1ActiveArc = (progressStats.hk1ActivePct / 100) * c;

  return (
    <div className="space-y-6">
      {/* Header Banner khớp với sơ đồ tiến trình đào tạo */}
      <div className="neu-card rounded-3xl p-5 sm:p-7 border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-[#0c1424] shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-extrabold uppercase tracking-wider">
                {CURRICULUM_METADATA.cohort}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold">
                {classLabel || CURRICULUM_METADATA.className} • Đang ở {CURRICULUM_METADATA.currentSemester}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              {CURRICULUM_METADATA.programTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Bảo toàn 100% nội dung &amp; mã học phần từ sơ đồ chuẩn 8 học kỳ • Cập nhật đúng thực trạng lớp CNTT K26 đã học xong 5 phân môn HK 1 và đang học 2 môn theo TKB.
            </p>
          </div>
        </div>

        {/* 4 KPI thực tế (không số ảo) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Đã học xong (HK1)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {progressStats.totalCompletedBlocks} <span className="text-xs font-bold">Phân môn</span>
            </p>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
              Đã tích lũy {progressStats.totalCompletedCredits} tín chỉ
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/25 border border-teal-200 dark:border-teal-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-teal-700 dark:text-teal-300">Tín chỉ hoàn thành</span>
              <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-1">
              {progressStats.totalCompletedCredits}/{progressStats.hk1.totalCredits} <span className="text-xs font-bold">TC (HK1)</span>
            </p>
            <p className="text-[10px] text-teal-700/80 dark:text-teal-300/80 mt-0.5">
              Đạt {progressStats.hk1CompletedPct.toFixed(1)}% khối lượng HK 1
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-300">Đang học theo TKB</span>
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
              {progressStats.totalActiveBlocks} <span className="text-xs font-bold">Môn ({progressStats.totalActiveCredits} TC)</span>
            </p>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 truncate">
              Lập trình Python &amp; Tiếng Anh 1
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">Tổng lộ trình chuẩn</span>
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
              {CURRICULUM_METADATA.totalSemesters} <span className="text-xs font-bold">HK ({progressStats.totalProgramCredits} TC)</span>
            </p>
            <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
              Tổng {progressStats.totalProgramBlocks} khối học phần HK 1 – HK 8
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BỘ 3 BIỂU ĐỒ TRỰC QUAN THỂ HIỆN TIẾN ĐỘ ĐÀO TẠO                           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Biểu đồ 1: Donut SVG - Tiến độ Học kỳ 1 */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Biểu Đồ Tiến Độ HK 1
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tính trên {progressStats.hk1.totalCredits} Tín chỉ của Học kỳ 1
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                {progressStats.hk1CompletedPct.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  {/* Đang học (Amber) - bắt đầu sau phần Đã học xong */}
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${hk1ActiveArc} ${c}`}
                    strokeDashoffset={-hk1CompletedArc}
                    strokeLinecap="butt"
                  />
                  {/* Đã học xong (Emerald) */}
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${hk1CompletedArc} ${c}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                    {progressStats.hk1CompletedPct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    {progressStats.hk1.completedCredits}/{progressStats.hk1.totalCredits} TC
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-200/80 dark:border-emerald-500/30">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    Đã học xong
                  </span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                    {progressStats.hk1.completedCredits} TC ({progressStats.hk1CompletedPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-amber-200/80 dark:border-amber-500/30">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    Đang học (TKB)
                  </span>
                  <span className="font-extrabold text-amber-700 dark:text-amber-300">
                    {progressStats.hk1.activeCredits} TC ({progressStats.hk1ActivePct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Biểu đồ 2: Stacked Progress Bar - Tiến độ Toàn Chương Trình (8 Học Kỳ) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Thanh Phân Tầng Toàn Khóa ({progressStats.totalProgramCredits} TC)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tổng {progressStats.totalProgramBlocks} khối học phần từ HK 1 đến HK 8
              </p>
            </div>

            <div className="space-y-3">
              {/* Multi-segment Stacked Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${Math.max(progressStats.overallCompletedPct, 2)}%` }}
                    title={`Đã hoàn thành: ${progressStats.totalCompletedCredits} TC (${progressStats.overallCompletedPct.toFixed(1)}%)`}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.max(progressStats.overallActivePct, 1.5)}%` }}
                    title={`Đang học HK1: ${progressStats.totalActiveCredits} TC (${progressStats.overallActivePct.toFixed(1)}%)`}
                  />
                  <div
                    className="h-full bg-slate-300 dark:bg-slate-700 transition-all"
                    style={{ width: `${Math.max(0, 100 - Math.max(progressStats.overallCompletedPct, 2) - Math.max(progressStats.overallActivePct, 1.5))}%` }}
                    title={`Chưa học (HK 2 - HK 8): ${progressStats.totalUpcomingCredits} TC`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>0%</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Tích lũy: {progressStats.overallCompletedPct.toFixed(1)}%
                  </span>
                  <span>100% ({progressStats.totalProgramCredits} TC)</span>
                </div>
              </div>

              {/* 3 Breakdown Tiles */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-200 dark:border-emerald-500/30">
                  <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {progressStats.totalCompletedCredits} TC
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Đã học xong ({progressStats.overallCompletedPct.toFixed(1)}%)
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-amber-200 dark:border-amber-500/30">
                  <div className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    {progressStats.totalActiveCredits} TC
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Đang học ({progressStats.overallActivePct.toFixed(1)}%)
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700">
                  <div className="font-black text-slate-700 dark:text-slate-200 text-sm">
                    {progressStats.totalUpcomingCredits} TC
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Chưa học ({progressStats.overallUpcomingPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Biểu đồ 3: Biểu đồ Cột 8 Học Kỳ (HK 1 -> HK 8) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Tín Chỉ Theo 8 Học Kỳ
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bấm vào cột học kỳ để lọc nhanh
                </p>
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5 items-end h-28 pt-3">
              {progressStats.perSemester.map((sem) => {
                const totalHeightPct = Math.round((sem.totalCredits / progressStats.maxSemCredits) * 100);
                const compShare = sem.totalCredits > 0 ? (sem.completedCredits / sem.totalCredits) * 100 : 0;
                const activeShare = sem.totalCredits > 0 ? (sem.activeCredits / sem.totalCredits) * 100 : 0;
                const upShare = Math.max(0, 100 - compShare - activeShare);
                const isSemSelected = filterMode === sem.id;

                return (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => setFilterMode(isSemSelected ? 'all' : sem.id)}
                    title={`${sem.title}: ${sem.totalCredits} TC (Đã xong: ${sem.completedCredits} TC, Đang học: ${sem.activeCredits} TC)`}
                    className="flex flex-col items-center gap-1 h-full justify-end group cursor-pointer focus:outline-none"
                  >
                    <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {sem.totalCredits}
                    </span>
                    <div
                      className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse bg-slate-200 dark:bg-slate-800 border transition-all ${
                        isSemSelected
                          ? 'ring-2 ring-blue-500 border-blue-500 scale-105'
                          : 'border-slate-300/70 dark:border-slate-700 group-hover:border-blue-400'
                      }`}
                      style={{ height: `${Math.max(totalHeightPct, 28)}%` }}
                    >
                      {compShare > 0 && (
                        <div className="w-full bg-emerald-500" style={{ height: `${compShare}%` }} />
                      )}
                      {activeShare > 0 && (
                        <div className="w-full bg-amber-400" style={{ height: `${activeShare}%` }} />
                      )}
                      {upShare > 0 && (
                        <div
                          className="w-full bg-blue-500/35 dark:bg-indigo-500/40"
                          style={{ height: `${upShare}%` }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-black ${
                        isSemSelected
                          ? 'text-blue-600 dark:text-blue-400 underline'
                          : sem.id === 'HK1'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {sem.id}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-800">
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Xong
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-amber-400" /> Đang học
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-blue-500/40" /> Chưa học
              </span>
            </div>
          </div>
        </div>

        {/* Tóm tắt 5 phân môn vừa học xong của CNTT K26 */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>5 Phân môn lớp CNTT K26 đã học xong (HK 1 • 10 TC):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {K26_COMPLETED_COURSES.map((course) => (
              <div
                key={course.code}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-300 dark:border-emerald-500/40 text-xs shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{course.code}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{course.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                  {course.credits} TC
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Thanh lọc & tìm kiếm */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả 8 Học kỳ' },
              { id: 'completed', label: 'Đã học xong (5 môn)' },
              { id: 'hk1', label: 'Học kỳ 1 (Hiện tại)' },
              { id: 'upcoming', label: 'HK 2 – HK 8 (Chưa học)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {filterMode.startsWith('HK') && (
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 cursor-pointer"
              >
                Đang lọc: {filterMode} ✕
              </button>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã HP hoặc tên môn (VD: KC213037)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </div>

      {/* Sơ đồ 8 Học kỳ (HK 1 -> HK 8) */}
      <div className="space-y-4">
        {filteredSemesters.length === 0 ? (
          <div className="neu-card rounded-2xl p-8 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800">
            Không tìm thấy học phần nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredSemesters.map((semester) => (
            <div
              key={semester.id}
              className={`rounded-3xl p-4 sm:p-5 border transition-all bg-white dark:bg-[#0c1424] shadow-md ${
                semester.isCurrent
                  ? 'border-emerald-400 dark:border-emerald-500/50 ring-1 ring-emerald-400/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                {/* Cột Học kỳ bên trái giống sơ đồ */}
                <div
                  className={`lg:w-32 shrink-0 rounded-2xl p-4 flex lg:flex-col items-center justify-between lg:justify-center text-center text-white shadow-sm ${
                    semester.isCurrent
                      ? 'bg-gradient-to-br from-blue-600 to-emerald-600'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                  }`}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-85">HỌC KỲ</p>
                    <p className="text-2xl font-black tracking-tight mt-0.5">{semester.code}</p>
                  </div>
                  <div className="lg:mt-2 flex flex-col items-end lg:items-center gap-1">
                    {semester.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold backdrop-blur-xs">
                        Hiện tại (K26)
                      </span>
                    )}
                    <span className="text-[10px] font-semibold opacity-90">
                      {semester.courses.length} khối HP
                    </span>
                  </div>
                </div>

                {/* Lưới các thẻ học phần bên phải */}
                <div className="flex-1 space-y-3">
                  {semester.summary && (
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{semester.summary}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {semester.courses.map((course) => (
                      <div
                        key={course.id}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 transition-all ${getCourseCardStyle(
                          course
                        )}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-extrabold text-blue-700 dark:text-blue-300">
                              {course.code}
                            </span>
                            {getStatusBadge(course)}
                          </div>

                          <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug">
                            {course.name}
                          </h4>

                          {course.scheduleNote && (
                            <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/40 px-2 py-1 rounded-lg flex items-start gap-1 leading-snug">
                              <Calendar className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{course.scheduleNote}</span>
                            </p>
                          )}

                          {course.groupTitle && (
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 pt-0.5">
                              {course.groupTitle}
                            </p>
                          )}

                          {Array.isArray(course.options) && course.options.length > 0 && (
                            <ul className="space-y-1 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                              {course.options.map((opt) => (
                                <li
                                  key={opt.code}
                                  className="text-[10px] text-slate-700 dark:text-slate-300 flex items-start justify-between gap-1.5"
                                >
                                  <span className="leading-tight">
                                    <strong className="font-mono text-blue-700 dark:text-blue-300">
                                      {opt.code}
                                    </strong>{' '}
                                    ({opt.credits}) {opt.name}
                                    {opt.prior && opt.prior.length > 0 && (
                                      <span className="block text-[9px] text-slate-500 dark:text-slate-400">
                                        Học trước: {opt.prior.join(', ')}
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {course.alternative && (
                            <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/25 px-2 py-1 rounded-lg leading-snug">
                              {course.alternative}
                            </p>
                          )}

                          {course.prior && course.prior.length > 0 && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span>Học trước: {course.prior.join(', ')}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {course.mandatoryNote || 'Khối lượng'}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-black text-[11px] border border-blue-500/20">
                            {course.credits} TC
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chú giải ký hiệu sơ đồ (khớp góc dưới bên phải của ảnh tiến trình) */}
      <div className="neu-card rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Chú giải ký hiệu sơ đồ tiến trình:
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            {CURRICULUM_LEGEND.map((item) => (
              <span key={item.type} className="inline-flex items-center gap-1.5 font-semibold">
                <ArrowRight className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Ghi chú: {CURRICULUM_METADATA.note}
        </div>
      </div>
    </div>
  );
}
