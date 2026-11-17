import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  GitCommit,
  Star,
  Save,
  Plus
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { gradebookService } from '../../services/gradebook.js';
import { sound } from '../../utils/sound.js';

export default function GroupProjectChecklistAddon({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [groups, setGroups] = useState(() => extendedFeaturesService.getGroupProjects());
  const activeGroup = groups[0];
  const [groupScoreInput, setGroupScoreInput] = useState(activeGroup?.groupScore?.toString() || '9.0');
  const [membersState, setMembersState] = useState(activeGroup?.members || []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMemberCode, setNewTaskMemberCode] = useState(activeGroup?.members?.[0]?.studentCode || '26103043');
  const [newTaskWeight, setNewTaskWeight] = useState('15');
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);

  const applyGroupsPayload = (nextGroups, force = false) => {
    if (!Array.isArray(nextGroups) || nextGroups.length === 0) return;
    setGroups(nextGroups);
    if (force || !isDirtyRef.current) {
      setGroupScoreInput(nextGroups[0].groupScore?.toString() || '9.0');
      setMembersState(nextGroups[0].members || []);
      if (nextGroups[0].members?.length && !nextGroups[0].members.some(m => m.studentCode === newTaskMemberCode)) {
        setNewTaskMemberCode(nextGroups[0].members[0].studentCode);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async (force = false) => {
      const res = await extendedFeaturesService.fetchGroupProjects();
      if (mounted && res?.groups) {
        applyGroupsPayload(res.groups, force);
      }
    };
    load(true);
    const timer = setInterval(() => load(false), 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role]);

  const handleFactorChange = (studentCode, newFactor) => {
    isDirtyRef.current = true;
    const factorNum = parseFloat(newFactor) || 0;
    const baseScore = parseFloat(groupScoreInput) || 0;
    const updated = membersState.map(m => {
      if (m.studentCode !== studentCode) return m;
      const finalScore = Math.min(10, Math.max(0, Math.round(baseScore * factorNum * 10) / 10));
      return { ...m, contributionFactor: factorNum, finalIndividualScore: finalScore };
    });
    setMembersState(updated);
  };

  const handleToggleTask = async (studentCode, taskId) => {
    if (!activeGroup) return;
    const res = await extendedFeaturesService.toggleMemberTask(activeGroup.groupId, studentCode, taskId);
    if (res?.groups) {
      isDirtyRef.current = false;
      applyGroupsPayload(res.groups, true);
    }
    sound.success();
    triggerToast?.(res?.message || 'Đã cập nhật trạng thái Checklist công việc nhóm & tính lại hệ số đóng góp C_i!');
  };

  const handleAddChecklistTask = async (e) => {
    e.preventDefault();
    if (!activeGroup || !newTaskTitle.trim()) return;
    const res = await extendedFeaturesService.addGroupMemberTask(activeGroup.groupId, {
      studentCode: newTaskMemberCode,
      title: newTaskTitle.trim(),
      weightPercent: parseInt(newTaskWeight, 10) || 15
    });
    if (!res?.success) {
      triggerToast?.(res?.message || 'Không thể bổ sung đầu việc mới!');
      return;
    }
    isDirtyRef.current = false;
    applyGroupsPayload(res.groups, true);
    setNewTaskTitle('');
    sound.success();
    triggerToast?.('✅ Đã bổ sung đầu việc mới vào Checklist chấm công của thành viên!');
  };

  const handleSaveAndSyncGroupGrades = async () => {
    if (!activeGroup || isSaving) return;
    setIsSaving(true);
    try {
      const res = await extendedFeaturesService.updateGroupProjectScore(
        activeGroup.groupId,
        groupScoreInput,
        membersState
      );
      if (!res?.success) {
        triggerToast?.(res?.message || 'Lỗi chốt điểm đồ án nhóm!');
        return;
      }
      isDirtyRef.current = false;
      applyGroupsPayload(res.groups, true);

      const updatedGroup = res.groups?.[0];
      if (updatedGroup?.members) {
        updatedGroup.members.forEach(m => {
          gradebookService.updateStudentGrade(m.studentCode, 'labScore', m.finalIndividualScore);
        });
      }

      sound.success();
      triggerToast?.(res.message || '✅ Đã chốt điểm bài tập nhóm theo Hệ số đóng góp (C_i) và đồng bộ điểm riêng từng thành viên sang Sổ điểm!');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeGroup) {
    return (
      <div id="table-group-checklist-ci" className="mt-0 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0c1424] border border-purple-500/30 text-center space-y-3 shadow-sm animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30">
          Đánh giá Đóng góp Nhóm (Hệ số C_i)
        </span>
        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
          Hiện chưa có Đồ án Nhóm nào được giao
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {role === 'teacher'
            ? 'Lớp CNTT K26 hiện chưa có dự án hoặc đồ án nhóm nào được tạo. Khi có đồ án nhóm, danh sách phân công công việc (Checklist) và bảng tính hệ số đóng góp C_i sẽ hiển thị tại đây.'
            : 'Giảng viên chưa giao Đồ án Nhóm cho lớp CNTT K26. Khi được phân nhóm và giao nhiệm vụ, danh sách đầu việc (Checklist) và điểm theo hệ số C_i của bạn sẽ hiển thị tại đây.'}
        </p>
      </div>
    );
  }

  return (
    <div id="table-group-checklist-ci" className="mt-0 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-purple-500/30 space-y-4 shadow-sm animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30">
              Đánh giá Đóng góp Nhóm (Hệ số C_i)
            </span>
            <span className="text-xs font-bold text-teal-600 dark:text-[#00dfa2]">
              Công thức: Điểm cá nhân = Điểm nhóm × Hệ số C_i (Tối đa 10.0)
            </span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            {activeGroup.groupName}: {activeGroup.projectTitle}
          </h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Điểm chung của Nhóm:</span>
            {role === 'teacher' ? (
              <input
                id="input-group-base-score"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={groupScoreInput}
                onChange={e => {
                  isDirtyRef.current = true;
                  setGroupScoreInput(e.target.value);
                  const base = parseFloat(e.target.value) || 0;
                  setMembersState(
                    membersState.map(m => ({
                      ...m,
                      finalIndividualScore: Math.min(10, Math.round(base * m.contributionFactor * 10) / 10)
                    }))
                  );
                }}
                className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-[#090e1a] border border-purple-500 text-center font-black text-sm text-purple-700 dark:text-purple-300"
              />
            ) : (
              <span className="font-black text-base text-purple-700 dark:text-purple-300">{activeGroup.groupScore}/10</span>
            )}
          </div>

          {role === 'teacher' && (
            <button
              id="btn-sync-group-ci-scores"
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndSyncGroupGrades}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang đồng bộ...' : 'Chốt & Đồng bộ Điểm Cá nhân'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add New Task to Member Checklist Form */}
      <form onSubmit={handleAddChecklistTask} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div className="md:col-span-3">
          <select
            value={newTaskMemberCode}
            onChange={e => setNewTaskMemberCode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-xs font-bold"
          >
            {membersState.map(m => (
              <option key={m.studentCode} value={m.studentCode}>
                👤 {m.studentName} ({m.studentCode})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-5">
          <input
            type="text"
            placeholder="Nhập đầu việc cụ thể của thành viên để đưa vào Checklist chấm công..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={newTaskWeight}
            onChange={e => setNewTaskWeight(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 text-xs font-bold"
          >
            <option value="10">Tỷ trọng: 10%</option>
            <option value="15">Tỷ trọng: 15%</option>
            <option value="25">Tỷ trọng: 25%</option>
            <option value="40">Tỷ trọng: 40%</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Việc
          </button>
        </div>
      </form>

      {/* Checklist & Member Fair-Share Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold">
              <th className="py-3 px-3">Thành viên nhóm</th>
              <th className="py-3 px-3">Danh sách nhiệm vụ cụ thể (Bấm để đánh dấu)</th>
              <th className="py-3 px-3 text-center">Tiến độ công việc</th>
              <th className="py-3 px-3 text-center">Đánh giá chéo</th>
              <th className="py-3 px-3 text-center">Hệ số đóng góp (C_i)</th>
              <th className="py-3 px-3 text-right">Điểm Cá nhân Thực nhận</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
            {membersState.map(m => {
              const isFreeRider = m.contributionFactor < 0.6;
              const isLeader = m.contributionFactor > 1.0;
              return (
                <tr key={m.studentCode} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                  <td className="py-3.5 px-3">
                    <div className="font-extrabold text-slate-900 dark:text-white">{m.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.studentCode} • {m.role}</div>
                  </td>
                  <td className="py-3.5 px-3 space-y-1.5">
                    {m.tasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTask(m.studentCode, t.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          t.done
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-800 dark:text-slate-200'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={t.done} readOnly className="rounded cursor-pointer" />
                          <span className="font-semibold">{t.title} ({t.weightPercent}%)</span>
                        </div>
                        {t.commitHash ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 flex items-center gap-1">
                            <GitCommit className="w-3 h-3" /> {t.commitHash}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Chưa nộp commit</span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-3.5 px-3 text-center font-extrabold">
                    <span className={m.taskCompletionPercent === 100 ? 'text-emerald-600 dark:text-[#00dfa2]' : 'text-amber-600'}>
                      {m.taskCompletionPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {m.peerRating}/5.0
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {role === 'teacher' ? (
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1.2"
                        value={m.contributionFactor}
                        onChange={e => handleFactorChange(m.studentCode, e.target.value)}
                        className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 text-center font-mono font-extrabold"
                      />
                    ) : (
                      <span className="font-mono font-extrabold text-sm">{m.contributionFactor}x</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span
                        className={`text-sm font-black px-3 py-1 rounded-xl border ${
                          isFreeRider
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : isLeader
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border-emerald-500/40'
                            : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
                        }`}
                      >
                        {m.finalIndividualScore} / 10
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {isFreeRider ? '⚠️ Ít đóng góp' : isLeader ? '🏆 Đóng góp nổi bật (+10%)' : '✓ Đúng tiến độ'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
