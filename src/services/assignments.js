import { STUDENTS_K26_A } from '../data/students.js';
import { gradebookService } from './gradebook.js';
import { api } from './api.js';

const ASSIGNMENTS_STORAGE_KEY = 'eg_assignments_v1';
const SUBMISSIONS_STORAGE_KEY = 'eg_submissions_v1';

let memAssignments = null;
let memSubmissions = null;

const safeStorage = {
  get: (key) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch {}
    return key === ASSIGNMENTS_STORAGE_KEY ? memAssignments : memSubmissions;
  },
  set: (key, data) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {}
    if (key === ASSIGNMENTS_STORAGE_KEY) memAssignments = data;
    else memSubmissions = data;
  }
};

const DEFAULT_ASSIGNMENTS = [];

function generateInitialSubmissions() {
  return [];
}

export const assignmentService = {
  /**
   * Lấy danh sách tất cả bài Lab / Assignment
   */
  getAll: async () => {
    try {
      const res = await api.assignments.getAll();
      if (res.success && Array.isArray(res.data)) {
        safeStorage.set(ASSIGNMENTS_STORAGE_KEY, res.data);
        return res.data;
      }
    } catch {}

    let stored = safeStorage.get(ASSIGNMENTS_STORAGE_KEY);
    if (!stored || !Array.isArray(stored)) {
      stored = DEFAULT_ASSIGNMENTS;
      safeStorage.set(ASSIGNMENTS_STORAGE_KEY, stored);
    }
    return stored;
  },

  /**
   * Giảng viên tạo bài Lab mới
   */
  createAssignment: async ({ title, description, deadline, weightPercent, maxScore = 10 }) => {
    try {
      const res = await api.assignments.create({
        title,
        description,
        deadline,
        weight_percent: weightPercent,
        max_score: maxScore
      });
      if (res.success) {
        // Refresh local cache
        const updated = await assignmentService.getAll();
        return res;
      }
    } catch {}

    const list = safeStorage.get(ASSIGNMENTS_STORAGE_KEY) || DEFAULT_ASSIGNMENTS;
    const newId = list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1;
    const newCode = `LAB-0${newId}`;

    const newAssignment = {
      id: newId,
      assignmentCode: newCode,
      subjectCode: 'IT204',
      subjectName: 'Cấu trúc dữ liệu & Giải thuật',
      classId: 'K26 CNTT - Lớp A',
      title,
      description,
      deadline,
      deadlineFormatted: new Date(deadline).toLocaleString('vi-VN'),
      maxScore,
      weightPercent: parseFloat(weightPercent) || 30.0,
      allowedTypes: 'all',
      status: 'active',
      totalStudents: 50,
      submittedCount: 0,
      gradedCount: 0,
      avgScore: null
    };

    const updated = [newAssignment, ...list];
    safeStorage.set(ASSIGNMENTS_STORAGE_KEY, updated);
    return { success: true, assignmentId: newId, assignmentCode: newCode };
  },

  /**
   * Giảng viên xem danh sách nộp bài của 50 sinh viên cho bài Lab
   */
  getSubmissions: async (assignmentId) => {
    try {
      const res = await api.assignments.getSubmissions(assignmentId);
      if (res.success && res.submissions) {
        return res.submissions;
      }
    } catch {}

    let allSubs = safeStorage.get(SUBMISSIONS_STORAGE_KEY);
    if (!allSubs || !Array.isArray(allSubs)) {
      allSubs = generateInitialSubmissions();
      safeStorage.set(SUBMISSIONS_STORAGE_KEY, allSubs);
    }

    const subsForAssignment = allSubs.filter(s => s.assignmentId === parseInt(assignmentId, 10));
    const subMap = new Map();
    subsForAssignment.forEach(s => subMap.set(s.studentCode, s));

    return STUDENTS_K26_A.map(student => {
      const sub = subMap.get(student.code);
      if (sub) {
        return {
          ...sub,
          hasSubmitted: true
        };
      } else {
        return {
          studentCode: student.code,
          studentName: student.name,
          hasSubmitted: false,
          submissionId: null,
          status: 'unsubmitted',
          score: null
        };
      }
    });
  },

  /**
   * Sinh viên nộp bài thực hành Lab (File hoặc link GitHub)
   */
  submitAssignment: async (assignmentId, { studentCode, studentName, submissionType, fileName, fileUrl, githubRepoUrl, studentNote }) => {
    try {
      const res = await api.assignments.submit(assignmentId, {
        student_code: studentCode,
        student_name: studentName,
        submission_type: submissionType,
        file_name: fileName,
        file_url: fileUrl,
        github_repo_url: githubRepoUrl,
        student_note: studentNote
      });
      if (res.success) {
        return res;
      }
    } catch {}

    let allSubs = safeStorage.get(SUBMISSIONS_STORAGE_KEY);
    if (!allSubs) allSubs = generateInitialSubmissions();

    const existingIdx = allSubs.findIndex(s => s.assignmentId === parseInt(assignmentId, 10) && s.studentCode === studentCode);
    const now = new Date();
    const submittedAt = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const newSub = {
      id: `SUB-${assignmentId}-${studentCode}`,
      assignmentId: parseInt(assignmentId, 10),
      studentCode,
      studentName: studentName || 'Sinh viên',
      submissionType: submissionType || 'github',
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      githubRepoUrl: githubRepoUrl || null,
      studentNote: studentNote || '',
      submittedAt,
      isLate: false,
      status: 'submitted',
      score: null,
      teacherFeedback: null,
      gradedAt: null,
      gradedBy: null
    };

    if (existingIdx >= 0) {
      allSubs[existingIdx] = { ...allSubs[existingIdx], ...newSub };
    } else {
      allSubs.push(newSub);
    }

    safeStorage.set(SUBMISSIONS_STORAGE_KEY, allSubs);
    return { success: true, message: 'Nộp bài thành công!' };
  },

  /**
   * Giảng viên chấm điểm bài nộp & TỰ ĐỘNG ĐỒNG BỘ VÀO SỔ ĐIỂM
   */
  gradeSubmission: async (submissionId, { score, teacherFeedback, studentCode, assignmentId }) => {
    const parsedScore = Math.max(0, Math.min(10, parseFloat(score) || 0));

    try {
      const res = await api.assignments.grade(submissionId || 0, {
        score: parsedScore,
        teacher_feedback: teacherFeedback,
        student_code: studentCode,
        assignment_id: assignmentId
      });
      if (res.success) {
        // Also update local gradebook
        if (res.newLabScore !== undefined && studentCode) {
          gradebookService.updateStudentGrade(studentCode, 'labScore', res.newLabScore);
        } else {
          assignmentService.syncStudentLabScoreToGradebook(studentCode);
        }
        return res;
      }
    } catch {}

    let allSubs = safeStorage.get(SUBMISSIONS_STORAGE_KEY);
    if (!allSubs) allSubs = generateInitialSubmissions();

    const sub = allSubs.find(s => s.id === submissionId || (s.studentCode === studentCode));
    if (sub) {
      sub.score = parsedScore;
      sub.teacherFeedback = teacherFeedback;
      sub.status = 'graded';
      const now = new Date();
      sub.gradedAt = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      sub.gradedBy = 'ThS. Phạm Văn Thuận';
      safeStorage.set(SUBMISSIONS_STORAGE_KEY, allSubs);

      // Auto-update student Lab score in Gradebook!
      assignmentService.syncStudentLabScoreToGradebook(sub.studentCode);
    }

    return { success: true, message: `Đã chấm ${parsedScore} điểm và cập nhật vào Sổ Điểm!` };
  },

  /**
   * Tự động tính toán lại điểm Lab của 1 sinh viên và cập nhật vào Sổ Điểm
   */
  syncStudentLabScoreToGradebook: (studentCode) => {
    let allSubs = safeStorage.get(SUBMISSIONS_STORAGE_KEY) || [];
    const gradedSubs = allSubs.filter(s => s.studentCode === studentCode && s.status === 'graded' && typeof s.score === 'number');

    if (gradedSubs.length > 0) {
      const sum = gradedSubs.reduce((acc, s) => acc + s.score, 0);
      const calculatedLabScore = Math.round((sum / gradedSubs.length) * 10) / 10;

      // Update in gradebookService
      gradebookService.updateStudentGrade(studentCode, 'labScore', calculatedLabScore);
      return calculatedLabScore;
    }
    return null;
  },

  /**
   * Đồng bộ toàn bộ điểm các bài Lab của 50 sinh viên vào Sổ Điểm
   */
  syncAllToGradebook: async () => {
    try {
      const res = await api.assignments.syncToGradebook();
      if (res && res.success && Array.isArray(res.updatedLabScores)) {
        res.updatedLabScores.forEach(item => {
          gradebookService.updateStudentGrade(item.studentCode, 'labScore', item.labScore);
        });
        return res;
      }
    } catch {}

    STUDENTS_K26_A.forEach(student => {
      assignmentService.syncStudentLabScoreToGradebook(student.code);
    });

    return { success: true, message: 'Đã tự động tính toán và cập nhật điểm Lab của toàn bộ sinh viên vào Sổ Điểm Quá Trình!' };
  }
};
