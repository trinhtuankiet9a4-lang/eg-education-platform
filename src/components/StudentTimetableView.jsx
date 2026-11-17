import React, { useState } from 'react';
import { Calendar, Clock, MapPin, UserCheck, BookOpen, Laptop } from 'lucide-react';
import { STUDENT_WEEKLY_TIMETABLES } from '../data/curriculumK26';

/**
 * Component hiển thị Thời Khóa Biểu Thực Tế Sinh Viên CNTT K26 (Trường Đại học Tây Nguyên)
 * Cập nhật chính xác 5 tuần từ 16/11/2026 đến 20/12/2026 theo ảnh thời khóa biểu của nhà trường.
 */
export default function StudentTimetableView() {
  const [selectedWeekId, setSelectedWeekId] = useState('all');

  const visibleWeeks =
    selectedWeekId === 'all'
      ? STUDENT_WEEKLY_TIMETABLES
      : STUDENT_WEEKLY_TIMETABLES.filter((w) => w.id === selectedWeekId);

  const shifts = [
    { key: 'sang', label: 'Sáng' },
    { key: 'chieu', label: 'Chiều' },
    { key: 'toi', label: 'Tối' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner thông tin nguồn & các học phần đang học */}
      <div className="neu-card rounded-3xl p-5 sm:p-6 border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-[#0c1424] shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-extrabold">
                Trường Đại học Tây Nguyên
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30 text-[11px] font-extrabold">
                Lớp CNTT K26 • Từ 16/11/2026 đến 20/12/2026
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Thời Khóa Biểu Tuần Chính Thức (Sinh Viên CNTT K26)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đồng bộ chính xác lịch học 2 học phần còn lại của HK 1 (Lập trình Python &amp; Tiếng Anh 1).
            </p>
          </div>
        </div>

        {/* Tóm tắt 2 học phần đang có lịch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-500/30 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-sm text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                HP: Lập trình Python (KC213042)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-extrabold text-[10px] border border-sky-500/30">
                Tiết (7-10) • Chiều
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                GV: <strong>Từ Ngọc Thảo</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Phòng: <strong>Online</strong> (PM: --, mã: --)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              Lịch: Thứ 3 (17/11), Thứ 5 (19/11), Thứ 2 (23/11), Thứ 5 (26/11), Thứ 3 (01/12)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-500/30 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                HP: Tiếng Anh 1 (FL211020)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                Tiết (7-10) / (7-8) • Chiều
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                GV: <strong>Tôn Nữ Hồng Hà</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Phòng: <strong>9.2.11</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              Lịch: Thứ 6 hàng tuần (20/11, 27/11 tiết 7-10; 04/12 tiết 7-8)
            </div>
          </div>
        </div>

        {/* Bộ lọc chọn tuần */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSelectedWeekId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedWeekId === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả 5 tuần (16/11 – 20/12/2026)
          </button>
          {STUDENT_WEEKLY_TIMETABLES.map((wk) => (
            <button
              key={wk.id}
              type="button"
              onClick={() => setSelectedWeekId(wk.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedWeekId === wk.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {wk.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng thời khóa biểu theo tuần chuẩn ĐH Tây Nguyên */}
      <div className="space-y-5">
        {visibleWeeks.map((week) => (
          <div
            key={week.id}
            className="neu-card rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] shadow-md space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                {week.title}
              </h4>
              {week.isEmpty && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                  Không có lịch học trong tuần này
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700">
              <table className="w-full min-w-[780px] border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0d3b66] text-white">
                    <th className="w-20 p-2.5 text-center font-extrabold border border-slate-300/40 dark:border-slate-700">
                      Thứ / Buổi
                    </th>
                    {week.days.map((day) => (
                      <th
                        key={day.date}
                        className="p-2.5 text-center font-extrabold border border-slate-300/40 dark:border-slate-700"
                      >
                        <div>{day.dayName}</div>
                        <div className="text-[11px] font-semibold opacity-90">{day.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.key}>
                      <td className="p-2.5 font-extrabold text-slate-800 dark:text-slate-200 bg-cyan-50/90 dark:bg-cyan-950/30 text-center border border-slate-300 dark:border-slate-700">
                        {shift.label}
                      </td>
                      {week.days.map((day) => {
                        const slot = day[shift.key];
                        const isLightCyanRow = shift.key === 'sang' || shift.key === 'toi';
                        return (
                          <td
                            key={`${day.date}-${shift.key}`}
                            className={`p-2 align-top border border-slate-300 dark:border-slate-700 ${
                              slot
                                ? 'bg-white dark:bg-[#0f192e]'
                                : isLightCyanRow
                                ? 'bg-cyan-50/50 dark:bg-cyan-950/15 h-9'
                                : 'bg-slate-50/60 dark:bg-[#090e1a]/60 h-20'
                            }`}
                          >
                            {slot ? (
                              <div
                                className={`p-2 rounded-xl border space-y-0.5 leading-snug ${
                                  slot.courseCode === 'KC213042'
                                    ? 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/40 text-slate-800 dark:text-slate-100'
                                    : 'bg-purple-50/90 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/40 text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                <div className="font-extrabold text-[11px] text-slate-900 dark:text-white">
                                  HP: {slot.subject} ({slot.periods})
                                </div>
                                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                                  GV: <strong>{slot.lecturer}</strong>
                                </div>
                                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                                  Phòng: <strong>{slot.room}</strong>
                                </div>
                                {slot.pm && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {slot.pm}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
