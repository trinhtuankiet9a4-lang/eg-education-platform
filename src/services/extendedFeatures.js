// =============================================================================
// CENTRALIZED DATA BUS FOR TYPE 2 (NEW MODULES) & TYPE 3 (ADDON ENHANCEMENTS)
// Synchronizes Teacher <-> Student portals in real-time via localStorage & Backend API
// =============================================================================

import api, { authStorage } from './api.js';
import { STUDENTS_K26_A } from '../data/students.js';

export function resolveStudentName(studentCode) {
  const code = String(studentCode || '').trim();
  const user = authStorage.getUser();
  if (user?.name && (!code || user.code === code || user.student_code === code)) {
    return user.name;
  }
  if (code) {
    const matched = STUDENTS_K26_A.find(s => s.code === code);
    if (matched?.name) return matched.name;
  }
  if (user?.role === 'student' && user?.name) {
    return user.name;
  }
  return code ? `Sinh viên (${code})` : 'Sinh viên';
}

const KEYS = {
  LEAVE_AI_PACKS: 'eg_leave_ai_packs_v1',
  GROUP_PROJECTS: 'eg_group_projects_v1',
  CODE_MOSS: 'eg_code_moss_v1',
  PEER_REVIEWS: 'eg_peer_reviews_v1',
  DRL_AND_RISK: 'eg_drl_and_risk_v1',
  EXIT_TICKETS: 'eg_exit_tickets_v1',
  QA_CHECKPOINTS: 'eg_qa_checkpoints_v1',
  VIRTUAL_ROOM: 'eg_virtual_room_v1',
  AI_MINDMAPS: 'eg_ai_mindmaps_v1',
  FLASH_QUIZ: 'eg_flash_quiz_v1',
  LAB_QUEUE: 'eg_lab_queue_v1',
  GAMIFICATION: 'eg_gamification_v1'
};

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write error:', e);
  }
  return data;
}

// -----------------------------------------------------------------------------
// SEED DATA
// -----------------------------------------------------------------------------

const SEED_LEAVE_AI_PACKS = {
  aiAutoApproveEnabled: true,
  confidenceThreshold: 88,
  requests: []
};

const SEED_GROUP_PROJECTS = [];

const SEED_CODE_MOSS = {
  scanCode: 'MOSS-SCAN-01',
  lastScanAt: 'Chưa quét',
  totalScanned: 0,
  flaggedCount: 0,
  pairs: []
};

const SEED_PEER_REVIEWS = [];

function buildSeedDrlAndRisk() {
  const records = {};
  let safeCount = 0;
  let watchCount = 0;
  let criticalCount = 0;

  const list = STUDENTS_K26_A.map((stu) => {
    const unexcused = Number(stu.absences) || 0;
    const disciplineWarning = unexcused >= 4
      ? `Vắng ${unexcused} buổi (Cấm thi >20%)`
      : (unexcused === 3 ? 'Cảnh báo học vụ (Vắng 3 buổi)' : null);
    const riskIndex = unexcused >= 4 ? Math.min(98, 70 + unexcused * 2) : (unexcused === 3 ? 58 : unexcused * 10);
    const riskLevel = riskIndex >= 70 ? 'CRITICAL' : (riskIndex >= 31 ? 'WATCH' : 'SAFE');

    if (riskLevel === 'CRITICAL') criticalCount++;
    else if (riskLevel === 'WATCH') watchCount++;
    else safeCount++;

    const row = {
      studentCode: stu.code,
      studentName: stu.name,
      classId: 'K26 CNTT - Lớp A',
      semester: 'HK1 (2026-2027)',
      drlScore: 0,
      drlRank: 'Chưa xét',
      activitiesCount: 0,
      disciplineWarning,
      riskIndex,
      riskLevel,
      advisorNotified: false
    };
    records[stu.code] = row;
    return row;
  });

  return {
    syncSource: 'Hệ thống Quản lý Công tác Sinh viên (CTSV - Trường ĐH)',
    lastSyncedAt: 'Chưa đồng bộ',
    summary: {
      total: list.length,
      safeCount,
      watchCount,
      criticalCount
    },
    records,
    list,
    spotlightStudents: []
  };
}

const SEED_DRL_AND_RISK = buildSeedDrlAndRisk();

const SEED_EXIT_TICKETS = {
  isOpen: true,
  sessionTitle: 'Phiếu Xác Nhận Cuối Buổi (Exit Ticket)',
  question1: '1. Khái niệm hoặc thuật toán nào trong buổi học hôm nay bạn nắm vững nhất?',
  question2: '2. Phần kiến thức nào bạn còn thấy mơ hồ, cần Giảng viên giải thích thêm ở đầu buổi sau?',
  ComprehensionQuiz: 'Trong cây AVL, thao tác chèn 1 phần tử mới tốn tối đa bao nhiêu phép xoay (Rotation)?',
  quizOptions: ['Tối đa 1 phép xoay (Đơn hoặc Kép)', 'Tối đa O(log N) phép xoay', 'Tối đa N phép xoay'],
  correctOptionIndex: 0,
  responses: [],
  coldCallHistory: []
};

const SEED_QA_CHECKPOINTS = {
  questions: [],
  checkpoint: {
    topicId: 'CHK-W10',
    title: 'Thảo luận 2 giai đoạn (Post-Before-View)',
    prompt: 'Giảng viên cập nhật câu hỏi thảo luận trọng tâm của buổi học tại đây.',
    posts: []
  }
};

const SEED_VIRTUAL_ROOM = {
  roomId: 'EG-CNTT-K26',
  title: 'Phòng Học Trực Tuyến — Lớp CNTT K26',
  hostName: 'ThS. Phạm Văn Thuận',
  isLive: true,
  startedAt: '',
  jitsiRoomName: 'EGEducation_CNTT_K26_LiveRoom',
  screenSharingActive: false,
  activeSlideTitle: 'Bảng trắng & Trình chiếu trực tiếp Lớp CNTT K26',
  autoAttendanceMinMinutes: 35,
  participants: [],
  chatMessages: []
};

const SEED_AI_MINDMAPS = [
  {
    id: 'MM-IT204-01',
    classId: 'K26 CNTT - Lớp A',
    title: 'Chương 5: Bảng Băm (Hash Table) & Quy Hoạch Động',
    sourceFileName: 'Slide_Chuong5_HashTable_DP.pdf',
    uploadedAt: '17/11/2026',
    publishedToClass: true,
    createdBy: 'ThS. Phạm Văn Thuận',
    aiEngine: 'EG Education Curriculum Engine',
    keyTakeaways: [
      'Bảng băm (Hash Table) ánh xạ khóa sang chỉ mục mảng qua hàm băm h(k), đạt độ phức tạp tra cứu trung bình O(1).',
      'Hai chiến lược xử lý đụng độ (Collision Resolution): Chaining (Danh sách liên kết tại mỗi bucket) và Open Addressing (Linear/Quadratic Probing, Double Hashing).',
      'Quy hoạch động (Dynamic Programming) giải quyết bài toán có cấu trúc con tối ưu (Optimal Substructure) và bài toán con gối nhau (Overlapping Subproblems).',
      'Phân biệt 2 hướng cài đặt DP: Top-Down (Đệ quy + Memoization) và Bottom-Up (Lập bảng tuần tự khử đệ quy).'
    ],
    infographicCards: [
      { metric: 'O(1)', label: 'Tra cứu / Chèn trung bình trên Hash Table (α < 0.75)', badge: 'Tốc độ tối đa' },
      { metric: 'α = N / M', label: 'Hệ số tải (Load Factor) quyết định ngưỡng Rehash ×2', badge: 'Kiểm soát đụng độ' },
      { metric: 'O(N·W)', label: 'DP Bài toán Cái Túi (0/1 Knapsack) Bottom-Up', badge: 'Khử chồng lấn' },
      { metric: '2 Chiến Lược', label: 'Separate Chaining & Open Addressing giảm đụng độ', badge: 'Bền vững' }
    ],
    mindmapTree: {
      root: 'Chương 5: Bảng Băm (Hash Table) & Quy Hoạch Động',
      branches: [
        {
          id: 'b1',
          title: '1. Hàm Băm & Tách Bucket',
          color: 'emerald',
          formula: 'h(k) = (a·k + b) mod M | α = N / M',
          items: [
            'Hàm băm chia dư & nhân (Division / Multiplication)',
            'Phân bố đều khóa, giảm gom cụm (Clustering)',
            'Rehashing tự động khi Load Factor α > 0.75',
            'Ứng dụng: Dictionary, Cache Redis, Index CSDL'
          ]
        },
        {
          id: 'b2',
          title: '2. Xử Lý Đụng Độ (Collision)',
          color: 'sky',
          formula: 'Chaining vs Linear Probing: (h(k)+i) mod M',
          items: [
            'Separate Chaining: Linked List / AVL tại mỗi ô',
            'Linear Probing: Thăm dò tuyến tính đơn giản',
            'Quadratic Probing & Double Hashing tránh Primary Clustering',
            'Độ phức tạp tồi nhất O(N) khi mọi khóa đụng độ'
          ]
        },
        {
          id: 'b3',
          title: '3. Nguyên Lý Quy Hoạch Động',
          color: 'purple',
          formula: 'dp[state] = opt(dp[prev_states]) + cost',
          items: [
            'Xác định Trạng thái (State) & Bài toán cơ sở (Base case)',
            'Thiết lập Công thức truy hồi (Transition Equation)',
            'Top-Down (Memoization) trực quan dễ viết',
            'Bottom-Up (Tabulation) tối ưu bộ nhớ O(W)'
          ]
        },
        {
          id: 'b4',
          title: '4. Bài Toán DP Kinh Điển',
          color: 'amber',
          formula: 'LCS / LIS / Knapsack / Floyd-Warshall',
          items: [
            'Dãy con tăng dài nhất (LIS) O(N log N)',
            'Xâu con chung dài nhất (LCS) bảng M×N',
            '0/1 Knapsack tối ưu giá trị trong giới hạn tải',
            'Kết hợp DP + Bitmask cho tập hợp nhỏ N ≤ 20'
          ]
        }
      ]
    }
  }
];

