/**
 * Centralized API Client for EG Education Platform
 * Connects Frontend seamlessly with Express Backend & SQLite Database
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : '/api';

function getAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('eg_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Lỗi yêu cầu máy chủ: HTTP ${res.status}`;
      return { success: false, message: errorMsg, status: res.status, data };
    }

    return data;
  } catch (err) {
    console.warn(`[API Connection Error] ${endpoint}:`, err.message);
    return { success: false, message: 'Không thể kết nối tới máy chủ backend!', error: err.message };
  }
}

export const api = {
  // 1. Auth Module
  auth: {
    login: (email, password, role) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
      }),
    me: () => request('/auth/me')
  },

  // 2. Attendance Module
  attendance: {
    getActiveSession: (classId) => request(`/attendance/active-session${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`),
    createSession: (data) => request('/attendance/session', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    pauseSession: (sessionId) => request(`/attendance/session/${sessionId}/pause`, {
      method: 'POST'
    }),
    rotateToken: (sessionId, token) => request(`/attendance/session/${sessionId}/token`, {
      method: 'PATCH',
      body: JSON.stringify(token ? { token } : {})
    }),
    resetSessionRecords: (sessionId) => request(`/attendance/session/${sessionId}/reset`, {
      method: 'POST'
    }),
    resetAll: () => request('/attendance/reset-all', {
      method: 'POST'
    }),
    verifyLocation: (coords) => request('/attendance/verify-location', {
      method: 'POST',
      body: JSON.stringify(coords || {})
    }),
    closeSession: (sessionId) => request(`/attendance/session/${sessionId}/close`, {
      method: 'POST'
    }),
    reopenSession: (sessionId) => request(`/attendance/session/${sessionId}/reopen`, {
      method: 'POST'
    }),
    getClassRoster: (classId) => request(`/attendance/class-roster?classId=${encodeURIComponent(classId || '')}`),
    getNetworkInfo: () => request('/attendance/network-info'),
    simulateStudentCheckin: (studentCode) => request('/attendance/simulate-student-checkin', {
      method: 'POST',
      body: JSON.stringify({ student_code: studentCode })
    }),
    checkIn: (data) => request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getMyHistory: () => request('/attendance/my-history')
  },

  // 3. Leave Requests Module
  leaveRequests: {
    getAll: (status) => request(`/leave-requests${status ? `?status=${status}` : ''}`),
    submit: (data) => request('/leave-requests', {
      method: 'POST',
      body: JSON.stringify({
        subject_name: data.subjectName || data.subject || 'Cấu trúc dữ liệu & Giải thuật (IT204)',
        leave_date: data.leaveDate || data.date,
        sessions_count: data.sessionsCount || 1,
        reason_category: data.reasonCategory || data.category || 'medical',
        reason: data.reason,
        proof_file_name: data.proofFileName || data.fileName || 'Minh_chung_dinh_kem.jpg',
        proof_url: data.proofUrl || data.proof || null
      })
    }),
    review: (id, { status, reviewNote }) => request(`/leave-requests/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        review_note: reviewNote
      })
    }),
    cancel: (id) => request(`/leave-requests/${id}`, {
      method: 'DELETE'
    }),
    getAiPacks: (classId) => request(`/leave-requests/ai-packs?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    updateAiConfig: (data) => request('/leave-requests/ai-config', {
      method: 'PATCH',
      body: JSON.stringify(data || {})
    }),
    submitAiLeave: (data) => request('/leave-requests/ai-submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    reviewAiLeave: (id, data) => request(`/leave-requests/${encodeURIComponent(id)}/ai-review`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    completeMakeup: (id, data) => request(`/leave-requests/${encodeURIComponent(id)}/complete-makeup`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    })
  },

  // 4. Announcements & Polls Module
  announcements: {
    getAll: () => request('/announcements'),
    analyzeAi: (rawText) => request('/announcements/analyze-ai', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText })
    }),
    analyzeFile: (fileName, fileBase64, fileText) => request('/announcements/analyze-file', {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName, file_base64: fileBase64, file_text: fileText })
    }),
    create: (data) => request('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        target_class: data.targetClass || data.target_class || 'K26 CNTT - Lớp A',
        subject: data.subject || 'Cấu trúc dữ liệu & GT',
        urgency: data.urgency || 'normal',
        urgency_label: data.urgencyLabel || data.urgency_label || 'THÔNG BÁO',
        deadline: data.deadline || '23:59 hôm nay',
        raw_text: data.rawText || data.raw_text || '',
        ai_summary: data.aiSummary || data.ai_summary,
        source_file_name: data.sourceFileName || data.source_file_name || null,
        has_poll: data.hasPoll !== undefined ? data.hasPoll : (data.has_poll !== undefined ? data.has_poll : true),
        options: data.options || data.pollOptions || []
      })
    }),
    vote: (announcementId, optionIndex) => request(`/announcements/${announcementId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_index: optionIndex })
    }),
    getReport: (announcementId) => request(`/announcements/${announcementId}/report`)
  },

  // 5. Feedbacks Module
  feedbacks: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/feedbacks${q ? `?${q}` : ''}`);
    },
    submit: (data) => request('/feedbacks', {
      method: 'POST',
      body: JSON.stringify({
        target_teacher_name: data.targetTeacherName,
        category: data.category,
        category_label: data.categoryLabel,
        priority: data.priority,
        priority_label: data.priorityLabel,
        title: data.title,
        content: data.content,
        is_anonymous: data.isAnonymous
      })
    }),
    reply: (id, replyContent) => request(`/feedbacks/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply_content: replyContent })
    }),
    rate: (id, rating, comment) => request(`/feedbacks/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback_comment: comment })
    })
  },

  // 6. Notifications Module
  notifications: {
    getAll: () => request('/notifications'),
    markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => request('/notifications/read-all', { method: 'POST' }),
    clearAll: () => request('/notifications', { method: 'DELETE' })
  },

  // 7. Gradebook Module
  gradebook: {
    getAll: (subjectCode, classId) => request(`/gradebook?subjectCode=${encodeURIComponent(subjectCode || 'IT204')}&classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    updateStudent: (studentCode, data) => request(`/gradebook/${studentCode}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    sync: (data) => request('/gradebook/sync', {
      method: 'POST',
      body: JSON.stringify(data || {})
    }),
    getDisputes: () => request('/gradebook/disputes'),
    submitDispute: (data) => request('/gradebook/disputes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    resolveDispute: (disputeId, data) => request(`/gradebook/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // 8. Assignments & Lab Hub Module
  assignments: {
    getAll: (subjectCode, classId) => request(`/assignments?subject_code=${encodeURIComponent(subjectCode || 'IT204')}&class_id=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    create: (data) => request('/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getSubmissions: (assignmentId) => request(`/assignments/${assignmentId}/submissions`),
    submit: (assignmentId, data) => request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    grade: (submissionId, data) => request(`/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    syncToGradebook: () => request('/assignments/sync-to-gradebook', {
      method: 'POST'
    })
  },

  // 9. Digital Lab Help Queue Module
  labQueue: {
    getAll: (classId, status) => {
      const params = new URLSearchParams();
      if (classId) params.append('classId', classId);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/lab-queue${query}`);
    },
    requestHelp: (data) => request('/lab-queue/request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateStatus: (ticketId, data) => request(`/lab-queue/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(typeof data === 'string' ? { status: data } : data)
    }),
    deleteTicket: (ticketId) => request(`/lab-queue/${ticketId}`, {
      method: 'DELETE'
    }),
    clearResolved: (classId) => request(`/lab-queue/clear-resolved?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`, {
      method: 'DELETE'
    })
  },

  // 10. Live Flash Quiz 45s Module
  flashQuiz: {
    getActive: (classId, studentCode) => {
      const params = new URLSearchParams();
      if (classId) params.append('classId', classId);
      if (studentCode) params.append('studentCode', studentCode);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/flash-quiz/active${query}`);
    },
    getHistory: (classId) => request(`/flash-quiz/history?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    start: (data) => request('/flash-quiz/start', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    submit: (data) => request('/flash-quiz/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getResults: (quizId) => request(`/flash-quiz/${quizId}/results`),
    resetTimer: (quizId) => request(`/flash-quiz/${quizId}/reset-timer`, {
      method: 'POST'
    }),
    endQuiz: (quizId) => request(`/flash-quiz/${quizId}/end`, {
      method: 'POST'
    })
  },

  // 11. AI Lecture Mindmaps, Bloom Lesson Docs & Course Materials Module
  aiMindmaps: {
    getAll: (classId) => request(`/ai-mindmaps?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    generate: (data) => request('/ai-mindmaps/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    parseLessonDoc: (payload) => request('/ai-mindmaps/parse-lesson-doc', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getEngineConfig: () => request('/ai-mindmaps/engine-config'),
    saveEngineConfig: (payload) => request('/ai-mindmaps/engine-config', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),
    askTutor: (payload) => request('/ai-mindmaps/tutor-chat', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),
    getMaterials: (classId) => request(`/ai-mindmaps/materials?classId=${encodeURIComponent(classId || 'all')}`),
    uploadMaterial: (payload) => request('/ai-mindmaps/materials', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    downloadMaterial: (materialId) => request(`/ai-mindmaps/materials/${encodeURIComponent(materialId)}/download`, {
      method: 'POST'
    }),
    deleteMaterial: (materialId) => request(`/ai-mindmaps/materials/${encodeURIComponent(materialId)}`, {
      method: 'DELETE'
    })
  },

  // 12. Group Projects (C_i), MOSS AST & Peer Reviews Module
  groupProjects: {
    getAll: (classId) => request(`/group-projects?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    addTask: (groupId, data) => request(`/group-projects/${encodeURIComponent(groupId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    toggleTask: (groupId, taskId, studentCode) => request(`/group-projects/${encodeURIComponent(groupId)}/tasks/${encodeURIComponent(taskId)}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify(studentCode ? { studentCode } : {})
    }),
    updateScores: (groupId, data) => request(`/group-projects/${encodeURIComponent(groupId)}/scores`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    getMoss: (classId) => request(`/group-projects/moss?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    scanMoss: (classId) => request('/group-projects/moss/scan', {
      method: 'POST',
      body: JSON.stringify({ classId: classId || 'K26 CNTT - Lớp A' })
    }),
    getPeerReviews: (classId) => request(`/group-projects/peer-reviews?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    submitPeerReview: (reviewId, data) => request(`/group-projects/peer-reviews/${encodeURIComponent(reviewId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    calibratePeerReviews: (classId) => request('/group-projects/peer-reviews/calibrate', {
      method: 'POST',
      body: JSON.stringify({ classId: classId || 'K26 CNTT - Lớp A' })
    })
  },

  // 13. Training Points (ĐRL) & Predictive At-Risk AI Module
  drlRisk: {
    getAll: (classId) => request(`/drl-risk?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    sync: (classId) => request('/drl-risk/sync', {
      method: 'POST',
      body: JSON.stringify({ classId: classId || 'K26 CNTT - Lớp A' })
    }),
    updateStudent: (studentCode, data) => request(`/drl-risk/${encodeURIComponent(studentCode)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    notifyAdvisor: (studentCode, note) => request(`/drl-risk/${encodeURIComponent(studentCode)}/notify-advisor`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    })
  },

  // 14. Live Classroom: Exit Tickets, Cold Call, Live Q&A & Virtual Room Module
  classroomLive: {
    getExitTickets: (classId) => request(`/classroom-live/exit-tickets?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    submitExitTicket: (data) => request('/classroom-live/exit-tickets/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    spinColdCall: (data) => request('/classroom-live/exit-tickets/cold-call', {
      method: 'POST',
      body: JSON.stringify(data || {})
    }),
    resetExitTickets: (classId) => request('/classroom-live/exit-tickets/reset', {
      method: 'POST',
      body: JSON.stringify({ classId: classId || 'K26 CNTT - Lớp A' })
    }),
    getQaCheckpoints: (classId) => request(`/classroom-live/qa-checkpoints?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    askQuestion: (data) => request('/classroom-live/qa-checkpoints/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    upvoteQuestion: (questionId, data) => request(`/classroom-live/qa-checkpoints/questions/${encodeURIComponent(questionId)}/upvote`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    replyQuestion: (questionId, data) => request(`/classroom-live/qa-checkpoints/questions/${encodeURIComponent(questionId)}/reply`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    deleteQuestion: (questionId, classId = 'K26 CNTT - Lớp A') => request(`/classroom-live/qa-checkpoints/questions/${encodeURIComponent(questionId)}?classId=${encodeURIComponent(classId)}`, {
      method: 'DELETE'
    }),
    updateCheckpointPrompt: (data) => request('/classroom-live/qa-checkpoints/checkpoint', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    submitCheckpointPost: (data) => request('/classroom-live/qa-checkpoints/checkpoint-posts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getVirtualRoom: (classId) => request(`/classroom-live/virtual-room?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}`),
    joinVirtualRoom: (data) => request('/classroom-live/virtual-room/join', {
      method: 'POST',
      body: JSON.stringify(data || {})
    }),
    sendRoomChat: (data) => request('/classroom-live/virtual-room/chat', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    toggleRaiseHand: (data) => request('/classroom-live/virtual-room/raise-hand', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    syncOnlineAttendance: (classId) => request('/classroom-live/virtual-room/sync-attendance', {
      method: 'POST',
      body: JSON.stringify({ classId: classId || 'K26 CNTT - Lớp A' })
    })
  },

  // 15. Gamification Streaks, EXP, Badges & Late Pass Module
  gamification: {
    getAll: (classId, studentCode) => request(`/gamification?classId=${encodeURIComponent(classId || 'K26 CNTT - Lớp A')}&studentCode=${encodeURIComponent(studentCode || '26103043')}`),
    getProfile: (studentCode) => request(`/gamification/${encodeURIComponent(studentCode || '26103043')}`),
    redeemLatePass: (studentCode) => request(`/gamification/${encodeURIComponent(studentCode || '26103043')}/redeem-late-pass`, {
      method: 'POST',
      body: JSON.stringify({})
    })
  }
};

export const authStorage = {
  getToken: () => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('eg_auth_token') : null;
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('eg_auth_token', token);
      }
    } catch {}
  },
  getUser: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const u = localStorage.getItem('eg_auth_user');
        return u ? JSON.parse(u) : null;
      }
    } catch {
      return null;
    }
    return null;
  },
  setUser: (user) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('eg_auth_user', JSON.stringify(user));
      }
    } catch {}
  },
  clearSession: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eg_auth_token');
        localStorage.removeItem('eg_auth_user');
      }
    } catch {}
  }
};

export const authService = {
  login: async ({ email, password, role }) => {
    const res = await api.auth.login(email, password, role);
    if (!res.success) {
      throw new Error(res.message || 'Đăng nhập thất bại!');
    }
    if (res.token && typeof localStorage !== 'undefined') {
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);
    }
    return res;
  },
  getMe: async () => {
    const res = await api.auth.me();
    if (!res.success) {
      throw new Error(res.message || 'Phiên làm việc không hợp lệ');
    }
    return res;
  },
  getCurrentUser: () => authStorage.getUser(),
  logout: () => authStorage.clearSession()
};

export default api;
