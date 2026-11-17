import React, { useState, useEffect } from 'react';
import { Monitor, Wrench, Trash2, RefreshCw, X, Code2 } from 'lucide-react';
import { extendedFeaturesService, resolveStudentName } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

const LAB_MODULES = [
  'LAB-01: Cây BST & AVL',
  'LAB-02: Đồ thị Dijkstra & Min-Heap',
  'LAB-03: Đồ án CDIO Định tuyến'
];

export default function LabHelpQueueHub({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [queue, setQueue] = useState(() => extendedFeaturesService.getLabQueue());
  const [station, setStation] = useState('Máy 05 — Dãy A (Phòng Lab 02)');
  const [labName, setLabName] = useState(LAB_MODULES[0]);
  const [bugTitle, setBugTitle] = useState('Con trỏ p->next bị trỏ vào vùng nhớ rác khi xóa phần tử cuối danh sách');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resolvedStudentName = resolveStudentName(activeStudentCode);

  // Sync with Backend API
  const refreshQueue = async () => {
    try {
      const liveData = await extendedFeaturesService.fetchLabQueue('K26 CNTT - Lớp A');
      if (Array.isArray(liveData)) {
        setQueue([...liveData]);
      }
    } catch (e) {
      console.warn('Queue refresh fallback:', e.message);
    }
  };

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 4000);
    return () => clearInterval(interval);
  }, []);

  const parseStationNum = (str) => {
    if (!str) return NaN;
    const s = String(str).trim();
    const kw = s.match(/(?:máy|may|station|seat|vị trí|vi tri)\s*#?\s*(\d+)/i);
    if (kw) return parseInt(kw[1], 10);
    const start = s.match(/^#?\s*(\d+)/);
    if (start) return parseInt(start[1], 10);
    const cleaned = s.replace(/(?:phòng\s*lab|phong\s*lab|phòng|phong|lab|p\.)\s*\d+/gi, '');
    const fallback = cleaned.match(/(\d+)/);
    return fallback ? parseInt(fallback[1], 10) : NaN;
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();

    // Client-side seat validation: 1 - 24 strictly
    const seatNum = parseStationNum(station);
    if (isNaN(seatNum) || seatNum < 1 || seatNum > 24) {
      sound.warning();
      if (triggerToast) triggerToast('❌ Vị trí máy không hợp lệ! Vui lòng chọn số máy từ 01 đến 24.');
      return;
    }

    if (!bugTitle.trim()) {
      sound.warning();
      if (triggerToast) triggerToast('⚠️ Vui lòng nhập mô tả lỗi / vấn đề cần Giảng viên hỗ trợ.');
      return;
    }

    setIsLoading(true);
    const result = await extendedFeaturesService.createLabHelpTicket({
      station,
      studentCode: activeStudentCode,
      studentName: resolvedStudentName,
      labName,
      bugTitle: bugTitle.trim(),
      codeSnippet: codeSnippet.trim(),
      classId: 'K26 CNTT - Lớp A'
    });
    setIsLoading(false);

    if (result && !result.success && result.message) {
      sound.warning();
      if (triggerToast) triggerToast(`⚠️ ${result.message}`);
      return;
    }

    if (result && result.data) {
      setQueue([...result.data]);
    }
    setCodeSnippet('');
    await refreshQueue();
    sound.success();
    if (triggerToast) triggerToast('🙋 Đã lấy số thứ tự hỗ trợ tại Phòng Lab! Giảng viên sẽ đến bàn của bạn.');
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    const result = await extendedFeaturesService.updateLabTicketStatus(ticketId, newStatus);
    if (result && !result.success && result.message) {
      sound.warning();
      if (triggerToast) triggerToast(`⚠️ ${result.message}`);
      return;
    }
    if (result && result.data) {
      setQueue([...result.data]);
    }
    sound.success();
    const label = newStatus === 'assisting' || newStatus === 'HELPING'
      ? 'Đang hỗ trợ'
      : (newStatus === 'resolved' || newStatus === 'RESOLVED' ? 'Đã hoàn thành' : newStatus);
    if (triggerToast) triggerToast(`Đã chuyển trạng thái phiếu sang: ${label}!`);
  };

  const handleCancelTicket = async (ticketId) => {
    const result = await extendedFeaturesService.cancelLabTicket(ticketId, 'K26 CNTT - Lớp A');
    if (result && !result.success && result.message) {
      sound.warning();
      if (triggerToast) triggerToast(`⚠️ ${result.message}`);
      return;
    }
    if (result && Array.isArray(result.data)) {
      setQueue([...result.data]);
    } else {
      await refreshQueue();
    }
    sound.success();
    if (triggerToast) triggerToast('🗑️ Đã hủy phiếu hỗ trợ khỏi hàng đợi phòng máy!');
  };

  const handleClearResolved = async () => {
    const remaining = await extendedFeaturesService.clearResolvedTickets('K26 CNTT - Lớp A');
    setQueue([...remaining]);
    sound.success();
    if (triggerToast) triggerToast('🧹 Đã dọn dẹp các phiếu hỗ trợ đã giải quyết!');
  };

  // Normalize matching helper
  const isMatchStatus = (ticketStatus, targetKey) => {
    const s = (ticketStatus || '').toLowerCase();
    const t = targetKey.toLowerCase();
    if (t === 'waiting') return s === 'waiting';
    if (t === 'assisting' || t === 'helping') return s === 'assisting' || s === 'helping';
    if (t === 'resolved') return s === 'resolved';
    return false;
  };

  const selectedStationNum = (() => {
    const num = parseStationNum(station);
    return !isNaN(num) ? String(num).padStart(2, '0') : null;
  })();

  // Visual 24-station Lab Map (Stations 01 - 24)
  const stationsMap = Array.from({ length: 24 }, (_, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const aisle = idx < 8 ? 'Dãy A' : (idx < 16 ? 'Dãy B' : 'Dãy C');
    const matching = queue.filter(t => {
      const seat = parseStationNum(t.station || t.station_number);
      return seat === (idx + 1);
    });
    const found =
      matching.find(t => isMatchStatus(t.status, 'assisting')) ||
      matching.find(t => isMatchStatus(t.status, 'waiting')) ||
      matching.find(t => isMatchStatus(t.status, 'resolved'));

    let displayStatus = 'IDLE';
    if (found) {
      const s = (found.status || '').toLowerCase();
      if (s === 'waiting') displayStatus = 'WAITING';
      else if (s === 'assisting' || s === 'helping') displayStatus = 'HELPING';
      else if (s === 'resolved') displayStatus = 'RESOLVED';
    }

    return {
      num,
      aisle,
      label: `Máy ${num}`,
      fullLabel: `Máy ${num} — ${aisle} (Phòng Lab 02)`,
      status: displayStatus,
      isSelected: selectedStationNum === num,
      studentName: found?.studentName || found?.student_name || 'Đang code ổn định'
    };
  });

  const waitingCount = queue.filter(t => isMatchStatus(t.status, 'waiting')).length;
  const helpingCount = queue.filter(t => isMatchStatus(t.status, 'assisting')).length;
  const resolvedCount = queue.filter(t => isMatchStatus(t.status, 'resolved')).length;

  return (
    <div id="module-lab-help-queue" className="mt-0 space-y-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-emerald-500/15 border border-cyan-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
              Hàng đợi Hỗ trợ Thực hành Phòng máy FIFO
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin" />
              <span>Realtime SQLite</span>
            </span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            Sơ đồ Phòng máy & Hàng đợi Hỗ trợ Trực tiếp theo Thứ tự (24 Máy)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sinh viên đăng ký vị trí ngồi thực hành (Máy 01 - 24) — Giảng viên và Trợ giảng tiếp nhận xử lý theo thứ tự FIFO.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
            ⏳ Chờ: {waitingCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-800 dark:text-sky-300 font-extrabold text-xs">
            🛠️ Đang gỡ: {helpingCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
            ✅ Xong: {resolvedCount}
          </div>
          {role === 'teacher' && resolvedCount > 0 && (
            <button
              type="button"
              onClick={handleClearResolved}
              className="px-3 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Dọn sạch các phiếu đã hoàn thành"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn đã xong</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Lab Station Floor Map (24 Stations) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-cyan-600" />
            <span>Sơ đồ Phòng Thực hành Lab 02 (Bấm vào máy để chọn vị trí 01 - 24):</span>
          </span>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="text-amber-600">🟡 Đang chờ GV</span>
            <span className="text-sky-600">🔵 Đang được hỗ trợ</span>
            <span className="text-emerald-600">🟢 Bình thường / Đã xong</span>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {stationsMap.map(st => (
            <button
              key={st.num}
              type="button"
              onClick={() => setStation(st.fullLabel)}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                st.status === 'WAITING'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 animate-pulse'
                  : st.status === 'HELPING'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-800 dark:text-sky-300 ring-2 ring-sky-500/30'
                  : st.isSelected && role === 'student'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/25'
                  : 'bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
              }`}
            >
              <div className="font-extrabold text-xs">{st.label}</div>
              <div className="text-[9px] text-slate-400">{st.aisle}</div>
              <div className="text-[9px] truncate opacity-85 mt-0.5 font-medium">{st.studentName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Student Request Form */}
      {role === 'student' && (
        <form onSubmit={handleCreateTicket} className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              Đăng ký phiếu hỗ trợ thực hành (FIFO)
            </span>
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Sinh viên: {resolvedStudentName} ({activeStudentCode})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Vị trí máy ngồi thực hành (Máy 01 - 24)</label>
              <input
                type="text"
                value={station}
                onChange={e => setStation(e.target.value)}
                placeholder="Ví dụ: Máy 05 — Dãy A (Phòng Lab 02)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Bài thực hành / Module Lab</label>
              <select
                value={labName}
                onChange={e => setLabName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:border-cyan-500"
              >
                {LAB_MODULES.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Mô tả lỗi / Bug cần Giảng viên gỡ</label>
              <input
                type="text"
                value={bugTitle}
                onChange={e => setBugTitle(e.target.value)}
                placeholder="Mô tả hiện tượng lỗi..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Đoạn code lỗi (tùy chọn)</label>
              <input
                type="text"
                value={codeSnippet}
                onChange={e => setCodeSnippet(e.target.value)}
                placeholder="Dán dòng code nghi lỗi (vd: delete p; p->next = ...)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              id="btn-student-request-lab-help"
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold cursor-pointer h-[36px] shadow-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Đang gửi...' : '🙋 Bấm Gọi Trợ Giúp Tại Máy'}
            </button>
          </div>
        </form>
      )}

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { key: 'waiting', title: '⏳ Đang chờ hỗ trợ', count: waitingCount, color: 'amber' },
          { key: 'assisting', title: '🛠️ Đang được hỗ trợ', count: helpingCount, color: 'sky' },
          { key: 'resolved', title: '✅ Đã hoàn thành', count: resolvedCount, color: 'emerald' }
        ].map(col => {
          const colTickets = queue.filter(t => isMatchStatus(t.status, col.key));
          return (
            <div key={col.key} className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="font-extrabold text-xs text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>{col.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {col.count}
                </span>
              </div>

              {colTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  Không có phiếu nào trong mục này
                </div>
              ) : (
                colTickets.map(t => {
                  const tId = t.id || t.ticketId;
                  const displayStation = t.station || t.station_number;
                  const displayName = t.studentName || t.student_name;
                  const displayCode = t.studentCode || t.student_code;
                  const displayLab = t.labName || t.lab_name;
                  const displayBug = t.bugTitle || t.issue_description;
                  const displaySnippet = t.codeSnippet || t.code_snippet;
                  const displayTime = t.createdAt || t.created_at;
                  const displayAssigned = t.assignedTo || t.assignedTa || t.assigned_to;
                  const canCancel = col.key !== 'resolved' && (role === 'teacher' || (role === 'student' && displayCode === activeStudentCode));

                  return (
                    <div key={tId} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2 text-xs hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between font-extrabold">
                        <span className="text-cyan-700 dark:text-cyan-300 truncate max-w-[200px]">{displayStation}</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">{displayTime}</span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{displayName} ({displayCode})</span>
                        <span className="text-[10px] font-mono text-slate-400">#{t.ticketId || `Q-${t.id}`}</span>
                      </div>
                      {displayLab && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                          {displayLab}
                        </div>
                      )}
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{displayBug}</p>

                      {displaySnippet && (
                        <div className="p-2 rounded-lg bg-slate-900/95 text-emerald-300 font-mono text-[10px] flex items-start gap-1.5 overflow-x-auto">
                          <Code2 className="w-3 h-3 shrink-0 mt-0.5 text-cyan-400" />
                          <code className="whitespace-pre-wrap break-all">{displaySnippet}</code>
                        </div>
                      )}

                      {displayAssigned && (
                        <div className="text-[10px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1 pt-0.5">
                          <Wrench className="w-3 h-3" />
                          <span>Người hỗ trợ: {displayAssigned}</span>
                        </div>
                      )}

                      {((role === 'teacher' && col.key !== 'resolved') || canCancel) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
                          <div className="flex flex-wrap gap-2">
                            {role === 'teacher' && col.key === 'waiting' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(tId, 'assisting')}
                                className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
                              >
                                Nhận Hỗ Trợ Máy Này
                              </button>
                            )}
                            {role === 'teacher' && col.key !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(tId, 'resolved')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
                              >
                                Hoàn Thành
                              </button>
                            )}
                          </div>

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelTicket(tId)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Hủy phiếu hỗ trợ này"
                            >
                              <X className="w-3 h-3" />
                              <span>Hủy phiếu</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