const SEED_FLASH_QUIZ = {
  quizId: null,
  isActive: false,
  status: 'ended',
  question: '',
  options: [],
  correctIndex: 0,
  durationSec: 45,
  bonusScore: 0.5,
  totalSubmissions: 0,
  totalVotes: 0,
  hasSubmitted: false,
  mySubmission: null,
  responses: [],
  podium: [],
  distribution: []
};

const SEED_LAB_QUEUE = [];

function buildSeedGamification() {
  const baseBadges = [
    { id: 'B1', name: 'Ngôi Sao Đúng Giờ (Punctual Star)', desc: 'Điểm danh QR trong 2 phút đầu 5 buổi liên tiếp', icon: 'Flame', unlocked: false, rewardExp: 300 },
    { id: 'B2', name: 'Chiến Thần Nộp Sớm (Early Bird)', desc: 'Nộp bài Lab trước hạn chót ít nhất 24 giờ', icon: 'Zap', unlocked: false, rewardExp: 400 },
    { id: 'B3', name: 'Thủ Lĩnh Gánh Team (Fair Leader)', desc: 'Đạt hệ số đóng góp nhóm C_i ≥ 1.05', icon: 'Award', unlocked: false, rewardExp: 500 },
    { id: 'B4', name: 'Thợ Săn Bug Phòng Lab', desc: 'Hỗ trợ bạn cùng lớp giải quyết 3 câu hỏi trên Q&A', icon: 'Shield', unlocked: false, rewardExp: 350 },
    { id: 'B5', name: 'Chuỗi Bất Bại 15 Tuần', desc: 'Đi học đầy đủ 100% số buổi toàn học kỳ', icon: 'Crown', unlocked: false, rewardExp: 1000 }
  ];

  const studentProfiles = {};
  STUDENTS_K26_A.forEach((stu) => {
    studentProfiles[stu.code] = {
      studentCode: stu.code,
      studentName: stu.name,
      currentStreak: 0,
      maxStreak: 0,
      expPoints: 0,
      level: 1,
      levelTitle: 'Tân Binh Giải Thuật',
      latePassCount: 1,
      weeklyAttendanceDays: [false, false, false, false, false],
      badges: baseBadges
    };
  });
  return { studentProfiles };
}

const SEED_GAMIFICATION = buildSeedGamification();

// -----------------------------------------------------------------------------
// EXPORTED SERVICE API
// -----------------------------------------------------------------------------

export const extendedFeaturesService = {
  // 1. Leave AI & Makeup Pack
  getLeaveAiData() {
    return readStore(KEYS.LEAVE_AI_PACKS, SEED_LEAVE_AI_PACKS);
  },
  async fetchLeaveAiData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.leaveRequests.getAiPacks(classId);
      if (res?.success && Array.isArray(res.requests)) {
        const synced = {
          aiAutoApproveEnabled: Boolean(res.aiAutoApproveEnabled),
          confidenceThreshold: Number(res.confidenceThreshold || 88),
          requests: res.requests
        };
        writeStore(KEYS.LEAVE_AI_PACKS, synced);
        return { success: true, ...synced };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchLeaveAiData fallback:', e.message);
    }
    return { success: false, ...this.getLeaveAiData() };
  },
  async toggleAiAutoApprove(nextEnabled) {
    try {
      const payload = typeof nextEnabled === 'boolean' ? { aiAutoApproveEnabled: nextEnabled } : {};
      const res = await api.leaveRequests.updateAiConfig(payload);
      if (res?.success) {
        const current = this.getLeaveAiData();
        const synced = {
          ...current,
          aiAutoApproveEnabled: Boolean(res.aiAutoApproveEnabled),
          confidenceThreshold: Number(res.confidenceThreshold || current.confidenceThreshold || 88)
        };
        writeStore(KEYS.LEAVE_AI_PACKS, synced);
        return { success: true, ...synced };
      }
      return { success: false, message: res?.message || 'Lỗi cập nhật cấu hình AI OCR!', ...this.getLeaveAiData() };
    } catch (e) {
      console.warn('[extendedFeatures] toggleAiAutoApprove error:', e.message);
      return { success: false, message: 'Không thể kết nối máy chủ để lưu cấu hình AI!', ...this.getLeaveAiData() };
    }
  },
  async submitStudentLeaveWithAi({ studentCode, studentName, date, leaveDate, sessionSlot, reason, proofFileName }) {
    const cleanCode = studentCode || '26103043';
    const resolvedName = resolveStudentName(cleanCode) || studentName || 'Trịnh Tuấn Kiệt';
    try {
      const res = await api.leaveRequests.submitAiLeave({
        studentCode: cleanCode,
        studentName: resolvedName,
        date,
        leaveDate: leaveDate || date,
        sessionSlot: sessionSlot || 'Tiết 1 - 3 (Buổi Sáng)',
        reason,
        proofFileName
      });
      if (res?.success && res.request) {
        const current = this.getLeaveAiData();
        const synced = {
          ...current,
          requests: Array.isArray(res.requests) ? res.requests : [res.request, ...current.requests]
        };
        writeStore(KEYS.LEAVE_AI_PACKS, synced);
        return { success: true, request: res.request, data: synced, message: res.message };
      }
      return { success: false, message: res?.message || 'Lỗi gửi đơn xin nghỉ & AI OCR!' };
    } catch (e) {
      console.warn('[extendedFeatures] submitStudentLeaveWithAi error:', e.message);
      return { success: false, message: 'Không thể kết nối máy chủ khi nộp đơn minh chứng!' };
    }
  },
  async updateLeaveStatus(reqId, status, teacherRequirementText) {
    try {
      const res = await api.leaveRequests.reviewAiLeave(reqId, { status, teacherRequirementText });
      if (res?.success) {
        const current = this.getLeaveAiData();
        const synced = {
          ...current,
          requests: Array.isArray(res.requests)
            ? res.requests
            : current.requests.map(r => (r.id === reqId && res.request ? res.request : r))
        };
        writeStore(KEYS.LEAVE_AI_PACKS, synced);
        return { success: true, request: res.request, ...synced };
      }
      return { success: false, message: res?.message || 'Lỗi cập nhật trạng thái đơn nghỉ!', ...this.getLeaveAiData() };
    } catch (e) {
      console.warn('[extendedFeatures] updateLeaveStatus error:', e.message);
      return { success: false, message: 'Không thể kết nối máy chủ khi duyệt đơn!', ...this.getLeaveAiData() };
    }
  },
  async completeMakeupPack(reqId, quizAnswersOrScore = {}) {
    try {
      const payload = typeof quizAnswersOrScore === 'object'
        ? { quizAnswers: quizAnswersOrScore }
        : { score: quizAnswersOrScore };
      const res = await api.leaveRequests.completeMakeup(reqId, payload);
      if (res?.success) {
        const current = this.getLeaveAiData();
        const synced = {
          ...current,
          requests: Array.isArray(res.requests)
            ? res.requests
            : current.requests.map(r => (r.id === reqId && res.request ? res.request : r))
        };
        writeStore(KEYS.LEAVE_AI_PACKS, synced);
        return {
          success: true,
          score: res.score,
          attendanceRestored: res.attendanceRestored,
          gradebookUpdate: res.gradebookUpdate,
          message: res.message,
          ...synced
        };
      }
      return { success: false, message: res?.message || 'Chưa hoàn thành yêu cầu bài học bù!', ...this.getLeaveAiData() };
    } catch (e) {
      console.warn('[extendedFeatures] completeMakeupPack error:', e.message);
      return { success: false, message: 'Không thể kết nối máy chủ khi nộp bài học bù!', ...this.getLeaveAiData() };
    }
  },

  // 2. Group Projects & Contribution Factor C_i
  getGroupProjects() {
    const stored = readStore(KEYS.GROUP_PROJECTS, SEED_GROUP_PROJECTS);
    const hasLegacy = Array.isArray(stored) && stored.some(g => g.members?.some(m => String(m.studentCode).startsWith('26A404')));
    return hasLegacy ? writeStore(KEYS.GROUP_PROJECTS, SEED_GROUP_PROJECTS) : stored;
  },
  async fetchGroupProjects(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.groupProjects.getAll(classId);
      if (res?.success && Array.isArray(res.groups)) {
        writeStore(KEYS.GROUP_PROJECTS, res.groups);
        return { success: true, groups: res.groups };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchGroupProjects fallback:', e.message);
    }
    return { success: false, groups: this.getGroupProjects() };
  },
  async addGroupMemberTask(groupId, { studentCode, title, weightPercent = 15 }) {
    try {
      const res = await api.groupProjects.addTask(groupId, { studentCode, title, weightPercent });
      if (res?.success && Array.isArray(res.groups)) {
        writeStore(KEYS.GROUP_PROJECTS, res.groups);
        return { success: true, message: res.message, groups: res.groups, group: res.group };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, groups: this.getGroupProjects() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] addGroupMemberTask fallback:', e.message);
    }

    // Local fallback
    const list = this.getGroupProjects();
    const updated = list.map(g => {
      if (g.groupId !== groupId) return g;
      const members = g.members.map(m => {
        if (m.studentCode !== studentCode) return m;
        const tasks = [
          ...m.tasks,
          { id: `T-${Date.now()}`, title, weightPercent: parseInt(weightPercent, 10) || 15, done: true, commitHash: 'f91a20b' }
        ];
        return { ...m, tasks, taskCompletionPercent: 100 };
      });
      return { ...g, members };
    });
    const saved = writeStore(KEYS.GROUP_PROJECTS, updated);
    return { success: true, groups: saved };
  },
  async toggleMemberTask(groupId, studentCode, taskId) {
    try {
      const res = await api.groupProjects.toggleTask(groupId, taskId, studentCode);
      if (res?.success && Array.isArray(res.groups)) {
        writeStore(KEYS.GROUP_PROJECTS, res.groups);
        return { success: true, message: res.message, groups: res.groups, group: res.group };
      }
    } catch (e) {
      console.warn('[extendedFeatures] toggleMemberTask fallback:', e.message);
    }

    const list = this.getGroupProjects();
    const updated = list.map(g => {
      if (g.groupId !== groupId) return g;
      const members = g.members.map(m => {
        if (m.studentCode !== studentCode) return m;
        const tasks = m.tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t));
        const doneCount = tasks.filter(t => t.done).length;
        const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 100;
        const newCi = pct === 100 ? Math.max(m.contributionFactor, 1.0) : pct >= 50 ? 0.85 : 0.4;
        return {
          ...m,
          tasks,
          taskCompletionPercent: pct,
          contributionFactor: newCi,
          finalIndividualScore: Math.min(10, Math.round(g.groupScore * newCi * 10) / 10)
        };
      });
      return { ...g, members };
    });
    const saved = writeStore(KEYS.GROUP_PROJECTS, updated);
    return { success: true, groups: saved };
  },
  async updateGroupProjectScore(groupId, newGroupScore, updatedMembers) {
    const scoreNum = parseFloat(newGroupScore) || 0;
    try {
      const res = await api.groupProjects.updateScores(groupId, {
        groupScore: scoreNum,
        members: updatedMembers
      });
      if (res?.success && Array.isArray(res.groups)) {
        writeStore(KEYS.GROUP_PROJECTS, res.groups);
        return {
          success: true,
          message: res.message,
          syncedGradebookRows: res.syncedGradebookRows,
          groups: res.groups,
          group: res.group
        };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, groups: this.getGroupProjects() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] updateGroupProjectScore fallback:', e.message);
    }

    const list = this.getGroupProjects();
    const updated = list.map(g => {
      if (g.groupId !== groupId) return g;
      const members = (updatedMembers || g.members).map(m => {
        const raw = scoreNum * (parseFloat(m.contributionFactor) || 1.0);
        const clamped = Math.min(10, Math.max(0, Math.round(raw * 10) / 10));
        return { ...m, finalIndividualScore: clamped };
      });
      return { ...g, groupScore: scoreNum, members };
    });
    const saved = writeStore(KEYS.GROUP_PROJECTS, updated);
    return { success: true, groups: saved };
  },

  // 3. Code Similarity MOSS & Peer Reviews
  getCodeMossData() {
    const stored = readStore(KEYS.CODE_MOSS, SEED_CODE_MOSS);
    const hasLegacy = stored?.pairs?.some(p => String(p.studentA?.code).startsWith('26A404'));
    return hasLegacy ? writeStore(KEYS.CODE_MOSS, SEED_CODE_MOSS) : stored;
  },
  async fetchCodeMossData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.groupProjects.getMoss(classId);
      if (res?.success && Array.isArray(res.pairs)) {
        const data = {
          scanCode: res.scanCode || 'MOSS-SCAN-01',
          lastScanAt: res.lastScanAt,
          totalScanned: res.totalScanned,
          flaggedCount: res.flaggedCount,
          pairs: res.pairs
        };
        writeStore(KEYS.CODE_MOSS, data);
        return { success: true, data };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchCodeMossData fallback:', e.message);
    }
    return { success: false, data: this.getCodeMossData() };
  },
  async scanCodeMoss(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.groupProjects.scanMoss(classId);
      if (res?.success && Array.isArray(res.pairs)) {
        const data = {
          scanCode: res.scanCode || 'MOSS-SCAN-01',
          lastScanAt: res.lastScanAt,
          totalScanned: res.totalScanned,
          flaggedCount: res.flaggedCount,
          pairs: res.pairs
        };
        writeStore(KEYS.CODE_MOSS, data);
        return { success: true, message: res.message, data };
      }
    } catch (e) {
      console.warn('[extendedFeatures] scanCodeMoss fallback:', e.message);
    }
    return { success: true, data: this.getCodeMossData() };
  },
  getPeerReviews() {
    const stored = readStore(KEYS.PEER_REVIEWS, SEED_PEER_REVIEWS);
    const hasLegacy = Array.isArray(stored) && stored.some(r => String(r.reviewerCode).startsWith('26A404'));
    return hasLegacy ? writeStore(KEYS.PEER_REVIEWS, SEED_PEER_REVIEWS) : stored;
  },
  async fetchPeerReviews(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.groupProjects.getPeerReviews(classId);
      if (res?.success && Array.isArray(res.reviews)) {
        writeStore(KEYS.PEER_REVIEWS, res.reviews);
        return { success: true, reviews: res.reviews };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchPeerReviews fallback:', e.message);
    }
    return { success: false, reviews: this.getPeerReviews() };
  },
  async submitPeerReview(reviewId, criteria, comment) {
    try {
      const res = await api.groupProjects.submitPeerReview(reviewId, { criteria, comment });
      if (res?.success && Array.isArray(res.reviews)) {
        writeStore(KEYS.PEER_REVIEWS, res.reviews);
        return { success: true, message: res.message, reviews: res.reviews };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, reviews: this.getPeerReviews() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] submitPeerReview fallback:', e.message);
    }

    const list = this.getPeerReviews();
    const updated = list.map(r =>
      r.reviewId === reviewId
        ? { ...r, criteria, comment, status: 'COMPLETED', calibratedDelta: '+0.1 (Hiệu chuẩn tự động)' }
        : r
    );
    const saved = writeStore(KEYS.PEER_REVIEWS, updated);
    return { success: true, reviews: saved };
  },
  async calibratePeerReviews(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.groupProjects.calibratePeerReviews(classId);
      if (res?.success && Array.isArray(res.reviews)) {
        writeStore(KEYS.PEER_REVIEWS, res.reviews);
        return { success: true, message: res.message, reviews: res.reviews };
      }
    } catch (e) {
      console.warn('[extendedFeatures] calibratePeerReviews fallback:', e.message);
    }
    const list = this.getPeerReviews().map(r => ({
      ...r,
      calibratedDelta: '+0.2 (Đã hiệu chuẩn toàn lớp)'
    }));
    const saved = writeStore(KEYS.PEER_REVIEWS, list);
    return { success: true, reviews: saved };
  },

  // 4. Training Points (ĐRL) & Predictive At-Risk AI
  getDrlAndRiskData() {
    const stored = readStore(KEYS.DRL_AND_RISK, SEED_DRL_AND_RISK);
    const hasLegacy = stored?.records && Object.keys(stored.records).some(k => k.startsWith('26A404'));
    return hasLegacy || !stored?.list ? writeStore(KEYS.DRL_AND_RISK, SEED_DRL_AND_RISK) : stored;
  },
  async fetchDrlAndRiskData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.drlRisk.getAll(classId);
      if (res?.success && res.records) {
        const data = {
          syncSource: res.syncSource,
          lastSyncedAt: res.lastSyncedAt,
          summary: res.summary,
          records: res.records,
          list: res.list || Object.values(res.records),
          spotlightStudents: res.spotlightStudents || []
        };
        writeStore(KEYS.DRL_AND_RISK, data);
        return { success: true, data };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchDrlAndRiskData fallback:', e.message);
    }
    return { success: false, data: this.getDrlAndRiskData() };
  },
  async syncSchoolDrl(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.drlRisk.sync(classId);
      if (res?.success && res.records) {
        const data = {
          syncSource: res.syncSource,
          lastSyncedAt: res.lastSyncedAt,
          summary: res.summary,
          records: res.records,
          list: res.list || Object.values(res.records),
          spotlightStudents: res.spotlightStudents || []
        };
        writeStore(KEYS.DRL_AND_RISK, data);
        return { success: true, message: res.message, data };
      }
    } catch (e) {
      console.warn('[extendedFeatures] syncSchoolDrl fallback:', e.message);
    }
    return { success: true, data: this.getDrlAndRiskData() };
  },
  getStudentDrlRecord(studentCode, indexFallback = 0) {
    const aliasMap = {
      '26A4040001': '26103043',
      '26A4040002': '26103028',
      '26A4040003': '26103011',
      '26A4040004': '26103008',
      '26A4040005': '26103004'
    };
    const resolvedCode = aliasMap[studentCode] || studentCode;
    const data = this.getDrlAndRiskData();
    if (data.records[resolvedCode]) return data.records[resolvedCode];
    const baseScore = 88 - (indexFallback % 7) * 5;
    const rank = baseScore >= 90 ? 'Xuất sắc' : baseScore >= 80 ? 'Tốt' : baseScore >= 65 ? 'Khá' : 'Trung bình';
    return {
      studentCode: resolvedCode,
      drlScore: baseScore,
      drlRank: rank,
      activitiesCount: 4,
      disciplineWarning: null,
      riskIndex: baseScore < 65 ? 45 : 12,
      riskLevel: baseScore < 65 ? 'WATCH' : 'SAFE',
      advisorNotified: false
    };
  },
  async updateStudentDrl(studentCode, newScore) {
    try {
      const res = await api.drlRisk.updateStudent(studentCode, { drlScore: newScore });
      if (res?.success && res.records) {
        const data = {
          syncSource: res.syncSource,
          lastSyncedAt: res.lastSyncedAt,
          summary: res.summary,
          records: res.records,
          list: res.list || Object.values(res.records),
          spotlightStudents: res.spotlightStudents || []
        };
        writeStore(KEYS.DRL_AND_RISK, data);
        return { success: true, message: res.message, data };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getDrlAndRiskData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] updateStudentDrl fallback:', e.message);
    }

    const data = this.getDrlAndRiskData();
    const s = Math.min(100, Math.max(0, parseInt(newScore, 10) || 0));
    const rank = s >= 90 ? 'Xuất sắc' : s >= 80 ? 'Tốt' : s >= 65 ? 'Khá' : s >= 50 ? 'Trung bình' : 'Yếu';
    const current = data.records[studentCode] || {};
    data.records[studentCode] = {
      ...current,
      drlScore: s,
      drlRank: rank,
      riskLevel: s < 50 ? 'CRITICAL' : s < 65 ? 'WATCH' : 'SAFE',
      riskIndex: s < 50 ? 85 : s < 65 ? 52 : 12
    };
    return { success: true, data: writeStore(KEYS.DRL_AND_RISK, data) };
  },
  async notifyAdvisorForStudent(studentCode, note = '') {
    try {
      const res = await api.drlRisk.notifyAdvisor(studentCode, note);
      if (res?.success && res.records) {
        const data = {
          syncSource: res.syncSource,
          lastSyncedAt: res.lastSyncedAt,
          summary: res.summary,
          records: res.records,
          list: res.list || Object.values(res.records),
          spotlightStudents: res.spotlightStudents || []
        };
        writeStore(KEYS.DRL_AND_RISK, data);
        return { success: true, message: res.message, record: res.record, data };
      }
    } catch (e) {
      console.warn('[extendedFeatures] notifyAdvisorForStudent fallback:', e.message);
    }
    const data = this.getDrlAndRiskData();
    if (data.records[studentCode]) {
      data.records[studentCode] = { ...data.records[studentCode], advisorNotified: true };
      writeStore(KEYS.DRL_AND_RISK, data);
    }
    return { success: true, data };
  },

  // 5. Exit Ticket & Cold Call Picker
  getExitTicketData() {
    const stored = readStore(KEYS.EXIT_TICKETS, SEED_EXIT_TICKETS);
    const serialized = JSON.stringify(stored);
    return serialized.includes('26A404') || serialized.includes('Lê Hoàng Bảo')
      ? writeStore(KEYS.EXIT_TICKETS, SEED_EXIT_TICKETS)
      : stored;
  },
  async fetchExitTicketData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.getExitTickets(classId);
      if (res?.success) {
        const synced = {
          isOpen: Boolean(res.isOpen),
          sessionTitle: res.sessionTitle,
          question1: res.question1,
          question2: res.question2,
          ComprehensionQuiz: res.ComprehensionQuiz,
          quizOptions: res.quizOptions || [],
          correctOptionIndex: Number(res.correctOptionIndex || 0),
          responses: res.responses || [],
          coldCallHistory: res.coldCallHistory || []
        };
        writeStore(KEYS.EXIT_TICKETS, synced);
        return { success: true, data: synced };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchExitTicketData fallback:', e.message);
    }
    return { success: false, data: this.getExitTicketData() };
  },
  async submitExitTicket({ studentCode, studentName, ans1, ans2, selectedOption = 0, classId = 'K26 CNTT - Lớp A' }) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    const resolvedName = (studentName && studentName !== 'Lê Hoàng Bảo') ? studentName : resolveStudentName(cleanCode);
    try {
      const res = await api.classroomLive.submitExitTicket({
        classId,
        studentCode: cleanCode,
        studentName: resolvedName,
        ans1,
        ans2,
        selectedOption
      });
      if (res?.success && res.exitData) {
        writeStore(KEYS.EXIT_TICKETS, res.exitData);
        return { success: true, message: res.message, data: res.exitData };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getExitTicketData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] submitExitTicket fallback:', e.message);
    }

    const data = this.getExitTicketData();
    const existingIdx = data.responses.findIndex(r => r.studentCode === cleanCode);
    const entry = {
      studentCode: cleanCode,
      studentName: resolvedName,
      ans1,
      ans2,
      quizCorrect: Number(selectedOption) === data.correctOptionIndex,
      submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      checkoutStatus: 'VALID_CHECKOUT'
    };
    if (existingIdx >= 0) data.responses[existingIdx] = entry;
    else data.responses.unshift(entry);
    return { success: true, data: writeStore(KEYS.EXIT_TICKETS, data) };
  },
  async spinColdCall(classId = 'K26 CNTT - Lớp A', studentCode = null) {
    try {
      const res = await api.classroomLive.spinColdCall({ classId, ...(studentCode ? { studentCode } : {}) });
      if (res?.success && res.exitData) {
        writeStore(KEYS.EXIT_TICKETS, res.exitData);
        return { success: true, message: res.message, chosen: res.chosen, entry: res.entry, data: res.exitData };
      }
    } catch (e) {
      console.warn('[extendedFeatures] spinColdCall fallback:', e.message);
    }
    const pool = STUDENTS_K26_A;
    const chosen = (studentCode ? pool.find(s => s.code === studentCode) : null) || pool[Math.floor(Math.random() * pool.length)];
    const data = this.recordColdCallWinner(chosen.code, chosen.name);
    return {
      success: true,
      chosen: { code: chosen.code, studentCode: chosen.code, name: chosen.name, studentName: chosen.name, fullName: chosen.name },
      data
    };
  },
  recordColdCallWinner(studentCode, studentName) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    const resolvedName = (studentName && studentName !== 'Lê Hoàng Bảo') ? studentName : resolveStudentName(cleanCode);
    const data = this.getExitTicketData();
    data.coldCallHistory.unshift({
      studentCode: cleanCode,
      studentName: resolvedName,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      bonus: '+0.25đ'
    });
    return writeStore(KEYS.EXIT_TICKETS, data);
  },
  async resetExitTicketData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.resetExitTickets(classId);
      if (res?.success && res.exitData) {
        writeStore(KEYS.EXIT_TICKETS, res.exitData);
        return { success: true, message: res.message, data: res.exitData };
      }
    } catch (e) {
      console.warn('[extendedFeatures] resetExitTicketData fallback:', e.message);
    }
    const data = this.getExitTicketData();
    const cleaned = { ...data, responses: [], coldCallHistory: [] };
    return { success: true, data: writeStore(KEYS.EXIT_TICKETS, cleaned) };
  },

  // 6. Live Q&A Upvote & Discussion Checkpoints
  getQaCheckpointsData() {
    const stored = readStore(KEYS.QA_CHECKPOINTS, SEED_QA_CHECKPOINTS);
    const serialized = JSON.stringify(stored);
    return serialized.includes('26A404') || serialized.includes('Lê Hoàng Bảo')
      ? writeStore(KEYS.QA_CHECKPOINTS, SEED_QA_CHECKPOINTS)
      : stored;
  },
  async fetchQaCheckpointsData(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.getQaCheckpoints(classId);
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, data: synced };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchQaCheckpointsData fallback:', e.message);
    }
    return { success: false, data: this.getQaCheckpointsData() };
  },
  async askQuestion({ studentCode, text, isAnonymous = true, classId = 'K26 CNTT - Lớp A' }) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    try {
      const res = await api.classroomLive.askQuestion({ classId, studentCode: cleanCode, text, isAnonymous });
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, message: res.message, data: synced };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getQaCheckpointsData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] askQuestion fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.questions.unshift({
      id: 'QA-' + (data.questions.length + 1),
      authorName: isAnonymous ? `Sinh viên Ẩn danh #${Math.floor(100 + Math.random() * 899)}` : resolveStudentName(cleanCode),
      studentCode: cleanCode,
      isAnonymous,
      question: text,
      upvotes: 1,
      upvotedBy: [cleanCode],
      createdAt: 'Vừa xong',
      isAnswered: false,
      teacherReply: null
    });
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },
  async upvoteQuestion(qId, studentCode = '26103043', classId = 'K26 CNTT - Lớp A') {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    try {
      const res = await api.classroomLive.upvoteQuestion(qId, { classId, studentCode: cleanCode });
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, data: synced };
      }
    } catch (e) {
      console.warn('[extendedFeatures] upvoteQuestion fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.questions = data.questions
      .map(q => {
        if (q.id !== qId) return q;
        const already = (q.upvotedBy || []).includes(cleanCode);
        const upvotes = already ? q.upvotes - 1 : q.upvotes + 1;
        const upvotedBy = already ? q.upvotedBy.filter(c => c !== cleanCode) : [...(q.upvotedBy || []), cleanCode];
        return { ...q, upvotes, upvotedBy };
      })
      .sort((a, b) => b.upvotes - a.upvotes);
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },
  async replyQuestion(qId, replyText, classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.replyQuestion(qId, { classId, replyText });
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, message: res.message, data: synced };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getQaCheckpointsData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] replyQuestion fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.questions = data.questions.map(q =>
      q.id === qId ? { ...q, isAnswered: true, teacherReply: replyText } : q
    );
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },
  async submitCheckpointPost({ studentCode, studentName, content, classId = 'K26 CNTT - Lớp A' }) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    const resolvedName = (studentName && studentName !== 'Lê Hoàng Bảo') ? studentName : resolveStudentName(cleanCode);
    try {
      const res = await api.classroomLive.submitCheckpointPost({
        classId,
        studentCode: cleanCode,
        studentName: resolvedName,
        content
      });
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, message: res.message, data: synced };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getQaCheckpointsData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] submitCheckpointPost fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.checkpoint.posts.unshift({
      id: 'POST-' + (data.checkpoint.posts.length + 1),
      studentCode: cleanCode,
      studentName: resolvedName,
      content,
      postedAt: 'Vừa xong',
      likes: 1
    });
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },
  async deleteQuestion(qId, classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.deleteQuestion(qId, classId);
      if (res?.success && Array.isArray(res.questions)) {
        const synced = { questions: res.questions, checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, message: res.message, data: synced };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getQaCheckpointsData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] deleteQuestion fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.questions = (data.questions || []).filter(q => q.id !== qId);
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },
  async updateCheckpointPrompt({ title, prompt, classId = 'K26 CNTT - Lớp A' }) {
    try {
      const res = await api.classroomLive.updateCheckpointPrompt({ classId, title, prompt });
      if (res?.success && res.checkpoint) {
        const synced = { questions: res.questions || [], checkpoint: res.checkpoint };
        writeStore(KEYS.QA_CHECKPOINTS, synced);
        return { success: true, message: res.message, data: synced };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getQaCheckpointsData() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] updateCheckpointPrompt fallback:', e.message);
    }

    const data = this.getQaCheckpointsData();
    data.checkpoint = {
      ...data.checkpoint,
      title: String(title || '').trim(),
      prompt: String(prompt || '').trim()
    };
    return { success: true, data: writeStore(KEYS.QA_CHECKPOINTS, data) };
  },

  // 7. Virtual Classroom
  getVirtualRoom() {
    const stored = readStore(KEYS.VIRTUAL_ROOM, SEED_VIRTUAL_ROOM);
    const serialized = JSON.stringify(stored);
    return serialized.includes('26A404') || serialized.includes('Lê Hoàng Bảo')
      ? writeStore(KEYS.VIRTUAL_ROOM, SEED_VIRTUAL_ROOM)
      : stored;
  },
  async fetchVirtualRoom(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.getVirtualRoom(classId);
      if (res?.success && res.room) {
        writeStore(KEYS.VIRTUAL_ROOM, res.room);
        return { success: true, data: res.room };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchVirtualRoom fallback:', e.message);
    }
    return { success: false, data: this.getVirtualRoom() };
  },
  async joinVirtualRoom({ role = 'student', studentCode = '26103043', cameraOn = true, micOn = false, classId = 'K26 CNTT - Lớp A' } = {}) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    try {
      const res = await api.classroomLive.joinVirtualRoom({
        classId,
        role,
        studentCode: cleanCode,
        cameraOn,
        micOn
      });
      if (res?.success && res.room) {
        writeStore(KEYS.VIRTUAL_ROOM, res.room);
        return { success: true, message: res.message, data: res.room };
      }
    } catch (e) {
      console.warn('[extendedFeatures] joinVirtualRoom fallback:', e.message);
    }
    const data = this.getVirtualRoom();
    if (role !== 'teacher' && !data.participants.some((p) => p.studentCode === cleanCode)) {
      data.participants.push({
        studentCode: cleanCode,
        studentName: resolveStudentName(cleanCode),
        joinedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        durationMin: 1,
        micOn: Boolean(micOn),
        camOn: Boolean(cameraOn),
        handRaised: false,
        autoAttended: false
      });
    }
    data.isLive = true;
    return { success: true, data: writeStore(KEYS.VIRTUAL_ROOM, data) };
  },
  async sendRoomChat({ sender, studentCode, role = 'student', text, classId = 'K26 CNTT - Lớp A' }) {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    const finalSender = role === 'teacher'
      ? (sender || 'ThS. Phạm Văn Thuận (GV)')
      : `${resolveStudentName(cleanCode)} (SV)`;
    try {
      const res = await api.classroomLive.sendRoomChat({
        classId,
        sender: finalSender,
        studentCode: cleanCode,
        role,
        text
      });
      if (res?.success && res.room) {
        writeStore(KEYS.VIRTUAL_ROOM, res.room);
        return { success: true, data: res.room };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, data: this.getVirtualRoom() };
      }
    } catch (e) {
      console.warn('[extendedFeatures] sendRoomChat fallback:', e.message);
    }

    const data = this.getVirtualRoom();
    data.chatMessages.push({
      id: Date.now(),
      sender: finalSender,
      studentCode: cleanCode,
      role,
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    return { success: true, data: writeStore(KEYS.VIRTUAL_ROOM, data) };
  },
  async toggleRaiseHand(studentCode = '26103043', classId = 'K26 CNTT - Lớp A') {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    try {
      const res = await api.classroomLive.toggleRaiseHand({ classId, studentCode: cleanCode });
      if (res?.success && res.room) {
        writeStore(KEYS.VIRTUAL_ROOM, res.room);
        return { success: true, message: res.message, handRaised: res.handRaised, data: res.room };
      }
    } catch (e) {
      console.warn('[extendedFeatures] toggleRaiseHand fallback:', e.message);
    }

    const data = this.getVirtualRoom();
    let handRaised = false;
    data.participants = data.participants.map(p => {
      if (p.studentCode !== cleanCode) return p;
      handRaised = !p.handRaised;
      return { ...p, handRaised };
    });
    return { success: true, handRaised, data: writeStore(KEYS.VIRTUAL_ROOM, data) };
  },
  async syncVirtualRoomAttendance(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.classroomLive.syncOnlineAttendance(classId);
      if (res?.success && res.room) {
        writeStore(KEYS.VIRTUAL_ROOM, res.room);
        return { success: true, message: res.message, attendedCount: res.attendedCount, totalCount: res.totalCount, data: res.room };
      }
    } catch (e) {
      console.warn('[extendedFeatures] syncVirtualRoomAttendance fallback:', e.message);
    }
    return {
      success: true,
      attendedCount: 0,
      totalCount: 88,
      message: 'Chưa có dữ liệu phòng học trực tuyến.',
      data: this.getVirtualRoom()
    };
  },

  // 8. AI Mindmaps & Infographic
  getAiMindmaps() {
    const stored = readStore(KEYS.AI_MINDMAPS, SEED_AI_MINDMAPS);
    if (!Array.isArray(stored) || stored.length === 0) {
      writeStore(KEYS.AI_MINDMAPS, SEED_AI_MINDMAPS);
      return SEED_AI_MINDMAPS;
    }
    return stored;
  },
  async fetchAiMindmaps(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.aiMindmaps.getAll(classId);
      if (res?.success && Array.isArray(res.mindmaps) && res.mindmaps.length > 0) {
        writeStore(KEYS.AI_MINDMAPS, res.mindmaps);
        return { success: true, mindmaps: res.mindmaps };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchAiMindmaps fallback:', e.message);
    }
    return { success: false, mindmaps: this.getAiMindmaps() };
  },
  async generateNewMindmap({ title, fileName, rawText = '', classId = 'K26 CNTT - Lớp A' }) {
    try {
      const res = await api.aiMindmaps.generate({ title, fileName, rawText, classId });
      if (res?.success && Array.isArray(res.mindmaps)) {
        const aiEngine = res.aiEngine || res.mindmap?.aiEngine || '';
        writeStore(KEYS.AI_MINDMAPS, res.mindmaps);
        return { success: true, mindmap: res.mindmap, mindmaps: res.mindmaps, aiEngine, message: res.message };
      }
      return { success: false, message: res?.message || 'Lỗi dựng Sơ đồ Tư duy AI!' };
    } catch (e) {
      console.warn('[extendedFeatures] generateNewMindmap error:', e.message);
      return { success: false, message: 'Không thể kết nối máy chủ để dựng Sơ đồ Tư duy!' };
    }
  },

  // 9. Live Flash Quiz
  resolveStudentName,
  getFlashQuiz() {
    return readStore(KEYS.FLASH_QUIZ, SEED_FLASH_QUIZ);
  },
  async fetchFlashQuiz(classId = 'K26 CNTT - Lớp A', studentCode = '') {
    try {
      const res = await api.flashQuiz.getActive(classId, studentCode);
      if (res && res.success && res.data) {
        const d = res.data;
        const normalized = {
          id: d.id,
          quizId: d.quizId || `FQ-${d.id}`,
          isActive: d.status === 'active',
          status: d.status,
          question: d.question || d.questionText,
          options: d.options || [],
          correctIndex: d.correctIndex !== undefined ? d.correctIndex : 1,
          durationSec: d.durationSec || d.timeLimitSec || 45,
          timeLimitSec: d.timeLimitSec || 45,
          bonusScore: d.bonusScore !== undefined ? d.bonusScore : 0.5,
          startedAt: d.startedAt,
          remainingSeconds: d.remainingSeconds !== undefined ? d.remainingSeconds : 45,
          totalSubmissions: d.totalSubmissions || 0,
          hasSubmitted: !!d.hasSubmitted,
          mySubmission: d.mySubmission || null,
          responses: []
        };

        // Also fetch live distribution & podium results
        try {
          const resResults = await api.flashQuiz.getResults(d.id);
          if (resResults && resResults.success && resResults.data) {
            normalized.responses = resResults.data.responses || [];
            normalized.podium = resResults.data.podium || [];
            normalized.distribution = resResults.data.distribution || [];
            normalized.totalVotes = resResults.data.totalSubmissions || 0;
            if (resResults.data.totalSubmissions !== undefined) {
              normalized.totalSubmissions = resResults.data.totalSubmissions;
            }
          }
        } catch {}

        writeStore(KEYS.FLASH_QUIZ, normalized);
        return normalized;
      }

      if (res && res.success && !res.data) {
        try {
          const histRes = await api.flashQuiz.getHistory(classId);
          if (histRes && histRes.success && Array.isArray(histRes.data) && histRes.data.length > 0) {
            const latest = histRes.data[0];
            const resResults = await api.flashQuiz.getResults(latest.id);
            if (resResults && resResults.success && resResults.data && resResults.data.quiz) {
              const q = resResults.data.quiz;
              const responses = resResults.data.responses || [];
              const mySub = studentCode ? responses.find(r => r.studentCode === studentCode) || null : null;
              const endedQuiz = {
                id: q.id,
                quizId: q.quizId || `FQ-${q.id}`,
                isActive: false,
                status: q.status || 'ended',
                question: q.question || q.questionText,
                options: q.options || [],
                correctIndex: q.correctIndex !== undefined ? q.correctIndex : 1,
                durationSec: q.durationSec || q.timeLimitSec || 45,
                timeLimitSec: q.timeLimitSec || q.durationSec || 45,
                bonusScore: q.bonusScore !== undefined ? q.bonusScore : 0.5,
                startedAt: q.startedAt,
                remainingSeconds: 0,
                totalSubmissions: resResults.data.totalSubmissions || responses.length || 0,
                totalVotes: resResults.data.totalSubmissions || responses.length || 0,
                hasSubmitted: !!mySub,
                mySubmission: mySub,
                responses,
                podium: resResults.data.podium || [],
                distribution: resResults.data.distribution || []
              };
              writeStore(KEYS.FLASH_QUIZ, endedQuiz);
              return endedQuiz;
            }
          }
        } catch {}

        const current = this.getFlashQuiz();
        const endedFallback = {
          ...current,
          isActive: false,
          status: 'ended',
          remainingSeconds: 0
        };
        writeStore(KEYS.FLASH_QUIZ, endedFallback);
        return endedFallback;
      }
    } catch (e) {
      console.warn('[FlashQuiz] Offline or fallback to local storage:', e.message);
    }
    return this.getFlashQuiz();
  },
  async fetchFlashQuizHistory(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.flashQuiz.getHistory(classId);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[FlashQuiz history] Offline fallback:', e.message);
    }
    return [];
  },
  async resetFlashQuizTimer(quizId) {
    const current = this.getFlashQuiz();
    const targetId = quizId || current?.id || current?.quizId;
    try {
      if (targetId) {
        const res = await api.flashQuiz.resetTimer(targetId);
        if (res && res.success) {
          const d = res.data || {};
          const duration = d.durationSec || d.timeLimitSec || current.durationSec || current.timeLimitSec || 45;
          const updated = {
            ...current,
            ...(d.id ? { id: d.id } : {}),
            ...(d.quizId ? { quizId: d.quizId } : {}),
            ...(d.question || d.questionText ? { question: d.question || d.questionText } : {}),
            ...(Array.isArray(d.options) && d.options.length ? { options: d.options } : {}),
            ...(d.correctIndex !== undefined ? { correctIndex: d.correctIndex } : {}),
            ...(d.bonusScore !== undefined ? { bonusScore: d.bonusScore } : {}),
            ...(d.startedAt !== undefined ? { startedAt: d.startedAt } : {}),
            isActive: true,
            status: 'active',
            durationSec: duration,
            timeLimitSec: duration,
            remainingSeconds: d.remainingSeconds !== undefined ? d.remainingSeconds : duration
          };
          writeStore(KEYS.FLASH_QUIZ, updated);
          return {
            success: true,
            data: updated,
            message: res.message || `Đã đặt lại đồng hồ ${duration}s cho toàn lớp!`
          };
        }
        if (res && !res.success && res.status) {
          return { success: false, message: res.message };
        }
      }
    } catch (e) {
      console.warn('[FlashQuiz resetTimer] Fallback to local:', e.message);
    }

    const duration = current?.durationSec || current?.timeLimitSec || 45;
    const fallback = {
      ...current,
      isActive: true,
      status: 'active',
      durationSec: duration,
      timeLimitSec: duration,
      remainingSeconds: duration
    };
    writeStore(KEYS.FLASH_QUIZ, fallback);
    return { success: true, data: fallback, message: `Đã đặt lại đồng hồ ${duration}s (Local)` };
  },
  async submitFlashQuizAnswer({ quizId, studentCode, studentName, selectedIndex, timeSec }) {
    const data = this.getFlashQuiz();
    const finalQuizId = quizId || data.id || data.quizId || 1;
    const finalStudentName = (studentName || '').trim() || resolveStudentName(studentCode);

    try {
      const res = await api.flashQuiz.submit({
        quizId: finalQuizId,
        studentCode,
        studentName: finalStudentName,
        selectedOption: selectedIndex,
        timeSec: timeSec || 5.2
      });

      if (res && res.success) {
        const isCorrect = !!res.is_correct;
        const entry = {
          studentCode,
          studentName: finalStudentName,
          selectedIndex,
          isCorrect,
          timeSec: res.timeSec || timeSec || 5.2,
          bonusAwarded: res.bonus_awarded || 0
        };
        const responses = Array.isArray(data.responses) ? [...data.responses] : [];
        const idx = responses.findIndex(r => r.studentCode === studentCode);
        if (idx >= 0) responses[idx] = entry;
        else responses.unshift(entry);
        const updated = {
          ...data,
          responses,
          totalSubmissions: responses.length,
          hasSubmitted: true,
          mySubmission: entry
        };
        writeStore(KEYS.FLASH_QUIZ, updated);
        return { ...updated, serverResult: res };
      }

      if (res && !res.success && res.status) {
        return { ...data, success: false, submitError: res.message };
      }
    } catch (e) {
      console.warn('[FlashQuiz submit] Fallback to local:', e.message);
    }

    // Local fallback
    const responses = Array.isArray(data.responses) ? [...data.responses] : [];
    const idx = responses.findIndex(r => r.studentCode === studentCode);
    const entry = {
      studentCode,
      studentName: finalStudentName,
      selectedIndex,
      isCorrect: selectedIndex === data.correctIndex,
      timeSec: timeSec || 5.2
    };
    if (idx >= 0) responses[idx] = entry;
    else responses.unshift(entry);
    const updated = {
      ...data,
      responses,
      totalSubmissions: responses.length,
      hasSubmitted: true,
      mySubmission: entry
    };
    return writeStore(KEYS.FLASH_QUIZ, updated);
  },
  async createFlashQuiz({ question, options, correctIndex, durationSec = 45, bonusScore = 0.5, classId = 'K26 CNTT - Lớp A' }) {
    try {
      const res = await api.flashQuiz.start({
        classId,
        question,
        options,
        correctIndex: Number(correctIndex),
        durationSec: Number(durationSec),
        bonusScore: Number(bonusScore)
      });
      if (res && res.success && res.data) {
        const d = res.data;
        const newData = {
          id: d.id,
          quizId: d.quizId || `FQ-${d.id}`,
          isActive: true,
          status: 'active',
          question: d.question,
          options: d.options || options,
          correctIndex: Number(correctIndex),
          durationSec: Number(durationSec),
          timeLimitSec: Number(durationSec),
          bonusScore: Number(bonusScore),
          startedAt: d.startedAt,
          remainingSeconds: d.remainingSeconds !== undefined ? d.remainingSeconds : Number(durationSec),
          totalSubmissions: 0,
          hasSubmitted: false,
          mySubmission: null,
          responses: [],
          podium: [],
          distribution: []
        };
        return writeStore(KEYS.FLASH_QUIZ, newData);
      }
    } catch (e) {
      console.warn('[FlashQuiz start] Fallback to local:', e.message);
    }

    const data = {
      quizId: 'FQ-' + Date.now(),
      isActive: true,
      status: 'active',
      question,
      options,
      correctIndex: Number(correctIndex),
      durationSec: Number(durationSec),
      timeLimitSec: Number(durationSec),
      bonusScore: Number(bonusScore),
      remainingSeconds: Number(durationSec),
      totalSubmissions: 0,
      hasSubmitted: false,
      mySubmission: null,
      responses: []
    };
    return writeStore(KEYS.FLASH_QUIZ, data);
  },
  async endFlashQuiz(quizId) {
    try {
      const res = await api.flashQuiz.endQuiz(quizId);
      const data = this.getFlashQuiz();
      data.isActive = false;
      data.status = 'ended';
      data.remainingSeconds = 0;
      writeStore(KEYS.FLASH_QUIZ, data);
      return res;
    } catch (e) {
      console.warn('[FlashQuiz end] Local fallback:', e.message);
      const data = this.getFlashQuiz();
      data.isActive = false;
      data.status = 'ended';
      data.remainingSeconds = 0;
      writeStore(KEYS.FLASH_QUIZ, data);
      return { success: true, message: 'Đã kết thúc phiên (Local)' };
    }
  },

  // 10. Digital Lab Help Queue
  getLabQueue() {
    return readStore(KEYS.LAB_QUEUE, SEED_LAB_QUEUE);
  },
  async fetchLabQueue(classId = 'K26 CNTT - Lớp A', status = '') {
    try {
      const res = await api.labQueue.getAll(classId, status);
      if (res && res.success && Array.isArray(res.data)) {
        writeStore(KEYS.LAB_QUEUE, res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[LabQueue] Offline or fallback to local storage:', e.message);
    }
    return this.getLabQueue();
  },
  async createLabHelpTicket({ station, studentCode, studentName, labName, bugTitle, codeSnippet, classId = 'K26 CNTT - Lớp A' }) {
    const finalStudentName = (studentName || '').trim() || resolveStudentName(studentCode);
    try {
      const res = await api.labQueue.requestHelp({
        station,
        studentCode,
        studentName: finalStudentName,
        labName,
        bugTitle,
        codeSnippet,
        classId
      });
      if (res && res.success && res.data) {
        const list = this.getLabQueue();
        const updated = [res.data, ...list.filter(t => t.id !== res.data.id && t.ticketId !== res.data.ticketId)];
        writeStore(KEYS.LAB_QUEUE, updated);
        return { success: true, data: updated, newTicket: res.data };
      }
      if (res && !res.success && res.status) {
        return { success: false, message: res.message };
      }
    } catch (e) {
      console.warn('[LabQueue create] Fallback to local storage:', e.message);
    }

    // Local fallback when backend is unreachable
    const list = this.getLabQueue();
    const existingPending = list.find(
      t => (t.studentCode || t.student_code) === studentCode &&
        ['waiting', 'assisting', 'helping'].includes((t.status || '').toLowerCase())
    );
    if (existingPending) {
      return {
        success: false,
        message: `Bạn đang có yêu cầu hỗ trợ chưa hoàn thành tại "${existingPending.station || existingPending.station_number}"! Vui lòng chờ Giảng viên hỗ trợ hoặc hủy phiếu cũ.`
      };
    }

    const ticket = {
      id: Date.now(),
      ticketId: 'Q-0' + (list.length + 1),
      station,
      station_number: station,
      studentCode,
      student_code: studentCode,
      studentName: finalStudentName,
      student_name: finalStudentName,
      labName: labName || 'LAB-02: Đồ thị Dijkstra & Min-Heap',
      bugTitle,
      issue_description: bugTitle,
      codeSnippet: (codeSnippet || '').trim(),
      status: 'waiting',
      statusUpper: 'WAITING',
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      assignedTa: null
    };
    list.unshift(ticket);
    writeStore(KEYS.LAB_QUEUE, list);
    return { success: true, data: list, newTicket: ticket };
  },
  async updateLabTicketStatus(ticketId, newStatus, assignedTa) {
    try {
      const res = await api.labQueue.updateStatus(ticketId, {
        status: newStatus,
        assigned_to: assignedTa
      });
      if (res && res.success && res.data) {
        const list = this.getLabQueue();
        const updated = list.map(t => (t.id === res.data.id || t.ticketId === res.data.ticketId) ? res.data : t);
        writeStore(KEYS.LAB_QUEUE, updated);
        return { success: true, data: updated, updatedTicket: res.data };
      }
      if (res && !res.success && res.status) {
        return { success: false, message: res.message };
      }
    } catch (e) {
      console.warn('[LabQueue update] Fallback to local storage:', e.message);
    }

    const list = this.getLabQueue();
    const updated = list.map(t => {
      const match = t.ticketId === ticketId || t.id === ticketId;
      if (!match) return t;
      const norm = newStatus.toLowerCase();
      return {
        ...t,
        status: norm,
        statusUpper: norm.toUpperCase(),
        assignedTa: norm === 'waiting' ? null : (assignedTa || 'ThS. Phạm Văn Thuận')
      };
    });
    writeStore(KEYS.LAB_QUEUE, updated);
    return { success: true, data: updated };
  },
  async cancelLabTicket(ticketId, classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.labQueue.deleteTicket(ticketId);
      if (res && !res.success && res.status && res.status !== 404) {
        return { success: false, message: res.message || 'Không thể hủy phiếu hỗ trợ!' };
      }
    } catch (e) {
      console.warn('[LabQueue cancel] Fallback to local storage:', e.message);
    }

    const list = this.getLabQueue();
    const rawTarget = String(ticketId ?? '');
    const strippedTarget = rawTarget.replace(/^Q-0*/i, '');
    const filtered = list.filter(t => {
      if (String(t.id) === rawTarget || String(t.ticketId) === rawTarget) return false;
      if (strippedTarget) {
        const tid = t.id != null ? String(t.id).replace(/^Q-0*/i, '') : '';
        const tcode = t.ticketId != null ? String(t.ticketId).replace(/^Q-0*/i, '') : '';
        if (tid === strippedTarget || tcode === strippedTarget) return false;
      }
      return true;
    });
    writeStore(KEYS.LAB_QUEUE, filtered);

    try {
      const liveRes = await api.labQueue.getAll(classId);
      if (liveRes && liveRes.success && Array.isArray(liveRes.data)) {
        writeStore(KEYS.LAB_QUEUE, liveRes.data);
        return { success: true, data: liveRes.data };
      }
    } catch {}

    return { success: true, data: filtered };
  },
  async clearResolvedTickets(classId = 'K26 CNTT - Lớp A') {
    try {
      const res = await api.labQueue.clearResolved(classId);
      if (res && res.success) {
        return await this.fetchLabQueue(classId);
      }
    } catch {}
    const list = this.getLabQueue();
    const filtered = list.filter(t => (t.status || '').toLowerCase() !== 'resolved' && (t.status || '').toLowerCase() !== 'cancelled');
    writeStore(KEYS.LAB_QUEUE, filtered);
    return filtered;
  },

  // 11. Gamification Streaks & Badges
  getGamificationProfile(studentCode = '26103043') {
    const aliasMap = {
      '26A4040001': '26103043',
      '26A4040002': '26103028',
      '26A4040003': '26103011',
      '26A4040004': '26103008',
      '26A4040005': '26103004'
    };
    const cleanCode = aliasMap[studentCode] || studentCode || '26103043';
    let data = readStore(KEYS.GAMIFICATION, SEED_GAMIFICATION);
    if (!data?.studentProfiles || data.studentProfiles['26A4040001']) {
      data = writeStore(KEYS.GAMIFICATION, SEED_GAMIFICATION);
    }
    return data.studentProfiles[cleanCode] || data.studentProfiles['26103043'];
  },
  async fetchGamificationProfile(studentCode = '26103043', classId = 'K26 CNTT - Lớp A') {
    const aliasMap = {
      '26A4040001': '26103043',
      '26A4040002': '26103028',
      '26A4040003': '26103011',
      '26A4040004': '26103008',
      '26A4040005': '26103004'
    };
    const cleanCode = aliasMap[studentCode] || studentCode || '26103043';
    try {
      const res = await api.gamification.getAll(classId, cleanCode);
      if (res?.success && res.profiles) {
        writeStore(KEYS.GAMIFICATION, { studentProfiles: res.profiles });
        return { success: true, profile: res.profile || res.profiles[cleanCode] };
      }
    } catch (e) {
      console.warn('[extendedFeatures] fetchGamificationProfile fallback:', e.message);
    }
    return { success: false, profile: this.getGamificationProfile(cleanCode) };
  },
  async redeemLatePass(studentCode = '26103043') {
    const cleanCode = studentCode === '26A4040001' ? '26103043' : (studentCode || '26103043');
    try {
      const res = await api.gamification.redeemLatePass(cleanCode);
      if (res?.success && res.profile) {
        if (res.profiles) {
          writeStore(KEYS.GAMIFICATION, { studentProfiles: res.profiles });
        } else {
          const data = readStore(KEYS.GAMIFICATION, SEED_GAMIFICATION);
          data.studentProfiles[cleanCode] = res.profile;
          writeStore(KEYS.GAMIFICATION, data);
        }
        return { success: true, message: res.message, profile: res.profile };
      }
      if (res?.status && res.status >= 400 && res.status < 500) {
        return { success: false, message: res.message, profile: this.getGamificationProfile(cleanCode) };
      }
    } catch (e) {
      console.warn('[extendedFeatures] redeemLatePass fallback:', e.message);
    }

    let data = readStore(KEYS.GAMIFICATION, SEED_GAMIFICATION);
    if (!data?.studentProfiles || data.studentProfiles['26A4040001']) {
      data = writeStore(KEYS.GAMIFICATION, SEED_GAMIFICATION);
    }
    const prof = { ...(data.studentProfiles[cleanCode] || data.studentProfiles['26103043']) };
    if (prof.expPoints < 500) {
      return { success: false, message: 'Bạn cần tối thiểu 500 EXP để đổi Vé miễn trừ đi trễ!', profile: prof };
    }
    prof.expPoints -= 500;
    prof.latePassCount += 1;
    data.studentProfiles[cleanCode] = prof;
    writeStore(KEYS.GAMIFICATION, data);
    return {
      success: true,
      message: '🎟️ Đổi thành công 1 Vé Miễn trừ Đi trễ (-500 EXP)! Vé sẽ tự động áp dụng nếu bạn quét QR trễ dưới 15 phút.',
      profile: prof
    };
  }
};
