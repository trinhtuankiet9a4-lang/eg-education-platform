import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Users, 
  Calendar, 
  FileCheck2, 
  Sparkles, 
  BookMarked, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Maximize2, 
  Minimize2,
  Play,
  Pause,
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  Wifi, 
  MapPin, 
  X, 
  FileText,
  Filter,
  Check,
  Eye,
  Download,
  Copy,
  Plus,
  AlertCircle,
  TrendingUp,
  BookOpen,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  ChevronDown,
  Megaphone,
  Vote,
  Send,
  Trash2,
  ChevronRight,
  FileDown,
  MessageSquare,
  MessageSquareText,
  Star,
  Inbox,
  HelpCircle,
  Printer,
  Smartphone,
  Lock,
  Unlock,
  UploadCloud,
  FileUp,
  Edit3,
  CheckCircle2,
  FolderGit2,
  Cpu,
  Menu
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import PrintMinutesModal from './PrintMinutesModal';
import CollapsibleFeatureSidebar from './CollapsibleFeatureSidebar';
import { api } from '../services/api.js';
import { attendanceExportService } from '../services/attendanceExport.js';
import { announcementService } from '../services/announcements.js';
import { STUDENTS_K26_A } from '../data/students.js';
import { QRCodeSVG } from 'qrcode.react';
import { exportBloomLessonToPptx } from '../utils/pptxExport.js';
import { feedbackService, ADVISOR_TEACHERS, FEEDBACK_CATEGORIES, FEEDBACK_PRIORITIES } from '../services/feedback.js';
import { sound } from '../utils/sound.js';
import TeacherGradebook from './TeacherGradebook';
import TeacherAssignments from './TeacherAssignments';
import VirtualClassroomHub from './modules/VirtualClassroomHub';
import AiLectureMindmapHub from './modules/AiLectureMindmapHub';
import LiveFlashQuizHub from './modules/LiveFlashQuizHub';
import LabHelpQueueHub from './modules/LabHelpQueueHub';
import GamificationStreakHub from './modules/GamificationStreakHub';
import LeaveAiAndMakeupAddon from './addons/LeaveAiAndMakeupAddon';
import AttendanceExitAndPickerAddon from './addons/AttendanceExitAndPickerAddon';
import LiveQaAndCheckpointsAddon from './addons/LiveQaAndCheckpointsAddon';

const UNIVERSITY_PERIODS = [
  { period: 1, startMin: 7 * 60, endMin: 7 * 60 + 50, timeLabel: '07:00 – 07:50', shift: 'Ca Sáng' },
  { period: 2, startMin: 7 * 60 + 50, endMin: 8 * 60 + 40, timeLabel: '07:50 – 08:40', shift: 'Ca Sáng' },
  { period: 3, startMin: 8 * 60 + 50, endMin: 9 * 60 + 40, timeLabel: '08:50 – 09:40', shift: 'Ca Sáng' },
  { period: 4, startMin: 9 * 60 + 40, endMin: 10 * 60 + 30, timeLabel: '09:40 – 10:30', shift: 'Ca Sáng' },
  { period: 5, startMin: 10 * 60 + 35, endMin: 11 * 60 + 25, timeLabel: '10:35 – 11:25', shift: 'Ca Sáng' },
  { period: 6, startMin: 13 * 60, endMin: 13 * 60 + 50, timeLabel: '13:00 – 13:50', shift: 'Ca Chiều' },
  { period: 7, startMin: 13 * 60 + 50, endMin: 14 * 60 + 40, timeLabel: '13:50 – 14:40', shift: 'Ca Chiều' },
  { period: 8, startMin: 14 * 60 + 50, endMin: 15 * 60 + 40, timeLabel: '14:50 – 15:40', shift: 'Ca Chiều' },
  { period: 9, startMin: 15 * 60 + 40, endMin: 16 * 60 + 30, timeLabel: '15:40 – 16:30', shift: 'Ca Chiều' },
  { period: 10, startMin: 16 * 60 + 35, endMin: 17 * 60 + 25, timeLabel: '16:35 – 17:25', shift: 'Ca Chiều' },
  { period: 11, startMin: 17 * 60 + 30, endMin: 18 * 60 + 20, timeLabel: '17:30 – 18:20', shift: 'Ca Tối' },
  { period: 12, startMin: 18 * 60 + 20, endMin: 19 * 60 + 10, timeLabel: '18:20 – 19:10', shift: 'Ca Tối' }
];

const WEEKDAY_VI_LABELS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function detectCurrentTimetable(now, classes = []) {
  const dayOfWeek = now.getDay(); // 0=CN, 1=T2..6=T7
  const dayLabel = WEEKDAY_VI_LABELS[dayOfWeek] || 'Hôm nay';
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const todayClasses = classes.filter(
    cls => Array.isArray(cls.days) && cls.days.includes(dayOfWeek) && Array.isArray(cls.periods) && cls.periods.length > 0
  );
  const todayScheduledPeriodSet = new Set();
  todayClasses.forEach(cls => {
    cls.periods.forEach(p => todayScheduledPeriodSet.add(p));
  });

  if (todayScheduledPeriodSet.size === 0) {
    return {
      dayOfWeek,
      dayLabel,
      dateStr,
      timeStr,
      periodStatus: 'no_schedule_today',
      currentPeriod: null,
      periodDisplay: 'Hôm nay không có ca giảng dạy trên TKB',
      shiftLabel: 'Chưa có lịch dạy',
      matchedClass: null
    };
  }

  const scheduledPeriodsToday = UNIVERSITY_PERIODS.filter(p => todayScheduledPeriodSet.has(p.period));
  const exactPeriod = scheduledPeriodsToday.find(p => totalMinutes >= p.startMin && totalMinutes < p.endMin);
  const nextPeriod = scheduledPeriodsToday.find(p => p.startMin > totalMinutes);

  let periodStatus = 'in_period';
  let activePeriod = exactPeriod || null;
  let periodDisplay = '';
  let shiftLabel = '';

  if (activePeriod) {
    periodDisplay = `Tiết ${activePeriod.period} (${activePeriod.timeLabel})`;
    shiftLabel = activePeriod.shift;
  } else if (nextPeriod) {
    periodStatus = 'upcoming_scheduled';
    activePeriod = nextPeriod;
    periodDisplay = `Chưa tới giờ • Tiết tiếp theo: Tiết ${nextPeriod.period} (${nextPeriod.timeLabel})`;
    shiftLabel = nextPeriod.shift;
  } else {
    periodStatus = 'finished_today';
    periodDisplay = 'Đã kết thúc các tiết trong ngày • Không còn tiết tiếp theo hôm nay';
    shiftLabel = 'Hết ca dạy hôm nay';
  }

  const matchedClass =
    todayClasses.find(
      cls => activePeriod && cls.periods.includes(activePeriod.period)
    ) || null;

  return {
    dayOfWeek,
    dayLabel,
    dateStr,
    timeStr,
    periodStatus,
    currentPeriod: activePeriod,
    periodDisplay,
    shiftLabel,
    matchedClass
  };
}

export default function TeacherDashboard({ user, onLogout, onSwitchToStudent, theme, setTheme, toggleTheme }) {
  // 2-Tier Workspace Navigation: 'overview' (default) | 'attendance' | 'assignments' | 'gradebook' | 'ai_lesson' | 'announcements'
  const [activeTab, setActiveTab] = useState('overview');

  // Persistent Sub-tab states within each Workspace
  const [classroomSubTab, setClassroomSubTab] = useState('qr_live'); // 'qr_live' | 'cold_call' | 'virtual_class' | 'live_quiz'
  const [practiceSubTab, setPracticeSubTab] = useState('assignments_main'); // 'assignments_main' | 'lab_queue'
  const [academicSubTab, setAcademicSubTab] = useState('gradebook_main'); // 'gradebook_main' | 'approvals' | 'schedule'
  const [leaveView, setLeaveView] = useState('classic'); // 'classic' | 'ai_ocr'
  const [aiSubTab, setAiSubTab] = useState('bloom_builder'); // 'bloom_builder' | 'mindmap' | 'materials'
  const [communitySubTab, setCommunitySubTab] = useState('announcements_main'); // 'announcements_main' | 'live_qa' | 'feedback'

  // Collapsible Left Toolbar & Accordion Group States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedSidebarGroups, setCollapsedSidebarGroups] = useState({});
  const handleToggleSidebarGroup = (groupId) => {
    setCollapsedSidebarGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getCheckinBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return window.location.origin;
      }
      return `http://${lanIp || host || 'localhost'}:5173`;
    }
    return `http://${lanIp || 'localhost'}:5173`;
  };

  // Backward-compatible Smart Router mapping workspace & legacy keys to (activeTab, subTab)
  const navigateTeacherTab = (tabKey) => {
    setIsMobileMenuOpen(false);
    switch (tabKey) {
      case 'overview':
        setActiveTab('overview');
        break;
      case 'attendance':
      case 'qr_live':
        setActiveTab('attendance');
        setClassroomSubTab('qr_live');
        break;
      case 'cold_call':
        setActiveTab('attendance');
        setClassroomSubTab('cold_call');
        break;
      case 'virtual_class':
        setActiveTab('attendance');
        setClassroomSubTab('virtual_class');
        break;
      case 'live_quiz':
        setActiveTab('attendance');
        setClassroomSubTab('live_quiz');
        break;
      case 'assignments':
      case 'assignments_main':
        setActiveTab('assignments');
        setPracticeSubTab('assignments_main');
        break;
      case 'lab_queue':
        setActiveTab('assignments');
        setPracticeSubTab('lab_queue');
        break;
      case 'gradebook':
      case 'gradebook_main':
        setActiveTab('gradebook');
        setAcademicSubTab('gradebook_main');
        break;
      case 'approvals':
        setActiveTab('gradebook');
        setAcademicSubTab('approvals');
        break;
      case 'schedule':
        setActiveTab('gradebook');
        setAcademicSubTab('schedule');
        break;
      case 'ai_lesson':
      case 'bloom_builder':
        setActiveTab('ai_lesson');
        setAiSubTab('bloom_builder');
        break;
      case 'mindmap':
        setActiveTab('ai_lesson');
        setAiSubTab('mindmap');
        break;
      case 'lecture_recap':
        setActiveTab('ai_lesson');
        setAiSubTab('lecture_recap');
        break;
      case 'materials':
        setActiveTab('ai_lesson');
        setAiSubTab('materials');
        break;
      case 'announcements':
      case 'announcements_main':
        setActiveTab('announcements');
        setCommunitySubTab('announcements_main');
        break;
      case 'live_qa':
        setActiveTab('announcements');
        setCommunitySubTab('live_qa');
        break;
      case 'feedback':
        setActiveTab('announcements');
        setCommunitySubTab('feedback');
        break;
      default:
        setActiveTab(tabKey);
        break;
    }
  };

  // Print administrative minutes modal state
  const [printMinutesModalAnnouncement, setPrintMinutesModalAnnouncement] = useState(null);

  // Master Overview & Statistics state
  const [overviewTimeframe, setOverviewTimeframe] = useState('week'); // 'today' | 'week' | 'month' | 'semester'
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  const handleRefreshOverview = () => {
    setIsRefreshingOverview(true);
    setTimeout(() => {
      setIsRefreshingOverview(false);
      triggerToast('Đã làm mới dữ liệu thống kê thời gian thực từ toàn hệ thống!');
    }, 600);
  };

  const handleExportFullReport = () => {
    try {
      const timeframeLabels = {
        today: 'Hôm nay',
        week: 'Tuần này',
        month: '30 ngày',
        semester: 'Học kỳ I'
      };
      const fileName = attendanceExportService.exportExecutiveReportToExcel({
        timeframe: overviewTimeframe,
        timeframeLabel: timeframeLabels[overviewTimeframe] || 'Tuần này',
        teacherName: user?.name || 'ThS. Phạm Văn Thuận',
        currentClass,
        classes: teacherClasses,
        students: mergedCurrentStudents,
        pendingLeaveCount: leaveRequests.filter(r => r.status === 'pending').length
      });
      sound.playSuccess();
      triggerToast(`🎉 Đã xuất Báo Cáo Điều Hành Tổng Hợp thành công: ${fileName}!`);
    } catch (err) {
      console.error('[Export Executive Report Error]', err);
      triggerToast('Lỗi khi tạo và xuất Báo cáo Thống kê!');
    }
  };

  const handleSendAcademicAlert = (subjectName, count) => {
    triggerToast(`Đã gửi thông báo cảnh báo chuyên cần đến ${count} sinh viên môn ${subjectName}!`);
  };

  // =========================================================================
  // AI ANNOUNCEMENTS & OFFICIAL DISPATCH SUMMARIZER STATE
  // =========================================================================
  const [announcements, setAnnouncements] = useState(() => announcementService.getAll());
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('ANN-2026-001');
  const [announcementSubTab, setAnnouncementSubTab] = useState('studio'); // 'studio' | 'monitoring'
  const [rawDispatchInput, setRawDispatchInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState(null);
  const [hasAttachedPoll, setHasAttachedPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState([]);
  const [pollDeadline, setPollDeadline] = useState('');
  const [pollTargetClass, setPollTargetClass] = useState('K26 CNTT - Lớp A');
  const [announcementSubject, setAnnouncementSubject] = useState('Kỹ thuật lập trình (KC213013)');
  const [studentFilterStatus, setStudentFilterStatus] = useState('all'); // 'all' | 'voted' | 'pending'
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [previewDispatchModal, setPreviewDispatchModal] = useState(null);

  // File Upload State (PDF, DOCX, Images)
  const [uploadedDispatchFile, setUploadedDispatchFile] = useState(null);
  const [isDraggingDispatchFile, setIsDraggingDispatchFile] = useState(false);
  const [showRawTextInput, setShowRawTextInput] = useState(false);

  // Auto-sync announcements on tab switch
  useEffect(() => {
    if (activeTab === 'announcements' && communitySubTab === 'announcements_main') {
      const all = announcementService.getAll();
      setAnnouncements(all);
    }
  }, [activeTab, communitySubTab]);

  // Process File for AI Extraction & Draft Generation
  const processFileForAnalysis = async (fileInput, meta = {}) => {
    setIsAiSummarizing(true);
    try {
      let res;
      const actualFile = (fileInput instanceof File || fileInput instanceof Blob) 
        ? fileInput 
        : (fileInput?.file instanceof File || fileInput?.file instanceof Blob ? fileInput.file : null);
      
      const fileName = actualFile?.name || fileInput?.name || meta.fileName || meta.name || 'Cong_van_dinh_kem.pdf';
      const fileUrl = fileInput?.url || meta.pdfUrl || null;

      if (actualFile) {
        setUploadedDispatchFile({
          name: fileName,
          size: actualFile.size ? (actualFile.size / 1024).toFixed(1) + ' KB' : '42.5 KB',
          file: actualFile
        });
        res = await announcementService.analyzeFileDispatch({
          file: actualFile,
          name: fileName
        });
      } else if (fileUrl) {
        setUploadedDispatchFile({
          name: fileName,
          size: '42.8 KB',
          url: fileUrl
        });
        const blob = await fetch(fileUrl).then(r => r.blob()).catch(() => null);
        if (blob) {
          res = await announcementService.analyzeFileDispatch({
            file: blob,
            name: fileName
          });
        } else {
          res = await announcementService.summarizeDispatch(meta.text || rawDispatchInput);
        }
      } else {
        res = await announcementService.summarizeDispatch(meta.text || rawDispatchInput);
      }

      setExtractedSummary({
        ...res,
        sourceFileName: fileName
      });
      if (res.extractedText) {
        setRawDispatchInput(res.extractedText);
      }
      if (res.requires_poll !== undefined) {
        setHasAttachedPoll(res.requires_poll);
      }
      if (res.poll) {
        if (res.poll.question) setPollQuestion(res.poll.question);
        if (res.poll.options && res.poll.options.length > 0) setPollOptions(res.poll.options);
        if (res.poll.deadline_suggested) setPollDeadline(res.poll.deadline_suggested);
      }
      sound.success();
      triggerToast('⚡ AI đã phân tích tập tin và sinh dự thảo! Thầy/Cô vui lòng kiểm tra & chỉnh sửa trước khi gửi.');
    } catch (err) {
      triggerToast('Có lỗi khi phân tích tập tin: ' + err.message, 'error');
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Upload file from input picker
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileForAnalysis(file);
  };

  // Editable Key Points Handlers
  const handleUpdateKeyPoint = (idx, text) => {
    if (!extractedSummary) return;
    const newPoints = [...(extractedSummary.keyPoints || [])];
    newPoints[idx] = text;
    setExtractedSummary({ ...extractedSummary, keyPoints: newPoints });
  };

  const handleAddKeyPoint = () => {
    if (!extractedSummary) return;
    const newPoints = [...(extractedSummary.keyPoints || []), 'Ý chính bổ sung mới...'];
    setExtractedSummary({ ...extractedSummary, keyPoints: newPoints });
  };

  const handleRemoveKeyPoint = (idx) => {
    if (!extractedSummary) return;
    const newPoints = (extractedSummary.keyPoints || []).filter((_, i) => i !== idx);
    setExtractedSummary({ ...extractedSummary, keyPoints: newPoints });
  };

  // Urgency change handler
  const handleChangeUrgency = (urgencyType) => {
    if (!extractedSummary) return;
    let label = 'THÔNG BÁO CHUNG';
    let badgeColor = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
    if (urgencyType === 'urgent' || urgencyType === 'emergency') {
      label = 'HỎA TỐC';
      badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    } else if (urgencyType === 'important') {
      label = 'QUAN TRỌNG';
      badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
    setExtractedSummary({
      ...extractedSummary,
      urgency: urgencyType,
      urgencyLabel: label,
      badgeColor
    });
  };

  // Run AI Summarization on dispatch text (manual trigger)
  const handleRunAiSummarize = async (customText) => {
    const textToAnalyze = customText || rawDispatchInput;
    if (!textToAnalyze || !textToAnalyze.trim()) {
      triggerToast('Vui lòng tải lên tập tin PDF hoặc dán nội dung công văn!', 'error');
      return;
    }
    setIsAiSummarizing(true);
    try {
      const summary = await announcementService.summarizeDispatch(textToAnalyze);
      setExtractedSummary(summary);
      if (summary.requires_poll !== undefined) {
        setHasAttachedPoll(summary.requires_poll);
      }
      if (summary.poll) {
        if (summary.poll.question) setPollQuestion(summary.poll.question);
        if (summary.poll.options && summary.poll.options.length > 0) setPollOptions(summary.poll.options);
        if (summary.poll.deadline_suggested) setPollDeadline(summary.poll.deadline_suggested);
      }
      sound.success();
      triggerToast('⚡ Trợ lý AI đã phân tích công văn & tự động sinh biểu quyết thành công!');
    } catch (err) {
      triggerToast('Có lỗi khi phân tích công văn: ' + err.message, 'error');
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Load sample dispatch template
  const handleSelectSampleDispatch = async (template) => {
    setSelectedTemplateId(template.id);
    setRawDispatchInput(template.text);
    await processFileForAnalysis(null, template);
  };

  // Add poll option
  const handleAddPollOption = () => {
    if (pollOptions.length >= 6) {
      triggerToast('Tối đa 6 phương án bình chọn!', 'error');
      return;
    }
    setPollOptions([...pollOptions, `Phương án mới ${pollOptions.length + 1}`]);
  };

  // Remove poll option
  const handleRemovePollOption = (idx) => {
    if (pollOptions.length <= 2) {
      triggerToast('Cần tối thiểu 2 phương án bình chọn!', 'error');
      return;
    }
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  // Update poll option
  const handleUpdatePollOption = (idx, text) => {
    const updated = [...pollOptions];
    updated[idx] = text;
    setPollOptions(updated);
  };

  // Publish Announcement
  const handlePublishAnnouncement = () => {
    const title = extractedSummary?.title || 'Thông báo mới từ Giảng viên phụ trách';
    const sourceFileName = uploadedDispatchFile?.name || extractedSummary?.sourceFileName || 'Cong_van_dinh_kem.pdf';

    const newAnn = announcementService.createAnnouncement({
      title,
      author: user?.name || 'ThS. Phạm Văn Thuận',
      targetClass: pollTargetClass,
      subject: announcementSubject,
      urgency: extractedSummary?.urgency || 'normal',
      urgencyLabel: extractedSummary?.urgencyLabel || 'THÔNG BÁO',
      badgeColor: extractedSummary?.badgeColor,
      deadline: pollDeadline,
      rawText: rawDispatchInput,
      sourceFileName,
      aiSummary: {
        ...(extractedSummary || {}),
        sourceFileName
      },
      hasPoll: hasAttachedPoll,
      pollQuestion,
      pollOptions: pollOptions.filter(o => o && o.trim())
    });

    const updatedList = announcementService.getAll();
    setAnnouncements(updatedList);
    setSelectedAnnouncementId(newAnn.id);
    sound.success();
    triggerToast(`Đã phê duyệt và ban hành công văn "${title}" đến sinh viên thành công!`);
    setAnnouncementSubTab('monitoring');
  };

  // Export Excel
  const handleExportPollExcel = (ann) => {
    try {
      const fileName = announcementService.exportPollToExcel(ann);
      triggerToast(`Đã xuất báo cáo Excel thành công: ${fileName}!`);
    } catch (err) {
      triggerToast(err.message || 'Lỗi xuất file Excel!', 'error');
    }
  };

  // Send reminder
  const handleSendReminderToPending = (count) => {
    triggerToast(`Đã gửi thông báo nhắc nhở đến ${count} sinh viên chưa tham gia biểu quyết!`);
  };

  // =========================================================================
  // STUDENT FEEDBACKS & ADVISING STATE
  // =========================================================================
  const [feedbacks, setFeedbacks] = useState(() => feedbackService.getAll());
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState('all'); // 'all' | 'pending' | 'resolved'
  const [feedbackFilterCategory, setFeedbackFilterCategory] = useState('all');
  const [feedbackSearchTerm, setFeedbackSearchTerm] = useState('');
  const [teacherReplyDrafts, setTeacherReplyDrafts] = useState({});

  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbacks(feedbackService.getAll());
    };
    window.addEventListener('eg_feedback_updated', handleFeedbackUpdate);
    return () => window.removeEventListener('eg_feedback_updated', handleFeedbackUpdate);
  }, []);

  const handleTeacherSendReply = (feedbackId) => {
    const draft = (teacherReplyDrafts[feedbackId] || '').trim();
    if (!draft) {
      triggerToast('Vui lòng nhập nội dung câu trả lời trước khi gửi!', 'error');
      return;
    }

    feedbackService.replyFeedback(
      feedbackId,
      draft,
      user?.name || 'ThS. Phạm Văn Thuận',
      user?.code || 'GV-089'
    );

    setFeedbacks(feedbackService.getAll());
    setTeacherReplyDrafts(prev => {
      const next = { ...prev };
      delete next[feedbackId];
      return next;
    });

    triggerToast('Đã gửi phản hồi thành công đến giao diện của Sinh viên!');
  };

  const handleAiSuggestReply = (feedback) => {
    const suggestion = feedbackService.suggestAiReply(feedback);
    setTeacherReplyDrafts(prev => ({
      ...prev,
      [feedback.id]: suggestion
    }));
    triggerToast('Trợ lý AI đã soạn bản thảo câu trả lời gợi ý!');
  };

  const handleExportFeedbacksExcel = () => {
    try {
      const fileName = feedbackService.exportFeedbacksToExcel(feedbacks, user?.name);
      triggerToast(`Đã xuất báo cáo Excel thành công: ${fileName}!`);
    } catch (err) {
      triggerToast('Lỗi khi xuất file Excel!', 'error');
    }
  };

  // =========================================================================
  // CLASS TEACHING STATE (CHỈ GIỮ DUY NHẤT 1 LỚP CHÍNH THỨC: CNTT K26)
  // =========================================================================
  const teacherClasses = [
    {
      id: 'CLS-CNTT-K26',
      code: 'CNTT K26',
      subject: 'Ngành Công Nghệ Thông Tin (HK 1 — Đã học xong 5 phân môn)',
      credits: 10,
      className: 'CNTT K26',
      dbClassId: 'K26 CNTT - Lớp A',
      room: '',
      schedule: 'Chưa có lịch giảng dạy được phân công',
      days: [],
      periods: [],
      studentsCount: 88,
      wifiAP: 'EG_SmartCampus_Hall_A2',
      wifiBSSID: '6C:3B:6B:A2:01',
      qrTokenPrefix: 'EG-TOKEN-K26',
      status: 'active',
      statusLabel: '88 SV (Excel)',
      badgeColor: 'emerald',
      attendanceRate: 'Theo Ktra (88 SV)',
      presentCount: 0,
      warningCount: 0,
      absentCount: 0,
      studentsRoster: []
    }
  ];

  // Live clock & University Timetable auto-period detector
  const [nowClock, setNowClock] = useState(() => new Date());
  useEffect(() => {
    const clockTimer = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);
  const timetableNow = React.useMemo(() => detectCurrentTimetable(nowClock, teacherClasses), [nowClock]);

  // Current active class state & Manual QR activation gate
  const [selectedClassId, setSelectedClassId] = useState('CLS-CNTT-K26');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isAttendanceStarted, setIsAttendanceStarted] = useState(false);

  // Dynamic Class Students State per Class ID
  const [classStudents, setClassStudents] = useState({
    'CLS-CNTT-K26': teacherClasses[0].studentsRoster,
  });

  const currentClass = teacherClasses.find(c => c.id === selectedClassId) || teacherClasses[0];

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
    setIsClassDropdownOpen(false);
    setIsAttendanceStarted(false);
    setActiveSession(null);
    setLiveDbRecords([]);
    const cls = teacherClasses.find(c => c.id === classId);
    if (cls) {
      setQrToken(`${cls.qrTokenPrefix}-SECURE-${Math.floor(1000 + Math.random() * 9000)}`);
      triggerToast(`Đã chuyển sang lớp: ${cls.subject} (${cls.className}) — Chế độ chờ Giảng viên bật điểm danh.`);
    }
  };

  // Dynamic QR Code settings & Sliding Token Cache (Default 3 seconds)
  const [qrInterval, setQrInterval] = useState(3); // Options: 3s (anti-proxy), 5s, 10s
  const [countdown, setCountdown] = useState(3);
  const [qrToken, setQrToken] = useState('EG-TOKEN-A2-301-SECURE-9912');
  const [previousToken, setPreviousToken] = useState(null);
  const [morphSeed, setMorphSeed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = (nextState) => {
    const target = typeof nextState === 'boolean' ? nextState : !isFullscreen;
    setIsFullscreen(target);
    if (typeof document !== 'undefined') {
      if (target) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', onFullscreenChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKeyDown);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  }, []);

  // Active Backend Attendance Session & Live Records state
  const [activeSession, setActiveSession] = useState(null);
  const [liveDbRecords, setLiveDbRecords] = useState([]);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [lanIp, setLanIp] = useState('172.20.10.3');

  // Real Browser Geolocation State (Yêu cầu trình duyệt & backend cấp quyền vị trí)
  const [teacherGps, setTeacherGps] = useState({
    status: 'idle', // 'idle' | 'requesting' | 'granted' | 'denied'
    lat: null,
    lng: null,
    accuracy: null,
    error: null
  });

  const requestTeacherLocation = () => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const nextErr = {
          status: 'denied',
          lat: null,
          lng: null,
          accuracy: null,
          error: 'Trình duyệt không hỗ trợ định vị GPS (Geolocation API).'
        };
        setTeacherGps(nextErr);
        triggerToast('⚠️ Trình duyệt không hỗ trợ định vị GPS!');
        resolve(nextErr);
        return;
      }

      setTeacherGps((prev) => ({ ...prev, status: 'requesting', error: null }));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy || 0);
          try {
            await api.attendance.verifyLocation({ lat, lng, accuracy });
          } catch {}
          const granted = { status: 'granted', lat, lng, accuracy, error: null };
          setTeacherGps(granted);
          resolve(granted);
        },
        (err) => {
          const msg =
            err.code === 1
              ? 'Trình duyệt đang chặn quyền Vị trí (Location). Hãy bấm Cho phép (Allow) trên thanh địa chỉ!'
              : 'Không thể lấy tọa độ GPS lúc này. Hãy thử bấm Lấy lại vị trí.';
          const denied = { status: 'denied', lat: null, lng: null, accuracy: null, error: msg };
          setTeacherGps(denied);
          triggerToast(`⚠️ ${msg}`);
          resolve(denied);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    if (activeTab === 'attendance' && teacherGps.status === 'idle') {
      requestTeacherLocation();
    }
  }, [activeTab]);

  // Student Attendance List state
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'valid' | 'excused' | 'pending' | 'absent'
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [teacherReviewNoteInput, setTeacherReviewNoteInput] = useState('');

  // Leave Requests state (Xét duyệt nghỉ học - đồng bộ từ SQLite backend)
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [selectedProof, setSelectedProof] = useState(null);

  // AI Lesson Generator & Word Document Upload States
  const [aiLessonTopic, setAiLessonTopic] = useState('Chương 4: Thuật Toán Đồ Thị & Đường Đi Ngắn Nhất (Dijkstra vs Floyd-Warshall)');
  const [aiBloomLevel, setAiBloomLevel] = useState('Vận dụng cao (Analyzing & Evaluating)');
  const [aiSlideCount, setAiSlideCount] = useState(12);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLessonFile, setAiLessonFile] = useState(null);
  const [aiLessonDocText, setAiLessonDocText] = useState('');
  const [aiLessonSections, setAiLessonSections] = useState([]);
  const [aiLessonUploading, setAiLessonUploading] = useState(false);
  const [isDraggingLessonFile, setIsDraggingLessonFile] = useState(false);
  const lessonFileInputRef = React.useRef(null);

  // Backend AI Engine Status States
  const [aiEngineConfig, setAiEngineConfig] = useState(null);
  const [lastAiEngineUsed, setLastAiEngineUsed] = useState('');

  const SAMPLE_WORD_LESSONS = [
    {
      id: 'word-1',
      btnId: 'btn-sample-word-1',
      name: 'Giao_an_Chuong_4_Dijkstra_Floyd_IT204.docx',
      title: 'Chương 4: Thuật Toán Đồ Thị & Đường Đi Ngắn Nhất (Dijkstra vs Floyd-Warshall)',
      text: [
        'Chương 4: Thuật Toán Đồ Thị & Đường Đi Ngắn Nhất (Dijkstra vs Floyd-Warshall)',
        '1. Mục tiêu bài học & Chuẩn đầu ra (CLO) theo mô hình CDIO',
        '2. Khái niệm đồ thị có trọng số và bài toán Single-Source Shortest Path',
        '3. Thuật toán Dijkstra sử dụng hàng đợi ưu tiên Min-Heap O((V+E) log V)',
        '4. Vì sao Dijkstra không xử lý được cạnh có trọng số âm',
        '5. Thuật toán Floyd-Warshall quy hoạch động tìm đường đi mọi cặp đỉnh O(V^3)',
        '6. So sánh chi phí thời gian, bộ nhớ giữa Dijkstra và Floyd-Warshall',
        '7. Bài tập vận dụng: Tối ưu định tuyến mạng máy tính & hệ thống giao thông'
      ].join('\n')
    },
    {
      id: 'word-2',
      btnId: 'btn-sample-word-2',
      name: 'Giao_an_Chuong_3_Cay_Nhi_Phan_AVL_IT204.docx',
      title: 'Chương 3: Cây Nhị Phân Tìm Kiếm Tự Cân Bằng AVL & Red-Black Tree',
      text: [
        'Chương 3: Cây Nhị Phân Tìm Kiếm Tự Cân Bằng AVL & Red-Black Tree',
        '1. Ôn tập Cây Nhị Phân Tìm Kiếm (BST) và hiện tượng suy biến O(N)',
        '2. Chỉ số cân bằng (Balance Factor) và 4 phép xoay cân bằng LL, RR, LR, RL',
        '3. Cài đặt thao tác chèn & xóa node trên cây AVL bảo toàn chiều cao O(log N)',
        '4. Nguyên lý cây Đỏ-Đen (Red-Black Tree) và ứng dụng trong std::map / TreeMap',
        '5. So sánh hiệu năng tìm kiếm & cập nhật giữa AVL Tree và Red-Black Tree',
        '6. Thực hành mô phỏng quá trình tái cân bằng và kiểm thử bộ dữ liệu lớn'
      ].join('\n')
    },
    {
      id: 'word-3',
      btnId: 'btn-sample-word-3',
      name: 'Giao_an_Chuong_5_Quy_Hoach_Dong_Knapsack.docx',
      title: 'Chương 5: Kỹ Thuật Quy Hoạch Động & Bài Toán Cái Túi (0/1 Knapsack)',
      text: [
        'Chương 5: Kỹ Thuật Quy Hoạch Động & Bài Toán Cái Túi (0/1 Knapsack)',
        '1. Điều kiện áp dụng Quy hoạch động: Cấu trúc con tối ưu & Bài toán con gối nhau',
        '2. So sánh Top-Down (Memoization) và Bottom-Up (Tabulation)',
        '3. Xây dựng công thức truy hồi cho bài toán Cái túi 0/1 Knapsack',
        '4. Tối ưu không gian lưu trữ từ mảng 2 chiều O(N*W) xuống 1 chiều O(W)',
        '5. Truy vết nghiệm tối ưu và biến thể Unbounded Knapsack',
        '6. Bài tập ứng dụng: Lập lịch phân bổ tài nguyên và tối ưu chi phí dự án'
      ].join('\n')
    }
  ];

  // Course Materials Repository States (Kho Học Liệu & Bài Giảng Trực Tuyến - đồng bộ từ SQLite)
  const DEFAULT_COURSE_MATERIALS = [];

  const SAMPLE_COURSE_MATERIAL_FILES = [
    {
      id: 'mat-sample-1',
      btnId: 'btn-sample-material-1',
      fileName: 'Giao_trinh_Quy_Hoach_Dong_IT204.docx',
      fileSizeLabel: '420 KB',
      fileMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      title: 'Chuyên đề Quy hoạch động & Bảng băm nâng cao (IT204)',
      type: 'Giáo Trình',
      accessScope: 'Lớp K26 CNTT',
      license: 'CC BY-NC',
      pagesLabel: '38 trang',
      description: 'Tài liệu bổ trợ chuyên sâu về Top-Down Memoization, Bottom-Up DP, 0/1 Knapsack và xử lý đụng độ Hash Table.',
      text: [
        'Chuyên đề Quy hoạch động & Bảng băm nâng cao (IT204)',
        '1. Cấu trúc con tối ưu & Bài toán con gối nhau',
        '2. Công thức truy hồi cho Knapsack, LIS và LCS',
        '3. Tối ưu không gian O(W) bằng mảng trượt 1 chiều',
        '4. Hàm băm phổ quát & Rehash động khi Load Factor vượt 0.75'
      ].join('\n')
    },
    {
      id: 'mat-sample-2',
      btnId: 'btn-sample-material-2',
      fileName: 'Slide_Bai_Giang_Do_Thi_Dijkstra_Floyd.pptx',
      fileSizeLabel: '3.4 MB',
      fileMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      title: 'Slide Bài giảng Tuần 10: Đường đi ngắn nhất Dijkstra & Floyd-Warshall',
      type: 'Slide Trình Chiếu',
      accessScope: 'Công khai toàn hệ thống',
      license: 'CC BY',
      pagesLabel: '42 slide',
      description: 'Bộ slide giảng đường kèm đồ thị mô phỏng từng bước giảm nhẹ cạnh (Relaxation) và ma trận khoảng cách.',
      text: [
        'Slide Bài giảng Tuần 10: Đường đi ngắn nhất Dijkstra & Floyd-Warshall',
        '1. Bài toán Single-Source Shortest Path và Priority Queue',
        '2. Chứng minh điều kiện cạnh không âm trong Dijkstra',
        '3. Thuật toán Bellman-Ford phát hiện chu trình âm',
        '4. Floyd-Warshall All-Pairs Shortest Path O(V^3)'
      ].join('\n')
    },
    {
      id: 'mat-sample-3',
      btnId: 'btn-sample-material-3',
      fileName: 'De_Thi_Thu_Giua_Ky_CTDL_GT_2026.pdf',
      fileSizeLabel: '780 KB',
      fileMime: 'application/pdf',
      title: 'Đề thi thử Giữa kỳ IT204 & Đáp án chấm chi tiết (2026)',
      type: 'Đề Thi Thử',
      accessScope: 'Khối CNTT',
      license: 'CC BY-NC-ND',
      pagesLabel: '16 trang',
      description: 'Đề thi mẫu gồm 30 câu trắc nghiệm đánh giá Big-O, Cây AVL và 2 bài tự luận cài đặt thuật toán.',
      text: [
        'Đề thi thử Giữa kỳ IT204 & Đáp án chấm chi tiết (2026)',
        '1. Phần A: Trắc nghiệm phân tích độ phức tạp & Cây cân bằng',
        '2. Phần B: Tự luận cài đặt hàng đợi ưu tiên & duyệt đồ thị BFS/DFS',
        '3. Thang điểm chuẩn & Hướng dẫn tránh lỗi tràn ngăn xếp'
      ].join('\n')
    }
  ];

  const [courseMaterials, setCourseMaterials] = useState(DEFAULT_COURSE_MATERIALS);
  const [showUploadMaterialPanel, setShowUploadMaterialPanel] = useState(false);
  const [materialFilterType, setMaterialFilterType] = useState('Tất cả');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [previewCourseMaterial, setPreviewCourseMaterial] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [isDraggingMaterialFile, setIsDraggingMaterialFile] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('Giáo Trình');
  const [newMaterialAccess, setNewMaterialAccess] = useState('Công khai toàn hệ thống');
  const [newMaterialLicense, setNewMaterialLicense] = useState('CC BY-NC');
  const [newMaterialPages, setNewMaterialPages] = useState('');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newMaterialFile, setNewMaterialFile] = useState(null);
  const [newMaterialFileBase64, setNewMaterialFileBase64] = useState('');
  const [newMaterialFileText, setNewMaterialFileText] = useState('');
  const materialFileInputRef = React.useRef(null);
  const uploadedMaterialBlobsRef = React.useRef(new Map());

  // Toast feedback
  const [toast, setToast] = useState(null);
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load persisted Course Materials Repository from SQLite
  useEffect(() => {
    let isMounted = true;
    api.aiMindmaps.getMaterials('all').then(res => {
      if (isMounted && res?.success && Array.isArray(res.materials)) {
        setCourseMaterials(res.materials);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Load backend AI Engine status from SQLite
  useEffect(() => {
    let isMounted = true;
    api.aiMindmaps?.getEngineConfig?.().then(res => {
      if (isMounted && res?.success && res.config) {
        setAiEngineConfig(res.config);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // 1. Fetch class roster & LAN IP on class switch; keep QR attendance off until teacher starts it manually
  useEffect(() => {
    let isMounted = true;
    const queryClassId = currentClass.dbClassId || currentClass.className;

    api.attendance.getClassRoster(queryClassId).then(res => {
      if (res.success && res.students && isMounted) {
        setRosterStudents(res.students);
      }
    }).catch(() => {});

    api.attendance.getNetworkInfo().then(res => {
      if (res.success && res.lanIp && isMounted) {
        setLanIp(res.lanIp);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [selectedClassId, currentClass.className, currentClass.dbClassId]);

  const activeTabRef = React.useRef(activeTab);
  activeTabRef.current = activeTab;

  const classroomSubTabRef = React.useRef(classroomSubTab);
  classroomSubTabRef.current = classroomSubTab;

  const isAttendanceStartedRef = React.useRef(isAttendanceStarted);
  isAttendanceStartedRef.current = isAttendanceStarted;

  const currentClassNameRef = React.useRef(currentClass.dbClassId || currentClass.className);
  currentClassNameRef.current = currentClass.dbClassId || currentClass.className;

  // 2. Real-time Live Polling (every 1500ms) only after teacher manually starts attendance
  useEffect(() => {
    let prevRecordCount = -1;
    let lastSessionSig = '';

    const pollTimer = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!isAttendanceStartedRef.current) return;
      const tab = activeTabRef.current;
      // Only poll live attendance when teacher is on overview or live QR / cold-call attendance sub-tabs
      if (tab !== 'overview' && !(tab === 'attendance' && (classroomSubTabRef.current === 'qr_live' || classroomSubTabRef.current === 'cold_call'))) return;

      try {
        const res = await api.attendance.getActiveSession(currentClassNameRef.current);
        if (res.session && res.session.status === 'active') {
          const records = res.session.records || [];
          const sig = `${res.session.id}:${res.session.status}:${res.session.current_token}:${records.length}:${records[0]?.id || 0}`;

          if (sig !== lastSessionSig) {
            lastSessionSig = sig;
            setActiveSession(res.session);
            setLiveDbRecords(records);
          }

          // If a new record was added, notify teacher with sound and toast
          if (prevRecordCount !== -1 && records.length > prevRecordCount) {
            const newlyChecked = records[0];
            triggerToast(`🎉 [Quét thành công] ${newlyChecked.student_name} (${newlyChecked.student_code}) vừa điểm danh!`);
          }
          prevRecordCount = records.length;
        }
      } catch (e) {}
    }, 1500);

    return () => clearInterval(pollTimer);
  }, []);

  const activeSessionRef = React.useRef(activeSession);
  activeSessionRef.current = activeSession;

  const qrTokenRef = React.useRef(qrToken);
  qrTokenRef.current = qrToken;

  const qrIntervalRef = React.useRef(qrInterval);
  qrIntervalRef.current = qrInterval;

  const selectedClassIdRef = React.useRef(selectedClassId);
  selectedClassIdRef.current = selectedClassId;

  // 3. Dynamic QR Code Timer Effect with Sliding Token Cache (Runs only when teacher manually started attendance)
  useEffect(() => {
    setCountdown(qrInterval);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!isAttendanceStartedRef.current) return;
      if (activeSessionRef.current?.status === 'closed') return;
      if (activeTabRef.current !== 'attendance' || classroomSubTabRef.current !== 'qr_live') return;

      setCountdown((prev) => {
        if (prev <= 1) {
          const currentInterval = qrIntervalRef.current || 3;
          const currentToken = qrTokenRef.current;
          const currentSession = activeSessionRef.current;
          const currentClassId = selectedClassIdRef.current;

          const prefix = teacherClasses.find(c => c.id === currentClassId)?.qrTokenPrefix || 'EG-TOKEN-A2-301';
          const nextToken = `${prefix}-SECURE-${Math.floor(1000 + Math.random() * 9000)}`;

          setPreviousToken(currentToken);
          setQrToken(nextToken);
          setMorphSeed(s => (s + 1) % 4);

          // Sync with backend active session if available
          if (currentSession && currentSession.id) {
            api.attendance.rotateToken(currentSession.id, nextToken).catch(() => {});
          }

          return currentInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedClassId, qrInterval, isAttendanceStarted]);

  // Handle single student approval in QR attendance for current class
  const handleApproveStudent = (id, newStatus) => {
    setClassStudents(prev => {
      const list = prev[selectedClassId] || [];
      const exists = list.some(s => s.id === id);
      const nextList = exists
        ? list.map(s => (s.id === id ? { ...s, status: newStatus } : s))
        : [...list, { id, status: newStatus }];
      return {
        ...prev,
        [selectedClassId]: nextList
      };
    });
    triggerToast(newStatus === 'valid' ? 'Đã duyệt điểm danh hợp lệ cho sinh viên!' : 'Đã xác nhận đánh vắng sinh viên!');
  };

  // Reset all attendance sessions and scan records in SQLite
  const handleResetSessionAttendance = async () => {
    try {
      const res = await api.attendance.resetAll();
      setActiveSession(null);
      setLiveDbRecords([]);
      setIsAttendanceStarted(false);
      setPreviousToken(null);
      setRosterStudents(prev => prev.map(s => ({ ...s, absences: 0 })));
      setClassStudents({ 'CLS-CNTT-K26': [] });
      sound.playSuccess();
      triggerToast(res?.message || 'Đã reset sạch toàn bộ dữ liệu phiên, lượt điểm danh & số buổi vắng (0 SV vắng)!');
    } catch (e) {
      setActiveSession(null);
      setLiveDbRecords([]);
      setIsAttendanceStarted(false);
      setPreviousToken(null);
      setRosterStudents(prev => prev.map(s => ({ ...s, absences: 0 })));
      setClassStudents({ 'CLS-CNTT-K26': [] });
      triggerToast('Đã làm mới sạch danh sách điểm danh!');
    }
  };

  // Trigger real check-in for a specific student in class roster
  const handleCheckInSpecificStudent = async (studentCode) => {
    try {
      const res = await api.attendance.simulateStudentCheckin(studentCode);
      if (res.success) {
        sound.playSuccess();
        triggerToast(`🎉 [Ghi nhận điểm danh] ${res.student.name} (${res.student.code})!`);
        // Refresh active session from backend for selected class
        const sessRes = await api.attendance.getActiveSession(currentClass.dbClassId || currentClass.className);
        if (sessRes.session) {
          setActiveSession(sessRes.session);
          setLiveDbRecords(sessRes.session.records || []);
        }
      }
    } catch (e) {
      triggerToast('Lỗi ghi nhận điểm danh sinh viên!');
    }
  };

  // Attendance Finalization (Khóa sổ) and Excel Export States
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Export full attendance sheet to Microsoft Excel (.xlsx)
  const handleExportAttendanceExcel = () => {
    try {
      const fileName = attendanceExportService.exportAttendanceToExcel({
        session: activeSession,
        students: mergedCurrentStudents,
        className: currentClass.className,
        subjectName: currentClass.subject,
        teacherName: user?.name || 'ThS. Phạm Văn Thuận',
        room: currentClass.room
      });
      sound.playSuccess();
      triggerToast(`🎉 Đã xuất thành công tệp Excel: ${fileName}!`);
    } catch (err) {
      console.error('[Export Excel Error]', err);
      triggerToast('Lỗi khi tạo và xuất file Excel!');
    }
  };

  // Manual start attendance session by teacher (requires real browser GPS position)
  const handleStartAttendanceSession = async () => {
    try {
      let coords = teacherGps;
      if (coords.lat == null || coords.lng == null) {
        coords = await requestTeacherLocation();
      }
      if (coords.lat == null || coords.lng == null) {
        triggerToast('⚠️ Máy chủ yêu cầu cho phép lấy Vị trí (GPS) trên trình duyệt trước khi mở điểm danh!');
        return;
      }

      const createRes = await api.attendance.createSession({
        subject_name: currentClass.subject,
        class_id: currentClass.dbClassId || currentClass.className,
        room: '',
        lat: coords.lat,
        lng: coords.lng,
        radius_meters: 50,
        wifi_ssid: '',
        token_interval: qrInterval
      });
      if (createRes?.success === false) {
        triggerToast(`⚠️ ${createRes.message || 'Cần cấp quyền Vị trí (GPS) để mở ca điểm danh!'}`);
        return;
      }
      if (createRes?.session) {
        setActiveSession(createRes.session);
        setQrToken(createRes.session.current_token);
        setPreviousToken(null);
        setLiveDbRecords(createRes.session.records || []);
        setCountdown(qrInterval);
        setIsAttendanceStarted(true);
        sound.playSuccess();
        triggerToast(`✅ Đã bật điểm danh QR (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°) cho lớp ${currentClass.className}!`);
      }
    } catch (err) {
      console.warn('[Start Attendance Error]', err);
      triggerToast('Không thể bật phiên điểm danh lúc này. Hãy kiểm tra quyền GPS trên trình duyệt!');
    }
  };

  // Manual pause attendance session (returns QR to standby without losing session state)
  const handlePauseAttendanceSession = async () => {
    try {
      if (activeSession && activeSession.id) {
        const res = await api.attendance.pauseSession(activeSession.id);
        if (res?.session) {
          setActiveSession(res.session);
        }
      }
      setIsAttendanceStarted(false);
      triggerToast(`⏸️ Đã tạm dừng phát QR điểm danh lớp ${currentClass.className}.`);
    } catch (e) {
      setIsAttendanceStarted(false);
      triggerToast(`⏸️ Đã tạm dừng phát QR điểm danh lớp ${currentClass.className}.`);
    }
  };

  // Close and lock session
  const handleConfirmCloseSession = async () => {
    if (!activeSession || !activeSession.id) return;
    setIsClosingSession(true);
    try {
      const res = await api.attendance.closeSession(activeSession.id);
      if (res.success) {
        sound.playSuccess();
        triggerToast(res.message);
        setActiveSession(res.session);
        setLiveDbRecords(res.session.records || []);
        setIsAttendanceStarted(false);
        setShowCloseSessionModal(false);
      }
    } catch (e) {
      triggerToast('Lỗi khi khóa ca điểm danh!');
    } finally {
      setIsClosingSession(false);
    }
  };

  // Reopen locked session
  const handleReopenSession = async () => {
    if (!activeSession || !activeSession.id) return;
    try {
      const res = await api.attendance.reopenSession(activeSession.id);
      if (res.success) {
        sound.playSuccess();
        triggerToast(res.message);
        setActiveSession(res.session);
        setIsAttendanceStarted(true);
      }
    } catch (e) {
      triggerToast('Lỗi khi mở lại ca điểm danh!');
    }
  };

  // Synchronize leave requests and attendance session from real backend database
  useEffect(() => {
    api.leaveRequests.getAll().then(res => {
      if (res.success && Array.isArray(res.requests)) {
        setLeaveRequests(res.requests.map(r => ({
          id: r.id,
          requestCode: r.request_code,
          studentName: r.student_name,
          studentId: r.student_code,
          classId: r.class_id,
          date: r.leave_date,
          period: `${r.sessions_count || 1} buổi`,
          reason: r.reason,
          proofName: r.proof_file_name || 'Minh_chung_dinh_kem.pdf',
          proofImage: r.proof_url || '',
          status: r.status,
          reviewNote: r.review_note
        })));
      }
    }).catch(() => {});
  }, []);

  // Handle leave request decision with 2-way attendance synchronization
  const handleLeaveDecision = async (requestId, newStatus, reviewNote = '') => {
    try {
      const res = await api.leaveRequests.review(requestId, { status: newStatus, reviewNote });
      if (res.success) {
        setLeaveRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus, reviewNote: reviewNote || r.reviewNote } : r));
        sound.playSuccess();
        triggerToast(newStatus === 'approved' ? '✓ Đã phê duyệt đơn nghỉ học có phép và đồng bộ vào sổ điểm danh!' : '✕ Đã từ chối đơn nghỉ học (tính vắng không phép)!');
        
        // Refresh active attendance session from backend to reflect excused record
        const sessRes = await api.attendance.getActiveSession();
        if (sessRes.session) {
          setActiveSession(sessRes.session);
          setLiveDbRecords(sessRes.session.records || []);
        }
      }
    } catch (err) {
      console.error('[Leave Review Error]', err);
      triggerToast('Lỗi khi phê duyệt đơn nghỉ học!');
    }
  };

  // Client-side fallback parser & Bloom lesson builder (in case backend is unavailable)
  const buildLocalBloomFallback = ({ topic, extractedText, bloomLevel, slideCount = 12, fileName = '' }) => {
    const cleanText = String(extractedText || '').trim();
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length >= 4);
    const detectedTitle = String(topic || '').trim() || lines[0] || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Bài giảng chuẩn Bloom');
    const sections = lines.filter(l => l !== detectedTitle).slice(0, 10);
    const fallbackSections = sections.length > 0 ? sections : [
      `Mục tiêu bài học & Chuẩn đầu ra (${detectedTitle})`,
      'Khái niệm cốt lõi và nền tảng lý thuyết',
      'Phân tích cơ chế & ví dụ minh họa',
      `Bài tập thực hành mức ${bloomLevel}`
    ];
    const targetSlides = Number(slideCount) || 12;
    const slides = [
      `Slide 1 [Phần 1 - Khởi động]: Giới thiệu "${detectedTitle}" & Mục tiêu Chuẩn đầu ra (${bloomLevel})`,
      `Slide 2 [Phần 1 - Ngữ cảnh]: Tổng quan nội dung giáo án${fileName ? ` từ tệp ${fileName}` : ''}`
    ];
    for (let i = 0; i < Math.max(1, targetSlides - 5); i++) {
      slides.push(`Slide ${i + 3} [Phần 2 - Phân tích]: ${fallbackSections[i % fallbackSections.length]}`);
    }
    slides.push(`Slide ${targetSlides - 2} [Phần 3 - Vận dụng]: Tình huống thực tế mức ${bloomLevel}`);
    slides.push(`Slide ${targetSlides - 1} [Phần 3 - Tổng kết]: Hệ thống hóa kiến thức "${detectedTitle}"`);
    slides.push(`Slide ${targetSlides} [Phần 3 - Đánh giá]: Câu hỏi củng cố & Nhiệm vụ tự học`);

    const s1 = fallbackSections[0] || detectedTitle;
    const quizzes = [
      {
        q: `Câu 1 (Nhận biết): Mục tiêu chính được đề cập trong "${s1}" là gì?`,
        options: [
          `A. Nắm vững bản chất và nguyên lý áp dụng của ${detectedTitle}`,
          'B. Bỏ qua cơ sở lý thuyết để viết mã trực tiếp',
          'C. Không cần phân tích điều kiện đầu vào',
          'D. Chỉ học thuộc tên thuật toán'
        ],
        ans: 'A',
        explain: `Được trích xuất trực tiếp từ nội dung giáo án "${detectedTitle}".`
      },
      {
        q: `Câu 2 (${bloomLevel}): Khi triển khai "${detectedTitle}" với dữ liệu quy mô lớn, cần chú trọng điều gì?`,
        options: [
          'A. Kiểm tra độ phức tạp thời gian, bộ nhớ và các trường hợp biên',
          'B. Chạy ngẫu nhiên không cần kiểm thử',
          'C. Giảm kích thước màn hình trình chiếu',
          'D. Bỏ qua bước đánh giá kết quả'
        ],
        ans: 'A',
        explain: `Phân tích hiệu năng và trường hợp biên là trọng tâm ở cấp độ ${bloomLevel}.`
      }
    ];
    return {
      detectedTitle,
      sections: fallbackSections,
      wordCount: cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0,
      lesson: { title: detectedTitle, bloomLevel, slideCount: targetSlides, sourceFileName: fileName || null, slides, quizzes }
    };
  };

  // Upload & extract Word (.docx / .doc) / PDF / TXT lesson plan file
  const handleUploadLessonWordFile = async (fileOrSample) => {
    if (!fileOrSample) return;
    setAiLessonUploading(true);
    try {
      const isRealFile = typeof File !== 'undefined' && (fileOrSample instanceof File || fileOrSample instanceof Blob);
      const fileName = fileOrSample.name || 'Giao_an_Bai_Giang.docx';
      const fileSizeText = fileOrSample.size
        ? (fileOrSample.size >= 1024 ? `${(fileOrSample.size / 1024).toFixed(1)} KB` : `${fileOrSample.size} B`)
        : '18.4 KB';

      let res;
      if (isRealFile) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || '');
            const commaIdx = raw.indexOf(',');
            resolve(commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileOrSample);
        });

        try {
          res = await api.aiMindmaps.parseLessonDoc({
            file_name: fileName,
            file_base64: base64,
            topic: '',
            bloom_level: aiBloomLevel,
            slide_count: aiSlideCount
          });
        } catch (apiErr) {
          const rawText = await fileOrSample.text().catch(() => '');
          res = {
            success: true,
            fileName,
            extractedText: rawText || `Nội dung giáo án từ tệp ${fileName}\n1. Mục tiêu bài học\n2. Nội dung trọng tâm\n3. Bài tập thực hành`,
            ...buildLocalBloomFallback({ topic: '', extractedText: rawText, bloomLevel: aiBloomLevel, slideCount: aiSlideCount, fileName })
          };
        }
      } else {
        const sampleText = String(fileOrSample.text || '');
        try {
          res = await api.aiMindmaps.parseLessonDoc({
            file_name: fileName,
            file_text: sampleText,
            topic: fileOrSample.title || '',
            bloom_level: aiBloomLevel,
            slide_count: aiSlideCount
          });
        } catch (apiErr) {
          res = {
            success: true,
            fileName,
            extractedText: sampleText,
            ...buildLocalBloomFallback({ topic: fileOrSample.title || '', extractedText: sampleText, bloomLevel: aiBloomLevel, slideCount: aiSlideCount, fileName })
          };
        }
      }

      if (res?.success) {
        const extracted = res.extractedText || '';
        const sections = res.sections || [];
        const wc = res.wordCount || (extracted ? extracted.split(/\s+/).filter(Boolean).length : 0);
        const engineUsed = res.aiEngine || res.lesson?.aiEngine || '';
        if (engineUsed) {
          setLastAiEngineUsed(engineUsed);
        }
        setAiLessonDocText(extracted);
        setAiLessonSections(sections);
        setAiLessonFile({
          name: res.fileName || fileName,
          size: fileSizeText,
          wordCount: wc,
          sectionsCount: sections.length,
          uploadedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
        if (res.detectedTitle) {
          setAiLessonTopic(res.detectedTitle);
        }
        sound.playSuccess();
        triggerToast(
          `📄 Đã tải & trích xuất giáo án Word: ${res.fileName || fileName} (${wc} từ)${engineUsed ? ` • AI: ${engineUsed}` : ''}!`
        );
      }
    } catch (err) {
      console.error('[Lesson Word Upload Error]', err);
      triggerToast('Không thể đọc tệp giáo án Word. Vui lòng kiểm tra định dạng .docx/.doc!');
    } finally {
      setAiLessonUploading(false);
    }
  };

  const handleRemoveLessonWordFile = () => {
    setAiLessonFile(null);
    setAiLessonDocText('');
    setAiLessonSections([]);
    if (lessonFileInputRef.current) lessonFileInputRef.current.value = '';
    triggerToast('Đã gỡ file Word giáo án đính kèm.');
  };

  const handleDownloadSampleWordTemplate = () => {
    const sample = SAMPLE_WORD_LESSONS[0];
    const fileName = 'Giao_an_Mau_EG_Education.doc';
    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sample.title}</title></head><body><h1>${sample.title}</h1><p><strong>Học phần:</strong> Cấu trúc dữ liệu & Giải thuật (IT204)</p><ul>${sample.text.split('\n').slice(1).map(line => `<li>${line}</li>`).join('')}</ul></body></html>`;
    const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    sound.playSuccess();
    triggerToast(`Đã tải về tệp Word mẫu: ${fileName}`);
  };

  const handleCopyBloomLesson = () => {
    if (!aiGeneratedResult) return;
    const text = [
      `CHỦ ĐỀ: ${aiGeneratedResult.title} (${aiGeneratedResult.bloomLevel})`,
      aiGeneratedResult.sourceFileName ? `NGUỒN FILE WORD: ${aiGeneratedResult.sourceFileName}` : '',
      '',
      '=== DÀN Ý 12 SLIDE ===',
      ...(aiGeneratedResult.slides || []),
      '',
      '=== NGÂN HÀNG CÂU HỎI BLOOM ===',
      ...(aiGeneratedResult.quizzes || []).map(q => `${q.q}\n${(q.options || []).join('\n')}\n-> Đáp án: ${q.ans} (${q.explain})`)
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    sound.playSuccess();
    triggerToast('Đã sao chép toàn bộ 12 slide & câu hỏi Bloom vào Clipboard!');
  };

  const handleDownloadBloomSlides = () => {
    if (!aiGeneratedResult) return;
    try {
      const fileName = exportBloomLessonToPptx(aiGeneratedResult);
      sound.playSuccess();
      triggerToast(`Đã tải xuống tệp PowerPoint: ${fileName}!`);
    } catch (error) {
      sound.playWarning();
      triggerToast(error?.message || 'Không thể xuất file PowerPoint (.pptx). Vui lòng thử lại.');
    }
  };

  const handleExportBloomDocx = () => {
    if (!aiGeneratedResult) return;
    const fileName = `Giao_An_Bloom_${new Date().toISOString().slice(0, 10)}.doc`;
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${aiGeneratedResult.title}</title></head><body style="font-family: 'Times New Roman', serif; line-height: 1.5;">
      <h1 style="text-align:center;">GIÁO ÁN & NGÂN HÀNG CÂU HỎI CHUẨN BLOOM</h1>
      <p><strong>Chủ đề:</strong> ${aiGeneratedResult.title}</p>
      <p><strong>Cấp độ Bloom:</strong> ${aiGeneratedResult.bloomLevel}</p>
      ${aiGeneratedResult.sourceFileName ? `<p><strong>Tài liệu Word gốc:</strong> ${aiGeneratedResult.sourceFileName}</p>` : ''}
      <h2>I. Dàn ý 12 Slide trình chiếu</h2>
      <ol>${(aiGeneratedResult.slides || []).map(s => `<li>${s}</li>`).join('')}</ol>
      <h2>II. Bộ câu hỏi trắc nghiệm đánh giá chuẩn Bloom</h2>
      ${(aiGeneratedResult.quizzes || []).map(q => `<div style="margin-bottom:12px;"><p><strong>${q.q}</strong></p><ul>${(q.options || []).map(o => `<li>${o}</li>`).join('')}</ul><p><em>Đáp án đúng: ${q.ans} — ${q.explain}</em></p></div>`).join('')}
    </body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    sound.playSuccess();
    triggerToast(`🎉 Đã xuất file Word đề thi & giáo án: ${fileName}!`);
  };

  // Handle AI Lesson Generation (reads uploaded Word content if attached)
  const handleGenerateAiLesson = async () => {
    setAiGenerating(true);
    try {
      let lessonResult = null;
      let engineUsed = '';
      try {
        const res = await api.aiMindmaps.parseLessonDoc({
          file_name: aiLessonFile?.name || '',
          file_text: aiLessonDocText || '',
          topic: aiLessonTopic,
          bloom_level: aiBloomLevel,
          slide_count: aiSlideCount
        });
        if (res?.success && res.lesson) {
          engineUsed = res.aiEngine || res.lesson?.aiEngine || '';
          lessonResult = engineUsed ? { ...res.lesson, aiEngine: engineUsed } : res.lesson;
        }
      } catch (err) {
        console.warn('[Generate AI Lesson Fallback]', err.message);
      }

      if (!lessonResult) {
        lessonResult = buildLocalBloomFallback({
          topic: aiLessonTopic,
          extractedText: aiLessonDocText,
          bloomLevel: aiBloomLevel,
          slideCount: aiSlideCount,
          fileName: aiLessonFile?.name || ''
        }).lesson;
      }

      if (engineUsed) {
        setLastAiEngineUsed(engineUsed);
      }

      setAiGeneratedResult(lessonResult);
      sound.playSuccess();
      const engineSuffix = engineUsed ? ` • AI: ${engineUsed}` : '';
      triggerToast(
        aiLessonFile
          ? `🎉 Đã sinh 12 slide & bộ câu hỏi Bloom trực tiếp từ file Word "${aiLessonFile.name}"${engineSuffix}!`
          : `Đã sinh thành công bài giảng & bộ câu hỏi chuẩn Bloom${engineSuffix}!`
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // Course Materials Repository Handlers
  const formatFileSizeLabel = (bytes = 0) => {
    if (!bytes) return '128 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleSelectMaterialFile = async (fileOrSample) => {
    if (!fileOrSample) return;
    const isRealFile = typeof File !== 'undefined' && (fileOrSample instanceof File || fileOrSample instanceof Blob);

    if (isRealFile) {
      const fileName = fileOrSample.name || 'Tai_lieu_hoc_phan.pdf';
      const lowerName = fileName.toLowerCase();
      const sizeLabel = formatFileSizeLabel(fileOrSample.size);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || '');
          const idx = raw.indexOf(',');
          resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileOrSample);
      }).catch(() => '');

      let plainText = '';
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        plainText = await fileOrSample.text().catch(() => '');
      }

      setNewMaterialFile({
        name: fileName,
        sizeLabel,
        mime: fileOrSample.type || 'application/octet-stream',
        rawFile: fileOrSample
      });
      setNewMaterialFileBase64(base64);
      setNewMaterialFileText(plainText);

      if (!newMaterialTitle.trim()) {
        setNewMaterialTitle(fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim());
      }
      if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
        setNewMaterialType('Slide Trình Chiếu');
      } else if (lowerName.includes('de_thi') || lowerName.includes('quiz') || lowerName.includes('trac_nghiem')) {
        setNewMaterialType('Đề Thi Thử');
      } else if (lowerName.includes('de_cuong') || lowerName.includes('rubric')) {
        setNewMaterialType('Đề Cương');
      }
      if (!newMaterialPages.trim()) {
        setNewMaterialPages(lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx') ? '36 slide' : '24 trang');
      }
      triggerToast(`📎 Đã đính kèm tệp "${fileName}" (${sizeLabel}). Bấm Đăng Tải để lưu vào Kho Học Liệu!`);
      return;
    }

    // Quick sample file template
    setNewMaterialFile({
      name: fileOrSample.fileName,
      sizeLabel: fileOrSample.fileSizeLabel,
      mime: fileOrSample.fileMime,
      rawFile: null
    });
    setNewMaterialFileBase64('');
    setNewMaterialFileText(fileOrSample.text || '');
    setNewMaterialTitle(fileOrSample.title || '');
    setNewMaterialType(fileOrSample.type || 'Giáo Trình');
    setNewMaterialAccess(fileOrSample.accessScope || 'Công khai toàn hệ thống');
    setNewMaterialLicense(fileOrSample.license || 'CC BY-NC');
    setNewMaterialPages(fileOrSample.pagesLabel || '');
    setNewMaterialDesc(fileOrSample.description || '');
    triggerToast(`📄 Đã nạp học liệu mẫu "${fileOrSample.fileName}". Kiểm tra thông tin & bấm Đăng Tải!`);
  };

  const handleResetUploadMaterialForm = () => {
    setNewMaterialTitle('');
    setNewMaterialType('Giáo Trình');
    setNewMaterialAccess('Công khai toàn hệ thống');
    setNewMaterialLicense('CC BY-NC');
    setNewMaterialPages('');
    setNewMaterialDesc('');
    setNewMaterialFile(null);
    setNewMaterialFileBase64('');
    setNewMaterialFileText('');
    if (materialFileInputRef.current) materialFileInputRef.current.value = '';
  };

  const handleSubmitUploadMaterial = async (e) => {
    e?.preventDefault?.();
    if (!newMaterialTitle.trim() && !newMaterialFile && !newMaterialFileText.trim()) {
      triggerToast('Vui lòng chọn tệp từ máy (hoặc nạp học liệu mẫu) và nhập tiêu đề!');
      return;
    }

    setUploadingMaterial(true);
    try {
      const payload = {
        title: newMaterialTitle.trim(),
        type: newMaterialType,
        accessScope: newMaterialAccess,
        license: newMaterialLicense,
        pagesLabel: newMaterialPages.trim(),
        description: newMaterialDesc.trim(),
        fileName: newMaterialFile?.name || '',
        fileSizeLabel: newMaterialFile?.sizeLabel || '',
        fileMime: newMaterialFile?.mime || '',
        fileBase64: newMaterialFileBase64 || '',
        fileText: newMaterialFileText || '',
        classId: currentClass.className,
        faculty: 'it',
        uploadedBy: user?.name || 'ThS. Phạm Văn Thuận'
      };

      const res = await api.aiMindmaps.uploadMaterial(payload);
      if (res?.success && res.material) {
        if (newMaterialFile?.rawFile) {
          uploadedMaterialBlobsRef.current.set(res.material.id, newMaterialFile.rawFile);
        }
        if (Array.isArray(res.materials)) {
          setCourseMaterials(res.materials);
        } else {
          setCourseMaterials(prev => [res.material, ...prev]);
        }
        handleResetUploadMaterialForm();
        setShowUploadMaterialPanel(false);
        sound.playSuccess();
        triggerToast(res.message || `🎉 Đã đăng tải học liệu "${res.material.title}" lên Kho Học Liệu!`);
      }
    } catch (err) {
      console.warn('[Upload Course Material Fallback]', err);
      const localTitle = newMaterialTitle.trim() || newMaterialFile?.name?.replace(/\.[^/.]+$/, '') || 'Tài liệu mới';
      const localItem = {
        id: `MAT-LOCAL-${Date.now()}`,
        materialCode: `MAT-LOCAL-${Date.now()}`,
        title: localTitle,
        type: newMaterialType,
        categoryKey: newMaterialType.includes('Slide') ? 'slide' : newMaterialType.includes('Đề Thi') ? 'quiz' : newMaterialType.includes('Đề Cương') ? 'exam' : 'book',
        access: newMaterialAccess,
        accessScope: newMaterialAccess,
        license: newMaterialLicense,
        pages: newMaterialPages.trim() || (newMaterialType.includes('Slide') ? '30 slide' : '20 trang'),
        downloadsCount: 0,
        downloads: '0 lượt tải',
        fileName: newMaterialFile?.name || `${localTitle}.pdf`,
        fileSizeLabel: newMaterialFile?.sizeLabel || '256 KB',
        description: newMaterialDesc.trim() || `Học liệu "${localTitle}" được tải lên bởi ${user?.name || 'ThS. Phạm Văn Thuận'}.`,
        tableOfContents: (newMaterialFileText || '').split('\n').map(l => l.trim()).filter(l => l.length >= 4).slice(0, 5),
        extractedPreview: newMaterialFileText || newMaterialDesc.trim(),
        uploadedBy: user?.name || 'ThS. Phạm Văn Thuận'
      };
      if (newMaterialFile?.rawFile) {
        uploadedMaterialBlobsRef.current.set(localItem.id, newMaterialFile.rawFile);
      }
      setCourseMaterials(prev => [localItem, ...prev]);
      handleResetUploadMaterialForm();
      setShowUploadMaterialPanel(false);
      sound.playSuccess();
      triggerToast(`✅ Đã đăng học liệu "${localTitle}" vào danh sách!`);
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDownloadCourseMaterial = async (item) => {
    if (!item) return;
    try {
      const res = await api.aiMindmaps.downloadMaterial(item.id);
      if (res?.success && Array.isArray(res.materials)) {
        setCourseMaterials(res.materials);
      }
    } catch {
      setCourseMaterials(prev => prev.map(m => {
        if (m.id !== item.id) return m;
        const nextCount = Number(m.downloadsCount || 0) + 1;
        return { ...m, downloadsCount: nextCount, downloads: `${nextCount.toLocaleString('en-US')} lượt tải` };
      }));
    }

    const storedBlob = uploadedMaterialBlobsRef.current.get(item.id);
    const dlFileName = item.fileName || `${item.title.replace(/[^a-zA-Z0-9À-ỹ]+/g, '_').slice(0, 40)}.doc`;
    const blob = storedBlob || new Blob(
      [
        `EG EDUCATION PLATFORM — KHO HỌC LIỆU MỞ (${item.license || 'CC BY-NC'})\n` +
        `====================================================================\n` +
        `Tiêu đề: ${item.title}\n` +
        `Phân loại: ${item.type} (${item.pages})\n` +
        `Phạm vi truy cập: ${item.access}\n` +
        `Giảng viên biên soạn: ${item.uploadedBy || 'ThS. Phạm Văn Thuận'}\n\n` +
        `MÔ TẢ HỌC LIỆU:\n${item.description || ''}\n\n` +
        `MỤC LỤC / CẤU TRÚC NỘI DUNG:\n${(item.tableOfContents || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n` +
        (item.extractedPreview ? `NỘI DUNG TRÍCH XUẤT:\n${item.extractedPreview}\n` : '')
      ],
      { type: 'text/plain;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = storedBlob ? dlFileName : (dlFileName.endsWith('.txt') ? dlFileName : `${dlFileName.replace(/\.[^/.]+$/, '')}_tom_tat.txt`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    sound.playSuccess();
    triggerToast(`⬇️ Đang tải xuống "${item.title}"!`);
  };

  const handleDeleteCourseMaterial = async (item) => {
    if (!item) return;
    try {
      const res = await api.aiMindmaps.deleteMaterial(item.id);
      if (res?.success && Array.isArray(res.materials)) {
        setCourseMaterials(res.materials);
      } else {
        setCourseMaterials(prev => prev.filter(m => m.id !== item.id));
      }
      if (previewCourseMaterial?.id === item.id) {
        setPreviewCourseMaterial(null);
      }
      triggerToast(`🗑️ Đã xóa học liệu "${item.title}" khỏi kho lưu trữ.`);
    } catch {
      setCourseMaterials(prev => prev.filter(m => m.id !== item.id));
      if (previewCourseMaterial?.id === item.id) {
        setPreviewCourseMaterial(null);
      }
      triggerToast(`🗑️ Đã gỡ học liệu "${item.title}" khỏi danh sách.`);
    }
  };

  const filteredCourseMaterials = React.useMemo(() => {
    const q = materialSearchQuery.trim().toLowerCase();
    return courseMaterials.filter(item => {
      const matchType = materialFilterType === 'Tất cả' || item.type === materialFilterType;
      const matchQuery = !q ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.fileName || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.access || '').toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [courseMaterials, materialFilterType, materialSearchQuery]);

  // Real roster trimmed to selected class size (Memoized O(N) lookup)
  const allClassStudents = (rosterStudents.length > 0 ? rosterStudents : STUDENTS_K26_A).slice(0, currentClass.studentsCount || 88);
  const mergedCurrentStudents = React.useMemo(() => {
    const recByCode = new Map();
    const recById = new Map();
    liveDbRecords.forEach(r => {
      if (r.student_code) recByCode.set(r.student_code, r);
      if (r.student_id != null) recById.set(String(r.student_id), r);
    });

    const manualById = new Map();
    (classStudents[selectedClassId] || []).forEach(m => {
      if (m?.id) manualById.set(m.id, m);
    });

    const isSessionClosed = activeSession?.status === 'closed';

    return allClassStudents.map(stu => {
      const liveRec = recByCode.get(stu.code) || recById.get(String(stu.id));
      const manualOverride = manualById.get(stu.code);
      const absences = stu.absences ?? 0;

      if (manualOverride) {
        return {
          id: stu.code,
          name: stu.name,
          absences,
          dist: manualOverride.status === 'valid' ? 'GV đã duyệt hợp lệ' : 'GV xác nhận đánh vắng',
          wifi: liveRec ? (liveRec.method === 'mobile_qr_camera' ? 'Camera QR + GPS' : 'GPS Trình duyệt') : 'GV cập nhật',
          time: liveRec?.check_in_time ? (liveRec.check_in_time.includes(' ') ? liveRec.check_in_time.split(' ')[1] : liveRec.check_in_time) : '--:--:--',
          status: manualOverride.status,
          isLiveDb: Boolean(liveRec),
          tokenMatchType: liveRec?.token_match_type
        };
      }

      if (liveRec) {
        return {
          id: stu.code,
          name: stu.name,
          absences,
          dist: liveRec.distance_meters != null ? `${liveRec.distance_meters}m (GPS)` : 'Đã xác thực GPS',
          wifi: liveRec.method === 'mobile_qr_camera' ? 'Camera QR + GPS' : 'GPS Trình duyệt',
          time: liveRec.check_in_time ? (liveRec.check_in_time.includes(' ') ? liveRec.check_in_time.split(' ')[1] : liveRec.check_in_time) : '--:--:--',
          status: liveRec.status === 'present' ? 'valid' : (liveRec.status === 'late' ? 'pending' : liveRec.status),
          isLiveDb: true,
          tokenMatchType: liveRec.token_match_type
        };
      }

      return {
        id: stu.code,
        name: stu.name,
        absences,
        dist: isSessionClosed
          ? 'Vắng mặt (Đã khóa sổ ca học)'
          : isAttendanceStarted
          ? 'Đang chờ sinh viên quét mã QR'
          : 'Chưa mở ca điểm danh',
        wifi: '--',
        time: '--:--:--',
        status: isSessionClosed ? 'absent' : 'unrecorded',
        isLiveDb: false
      };
    }).sort((a, b) => {
      if (a.status === 'valid' && b.status !== 'valid') return -1;
      if (a.status !== 'valid' && b.status === 'valid') return 1;
      return a.id.localeCompare(b.id);
    });
  }, [allClassStudents, liveDbRecords, classStudents, selectedClassId, activeSession?.status, isAttendanceStarted, currentClass.wifiAP]);

  // Filtered student attendance list for currently selected class
  const filteredStudents = React.useMemo(() => {
    const q = attendanceSearch.toLowerCase();
    return mergedCurrentStudents.filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.id.includes(attendanceSearch);
      if (attendanceFilter === 'all') return matchSearch;
      return matchSearch && s.status === attendanceFilter;
    });
  }, [mergedCurrentStudents, attendanceSearch, attendanceFilter]);

  // Dynamic Class Live Statistics (Computed live from SQLite & Real Roster)
  const totalClassSize = allClassStudents.length;
  const liveValidCount = mergedCurrentStudents.filter(s => s.status === 'valid').length;
  const liveExcusedCount = mergedCurrentStudents.filter(s => s.status === 'excused').length;
  const liveWarningCount = mergedCurrentStudents.filter(s => s.status === 'pending').length;
  const liveAbsentCount = mergedCurrentStudents.filter(s => s.status === 'absent').length;
  const liveAttendanceRate = totalClassSize > 0 ? `${Math.round(((liveValidCount + liveExcusedCount) / totalClassSize) * 100)}%` : '0%';

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length;
  const pendingFeedbackCount = feedbacks.filter(f => f.status === 'pending').length;

  const teacherWorkspaces = [
    {
      id: 'overview',
      navId: 'nav-btn-teacher-overview',
      label: 'Tổng quan Lớp học',
      shortLabel: 'Tổng quan',
      icon: BarChart3,
      iconClass: 'text-teal-600 dark:text-[#00dfa2]',
      activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
      mobileActiveClass: 'bg-teal-600 text-white',
      badge: 'KPI',
      badgeClass: 'bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]'
    },
    {
      id: 'attendance',
      navId: 'nav-btn-teacher-attendance',
      label: 'Giảng đường & Tương tác Live',
      shortLabel: 'Giảng đường',
      icon: QrCode,
      iconClass: 'text-teal-600 dark:text-[#00dfa2]',
      activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-emerald-500/10 border border-emerald-500/30 shadow-sm',
      mobileActiveClass: 'bg-emerald-600 text-white',
      badge: 'LIVE',
      badgeClass: 'bg-rose-500 text-white'
    },
    {
      id: 'assignments',
      navId: 'nav-btn-teacher-assignments',
      label: 'Thực hành Lab & Đồ án',
      shortLabel: 'Lab & Đồ án',
      icon: FolderGit2,
      iconClass: 'text-purple-600 dark:text-purple-400',
      activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 shadow-sm',
      mobileActiveClass: 'bg-purple-600 text-white',
      badge: 'Lab 30%',
      badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
    },
    {
      id: 'gradebook',
      navId: 'nav-btn-teacher-gradebook',
      label: 'Sổ điểm & Học vụ',
      shortLabel: 'Sổ điểm',
      icon: FileSpreadsheet,
      iconClass: 'text-teal-600 dark:text-[#00dfa2]',
      activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-teal-500/10 border border-teal-500/30 shadow-sm',
      mobileActiveClass: 'bg-teal-600 text-white',
      badge: pendingLeaveCount > 0 ? pendingLeaveCount : '88 SV',
      badgeClass: pendingLeaveCount > 0
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
        : 'bg-teal-500/20 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30'
    },
    {
      id: 'ai_lesson',
      navId: 'nav-btn-teacher-ai-lesson',
      label: 'Trợ lý AI & Học liệu',
      shortLabel: 'AI & Học liệu',
      icon: Sparkles,
      iconClass: 'text-purple-600 dark:text-purple-400',
      activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 shadow-sm',
      mobileActiveClass: 'bg-indigo-600 text-white',
      badge: 'Bloom',
      badgeClass: 'bg-purple-500/20 text-purple-800 dark:text-purple-200'
    },
    {
      id: 'announcements',
      navId: 'nav-btn-teacher-announcements',
      label: 'Bảng tin, Khảo sát & Hỏi đáp',
      shortLabel: 'Bảng tin & Q&A',
      icon: Megaphone,
      iconClass: 'text-rose-600 dark:text-rose-400',
      activeClass: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 shadow-sm',
      mobileActiveClass: 'bg-rose-600 text-white',
      badge: pendingFeedbackCount > 0 ? pendingFeedbackCount : null,
      badgeClass: 'bg-rose-500 text-white animate-pulse'
    }
  ];

  // 16 Major Features grouped for Left Collapsible Sidebar
  const teacherFeatureGroups = [
    {
      id: 'general',
      title: 'Điều Hành Chung',
      items: [
        {
          key: 'overview',
          navId: 'nav-btn-teacher-overview',
          label: 'Tổng quan Lớp học',
          icon: BarChart3,
          iconClass: 'text-teal-600 dark:text-[#00dfa2]',
          activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          badge: 'KPI',
          badgeClass: 'bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]',
          isActive: activeTab === 'overview'
        }
      ]
    },
    {
      id: 'classroom',
      title: 'Giảng Đường & Tương Tác Live',
      items: [
        {
          key: 'qr_live',
          navId: 'nav-btn-teacher-qr_live',
          label: 'Điểm danh QR Động (3s)',
          icon: QrCode,
          iconClass: 'text-emerald-600 dark:text-[#00dfa2]',
          activeClass: 'text-emerald-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          badge: `${qrInterval}s`,
          badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2]',
          isActive: activeTab === 'attendance' && classroomSubTab === 'qr_live'
        },
        {
          key: 'cold_call',
          navId: 'nav-btn-teacher-cold_call',
          label: 'Vòng quay Gọi tên & Exit Ticket',
          icon: RefreshCw,
          iconClass: 'text-teal-600 dark:text-teal-400',
          activeClass: 'text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/40 shadow-sm',
          isActive: activeTab === 'attendance' && classroomSubTab === 'cold_call'
        },
        {
          key: 'virtual_class',
          navId: 'nav-btn-teacher-virtual_class',
          label: 'Phòng học Online WebRTC',
          icon: Wifi,
          iconClass: 'text-rose-600 dark:text-rose-400',
          activeClass: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/40 shadow-sm',
          badge: 'LIVE',
          badgeClass: 'bg-rose-500 text-white',
          isActive: activeTab === 'attendance' && classroomSubTab === 'virtual_class'
        },
        {
          key: 'live_quiz',
          navId: 'nav-btn-teacher-live_quiz',
          label: 'Đố vui Flash Quiz 45s',
          icon: Clock,
          iconClass: 'text-amber-600 dark:text-amber-400',
          activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-sm',
          badge: '45s',
          badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
          isActive: activeTab === 'attendance' && classroomSubTab === 'live_quiz'
        }
      ]
    },
    {
      id: 'practice',
      title: 'Thực Hành Lab & Đồ Án',
      items: [
        {
          key: 'assignments_main',
          navId: 'nav-btn-teacher-assignments_main',
          label: 'Quản lý Bài tập & Đồ án',
          icon: FolderGit2,
          iconClass: 'text-purple-600 dark:text-purple-400',
          activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/40 shadow-sm',
          badge: 'Lab 30%',
          badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
          isActive: activeTab === 'assignments' && practiceSubTab === 'assignments_main'
        },
        {
          key: 'lab_queue',
          navId: 'nav-btn-teacher-lab_queue',
          label: 'Hàng đợi Hỗ trợ Phòng Lab',
          icon: HelpCircle,
          iconClass: 'text-violet-600 dark:text-violet-400',
          activeClass: 'text-violet-700 dark:text-violet-300 bg-violet-500/15 border border-violet-500/40 shadow-sm',
          badge: 'FIFO',
          badgeClass: 'bg-violet-500/20 text-violet-700 dark:text-violet-300',
          isActive: activeTab === 'assignments' && practiceSubTab === 'lab_queue'
        }
      ]
    },
    {
      id: 'academic',
      title: 'Sổ Điểm & Học Vụ',
      items: [
        {
          key: 'gradebook_main',
          navId: 'nav-btn-teacher-gradebook_main',
          label: 'Sổ điểm & Cảnh báo Học vụ',
          icon: FileSpreadsheet,
          iconClass: 'text-indigo-600 dark:text-indigo-400',
          activeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/40 shadow-sm',
          badge: `${currentClass.studentsCount || 88} SV`,
          badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
          isActive: activeTab === 'gradebook' && academicSubTab === 'gradebook_main'
        },
        {
          key: 'approvals',
          navId: 'nav-btn-teacher-approvals',
          label: 'Duyệt đơn Nghỉ phép & Học bù AI',
          icon: FileCheck2,
          iconClass: 'text-amber-600 dark:text-amber-400',
          activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-sm',
          badge: pendingLeaveCount > 0 ? pendingLeaveCount : null,
          badgeClass: 'bg-amber-500 text-white',
          isActive: activeTab === 'gradebook' && academicSubTab === 'approvals'
        },
        {
          key: 'schedule',
          navId: 'nav-btn-teacher-schedule',
          label: 'Lịch giảng dạy & Ca học',
          icon: Calendar,
          iconClass: 'text-sky-600 dark:text-sky-400',
          activeClass: 'text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/40 shadow-sm',
          isActive: activeTab === 'gradebook' && academicSubTab === 'schedule'
        }
      ]
    },
    {
      id: 'ai_oer',
      title: 'Trợ Lý AI & Học Liệu',
      items: [
        {
          key: 'bloom_builder',
          navId: 'nav-btn-teacher-bloom_builder',
          label: 'AI Soạn giáo án & Quiz Bloom',
          icon: Sparkles,
          iconClass: 'text-purple-600 dark:text-purple-400',
          activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/40 shadow-sm',
          badge: 'Bloom',
          badgeClass: 'bg-purple-500/20 text-purple-800 dark:text-purple-200',
          isActive: activeTab === 'ai_lesson' && aiSubTab === 'bloom_builder'
        },
        {
          key: 'mindmap',
          navId: 'nav-btn-teacher-mindmap',
          label: 'AI Tạo Sơ đồ Tư duy',
          icon: PieChart,
          iconClass: 'text-fuchsia-600 dark:text-fuchsia-400',
          activeClass: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/40 shadow-sm',
          badge: 'AI',
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300',
          isActive: activeTab === 'ai_lesson' && aiSubTab === 'mindmap'
        },
        {
          key: 'lecture_recap',
          navId: 'nav-btn-teacher-lecture_recap',
          label: 'Bài cũ & Sơ đồ Ôn tập',
          icon: BookMarked,
          iconClass: 'text-teal-600 dark:text-[#00dfa2]',
          activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-teal-500/15 border border-teal-500/40 shadow-sm',
          badge: 'Ôn tập',
          badgeClass: 'bg-teal-500/20 text-teal-700 dark:text-[#00dfa2]',
          isActive: activeTab === 'ai_lesson' && aiSubTab === 'lecture_recap'
        },
        {
          key: 'materials',
          navId: 'nav-btn-teacher-materials',
          label: 'Kho Học liệu & Slide',
          icon: BookOpen,
          iconClass: 'text-emerald-600 dark:text-[#00dfa2]',
          activeClass: 'text-emerald-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          badge: 'OER',
          badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2]',
          isActive: activeTab === 'ai_lesson' && aiSubTab === 'materials'
        }
      ]
    },
    {
      id: 'community',
      title: 'Bảng Tin, Khảo Sát & Hỏi Đáp',
      items: [
        {
          key: 'announcements_main',
          navId: 'nav-btn-teacher-announcements_main',
          label: 'Công văn & Biểu quyết AI',
          icon: Megaphone,
          iconClass: 'text-blue-600 dark:text-blue-400',
          activeClass: 'text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/40 shadow-sm',
          isActive: activeTab === 'announcements' && communitySubTab === 'announcements_main'
        },
        {
          key: 'live_qa',
          navId: 'nav-btn-teacher-live_qa',
          label: 'Hỏi đáp Q&A Lớp học & Điểm dừng Slide',
          icon: MessageSquareText,
          iconClass: 'text-teal-600 dark:text-[#00dfa2]',
          activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-teal-500/15 border border-teal-500/40 shadow-sm',
          isActive: activeTab === 'announcements' && communitySubTab === 'live_qa'
        },
        {
          key: 'feedback',
          navId: 'nav-btn-teacher-feedback',
          label: 'Hòm thư Phản hồi Sinh viên',
          icon: Inbox,
          iconClass: 'text-rose-600 dark:text-rose-400',
          activeClass: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/40 shadow-sm',
          badge: pendingFeedbackCount > 0 ? pendingFeedbackCount : null,
          badgeClass: 'bg-rose-500 text-white animate-pulse',
          isActive: activeTab === 'announcements' && communitySubTab === 'feedback'
        }
      ]
    }
  ];

  const currentTeacherFeatureKey =
    activeTab === 'overview'
      ? 'overview'
      : activeTab === 'attendance'
      ? classroomSubTab
      : activeTab === 'assignments'
      ? practiceSubTab
      : activeTab === 'gradebook'
      ? academicSubTab
      : activeTab === 'ai_lesson'
      ? aiSubTab
      : communitySubTab;

  const getHeaderMeta = () => {
    if (activeTab === 'overview') {
      return {
        title: 'Trung Tâm Thống Kê & Điều Hành Số • EG Education',
        subtitle: 'Số liệu thời gian thực về chuyên cần, an ninh GPS Geofencing, duyệt đơn từ và trợ lý AI'
      };
    }
    if (activeTab === 'attendance') {
      switch (classroomSubTab) {
        case 'cold_call':
          return {
            title: 'Vòng Quay Gọi Tên & Vé Ra Về (Exit Ticket)',
            subtitle: 'Khảo sát mức độ hiểu bài cuối buổi và chọn ngẫu nhiên sinh viên phát biểu'
          };
        case 'virtual_class':
          return {
            title: 'Phòng Học Trực Tuyến WebRTC & Bảng Trắng',
            subtitle: 'Giảng dạy trực tuyến thời gian thực, chia sẻ màn hình và ghi nhận tham gia'
          };
        case 'live_quiz':
          return {
            title: 'Đố Vui Nhanh Flash Quiz 45s Tại Giảng Đường',
            subtitle: 'Tổ chức câu hỏi trắc nghiệm tốc độ cao và bảng xếp hạng trực tiếp'
          };
        default:
          return {
            title: `Hệ Thống Trình Chiếu & Điểm Danh Dynamic QR ${qrInterval}s`,
            subtitle: `Tự động đổi mã sau ${qrInterval}s • Chống điểm danh hộ 100% • Xác thực GPS & WiFi`
          };
      }
    }
    if (activeTab === 'assignments') {
      return practiceSubTab === 'lab_queue'
        ? {
            title: 'Hàng Đợi Hỗ Trợ Thực Hành Phòng Lab (FIFO)',
            subtitle: 'Điều phối yêu cầu hỗ trợ kỹ thuật và chấm bài trực tiếp tại phòng máy'
          }
        : {
            title: 'Quản Lý Bài Tập Lớn & Thực Hành Lab (IT204)',
            subtitle: 'Giao bài thực hành, kiểm tra mã nguồn, chấm Rubric và đồng bộ vào Sổ Điểm'
          };
    }
    if (activeTab === 'gradebook') {
      if (academicSubTab === 'approvals') {
        return {
          title: 'Xét Duyệt Đơn Nghỉ Phép & Học Bù AI',
          subtitle: 'Xử lý minh chứng y tế, AI quét OCR tự động và đồng bộ sổ chuyên cần'
        };
      }
      if (academicSubTab === 'schedule') {
        return {
          title: 'Lịch Giảng Dạy & Ca Học • ThS. Phạm Văn Thuận',
          subtitle: 'Hiện tại giảng viên ThS. Phạm Văn Thuận chưa có lịch giảng dạy được phân công'
        };
      }
      return {
        title: 'Sổ Điểm Đánh Giá Quá Trình & Cảnh Báo Học Vụ',
        subtitle: 'Quản lý điểm chuyên cần QR, thực hành Lab, giữa kỳ, điểm rèn luyện và phúc khảo'
      };
    }
    if (activeTab === 'ai_lesson') {
      if (aiSubTab === 'mindmap') {
        return {
          title: 'AI Tạo Sơ Đồ Tư Duy & Infographic',
          subtitle: 'Tự động phân rã chủ đề hoặc tài liệu bất kỳ thành sơ đồ tư duy đa nhánh & Infographic trực quan'
        };
      }
      if (aiSubTab === 'lecture_recap') {
        return {
          title: 'Tổng Hợp Bài Cũ Theo Môn Học (Mindmap & File Bài Giảng)',
          subtitle: 'Đăng tải & quản lý sơ đồ tư duy ôn tập bài cũ từng môn kèm file slide bài giảng cho sinh viên'
        };
      }
      if (aiSubTab === 'materials') {
        return {
          title: 'Quản Lý Kho Học Liệu & Slide Bài Giảng',
          subtitle: 'Kho tài nguyên bản quyền mở OER chia sẻ cho sinh viên và đồng nghiệp'
        };
      }
      return {
        title: 'Trợ Lý AI Soạn Giáo Án & Trắc Nghiệm Chuẩn Bloom',
        subtitle: 'Tự động phân tích đề cương bài giảng, sinh 12 slide và bộ câu hỏi trắc nghiệm Bloom'
      };
    }
    if (activeTab === 'announcements') {
      if (communitySubTab === 'live_qa') {
        return {
          title: 'Hỏi Đáp Q&A Lớp Học & Điểm Dừng Slide',
          subtitle: 'Tiếp nhận câu hỏi ẩn danh có Upvote và kiểm tra mức độ nắm bài theo chặng'
        };
      }
      if (communitySubTab === 'feedback') {
        return {
          title: 'Hòm Thư Tiếp Nhận & Giải Đáp Phản Hồi Sinh Viên',
          subtitle: 'Giải đáp thắc mắc đồ án, kiến nghị môn học với gợi ý trả lời từ AI'
        };
      }
      return {
        title: 'Trợ Lý AI Tóm Tắt Công Văn & Biểu Quyết Lớp Học',
        subtitle: 'Trích xuất ý chính công văn, đính kèm bình chọn lớp và xuất báo cáo Excel'
      };
    }
    return { title: 'EG Education', subtitle: '' };
  };

  const renderSubTabBar = (items, activeKey, onChange) => (
    <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar mb-4">
      {items.map((item) => {
        const isActive = activeKey === item.id;
        return (
          <button
            key={item.id}
            type="button"
            id={`subtab-btn-${item.id}`}
            onClick={() => onChange(item.id)}
            className={
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm whitespace-nowrap shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer'
            }
          >
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : (item.badgeClass || 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300')
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderWorkspaceSubTabBar = () => {
    if (activeTab === 'attendance') {
      return renderSubTabBar(
        [
          { id: 'qr_live', label: '📡 Điểm danh QR Động (3s)' },
          { id: 'cold_call', label: '🎲 Vòng quay Gọi tên & Exit Ticket' },
          { id: 'virtual_class', label: '🎥 Phòng học Online WebRTC', badge: 'LIVE', badgeClass: 'bg-rose-500 text-white' },
          { id: 'live_quiz', label: '⚡ Đố vui Flash Quiz 45s' }
        ],
        classroomSubTab,
        setClassroomSubTab
      );
    }
    if (activeTab === 'assignments') {
      return renderSubTabBar(
        [
          { id: 'assignments_main', label: '💻 Quản lý Bài tập & Đồ án' },
          { id: 'lab_queue', label: '🛠️ Hàng đợi Hỗ trợ Phòng Lab' }
        ],
        practiceSubTab,
        setPracticeSubTab
      );
    }
    if (activeTab === 'gradebook') {
      return renderSubTabBar(
        [
          { id: 'gradebook_main', label: '📊 Sổ điểm & Cảnh báo Học vụ' },
          {
            id: 'approvals',
            label: '📝 Duyệt đơn Nghỉ phép & Học bù AI',
            badge: pendingLeaveCount > 0 ? pendingLeaveCount : null,
            badgeClass: 'bg-amber-500 text-white'
          },
          { id: 'schedule', label: '📅 Lịch giảng dạy & Ca học' }
        ],
        academicSubTab,
        setAcademicSubTab
      );
    }
    if (activeTab === 'ai_lesson') {
      return renderSubTabBar(
        [
          { id: 'bloom_builder', label: '✨ AI Soạn giáo án & Quiz Bloom' },
          { id: 'mindmap', label: '🧠 AI Tạo Sơ đồ Tư duy' },
          { id: 'lecture_recap', label: '📖 Bài cũ & Sơ đồ Ôn tập' },
          { id: 'materials', label: '📚 Kho Học liệu & Slide' }
        ],
        aiSubTab,
        setAiSubTab
      );
    }
    if (activeTab === 'announcements') {
      return renderSubTabBar(
        [
          { id: 'announcements_main', label: '📢 Công văn & Biểu quyết AI' },
          { id: 'live_qa', label: '🙋 Hỏi đáp Q&A Lớp học & Điểm dừng Slide' },
          {
            id: 'feedback',
            label: '💬 Hòm thư Phản hồi Sinh viên',
            badge: pendingFeedbackCount > 0 ? pendingFeedbackCount : null,
            badgeClass: 'bg-rose-500 text-white'
          }
        ],
        communitySubTab,
        setCommunitySubTab
      );
    }
    return null;
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-800 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:top-6 sm:right-6 z-50 max-w-md mx-auto sm:mx-0 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-[#00dfa2]/50 text-emerald-800 dark:text-[#00dfa2] text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-[#00dfa2]" />
          <span className="leading-snug">{toast}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 transition-colors">
        {/* LEFT: Hamburger (Mobile) + Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 lg:flex-none overflow-hidden">
          <button
            id="btn-teacher-mobile-menu"
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Mở menu 16 tính năng"
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => navigateTeacherTab('overview')}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden text-left cursor-pointer group focus:outline-none"
            title="Về trang Tổng quan Hệ thống"
          >
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0c1424] p-1 border border-[#85b8bc]/40 dark:border-slate-800 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <img 
                src={theme === 'dark' ? '/eg-logo-teal.png' : '/eg-logo.png'} 
                alt="EG" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5 min-w-0">
                <span className="truncate">EG Education</span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30 whitespace-nowrap shrink-0">Giảng Viên</span>
              </span>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">Tiện ích giáo dục • Educational Utility</p>
            </div>
          </button>
        </div>

        {/* CENTER: Global Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-2 items-center gap-2 bg-slate-100/90 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/15 rounded-2xl px-3.5 py-2 neu-inset transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text"
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && attendanceSearch.trim()) {
                navigateTeacherTab('attendance');
              }
            }}
            placeholder="Tìm kiếm sinh viên, MSSV, lớp CNTT K26..." 
            className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-medium"
          />
          {attendanceSearch && (
            <button
              type="button"
              onClick={() => setAttendanceSearch('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* RIGHT: Controls, User Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} />
            <NotificationCenter role="teacher" onNavigateTab={(tab) => navigateTeacherTab(tab)} />
          </div>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

          <div className="hidden md:flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] font-bold text-xs flex items-center justify-center border border-emerald-500/30 shadow-sm shrink-0">
              GV
            </div>
            <div className="text-left whitespace-nowrap">
              <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{user?.name || 'ThS. Phạm Văn Thuận'}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Giảng viên • CNTT K26</div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="p-2 sm:p-2.5 rounded-xl border border-transparent text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all cursor-pointer shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex min-w-0 relative">
        
        {/* LEFT SIDEBAR NAVIGATION (Collapsible 16-Feature Toolbar Drawer) */}
        <CollapsibleFeatureSidebar
          sidebarId="teacher-left-sidebar"
          toggleBtnId="btn-toggle-sidebar"
          edgeHandleId="btn-sidebar-edge-handle"
          accentColor="emerald"
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          collapsedGroups={collapsedSidebarGroups}
          onToggleGroup={handleToggleSidebarGroup}
          featureGroups={teacherFeatureGroups}
          onSelectFeature={navigateTeacherTab}
          collapsedAvatarText="GV"
          collapsedAvatarTitle={`${user?.name || 'ThS. Phạm Văn Thuận'} • ${currentClass.className}`}
          profileCard={
            <div className="p-3 rounded-2xl bg-white dark:bg-[#0f192e] border border-slate-200 dark:border-slate-800 space-y-2 neu-flat">
              <div className="flex items-center justify-between gap-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'ThS. Phạm Văn Thuận'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] font-bold shrink-0">
                  Đang Giảng Dạy
                </span>
              </div>

              {/* Compact Single Class Line in Sidebar */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>Lớp: <b className="text-slate-900 dark:text-white">{currentClass.className}</b></span>
                <span className="font-semibold text-teal-600 dark:text-[#00dfa2]">{currentClass.studentsCount} SV</span>
              </div>
            </div>
          }
          securityBadge={
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hệ Thống Bảo Mật</div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Geofencing & SSL 256-bit</span>
              </div>
            </div>
          }
          footerStatusText="Máy chủ đào tạo: Trực tuyến"
          footerVersionText="EG Education Platform v2.4.0"
        />

        {/* RIGHT CONTENT WORKSPACE */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 pb-24 md:pb-6 overflow-y-auto space-y-4">
          
          {/* Compact Dynamic Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-[#00dfa2] text-[11px] font-semibold mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00dfa2] animate-ping" />
                CỔNG QUẢN TRỊ ĐÀO TẠO • THS. PHẠM VĂN THUẬN
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {headerMeta.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {headerMeta.subtitle}
              </p>
            </div>

            {/* Mobile Workspace Pills for Small Screens */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {teacherWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setActiveTab(ws.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    activeTab === ws.id
                      ? ws.mobileActiveClass
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {ws.shortLabel}
                  {typeof ws.badge === 'number' && ws.badge > 0 ? ` (${ws.badge})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div key={currentTeacherFeatureKey} className="workspace-stage-anim space-y-4">
            {/* 2-Tier Navigation: Horizontal Segmented Sub-tabs on Mobile only */}
            {renderWorkspaceSubTabBar()}

          {/* ========================================================================= */}
          {/* TAB 0: DASHBOARD TỔNG QUAN (100% SỐ LIỆU THỰC TỪ EXCEL 88 SV & SQLITE)    */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (() => {
            const totalStudents = allClassStudents.length;
            const zeroAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) === 0).length;
            const oneAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) === 1).length;
            const twoAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) === 2).length;
            const oneTwoAbsenceCount = oneAbsenceCount + twoAbsenceCount;
            const warningAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) === 3).length;
            const fourFiveAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) >= 4 && (Number(s.absences) || 0) <= 5).length;
            const sixPlusAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) >= 6).length;
            const bannedAbsenceCount = allClassStudents.filter(s => (Number(s.absences) || 0) >= 4).length;
            const eligibleCount = totalStudents - bannedAbsenceCount;
            const eligibleRate = totalStudents > 0 ? ((eligibleCount / totalStudents) * 100).toFixed(1) : '0.0';
            const totalAbsenceSessions = allClassStudents.reduce((sum, s) => sum + (Number(s.absences) || 0), 0);
            const highAbsenceStudents = [...allClassStudents]
              .filter(s => (Number(s.absences) || 0) >= 3)
              .sort((a, b) => (Number(b.absences) || 0) - (Number(a.absences) || 0));

            const absenceBuckets = [
              { label: '0 buổi', count: zeroAbsenceCount, color: 'from-teal-600 via-teal-500 to-[#00dfa2]', highlight: true },
              { label: '1 buổi', count: oneAbsenceCount, color: 'from-sky-600 via-sky-500 to-cyan-400', highlight: false },
              { label: '2 buổi', count: twoAbsenceCount, color: 'from-indigo-600 via-indigo-500 to-sky-400', highlight: false },
              { label: '3 buổi', count: warningAbsenceCount, color: 'from-amber-600 via-amber-500 to-yellow-400', highlight: false },
              { label: '4–5 buổi', count: fourFiveAbsenceCount, color: 'from-orange-600 via-rose-500 to-amber-400', highlight: false },
              { label: '≥ 6 buổi', count: sixPlusAbsenceCount, color: 'from-rose-700 via-rose-600 to-rose-400', highlight: false }
            ];
            const maxBucketCount = Math.max(1, ...absenceBuckets.map(b => b.count));

            const pct0 = totalStudents > 0 ? ((zeroAbsenceCount / totalStudents) * 100).toFixed(1) : '0.0';
            const pct12 = totalStudents > 0 ? ((oneTwoAbsenceCount / totalStudents) * 100).toFixed(1) : '0.0';
            const pctWarn = totalStudents > 0 ? ((warningAbsenceCount / totalStudents) * 100).toFixed(1) : '0.0';
            const pctBanned = totalStudents > 0 ? ((bannedAbsenceCount / totalStudents) * 100).toFixed(1) : '0.0';

            const ringCirc = 238.76;
            const len0 = totalStudents > 0 ? (zeroAbsenceCount / totalStudents) * ringCirc : 0;
            const len12 = totalStudents > 0 ? (oneTwoAbsenceCount / totalStudents) * ringCirc : 0;
            const lenWarn = totalStudents > 0 ? (warningAbsenceCount / totalStudents) * ringCirc : 0;
            const lenBanned = totalStudents > 0 ? (bannedAbsenceCount / totalStudents) * ringCirc : 0;

            return (
              <div className="space-y-6">
                {/* Top Controls & Excel Data Header */}
                <div className="p-4 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 flex items-center justify-center shrink-0 border border-teal-500/30">
                      <Activity className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        Thống Kê Chuyên Cần Thực Tế • Lớp {currentClass.className} ({totalStudents} SV)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Nguồn dữ liệu: Danh sách Excel lớp học ({totalStudents} sinh viên) • Tổng số lượt nghỉ (cột Ktra): {totalAbsenceSessions} buổi
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleRefreshOverview}
                      disabled={isRefreshingOverview}
                      className="p-2 rounded-xl neu-btn text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      title="Làm mới số liệu"
                    >
                      <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-[#00dfa2] ${isRefreshingOverview ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      id="btn-export-overview-report"
                      onClick={handleExportFullReport}
                      className="px-3.5 py-2 rounded-xl neu-btn-glow font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất Báo Cáo (Excel / PDF)</span>
                    </button>
                  </div>
                </div>

                {/* 4 REAL KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1 */}
                  <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group hover:border-teal-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sĩ Số &amp; Đủ Điều Kiện Thi</span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center border border-emerald-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{eligibleCount} / {totalStudents} SV</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-[#00dfa2]">{eligibleRate}%</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Không nghỉ (0 buổi): {zeroAbsenceCount} SV • Nghỉ 1–2 buổi: {oneTwoAbsenceCount} SV
                      </p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-[#00dfa2] rounded-full" style={{ width: `${eligibleRate}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Quy chế: Vắng &lt; 4 buổi</span>
                      <span className="text-emerald-600 dark:text-[#00dfa2] font-semibold">Đủ điều kiện: {eligibleCount} SV</span>
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group hover:border-rose-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cảnh Báo &amp; Cấm Thi (Cột Ktra)</span>
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{bannedAbsenceCount} Cấm thi</span>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{warningAbsenceCount} cảnh báo</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Nghỉ ≥ 4 buổi: {bannedAbsenceCount} SV • Nghỉ 3 buổi: {warningAbsenceCount} SV
                      </p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full" style={{ width: `${pctBanned}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tổng lượt nghỉ cả lớp: {totalAbsenceSessions} buổi</span>
                      <button
                        onClick={() => navigateTeacherTab('gradebook')}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                      >
                        Mở sổ điểm →
                      </button>
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đơn Nghỉ Học Trực Tuyến</span>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{leaveRequests.length} Đơn</span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          {pendingLeaveCount} chờ duyệt
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {leaveRequests.filter(r => r.status !== 'pending').length} Đã giải quyết • Ca QR hôm nay: {liveValidCount}/{totalStudents} có mặt
                      </p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${leaveRequests.length > 0 ? 100 : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Dữ liệu thực từ SQLite</span>
                      <button
                        onClick={() => navigateTeacherTab('approvals')}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                      >
                        Duyệt đơn →
                      </button>
                    </div>
                  </div>

                  {/* KPI 4 */}
                  <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Học Liệu &amp; Thông Báo</span>
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{courseMaterials.length}</span>
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">Học liệu</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {announcements.length} Công văn/Biểu quyết • {feedbacks.length} Phản hồi SV
                      </p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${courseMaterials.length > 0 ? 100 : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Dữ liệu thực trên hệ thống</span>
                      <button
                        onClick={() => navigateTeacherTab('materials')}
                        className="text-purple-600 dark:text-purple-300 hover:underline font-bold cursor-pointer"
                      >
                        Kho học liệu →
                      </button>
                    </div>
                  </div>
                </div>

                {/* REAL CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Chart 1: Distribution of Absences from Ktra */}
                  <div className="lg:col-span-7 p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                          Phân Bố Số Buổi Nghỉ Thực Tế Theo Cột Ktra ({totalStudents} Sinh Viên)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Thống kê trực tiếp từ cột Kiểm tra (Ktra) trong danh sách Excel lớp {currentClass.className}
                        </p>
                      </div>
                    </div>

                    <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2">
                      {absenceBuckets.map((bucket, bIdx) => {
                        const heightPercent = Math.round((bucket.count / maxBucketCount) * 100);
                        const bucketPct = totalStudents > 0 ? ((bucket.count / totalStudents) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={bIdx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <span className={`text-[10px] font-bold transition-all ${
                              bucket.highlight
                                ? 'text-teal-700 dark:text-[#00dfa2]'
                                : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}>
                              {bucketPct}%
                            </span>

                            <div className="w-full max-w-[46px] h-40 bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 relative flex items-end overflow-hidden neu-inset">
                              <div
                                className={`w-full rounded-xl transition-all duration-700 bg-gradient-to-t ${bucket.color}`}
                                style={{ height: `${bucket.count > 0 ? Math.max(10, heightPercent) : 0}%` }}
                              />
                            </div>

                            <div className="text-center">
                              <span className={`text-[11px] font-bold block ${
                                bucket.highlight ? 'text-teal-700 dark:text-[#00dfa2]' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {bucket.label}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                {bucket.count} SV
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span>Không nghỉ (0 buổi): <strong className="text-slate-900 dark:text-white font-extrabold">{zeroAbsenceCount} SV ({pct0}%)</strong></span>
                      <span>Có nghỉ (≥ 1 buổi): <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{totalStudents - zeroAbsenceCount} SV</strong></span>
                      <span>Tổng lượt nghỉ: <strong className="text-rose-500 font-extrabold">{totalAbsenceSessions} buổi</strong></span>
                    </div>
                  </div>

                  {/* Chart 2: Attendance Structure Donut for 88 Students */}
                  <div className="lg:col-span-5 p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-sky-600 dark:text-[#00b4d8]" />
                        Cơ Cấu Chuyên Cần Lớp {currentClass.className} ({totalStudents} SV)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Phân loại trạng thái dự thi của {totalStudents} sinh viên theo cột Ktra
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800/80" />
                          <circle
                            cx="50" cy="50" r="38" fill="transparent" stroke="#00dfa2" strokeWidth="12"
                            strokeDasharray={`${len0} ${ringCirc}`} strokeDashoffset="0"
                          />
                          <circle
                            cx="50" cy="50" r="38" fill="transparent" stroke="#00b4d8" strokeWidth="12"
                            strokeDasharray={`${len12} ${ringCirc}`} strokeDashoffset={-len0}
                          />
                          <circle
                            cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="12"
                            strokeDasharray={`${lenWarn} ${ringCirc}`} strokeDashoffset={-(len0 + len12)}
                          />
                          <circle
                            cx="50" cy="50" r="38" fill="transparent" stroke="#f43f5e" strokeWidth="12"
                            strokeDasharray={`${lenBanned} ${ringCirc}`} strokeDashoffset={-(len0 + len12 + lenWarn)}
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{totalStudents}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Sinh viên</span>
                          <span className="text-[10px] font-extrabold text-teal-600 dark:text-[#00dfa2] mt-1 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                            {eligibleRate}% Đủ ĐK
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 w-full max-w-[220px] text-xs">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00dfa2]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Nghỉ 0 buổi</span>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">{zeroAbsenceCount} SV ({pct0}%)</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00b4d8]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Nghỉ 1–2 buổi</span>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">{oneTwoAbsenceCount} SV ({pct12}%)</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Nghỉ 3 buổi (Cảnh báo)</span>
                          </div>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400">{warningAbsenceCount} SV ({pctWarn}%)</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Nghỉ ≥ 4 buổi (Cấm thi)</span>
                          </div>
                          <span className="font-extrabold text-rose-500">{bannedAbsenceCount} SV ({pctBanned}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Dữ liệu khớp 100% file Excel</span>
                      <span className="text-teal-600 dark:text-[#00dfa2] font-semibold">✓ Sẵn sàng vận hành</span>
                    </div>
                  </div>
                </div>

                {/* SINGLE REAL CLASS SUMMARY TABLE */}
                <div className="p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Tổng Hợp Tình Hình Lớp Học Quản Lý ({currentClass.className})
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Quy chế tín chỉ: Sinh viên vắng ≥ 4 buổi (vượt 20%) bị cấm thi kết thúc học phần
                      </p>
                    </div>
                    <button
                      onClick={() => navigateTeacherTab('gradebook')}
                      className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Mở Sổ Điểm {totalStudents} SV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-[#090e1a] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5">Lớp &amp; Học Phần</th>
                          <th className="p-3.5">Sĩ Số</th>
                          <th className="p-3.5">Đi Đầy Đủ (0 Buổi)</th>
                          <th className="p-3.5">Nghỉ 1–2 Buổi</th>
                          <th className="p-3.5">Cảnh Báo (3 Buổi)</th>
                          <th className="p-3.5">Cấm Thi (≥ 4 Buổi)</th>
                          <th className="p-3.5 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-900 dark:text-white block text-xs">{currentClass.subject}</span>
                            <span className="text-[10px] text-slate-500">{currentClass.className} • GV: {user?.name || 'ThS. Phạm Văn Thuận'}</span>
                          </td>
                          <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">{totalStudents} SV</td>
                          <td className="p-3.5 font-bold text-emerald-600 dark:text-[#00dfa2]">{zeroAbsenceCount} SV</td>
                          <td className="p-3.5 font-bold text-sky-600 dark:text-cyan-400">{oneTwoAbsenceCount} SV</td>
                          <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">{warningAbsenceCount} SV</td>
                          <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">{bannedAbsenceCount} SV</td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => navigateTeacherTab('qr_live')}
                              className="px-2.5 py-1 rounded-lg neu-btn text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Điểm Danh QR</span>
                              <ArrowUpRight className="w-3 h-3 text-teal-600 dark:text-[#00dfa2]" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* REAL LIST OF HIGH-ABSENCE STUDENTS (>= 3) FROM EXCEL Ktra COLUMN */}
                <div className="p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        Danh Sách Sinh Viên Nghỉ Từ 3 Buổi Trở Lên (Theo Cột Ktra File Excel — {highAbsenceStudents.length} SV)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Sắp xếp giảm dần theo số buổi vắng thực tế ({bannedAbsenceCount} Cấm thi • {warningAbsenceCount} Cảnh báo)
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[380px]">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-[#090e1a] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 z-10">
                        <tr>
                          <th className="p-3">STT</th>
                          <th className="p-3">Mã SV</th>
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">Ngày sinh</th>
                          <th className="p-3">Số điện thoại</th>
                          <th className="p-3">Tên Zalo</th>
                          <th className="p-3 text-center">Số buổi nghỉ (Ktra)</th>
                          <th className="p-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] bg-white dark:bg-[#0c1424]">
                        {highAbsenceStudents.map((stu, idx) => {
                          const abs = Number(stu.absences) || 0;
                          const isBanned = abs >= 4;
                          return (
                            <tr key={stu.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{stu.code}</td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{stu.name}</td>
                              <td className="p-3 font-mono text-slate-500">{stu.dob || '--'}</td>
                              <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{stu.phone || '--'}</td>
                              <td className="p-3 text-slate-600 dark:text-slate-300">{stu.zaloName || '--'}</td>
                              <td className="p-3 text-center font-extrabold text-sm">
                                <span className={isBanned ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                                  {abs}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isBanned
                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                }`}>
                                  {isBanned ? 'Cấm thi (≥ 4 buổi)' : 'Cảnh báo (3 buổi)'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* WORKSPACE 6: CÔNG VĂN, BIỂU QUYẾT AI & HỎI ĐÁP LỚP HỌC                   */}
          {/* ========================================================================= */}
          {activeTab === 'announcements' && communitySubTab === 'announcements_main' && (() => {
            const currentAnn = announcements.find(a => a.id === selectedAnnouncementId) || announcements[0];
            const maxVotes = currentAnn?.poll ? Math.max(...currentAnn.poll.options.map(o => o.votes), 0) : 0;
            const leadingOption = currentAnn?.poll?.options?.find(o => o.votes === maxVotes);
            const totalVotedCount = currentAnn?.poll?.totalVotes || 0;
            const totalClassStudents = STUDENTS_K26_A.length;
            const pendingCount = Math.max(0, totalClassStudents - totalVotedCount);
            const responseRate = ((totalVotedCount / totalClassStudents) * 100).toFixed(1);

            const filteredStudents = STUDENTS_K26_A.filter(stu => {
              const voteRecord = currentAnn?.poll?.votesList?.find(v => v.studentCode === stu.code);
              const hasVoted = Boolean(voteRecord);
              if (studentFilterStatus === 'voted' && !hasVoted) return false;
              if (studentFilterStatus === 'pending' && hasVoted) return false;
              if (studentSearchTerm.trim()) {
                const q = studentSearchTerm.toLowerCase();
                return stu.name.toLowerCase().includes(q) || stu.code.includes(q);
              }
              return true;
            });

            return (
              <div className="space-y-6">
                {/* Control Ribbon: Switch between AI Studio & Live Monitoring */}
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-sky-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                          AI Official Dispatch & Realtime Poll Generator
                        </span>
                        <span className="text-xs text-slate-500">Giảng Viên: ThS. Phạm Văn Thuận</span>
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                        Hệ Thống AI Phân Tích Công Văn & Tự Động Kích Hoạt Biểu Quyết Lớp Học
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Mô hình AI tự động tóm tắt 3 ý trọng tâm, phát hiện nhu cầu biểu quyết và sinh phương án lựa chọn tức thì.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <button
                        type="button"
                        id="tab-btn-ai-studio"
                        onClick={() => setAnnouncementSubTab('studio')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          announcementSubTab === 'studio'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>1. Soạn & AI Phân Tích</span>
                      </button>

                      <button
                        type="button"
                        id="tab-btn-live-monitoring"
                        onClick={() => setAnnouncementSubTab('monitoring')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          announcementSubTab === 'monitoring'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>2. Giám Sát Biểu Quyết ({announcements.length})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const resetList = announcementService.getAll();
                        setAnnouncements(resetList);
                        triggerToast('Đã làm mới dữ liệu công văn & biểu quyết!');
                      }}
                      className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-sm"
                      title="Làm mới"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* VIEW 1: AI DISPATCH & AUTO-POLL STUDIO */}
                {announcementSubTab === 'studio' && (
                  <div className="space-y-6">
                    <div className="neu-card rounded-3xl p-5 sm:p-7 border border-teal-500/30 shadow-xl bg-white dark:bg-[#0c1424] space-y-6">
                      
                      {/* Step 1: Upload File hoặc Chọn công văn mẫu */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center text-xs font-black">
                              1
                            </span>
                            <span>Bước 1: Tải lên tập tin công văn (.pdf, .docx, .png, .jpg) hoặc Dán văn bản</span>
                          </label>
                          <span className="text-[11px] text-teal-600 dark:text-[#00dfa2] font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> AI Parser tự động trích xuất nội dung & nhận diện bình chọn
                          </span>
                        </div>

                        {/* Drag & Drop File Upload Zone */}
                        <div
                          id="dispatch-file-dropzone"
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingDispatchFile(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDraggingDispatchFile(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingDispatchFile(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) processFileForAnalysis(f);
                          }}
                          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
                            isDraggingDispatchFile
                              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-[#080d19]/80 hover:border-teal-500/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="dispatch-file-picker"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={handleFileUpload}
                            className="hidden"
                          />

                          {!uploadedDispatchFile ? (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-sky-500/20 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center shadow-inner">
                                <UploadCloud className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                  Kéo thả tập tin công văn (.pdf, .docx, .png, .jpg) vào đây
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                  Hệ thống hỗ trợ file PDF công văn hành chính, văn bản Word hoặc ảnh chụp nghị quyết. AI sẽ tự động đọc hiểu và trích xuất ý chính.
                                </p>
                              </div>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  id="btn-upload-dispatch-picker"
                                  onClick={() => document.getElementById('dispatch-file-picker')?.click()}
                                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 flex items-center gap-2 mx-auto cursor-pointer transition-all"
                                >
                                  <FileUp className="w-4 h-4" />
                                  <span>📁 Chọn File PDF Từ Máy Tính</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-emerald-500/40 shadow-md text-left">
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                                      {uploadedDispatchFile.name}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                                      {uploadedDispatchFile.size || 'PDF'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Đã sẵn sàng phân tích nội dung • Trích xuất cấu trúc văn bản và nhận diện yêu cầu bình chọn
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  id="btn-run-file-analysis"
                                  onClick={() => processFileForAnalysis(uploadedDispatchFile)}
                                  disabled={isAiSummarizing}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{isAiSummarizing ? 'Đang phân tích...' : '⚡ AI Phân Tích Lại'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadedDispatchFile(null);
                                    setExtractedSummary(null);
                                  }}
                                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-all"
                                  title="Đổi tệp khác"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>


                        {/* Collapsible Manual Raw Textarea */}
                        <div className="pt-1">
                          <button
                            type="button"
                            id="btn-toggle-raw-text"
                            onClick={() => setShowRawTextInput(!showRawTextInput)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{showRawTextInput ? 'Ẩn ô dán văn bản thô ▲' : 'Hoặc dán toàn văn nội dung công văn bằng tay / xem văn bản thô ▼'}</span>
                          </button>

                          {showRawTextInput && (
                            <div className="mt-2 space-y-2 animate-fadeIn">
                              <textarea
                                id="raw-dispatch-textarea"
                                rows={5}
                                value={rawDispatchInput}
                                onChange={(e) => setRawDispatchInput(e.target.value)}
                                placeholder="Dán toàn văn nội dung công văn, quyết định hoặc thông báo hành chính..."
                                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                              />
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {rawDispatchInput.length} ký tự • Tự động nhận diện cấu trúc công văn hành chính
                                </span>
                                <button
                                  type="button"
                                  id="btn-run-ai-analyze"
                                  onClick={() => handleRunAiSummarize()}
                                  disabled={isAiSummarizing || !rawDispatchInput.trim()}
                                  className="px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{isAiSummarizing ? 'AI Đang Phân Tích...' : '⚡ Phân Tích Văn Bản Thô Này'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2: WORKSPACE KIỂM TRA & TOÀN QUYỀN CHỈNH SỬA DỰ THẢO DÀNH CHO GIÁO VIÊN */}
                      {extractedSummary && (
                        <div className="neu-card rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-sky-500/5 space-y-5 animate-fadeIn shadow-lg">
                          
                          {/* Banner Header: Khẳng định quyền kiểm duyệt của giáo viên */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                                <Edit3 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                                    DỰ THẢO AI ĐỀ XUẤT
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    Bước 2: Giáo viên kiểm tra & chỉnh sửa trước khi gửi
                                  </span>
                                </div>
                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                                  Không Gửi Thẳng • Thầy/Cô Toàn Quyền Hiệu Chỉnh Mọi Nội Dung
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-teal-600" />
                              <span>{extractedSummary.readingTime || 'Đọc trong 1.5 phút'}</span>
                            </div>
                          </div>

                          {/* Row 1: Metadata: Số hiệu, Hạn chót, Mức độ khẩn cấp (Interactive Pills) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Số hiệu công văn:
                              </label>
                              <input
                                type="text"
                                id="edit-dispatch-no"
                                value={extractedSummary.dispatchNo || ''}
                                onChange={(e) => setExtractedSummary({ ...extractedSummary, dispatchNo: e.target.value })}
                                className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-emerald-500"
                                placeholder="VD: 48/QĐ-ĐHTTN"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Thời hạn xử lý / Hạn chót:
                              </label>
                              <input
                                type="text"
                                id="edit-dispatch-deadline"
                                value={pollDeadline}
                                onChange={(e) => setPollDeadline(e.target.value)}
                                className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500"
                                placeholder="VD: 02/11/2026 18:00"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Mức độ khẩn cấp (Chọn pill):
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  id="urgency-pill-urgent"
                                  onClick={() => handleChangeUrgency('urgent')}
                                  className={`px-2 py-2 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                                    extractedSummary.urgency === 'urgent' || extractedSummary.urgency === 'emergency'
                                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                      : 'bg-white dark:bg-[#0c1424] text-rose-600 border-rose-300 dark:border-rose-900/50 hover:bg-rose-50'
                                  }`}
                                >
                                  🔴 HỎA TỐC
                                </button>
                                <button
                                  type="button"
                                  id="urgency-pill-important"
                                  onClick={() => handleChangeUrgency('important')}
                                  className={`px-2 py-2 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                                    extractedSummary.urgency === 'important'
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                      : 'bg-white dark:bg-[#0c1424] text-amber-600 border-amber-300 dark:border-amber-900/50 hover:bg-amber-50'
                                  }`}
                                >
                                  🟡 QUAN TRỌNG
                                </button>
                                <button
                                  type="button"
                                  id="urgency-pill-normal"
                                  onClick={() => handleChangeUrgency('normal')}
                                  className={`px-2 py-2 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                                    extractedSummary.urgency === 'normal' || !extractedSummary.urgency
                                      ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                                      : 'bg-white dark:bg-[#0c1424] text-sky-600 border-sky-300 dark:border-sky-900/50 hover:bg-sky-50'
                                  }`}
                                >
                                  🔵 THƯỜNG
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Tiêu đề công văn (Editable) */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Tiêu đề thông báo gửi đến sinh viên (Giáo viên có thể sửa lại cho trực quan):
                            </label>
                            <input
                              type="text"
                              id="edit-dispatch-title"
                              value={extractedSummary.title || ''}
                              onChange={(e) => setExtractedSummary({ ...extractedSummary, title: e.target.value })}
                              className="w-full p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-500/30 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white focus:border-emerald-500 shadow-sm"
                              placeholder="Tiêu đề thông báo công văn..."
                            />
                          </div>

                          {/* Row 3: 3 Ý chính trọng tâm trích xuất (Editable list + Add / Remove) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Ý chính trọng tâm trích xuất ({extractedSummary.keyPoints?.length || 0} ý - Thầy/Cô có thể sửa, thêm hoặc xóa):</span>
                              </label>
                              <button
                                type="button"
                                id="btn-add-keypoint"
                                onClick={handleAddKeyPoint}
                                className="text-xs font-bold text-emerald-600 dark:text-[#00dfa2] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Thêm ý chính
                              </button>
                            </div>

                            <div className="space-y-2">
                              {extractedSummary.keyPoints?.map((kp, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0 font-black text-[11px]">
                                    {idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    id={`edit-keypoint-${idx}`}
                                    value={kp}
                                    onChange={(e) => handleUpdateKeyPoint(idx, e.target.value)}
                                    className="flex-1 p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:border-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyPoint(idx)}
                                    disabled={(extractedSummary.keyPoints || []).length <= 1}
                                    className={`p-2.5 rounded-xl border transition-all ${
                                      (extractedSummary.keyPoints || []).length <= 1
                                        ? 'text-slate-300 dark:text-slate-700 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                        : 'text-rose-500 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer'
                                    }`}
                                    title="Xóa ý chính này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Row 4: Hành động yêu cầu (Editable) */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Hành động yêu cầu / Chỉ đạo sinh viên thực hiện:
                            </label>
                            <input
                              type="text"
                              id="edit-dispatch-action"
                              value={extractedSummary.actionRequired || ''}
                              onChange={(e) => setExtractedSummary({ ...extractedSummary, actionRequired: e.target.value })}
                              className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500"
                              placeholder="VD: Toàn thể sinh viên hoàn thành bình chọn trước 18h00..."
                            />
                          </div>

                        </div>
                      )}

                      {/* Step 3: Khối nhận diện & Thiết lập bình chọn tự động */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 space-y-4">
                        {/* Detection Banner */}
                        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          hasAttachedPoll
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          <div className="flex items-start gap-3 text-xs">
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ${hasAttachedPoll ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <div>
                              <div className="font-extrabold text-sm">
                                {hasAttachedPoll
                                  ? '🟢 AI Nhận diện: Công văn yêu cầu tổ chức biểu quyết / lấy ý kiến sinh viên'
                                  : 'ℹ️ AI Nhận diện: Công văn thông báo phổ biến quy chế, không bắt buộc sinh biểu quyết'}
                              </div>
                              <div className="text-[11px] opacity-80 mt-0.5">
                                {hasAttachedPoll
                                  ? 'Hệ thống đã tự động soạn thảo câu hỏi biểu quyết và các phương án. Thầy/Cô có thể chỉnh sửa tự do trước khi gửi.'
                                  : 'Văn bản này không yêu cầu biểu quyết. Bạn vẫn có thể chủ động bật nút bên cạnh nếu muốn lấy thêm ý kiến sinh viên.'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <label className="text-xs font-bold cursor-pointer flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="toggle-has-poll"
                                checked={hasAttachedPoll}
                                onChange={(e) => setHasAttachedPoll(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Kích hoạt bình chọn</span>
                            </label>
                          </div>
                        </div>

                        {hasAttachedPoll && (
                          <div className="space-y-4 pt-2 animate-fadeIn">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Câu hỏi biểu quyết (AI sinh tự động - Thầy/Cô có thể sửa):
                                </label>
                                <input
                                  type="text"
                                  id="poll-question-input"
                                  value={pollQuestion}
                                  onChange={(e) => setPollQuestion(e.target.value)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Thời hạn chót biểu quyết:
                                </label>
                                <input
                                  type="text"
                                  id="poll-deadline-input"
                                  value={pollDeadline}
                                  onChange={(e) => setPollDeadline(e.target.value)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                  Các phương án lựa chọn ({pollOptions.length}/6 phương án - Thầy/Cô có thể thêm/bớt/sửa):
                                </label>
                                <button
                                  type="button"
                                  id="btn-add-poll-option"
                                  onClick={handleAddPollOption}
                                  className="text-xs font-bold text-emerald-600 dark:text-[#00dfa2] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Thêm phương án
                                </button>
                              </div>

                              <div className="space-y-2">
                                {pollOptions.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="w-7 text-xs font-black text-slate-400 text-center font-mono">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    <input
                                      type="text"
                                      id={`poll-option-input-${idx}`}
                                      value={opt}
                                      onChange={(e) => handleUpdatePollOption(idx, e.target.value)}
                                      className="flex-1 p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePollOption(idx)}
                                      disabled={pollOptions.length <= 2}
                                      className={`p-2.5 rounded-xl border transition-all ${
                                        pollOptions.length <= 2
                                          ? 'text-slate-300 dark:text-slate-700 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                          : 'text-rose-500 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer'
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* File Attachment Notification */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 font-medium">
                            <FileText className="w-4 h-4 text-teal-600" />
                            Tệp công văn gốc đính kèm: <strong className="text-slate-800 dark:text-slate-200">{uploadedDispatchFile?.name || extractedSummary?.sourceFileName || 'Tệp văn bản đã phân tích'}</strong>
                          </span>
                          <span className="text-[11px] text-teal-600 dark:text-[#00dfa2] font-semibold">
                            Tự động đính kèm vào thông báo gửi sinh viên
                          </span>
                        </div>
                      </div>

                      {/* Step 4: Publish Action Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-500">
                          Phát hành cho: <strong className="text-slate-800 dark:text-slate-200">{totalClassStudents} Sinh Viên Lớp K26 CNTT - Lớp A</strong> • Môn: <strong className="text-slate-800 dark:text-slate-200">{announcementSubject}</strong>
                        </div>

                        <button
                          type="button"
                          id="btn-publish-announcement"
                          onClick={handlePublishAnnouncement}
                          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00dfa2] hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Megaphone className="w-4 h-4" />
                          <span>📢 Phê Duyệt & Ban Hành Công Văn Đến Toàn Thể Sinh Viên</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: REALTIME MONITORING & EXCEL EXPORT COLUMN */}
                {announcementSubTab === 'monitoring' && (
                  <div className="w-full space-y-6">
                    
                    {/* Announcement selector bar */}
                    <div className="neu-card rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Chọn thông báo theo dõi số liệu:
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-[#00dfa2] font-bold">
                          {announcements.length} thông báo trong hệ thống
                        </span>
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {announcements.map((ann) => (
                          <button
                            key={ann.id}
                            onClick={() => setSelectedAnnouncementId(ann.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-2 ${
                              selectedAnnouncementId === ann.id
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-[#00dfa2] shadow-sm'
                                : 'bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${ann.hasPoll ? 'bg-rose-500 animate-pulse' : 'bg-sky-500'}`} />
                            <span className="truncate max-w-[200px]">{ann.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Announcement Overview & Excel Export Card */}
                    {currentAnn && (
                      <div className="neu-card rounded-3xl p-5 sm:p-6 space-y-5 border border-slate-200 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[#0c1424]">
                        
                        {/* Title and metadata */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${currentAnn.badgeColor}`}>
                                {currentAnn.urgencyLabel}
                              </span>
                              <span className="text-xs text-slate-500 font-mono font-bold">
                                {currentAnn.aiSummary?.dispatchNo}
                              </span>
                            </div>
                            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                              {currentAnn.title}
                            </h3>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                              <span>Lớp: <strong className="text-slate-700 dark:text-slate-300">{currentAnn.targetClass}</strong></span>
                              <span>•</span>
                              <span>Hạn chót: <strong className="text-rose-600 dark:text-rose-400">{currentAnn.deadline}</strong></span>
                            </div>
                          </div>

                          <button
                            onClick={() => setPreviewDispatchModal(currentAnn)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem công văn gốc</span>
                          </button>
                        </div>

                        {/* EXCEL EXPORT & ACTION HERO BANNER */}
                        {currentAnn.hasPoll && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-sky-600/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <FileSpreadsheet className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                  Báo Cáo Biểu Quyết Toàn Lớp Chuẩn Excel (.xlsx)
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Bao gồm 2 Sheet: Sheet 1 Thống kê % tổng hợp & Sheet 2 Danh sách chi tiết {totalClassStudents} sinh viên.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleExportPollExcel(currentAnn)}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                <span>Xuất Báo Cáo Excel</span>
                              </button>

                              <button
                                onClick={() => setPrintMinutesModalAnnouncement(currentAnn)}
                                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                title="In hoặc lưu PDF biên bản họp lớp hành chính (Nghị định 30/2020/NĐ-CP)"
                              >
                                <Printer className="w-4 h-4" />
                                <span>In Biên Bản PDF</span>
                              </button>

                              {pendingCount > 0 && (
                                <button
                                  onClick={() => handleSendReminderToPending(pendingCount)}
                                  className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all cursor-pointer"
                                >
                                  Nhắc nhở {pendingCount} SV
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Poll Statistics KPIs (4 boxes) */}
                        {currentAnn.hasPoll && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <div className="text-[11px] font-bold text-slate-500">Sĩ số lớp</div>
                              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                                {totalClassStudents} <span className="text-xs text-slate-400 font-normal">SV</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <div className="text-[11px] font-bold text-emerald-600 dark:text-[#00dfa2]">Đã biểu quyết</div>
                              <div className="text-xl font-extrabold text-emerald-600 dark:text-[#00dfa2]">
                                {totalVotedCount} <span className="text-xs text-slate-400 font-normal">({responseRate}%)</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Chưa phản hồi</div>
                              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                                {pendingCount} <span className="text-xs text-slate-400 font-normal">SV</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <div className="text-[11px] font-bold text-sky-600 dark:text-cyan-400">Dẫn đầu</div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {leadingOption ? `${Math.round((leadingOption.votes / totalVotedCount) * 100)}%` : '---'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Breakdown of poll options with progress bars */}
                        {currentAnn.hasPoll && currentAnn.poll && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span>Kết quả phân bổ phiếu bầu:</span>
                              <span className="text-slate-400 font-normal">
                                {currentAnn.poll.question}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {currentAnn.poll.options.map((opt, idx) => {
                                const pct = totalVotedCount > 0 ? Math.round((opt.votes / totalVotedCount) * 100) : 0;
                                const isLeading = opt.votes === maxVotes && opt.votes > 0;

                                return (
                                  <div key={opt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <div className="flex items-center gap-2 truncate pr-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 text-[10px]">
                                          {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="text-slate-900 dark:text-white truncate">{opt.text}</span>
                                        {isLeading && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] font-extrabold shrink-0">
                                            Dẫn đầu
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-emerald-600 dark:text-[#00dfa2] font-extrabold shrink-0">
                                        {pct}% ({opt.votes} phiếu)
                                      </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-700 ${
                                          isLeading 
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                            : 'bg-slate-400 dark:bg-slate-600'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Interactive Table of 50 Students */}
                        {currentAnn.hasPoll && currentAnn.poll && (
                          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-500" />
                                <span>Chi Tiết Biểu Quyết {totalClassStudents} Sinh Viên Lớp K26 CNTT</span>
                              </h4>

                              {/* Search & filter chips */}
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={studentSearchTerm}
                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                    placeholder="Tìm tên / Mã SV..."
                                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-36 sm:w-48"
                                  />
                                </div>

                                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                                  <button
                                    onClick={() => setStudentFilterStatus('all')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                      studentFilterStatus === 'all'
                                        ? 'bg-white dark:bg-[#0c1424] text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Tất cả ({totalClassStudents})
                                  </button>
                                  <button
                                    onClick={() => setStudentFilterStatus('voted')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                      studentFilterStatus === 'voted'
                                        ? 'bg-white dark:bg-[#0c1424] text-emerald-600 dark:text-[#00dfa2] shadow-sm'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Đã vote ({totalVotedCount})
                                  </button>
                                  <button
                                    onClick={() => setStudentFilterStatus('pending')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                      studentFilterStatus === 'pending'
                                        ? 'bg-white dark:bg-[#0c1424] text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Chờ ({pendingCount})
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Table container */}
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[380px]">
                              <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-[#090e1a] text-slate-600 dark:text-slate-400 uppercase text-[10px] font-extrabold z-10 border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="py-2.5 px-3">STT</th>
                                    <th className="py-2.5 px-3">Mã SV</th>
                                    <th className="py-2.5 px-3">Họ và tên</th>
                                    <th className="py-2.5 px-3">Ngày sinh</th>
                                    <th className="py-2.5 px-3">Lựa chọn biểu quyết</th>
                                    <th className="py-2.5 px-3">Thời gian</th>
                                    <th className="py-2.5 px-3">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0c1424]">
                                  {filteredStudents.map((stu, idx) => {
                                    const vote = currentAnn.poll.votesList.find(v => v.studentCode === stu.code);
                                    const chosenOpt = vote ? currentAnn.poll.options.find(o => o.id === vote.optionId) : null;

                                    return (
                                      <tr key={stu.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{stu.stt}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{stu.code}</td>
                                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{stu.name}</td>
                                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{stu.dob}</td>
                                        <td className="py-2 px-3 max-w-[220px] truncate">
                                          {chosenOpt ? (
                                            <span className="font-bold text-emerald-700 dark:text-[#00dfa2] text-xs">
                                              {chosenOpt.text}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic text-[11px]">Chưa phản hồi</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                          {vote ? vote.votedAt.split(' ')[1] || vote.votedAt : '---'}
                                        </td>
                                        <td className="py-2 px-3 whitespace-nowrap">
                                          {vote ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                                              <Check className="w-3 h-3" /> Đã vote
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                              <Clock className="w-3 h-3" /> Chờ vote
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Non-poll announcement body */}
                        {!currentAnn.hasPoll && (
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-3 text-xs leading-relaxed">
                            <div className="font-bold text-slate-800 dark:text-white">
                              Tóm tắt ý chính công văn:
                            </div>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                              {currentAnn.aiSummary?.keyPoints?.map((kp, i) => (
                                <li key={i}>{kp}</li>
                              ))}
                            </ul>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                              Hành động yêu cầu: <strong className="text-slate-700 dark:text-slate-300">{currentAnn.aiSummary?.actionRequired}</strong>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })()}

          {activeTab === 'announcements' && communitySubTab === 'live_qa' && (
            <LiveQaAndCheckpointsAddon role="teacher" triggerToast={triggerToast} />
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 4: SỔ ĐIỂM TỰ ĐỘNG & THỐNG KÊ KẾT QUẢ HỌC TẬP                   */}
          {/* ========================================================================= */}
          {activeTab === 'gradebook' && academicSubTab === 'gradebook_main' && (
            <TeacherGradebook triggerToast={triggerToast} />
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 3: BÀI TẬP LỚN, THỰC HÀNH LAB & HÀNG ĐỢI PHÒNG LAB              */}
          {/* ========================================================================= */}
          {activeTab === 'assignments' && practiceSubTab === 'assignments_main' && (
            <TeacherAssignments triggerToast={triggerToast} />
          )}
          {activeTab === 'assignments' && practiceSubTab === 'lab_queue' && (
            <LabHelpQueueHub role="teacher" triggerToast={triggerToast} />
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 2: GIẢNG ĐƯỜNG & TƯƠNG TÁC LIVE (QR, PICKER, WEBRTC, QUIZ)      */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && classroomSubTab === 'cold_call' && (
            <AttendanceExitAndPickerAddon role="teacher" triggerToast={triggerToast} />
          )}
          {activeTab === 'attendance' && classroomSubTab === 'virtual_class' && (
            <VirtualClassroomHub role="teacher" triggerToast={triggerToast} />
          )}
          {activeTab === 'attendance' && classroomSubTab === 'live_quiz' && (
            <LiveFlashQuizHub role="teacher" triggerToast={triggerToast} />
          )}

          {activeTab === 'attendance' && classroomSubTab === 'qr_live' && (
            <div className="space-y-6">
              {/* ========================================================================= */}
              {/* CLASS SELECTOR RIBBON (THANH ĐIỀU KHIỂN & CHỌN LỚP GIẢNG DẠY TRỰC QUAN)    */}
              {/* REAL-TIME TIMETABLE & MANUAL ACTIVATION BANNER (Auto-detects current period without auto-starting QR) */}
              <div
                id="banner-timetable-current-period"
                className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0f1c33] to-teal-950 text-white border border-teal-500/30 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0 text-[#00dfa2]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#00dfa2] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {timetableNow.dayLabel}, {timetableNow.dateStr} • {timetableNow.timeStr}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-teal-200 border border-white/15">
                        {timetableNow.shiftLabel}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-white">
                      Tiết hiện tại theo TKB: <span className="text-[#00dfa2]">{timetableNow.periodDisplay}</span>
                    </div>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                      {timetableNow.matchedClass ? (
                        <>
                          <span>
                            Lớp đúng lịch hiện tại: <b className="text-white">{timetableNow.matchedClass.className}</b> ({timetableNow.matchedClass.room}) • {timetableNow.matchedClass.subject}
                          </span>
                          {timetableNow.matchedClass.id !== selectedClassId && (
                            <button
                              type="button"
                              onClick={() => handleSelectClass(timetableNow.matchedClass.id)}
                              className="px-2.5 py-0.5 rounded-lg bg-[#00dfa2] text-slate-950 font-black text-[11px] hover:brightness-110 transition cursor-pointer"
                            >
                              Chuyển sang lớp đúng lịch
                            </button>
                          )}
                        </>
                      ) : (
                        <span>
                          Chưa có lịch dạy cố định trong ngày — Lớp quản lý: <b className="text-white">{currentClass.className}</b> (Chỉ mở điểm danh khi GV bấm bật thủ công)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
                  {activeSession?.status === 'closed' ? (
                    <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-extrabold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Ca điểm danh đã khóa sổ
                    </span>
                  ) : isAttendanceStarted ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-[#00dfa2] text-xs font-extrabold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00dfa2] animate-ping inline-block" />
                      Đang bật điểm danh QR (GV kích hoạt)
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                      <Pause className="w-3.5 h-3.5" /> Chờ GV bấm bật thủ công
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Stat Summary Cards for Current Selected Class (Computed live from SQLite & UI) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm neu-flat">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sĩ số lớp: <b className="text-slate-700 dark:text-slate-300">{currentClass.className}</b></div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {totalClassSize} <span className="text-xs font-normal text-slate-400">sinh viên</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-emerald-200 dark:border-emerald-500/30 shadow-sm neu-flat">
                  <div className="text-xs text-emerald-600 dark:text-[#00dfa2] font-semibold">Đã điểm danh hợp lệ</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-[#00dfa2] mt-1 flex items-baseline gap-2">
                    <span>{liveValidCount}</span>
                    <span className="text-xs font-bold text-emerald-500">({liveAttendanceRate})</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-amber-200 dark:border-amber-500/30 shadow-sm neu-flat">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Cảnh báo vị trí (GPS)</div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {liveWarningCount} <span className="text-xs font-normal text-slate-400">cần duyệt</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-rose-200 dark:border-rose-500/30 shadow-sm neu-flat">
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Vắng mặt chưa có phép</div>
                  <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {liveAbsentCount} <span className="text-xs font-normal text-slate-400">sinh viên</span>
                  </div>
                </div>
              </div>

              {/* MAIN 2-COLUMN GRID (QR PROJECTOR & LIVE LIST) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMN 1: DYNAMIC QR PROJECTOR (Col 7) */}
                <div className="lg:col-span-7 neu-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[#0c1424]">
                  
                  {/* Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                        Trình Chiếu Dynamic QR Giảng Đường • {currentClass.className}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {currentClass.subject} • Trạm WiFi: {currentClass.wifiAP}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* QR Interval Selector: 3s (Default / Anti-Cheat) | 5s | 10s */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1.5 uppercase hidden sm:inline">Chu kỳ:</span>
                        {[
                          { sec: 3, label: '3s', desc: 'Siêu bảo mật (Khuyên dùng)' },
                          { sec: 5, label: '5s', desc: 'Cân bằng tiêu chuẩn' },
                          { sec: 10, label: '10s', desc: 'Giảng đường lớn' }
                        ].map(opt => (
                          <button
                            key={opt.sec}
                            type="button"
                            onClick={() => {
                              setQrInterval(opt.sec);
                              setCountdown(opt.sec);
                              triggerToast(`Đã chuyển chu kỳ làm mới mã QR sang: ${opt.sec}s (${opt.desc})`);
                            }}
                            title={opt.desc}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              qrInterval === opt.sec
                                ? 'bg-emerald-500 text-slate-950 shadow-sm ring-1 ring-emerald-400/50 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <button
                        id="btn-fullscreen-qr"
                        type="button"
                        onClick={() => handleToggleFullscreen()}
                        className="px-3 py-1.5 rounded-xl neu-btn text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2]" />
                        <span className="hidden sm:inline">{isFullscreen ? 'Đang Chiếu Full' : 'Toàn Màn Hình'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic QR Center Display */}
                  <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                    
                    {/* Real Scannable QR Code Container with Center Logo & Glowing Frame */}
                    <div className="relative p-5 rounded-3xl neu-flat border-2 border-emerald-500/40 shadow-2xl bg-white dark:bg-[#090e1a] group transition-transform duration-300 hover:scale-[1.01] flex items-center justify-center">
                      
                      {/* Corner Accents */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-teal-500 dark:border-[#00dfa2]" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-teal-500 dark:border-[#00dfa2]" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-teal-500 dark:border-[#00dfa2]" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-teal-500 dark:border-[#00dfa2]" />

                      {/* Real Scannable ISO QR Code or Manual Standby Card */}
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                          {activeSession?.status === 'closed' ? (
                            <div className="w-[205px] h-[205px] flex flex-col items-center justify-center p-4 bg-slate-950 text-white rounded-xl text-center space-y-2">
                              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                                <Lock className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-black uppercase text-rose-400 tracking-wider">
                                Ca Học Đã Khóa Sổ
                              </span>
                              <p className="text-[11px] text-slate-200">
                                Sĩ số có mặt: <b className="text-emerald-400 font-bold">{liveValidCount}/{mergedCurrentStudents.length}</b> ({mergedCurrentStudents.length > 0 ? Math.round((liveValidCount / mergedCurrentStudents.length) * 100) : 0}%)
                              </p>
                              <p className="text-[9px] text-slate-400">
                                Đã chốt {mergedCurrentStudents.length - liveValidCount} sinh viên vắng mặt vào SQLite.
                              </p>
                            </div>
                          ) : !isAttendanceStarted ? (
                            <div
                              id="qr-manual-standby-card"
                              className="w-[225px] min-h-[225px] flex flex-col items-center justify-center p-4 bg-slate-950 text-white rounded-xl text-center space-y-3 border border-slate-800"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/40">
                                <QrCode className="w-6 h-6" />
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                CHƯA BẬT ĐIỂM DANH
                              </span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                Giáo viên chủ động bấm bật để trình chiếu QR ({timetableNow.periodDisplay})
                              </p>
                              <button
                                id="btn-start-qr-attendance"
                                type="button"
                                onClick={handleStartAttendanceSession}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00dfa2] to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Bật Điểm Danh Ngay</span>
                              </button>
                            </div>
                          ) : (
                            <QRCodeSVG
                              value={`${getCheckinBaseUrl()}/?checkin=true&s=${activeSession?.id || 1}&t=${encodeURIComponent(qrToken)}`}
                              size={205}
                              level="M"
                              includeMargin={false}
                              bgColor="#ffffff"
                              fgColor="#0f172a"
                              imageSettings={{
                                src: '/eg-logo-teal.png',
                                x: undefined,
                                y: undefined,
                                height: 38,
                                width: 38,
                                excavate: true
                              }}
                            />
                          )}
                        </div>

                        {/* Mobile Phone Camera direct scan guidance */}
                        <div className="mt-2.5 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                            <Smartphone className="w-3.5 h-3.5 text-[#00dfa2]" />
                            <span>{isAttendanceStarted ? 'Quét bằng Camera điện thoại hoặc Zalo' : 'Chế độ chờ giáo viên kích hoạt'}</span>
                          </div>
                          <div className="text-[10px] text-teal-600 dark:text-[#00dfa2] font-mono select-all bg-slate-100 dark:bg-slate-900/90 py-0.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 max-w-[210px] truncate">
                            {isAttendanceStarted ? `${getCheckinBaseUrl()}/?checkin=true` : `${timetableNow.dayLabel} • ${timetableNow.periodDisplay}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timer and Security Metadata with Animated SVG Progress Ring */}
                    <div className="space-y-4 text-center sm:text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Chu kỳ đổi mã chống chụp ảnh:</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-[#00dfa2] border border-emerald-500/30">
                            {qrInterval}s / Lần
                          </span>
                        </div>

                        <div className="flex items-center justify-center sm:justify-start gap-4">
                          {/* Animated SVG Circular Progress Ring */}
                          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center shadow-md rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                className="stroke-slate-200 dark:stroke-slate-800"
                                strokeWidth="4.5"
                                fill="transparent"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                stroke={!isAttendanceStarted ? '#64748b' : countdown <= 1 ? '#ef4444' : countdown === 2 ? '#f59e0b' : '#00dfa2'}
                                strokeWidth="4.5"
                                strokeDasharray={163.36}
                                strokeDashoffset={isAttendanceStarted ? 163.36 * (1 - countdown / qrInterval) : 163.36}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-1000 ease-linear"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-xl font-black transition-colors ${
                                !isAttendanceStarted ? 'text-slate-400 text-sm' : countdown <= 1 ? 'text-rose-500 animate-pulse' : countdown === 2 ? 'text-amber-500' : 'text-emerald-600 dark:text-[#00dfa2]'
                              }`}>
                                {isAttendanceStarted ? `${countdown}s` : 'CHỜ'}
                              </span>
                            </div>
                          </div>

                          <div className="text-left space-y-0.5">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{isAttendanceStarted ? 'Mã QR Thật 100%' : 'Sẵn Sàng Kích Hoạt'}</span>
                              {isAttendanceStarted && activeSession?.status !== 'closed' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Thuật toán Sliding Window (Dung sai +{qrInterval}s)
                            </div>
                            <div className={`text-[10px] font-medium ${isAttendanceStarted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {isAttendanceStarted ? 'Camera điện thoại quét tức thì' : 'Chỉ phát QR khi giáo viên bấm Bật'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Real Browser GPS Geolocation Lock (Backend yêu cầu quyền vị trí) */}
                      <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2 text-xs shadow-inner">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${
                              teacherGps.status === 'granted'
                                ? 'text-teal-600 dark:text-[#00dfa2]'
                                : 'text-amber-500'
                            }`} />
                            <span className="truncate font-semibold">
                              {teacherGps.status === 'granted'
                                ? `GPS thực: ${teacherGps.lat.toFixed(5)}°, ${teacherGps.lng.toFixed(5)}° (±${teacherGps.accuracy}m)`
                                : teacherGps.status === 'requesting'
                                ? 'Đang xin quyền lấy vị trí GPS...'
                                : 'Chưa lấy vị trí GPS trình duyệt'}
                            </span>
                          </div>
                          <button
                            type="button"
                            id="btn-teacher-request-gps"
                            onClick={requestTeacherLocation}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 font-extrabold text-[10px] shrink-0 cursor-pointer"
                          >
                            📍 {teacherGps.status === 'granted' ? 'Cập nhật GPS' : 'Lấy Vị Trí GPS'}
                          </button>
                        </div>
                        {teacherGps.error && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            {teacherGps.error}
                          </div>
                        )}
                      </div>

                      {/* Action Controls: Start/Pause, Simulate, Lock/Finalize, Excel Export, Reset */}
                      <div className="grid grid-cols-2 gap-2">
                        {isAttendanceStarted && activeSession?.status === 'active' && (
                          <button
                            id="btn-pause-qr-attendance"
                            type="button"
                            onClick={handlePauseAttendanceSession}
                            className="col-span-2 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Tạm dừng hiển thị mã QR cho sinh viên"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>⏸ Tạm dừng phát QR</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleExportAttendanceExcel}
                          className="py-2.5 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
                          title={`Tải xuống tệp Excel biên bản giảng đường đầy đủ ${mergedCurrentStudents.length} sinh viên`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Xuất File Excel</span>
                        </button>

                        {activeSession?.status === 'closed' ? (
                          <button
                            type="button"
                            onClick={handleReopenSession}
                            className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            title="Mở lại ca điểm danh để sinh viên tiếp tục quét mã"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Mở Lại Ca</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCloseSessionModal(true)}
                            disabled={!activeSession?.id}
                            className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-45 disabled:cursor-not-allowed text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
                            title="Khóa ca và tự động chốt toàn bộ sinh viên vắng mặt vào CSDL"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Khóa & Chốt Sổ</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleResetSessionAttendance}
                          title="Làm mới ca điểm danh (Xóa lượt quét để bắt đầu ca mới)"
                          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Làm mới ca</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Footer Info: Shows both Current and Previous Sliding Token */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#00dfa2]" />
                      Chuẩn chống điểm danh hộ 0đ thiết bị
                    </span>
                    
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                        Mã hiện hành: {qrToken}
                      </span>
                      {previousToken && (
                        <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded-lg hidden md:inline">
                          Dung sai mạng: {previousToken}
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: REAL-TIME ATTENDANCE LIST (Col 5) */}
                <div className="lg:col-span-5 neu-card rounded-3xl p-6 flex flex-col justify-between border border-slate-200 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[#0c1424]">
                  
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-teal-600 dark:text-[#00dfa2]" />
                          Nhật Ký Quét Mã Trực Tuyến
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {filteredStudents.length} kết quả phù hợp
                        </p>
                      </div>

                      <button 
                        onClick={handleExportAttendanceExcel}
                        className="px-2.5 py-1.5 rounded-xl neu-btn text-teal-700 dark:text-[#00dfa2] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 border border-teal-500/30 text-xs font-bold shadow-sm"
                        title="Xuất Biên Bản Điểm Danh Ra Tệp Excel (.xlsx)"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Xuất Excel</span>
                      </button>
                    </div>

                    {/* Filter and Search */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={attendanceSearch}
                          onChange={(e) => setAttendanceSearch(e.target.value)}
                          placeholder="Tìm tên hoặc mã số sinh viên..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
                        <button
                          onClick={() => setAttendanceFilter('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${attendanceFilter === 'all' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          Tất cả ({mergedCurrentStudents.length})
                        </button>
                        <button
                          onClick={() => setAttendanceFilter('valid')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${attendanceFilter === 'valid' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          Hợp lệ ({liveValidCount})
                        </button>
                        <button
                          onClick={() => setAttendanceFilter('excused')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${attendanceFilter === 'excused' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          Có phép ({liveExcusedCount})
                        </button>
                        <button
                          onClick={() => setAttendanceFilter('pending')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${attendanceFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          Cảnh báo GPS ({liveWarningCount})
                        </button>
                        <button
                          onClick={() => setAttendanceFilter('absent')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${attendanceFilter === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          Vắng ({liveAbsentCount})
                        </button>
                      </div>
                    </div>

                    {/* Live Student Feed */}
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {filteredStudents.map((student) => (
                        <div 
                          key={student.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            student.status === 'valid'
                              ? 'bg-emerald-50/50 dark:bg-[#091522] border-emerald-200/80 dark:border-emerald-500/20'
                              : student.status === 'excused'
                              ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-500/30'
                              : student.status === 'absent'
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/20'
                              : student.status === 'unrecorded'
                              ? 'bg-slate-50/80 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800'
                              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between text-xs">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {student.name}
                                <span className="font-mono text-[10px] text-slate-500">({student.id})</span>
                                {student.isLiveDb && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/40 animate-pulse">
                                    Live {student.tokenMatchType === 'grace_period' ? '⚡ Cửa Sổ Trượt' : '✓ QR 3s'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {student.dist}
                                </span>
                                <span>•</span>
                                <span>{student.wifi}</span>
                                <span>•</span>
                                <span>{student.time}</span>
                              </div>
                            </div>

                            <div>
                              {student.status === 'valid' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-[#00dfa2] text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Hợp lệ
                                </span>
                              ) : student.status === 'excused' ? (
                                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-800 dark:text-[#00b4d8] text-[10px] font-bold border border-sky-500/30 flex items-center gap-1">
                                  <FileCheck2 className="w-3 h-3" /> Có phép
                                </span>
                              ) : student.status === 'unrecorded' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-300 dark:border-slate-700">
                                    Chưa điểm danh
                                  </span>
                                  <button
                                    onClick={() => handleCheckInSpecificStudent(student.id)}
                                    className="px-2 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] text-[10px] font-bold border border-teal-500/30 transition-all cursor-pointer flex items-center gap-1"
                                    title="Ghi nhận điểm danh thực tế cho sinh viên này vào SQLite"
                                  >
                                    ⚡ Điểm danh
                                  </button>
                                </div>
                              ) : student.status === 'absent' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 text-[10px] font-bold border border-rose-500/30">
                                    Vắng mặt
                                  </span>
                                  <button
                                    onClick={() => handleCheckInSpecificStudent(student.id)}
                                    className="px-2 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] text-[10px] font-bold border border-teal-500/30 transition-all cursor-pointer flex items-center gap-1"
                                    title="Ghi nhận điểm danh thực tế cho sinh viên này vào SQLite"
                                  >
                                    ⚡ Điểm danh
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                  Cần duyệt
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Approval Actions for Pending */}
                          {student.status === 'pending' && (
                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-500/20 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveStudent(student.id, 'valid')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-[#00dfa2] text-[10px] font-bold border border-emerald-500/40 transition-colors cursor-pointer"
                              >
                                ✓ Chấp nhận
                              </button>
                              <button
                                onClick={() => handleApproveStudent(student.id, 'absent')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-500/40 transition-colors cursor-pointer"
                              >
                                ✕ Đánh vắng
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Live Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Tỷ lệ có mặt lớp:</span>
                    <span className="font-extrabold text-teal-600 dark:text-[#00dfa2]">{liveAttendanceRate} ({liveValidCount}/{totalClassSize})</span>
                  </div>

                </div>

              </div>

            </div>
          )}



          {/* ========================================================================= */}
          {/* WORKSPACE 4 -> SUB-TAB: XÉT DUYỆT ĐƠN NGHỈ PHÉP & HỌC BÙ AI               */}
          {/* ========================================================================= */}
          {activeTab === 'gradebook' && academicSubTab === 'approvals' && (
            <div className="space-y-5">
              {/* Compact 2-button view switcher: Classic Leave Requests vs AI OCR & Make-up Pack */}
              <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  type="button"
                  id="toggle-leave-view-classic"
                  onClick={() => setLeaveView('classic')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    leaveView === 'classic'
                      ? 'bg-white dark:bg-[#121f38] text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📋 Danh sách đơn cần duyệt</span>
                  {pendingLeaveCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {pendingLeaveCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  id="toggle-leave-view-ai-ocr"
                  onClick={() => setLeaveView('ai_ocr')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    leaveView === 'ai_ocr'
                      ? 'bg-white dark:bg-[#121f38] text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🤖 AI Quét minh chứng & Gói học bù</span>
                </button>
              </div>

              {leaveView === 'ai_ocr' ? (
                <LeaveAiAndMakeupAddon role="teacher" triggerToast={triggerToast} />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 neu-flat">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-sky-600 dark:text-[#00b4d8]" />
                    Hồ Sơ Đơn Nghỉ Học Có Phép (Trực Tuyến)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống lưu trữ minh chứng y tế, phê duyệt 1-chạm cập nhật tự động vào sổ cái chuyên cần tín chỉ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setApprovalFilter('all')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${approvalFilter === 'all' ? 'bg-sky-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    Tất cả ({leaveRequests.length})
                  </button>
                  <button
                    onClick={() => setApprovalFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${approvalFilter === 'pending' ? 'bg-amber-600 text-white shadow' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'}`}
                  >
                    Chờ duyệt ({leaveRequests.filter(r => r.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setApprovalFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${approvalFilter === 'approved' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-500/10 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30'}`}
                  >
                    Đã duyệt ({leaveRequests.filter(r => r.status === 'approved').length})
                  </button>
                  <button
                    onClick={() => setApprovalFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${approvalFilter === 'rejected' ? 'bg-rose-600 text-white shadow' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'}`}
                  >
                    Từ chối ({leaveRequests.filter(r => r.status === 'rejected').length})
                  </button>
                </div>
              </div>

              {/* Leave Requests Cards */}
              <div className="grid grid-cols-1 gap-4">
                {leaveRequests.filter(r => approvalFilter === 'all' || r.status === approvalFilter).map((req) => (
                  <div 
                    key={req.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                            {req.studentName}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            MSSV: {req.studentId} • Lớp: {req.classId}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Xin nghỉ buổi: <span className="font-bold text-sky-700 dark:text-[#00b4d8]">{req.date} ({req.period})</span>
                        </div>
                      </div>

                      <div>
                        {req.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                            Chờ xét duyệt
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-[#00dfa2] text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Đã duyệt (Có phép)
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-500/30">
                            Đã từ chối (Vắng không phép)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason and Proof Attachment */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div>
                        <span className="text-slate-500 font-semibold">Lý do sinh viên trình bày: </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{req.reason}</span>
                      </div>

                      {req.reviewNote && (
                        <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300">
                          <strong>Nhận xét giảng viên:</strong> {req.reviewNote}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-sky-600 dark:text-cyan-400 font-semibold">
                          <FileText className="w-4 h-4" />
                          <span>Tệp minh chứng đính kèm: {req.proofName}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProof(req);
                            setTeacherReviewNoteInput(req.reviewNote || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-cyan-300 hover:bg-sky-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem ảnh minh chứng
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'rejected')}
                          className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          ✕ Từ chối (Không phép)
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(req.id, 'approved')}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Phê duyệt nghỉ có phép
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
                </>
              )}

            </div>
          )}



          {/* ========================================================================= */}
          {/* WORKSPACE 5: TRỢ LÝ AI SOẠN GIẢNG BLOOM & SƠ ĐỒ TƯ DUY MINDMAP            */}
          {/* ========================================================================= */}
          {activeTab === 'ai_lesson' && (aiSubTab === 'mindmap' || aiSubTab === 'lecture_recap') && (
            <AiLectureMindmapHub
              role="teacher"
              initialFeatureTab={aiSubTab === 'lecture_recap' ? 'course_recap' : 'ai_generator'}
              triggerToast={triggerToast}
              initialTitle={aiGeneratedResult?.title || aiLessonTopic}
              initialFileName={aiGeneratedResult?.sourceFileName || aiLessonFile?.name || ''}
              initialRawText={aiLessonDocText || ''}
              onAiEngineUsed={(engine) => {
                if (engine) setLastAiEngineUsed(engine);
              }}
            />
          )}

          {activeTab === 'ai_lesson' && aiSubTab === 'bloom_builder' && (
            <div className="space-y-6">
              {/* Tool Config Form */}
              <div className="neu-card rounded-3xl p-6 sm:p-8 border border-purple-200 dark:border-purple-500/30 bg-white dark:bg-[#0c1424] space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                        Thiết Kế Bài Giảng Tự Động Với AI Chuẩn Thang Đo Bloom
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tự động phân rã nội dung bài giảng thành cấu trúc 3 phần, trích xuất 12 slide trình chiếu và sinh ngân hàng câu hỏi phân hóa.
                      </p>
                    </div>
                  </div>
                  <span
                    id="teacher-ai-engine-badge"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-extrabold shrink-0 self-start sm:self-center"
                  >
                    <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{lastAiEngineUsed || aiEngineConfig?.activeEngineLabel || 'AI Backend (Deep SQLite RAG + Academic NLP)'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Chủ đề / Tên bài giảng cần sinh giáo án *
                    </label>
                    <input 
                      type="text" 
                      value={aiLessonTopic}
                      onChange={(e) => setAiLessonTopic(e.target.value)}
                      className="w-full p-3 rounded-xl neu-inset text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Cấp độ Bloom mục tiêu
                    </label>
                    <select 
                      value={aiBloomLevel}
                      onChange={(e) => setAiBloomLevel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm"
                    >
                      <option value="Nhận biết (Remembering)">Nhận biết (Remembering)</option>
                      <option value="Thông hiểu (Understanding)">Thông hiểu (Understanding)</option>
                      <option value="Vận dụng (Applying)">Vận dụng (Applying)</option>
                      <option value="Vận dụng cao (Analyzing & Evaluating)">Vận dụng cao (Analyzing & Evaluating)</option>
                    </select>
                  </div>
                </div>

                {/* Word Document (.docx / .doc / .pdf / .txt) Upload & Extraction Area */}
                <div id="lesson-word-upload-section" className="space-y-3">
                  <input
                    ref={lessonFileInputRef}
                    id="lesson-word-file-input"
                    type="file"
                    accept=".docx,.doc,.pdf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadLessonWordFile(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  <div
                    id="lesson-word-upload-zone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingLessonFile(true);
                    }}
                    onDragLeave={() => setIsDraggingLessonFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLessonFile(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) handleUploadLessonWordFile(droppedFile);
                    }}
                    className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 transition-all ${
                      isDraggingLessonFile
                        ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
                        : 'border-purple-300/70 dark:border-purple-500/35 bg-purple-50/40 dark:bg-[#090e1a]/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            Tải Lên File Word Giáo Án / Đề Cương Bài Giảng (.docx, .doc, .pdf, .txt)
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Kéo thả tệp Word bài giảng vào đây hoặc bấm chọn từ máy tính. AI tự động đọc nội dung tệp Word (.docx/.doc), bóc tách các mục chính để sinh 12 slide & câu hỏi chuẩn Bloom.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          id="btn-upload-lesson-word"
                          type="button"
                          disabled={aiLessonUploading}
                          onClick={() => lessonFileInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all"
                        >
                          <FileUp className="w-4 h-4" />
                          <span>{aiLessonUploading ? 'Đang đọc file Word...' : 'Chọn File Word (.docx / .doc) Từ Máy'}</span>
                        </button>

                        <button
                          id="btn-download-sample-word"
                          type="button"
                          onClick={handleDownloadSampleWordTemplate}
                          className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c1424] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                          title="Tải xuống một tệp giáo án Word mẫu về máy tính"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Tải file Word mẫu (.doc)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Word Preview Card */}
                  {aiLessonFile && (
                    <div
                      id="uploaded-word-lesson-card"
                      className="rounded-2xl p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/35 space-y-3 animate-fadeIn"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{aiLessonFile.name}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {aiLessonFile.size} • {aiLessonFile.wordCount} từ • {aiLessonSections.length} mục nội dung
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id="btn-change-lesson-word"
                            type="button"
                            onClick={() => lessonFileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                          >
                            Đổi file Word khác
                          </button>
                          <button
                            id="btn-remove-lesson-word"
                            type="button"
                            onClick={handleRemoveLessonWordFile}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa file</span>
                          </button>
                        </div>
                      </div>

                      {aiLessonSections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {aiLessonSections.slice(0, 6).map((sec, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/25 text-[10px] font-semibold text-slate-700 dark:text-slate-300 max-w-full truncate"
                            >
                              {sec}
                            </span>
                          ))}
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="word-lesson-extracted-preview"
                          className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1"
                        >
                          Nội dung trích xuất từ file Word giáo án (Có thể chỉnh sửa trước khi sinh Slide & Quiz):
                        </label>
                        <textarea
                          id="word-lesson-extracted-preview"
                          rows={4}
                          value={aiLessonDocText}
                          onChange={(e) => setAiLessonDocText(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-[#090e1a] border border-emerald-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Số lượng slide đề xuất:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">12 slide chuẩn hóa</span>
                    {aiLessonFile && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-sky-300 border border-blue-500/30 font-bold text-[11px]">
                        Nguồn dữ liệu: File Word {aiLessonFile.name}
                      </span>
                    )}
                  </div>

                  <button
                    id="btn-generate-bloom-lesson"
                    onClick={handleGenerateAiLesson}
                    disabled={aiGenerating}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    {aiGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>AI đang phân tích & sinh bài giảng...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>BẮT ĐẦU SINH GIÁO ÁN BLOOM</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Result Container */}
              {aiGeneratedResult && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Slide Outline */}
                  <div className="neu-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] space-y-4 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          Dàn Ý {aiGeneratedResult.slideCount || 12} Slide Bài Giảng Chuẩn Trình Chiếu
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {aiGeneratedResult.sourceFileName
                            ? `Trích xuất trực tiếp từ file Word: ${aiGeneratedResult.sourceFileName} • Mục tiêu ${aiGeneratedResult.bloomLevel}`
                            : 'Đã cấu trúc theo mô hình Giới thiệu - Phân tích - Ứng dụng thực tế'}
                        </p>
                        {(aiGeneratedResult.aiEngine || lastAiEngineUsed) && (
                          <span
                            id="bloom-result-engine-badge"
                            className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[11px] font-bold"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>AI Engine: {aiGeneratedResult.aiEngine || lastAiEngineUsed}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id="btn-copy-bloom-slides"
                          type="button"
                          onClick={handleCopyBloomLesson}
                          className="px-3 py-1.5 rounded-xl neu-btn text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" /> Sao chép
                        </button>
                        <button
                          id="btn-download-bloom-slides"
                          type="button"
                          onClick={handleDownloadBloomSlides}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Tải Slide (.PPTX)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {aiGeneratedResult.slides.map((slide, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{slide}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quizzes Bank */}
                  <div className="neu-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-[#00dfa2]" />
                          Bộ Câu Hỏi Trắc Nghiệm Đánh Giá Chuẩn Thang Bloom
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Có đáp án và lời giải đối chiếu trực tiếp từ học liệu</p>
                      </div>

                      <button
                        id="btn-export-bloom-docx"
                        type="button"
                        onClick={handleExportBloomDocx}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Xuất File Word (.DOC)
                      </button>
                    </div>

                    <div className="space-y-4 pt-2">
                      {aiGeneratedResult.quizzes.map((quiz, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {quiz.q}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {quiz.options.map((opt, oIdx) => (
                              <div 
                                key={oIdx} 
                                className={`p-2.5 rounded-xl border ${opt.startsWith(quiz.ans) ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-[#00dfa2] font-bold' : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            <span className="font-semibold text-emerald-600 dark:text-[#00dfa2]">Giải thích: </span>
                            {quiz.explain}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}



          {/* ========================================================================= */}
          {/* WORKSPACE 4 -> SUB-TAB: LỊCH GIẢNG DẠY & BIỂU ĐỒ CHUYÊN CẦN               */}
          {/* ========================================================================= */}
          {activeTab === 'gradebook' && academicSubTab === 'schedule' && (() => {
            const totalStudents = allClassStudents.length;
            const zeroAbs = allClassStudents.filter(s => (Number(s.absences) || 0) === 0).length;
            const oneTwoAbs = allClassStudents.filter(s => { const a = Number(s.absences) || 0; return a === 1 || a === 2; }).length;
            const warnAbs = allClassStudents.filter(s => (Number(s.absences) || 0) === 3).length;
            const bannedAbs = allClassStudents.filter(s => (Number(s.absences) || 0) >= 4).length;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 neu-card rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Lịch Giảng Dạy Tuần • {user?.name || 'ThS. Phạm Văn Thuận'}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                        Chưa có lịch phân công
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          Hiện tại giảng viên {user?.name || 'ThS. Phạm Văn Thuận'} chưa có lịch giảng dạy được phân công.
                        </p>
                        <p className="text-[11px] opacity-85 mt-0.5">
                          Hệ thống chỉ hiển thị danh sách thực tế gồm <strong>{totalStudents} sinh viên lớp {currentClass.className}</strong> từ file Excel (cùng cột số buổi nghỉ Ktra).
                        </p>
                      </div>
                    </div>

                    {/* Bảng lịch tuần trống chính thức */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full min-w-[600px] border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                            <th className="p-2.5 border border-slate-200 dark:border-slate-800 font-extrabold w-20">Buổi</th>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((d) => (
                              <th key={d} className="p-2.5 border border-slate-200 dark:border-slate-800 font-bold text-center">
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {['Sáng', 'Chiều', 'Tối'].map((buoi) => (
                            <tr key={buoi}>
                              <td className="p-2.5 border border-slate-200 dark:border-slate-800 font-bold text-center bg-slate-50 dark:bg-[#090e1a] text-slate-600 dark:text-slate-300">
                                {buoi}
                              </td>
                              {Array.from({ length: 7 }).map((_, idx) => (
                                <td
                                  key={`${buoi}-${idx}`}
                                  className="p-3 border border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-600 bg-white dark:bg-[#0c1424]"
                                >
                                  —
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="neu-card rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1424] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                        Thống Kê Cột Ktra ({currentClass.className})
                      </h3>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Nghỉ 0 buổi:</span>
                        <strong className="text-emerald-600 dark:text-[#00dfa2]">{zeroAbs} SV</strong>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Nghỉ 1–2 buổi:</span>
                        <strong className="text-sky-600 dark:text-cyan-400">{oneTwoAbs} SV</strong>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Nghỉ 3 buổi (Cảnh báo):</span>
                        <strong className="text-amber-600 dark:text-amber-400">{warnAbs} SV</strong>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Nghỉ ≥ 4 buổi (Cấm thi):</span>
                        <strong className="text-rose-600 dark:text-rose-400">{bannedAbs} SV</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}



          {/* ========================================================================= */}
          {/* WORKSPACE 5 -> SUB-TAB: QUẢN LÝ KHO HỌC LIỆU GIẢNG DẠY                    */}
          {/* ========================================================================= */}
          {activeTab === 'ai_lesson' && aiSubTab === 'materials' && (
            <div className="space-y-6">

              {/* Header Card & Open Upload Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 neu-flat">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600 dark:text-[#00dfa2]" />
                    Kho Học Liệu & Bài Giảng Trực Tuyến ({courseMaterials.length} tài liệu)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quản lý tài liệu học phần, slide bài giảng, đề thi & giáo trình mở cấp phép Creative Commons.
                  </p>
                </div>

                <button
                  id="btn-open-upload-material"
                  type="button"
                  onClick={() => setShowUploadMaterialPanel(prev => !prev)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 ${
                    showUploadMaterialPanel
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                  }`}
                >
                  {showUploadMaterialPanel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{showUploadMaterialPanel ? 'Đóng Biểu Mẫu Tải Lên' : 'Đăng Học Liệu Mới'}</span>
                </button>
              </div>

              {/* Upload Course Material Panel */}
              {showUploadMaterialPanel && (
                <form
                  id="teacher-upload-material-panel"
                  onSubmit={handleSubmitUploadMaterial}
                  className="neu-card rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#0c1424] border-2 border-emerald-500/35 shadow-xl space-y-5 animate-fadeIn"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-[#00dfa2]" />
                        Tải Lên & Xuất Bản Học Liệu Mới Lên Hệ Thống
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Hỗ trợ tệp PDF, Word (.docx/.doc), PowerPoint (.pptx/.ppt), Excel (.xlsx), TXT hoặc ZIP mã nguồn. Lưu trực tiếp vào SQLite & đồng bộ ngay tới cổng Sinh viên.
                      </p>
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={materialFileInputRef}
                    id="material-file-upload-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectMaterialFile(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Dropzone Area */}
                  <div
                    id="material-upload-dropzone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingMaterialFile(true);
                    }}
                    onDragLeave={() => setIsDraggingMaterialFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingMaterialFile(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) handleSelectMaterialFile(dropped);
                    }}
                    className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 transition-all ${
                      isDraggingMaterialFile
                        ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                        : 'border-emerald-300/80 dark:border-emerald-500/35 bg-emerald-50/40 dark:bg-[#090e1a]/75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-[#00dfa2] border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                            Kéo thả tệp học liệu vào đây hoặc chọn tệp từ máy tính
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hệ thống tự động bóc tách mục lục từ tệp .docx / .pdf / .txt và gán phân loại phù hợp.
                          </p>
                        </div>
                      </div>

                      <button
                        id="btn-select-material-file"
                        type="button"
                        onClick={() => materialFileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer shrink-0 transition"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Chọn File Học Liệu Từ Máy</span>
                      </button>
                    </div>

                    {/* Selected File Preview Pill */}
                    {newMaterialFile && (
                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#00dfa2] shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">{newMaterialFile.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] text-[10px] font-bold">
                            {newMaterialFile.sizeLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewMaterialFile(null);
                            setNewMaterialFileBase64('');
                            setNewMaterialFileText('');
                            if (materialFileInputRef.current) materialFileInputRef.current.value = '';
                          }}
                          className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Gỡ tệp
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="md:col-span-2">
                      <label htmlFor="input-material-title" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tiêu đề học liệu / Tài liệu bài giảng *
                      </label>
                      <input
                        id="input-material-title"
                        type="text"
                        value={newMaterialTitle}
                        onChange={(e) => setNewMaterialTitle(e.target.value)}
                        placeholder="VD: Slide Bài giảng Tuần 10: Thuật toán Dijkstra & Floyd-Warshall"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="select-material-type" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Phân loại học liệu
                      </label>
                      <select
                        id="select-material-type"
                        value={newMaterialType}
                        onChange={(e) => setNewMaterialType(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Giáo Trình">Giáo Trình</option>
                        <option value="Slide Trình Chiếu">Slide Trình Chiếu</option>
                        <option value="Đề Thi Thử">Đề Thi Thử</option>
                        <option value="Đề Cương">Đề Cương</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-material-access" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Phạm vi chia sẻ
                      </label>
                      <select
                        id="select-material-access"
                        value={newMaterialAccess}
                        onChange={(e) => setNewMaterialAccess(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Công khai toàn hệ thống">Công khai toàn hệ thống</option>
                        <option value="Lớp K26 CNTT">Lớp K26 CNTT</option>
                        <option value="Khối CNTT">Khối CNTT</option>
                        <option value="Nội bộ khoa">Nội bộ khoa</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-material-license" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Giấy phép bản quyền mở
                      </label>
                      <select
                        id="select-material-license"
                        value={newMaterialLicense}
                        onChange={(e) => setNewMaterialLicense(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="CC BY-NC">CC BY-NC (Phi thương mại)</option>
                        <option value="CC BY">CC BY (Ghi công tác giả)</option>
                        <option value="CC BY-SA">CC BY-SA (Chia sẻ tương đồng)</option>
                        <option value="CC BY-NC-ND">CC BY-NC-ND (Không phái sinh)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="input-material-pages" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Số trang / Số slide
                      </label>
                      <input
                        id="input-material-pages"
                        type="text"
                        value={newMaterialPages}
                        onChange={(e) => setNewMaterialPages(e.target.value)}
                        placeholder="VD: 42 slide hoặc 38 trang"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <label htmlFor="input-material-desc" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mô tả tóm tắt & Ghi chú cho sinh viên
                      </label>
                      <textarea
                        id="input-material-desc"
                        rows={2}
                        value={newMaterialDesc}
                        onChange={(e) => setNewMaterialDesc(e.target.value)}
                        placeholder="Mô tả trọng tâm tài liệu, mục tiêu chương học hoặc hướng dẫn sinh viên đọc trước giờ lên lớp..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetUploadMaterialForm();
                        setShowUploadMaterialPanel(false);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      id="btn-submit-upload-material"
                      type="submit"
                      disabled={uploadingMaterial}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transition"
                    >
                      {uploadingMaterial ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải lên kho học liệu...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>🚀 Đăng Tải Lên Kho Học Liệu</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Category Filter & Search Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['Tất cả', 'Giáo Trình', 'Slide Trình Chiếu', 'Đề Thi Thử', 'Đề Cương'].map((cat) => {
                    const count = cat === 'Tất cả'
                      ? courseMaterials.length
                      : courseMaterials.filter(m => m.type === cat).length;
                    const active = materialFilterType === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setMaterialFilterType(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-[#090e1a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-search-materials"
                    type="text"
                    value={materialSearchQuery}
                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                    placeholder="Tìm tên giáo trình, slide, tệp..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Materials Grid */}
              {filteredCourseMaterials.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Chưa có học liệu nào phù hợp bộ lọc hiện tại.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialFilterType('Tất cả');
                      setMaterialSearchQuery('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] text-xs font-bold cursor-pointer"
                  >
                    Hiển thị tất cả học liệu
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCourseMaterials.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/25">
                              {item.type}
                            </span>
                            {item.license && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-cyan-300 border border-cyan-500/25">
                                {item.license}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-medium shrink-0">{item.pages}</span>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {item.fileName && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 max-w-full">
                            <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{item.fileName}</span>
                            {item.fileSizeLabel && (
                              <span className="text-[10px] text-slate-400 shrink-0">({item.fileSizeLabel})</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{item.access}</span>
                          <span className="font-semibold text-emerald-600 dark:text-[#00dfa2]">{item.downloads}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCourseMaterial(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadCourseMaterial(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-cyan-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải xuống</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCourseMaterial(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 6 -> SUB-TAB: HỘP THƯ TIẾP NHẬN & GIẢI ĐÁP PHẢN HỒI SINH VIÊN   */}
          {/* ========================================================================= */}
          {activeTab === 'announcements' && communitySubTab === 'feedback' && (() => {
            const pendingFeedbacks = feedbacks.filter(f => f.status === 'pending');
            const resolvedFeedbacks = feedbacks.filter(f => f.status === 'resolved');
            const ratedFeedbacks = feedbacks.filter(f => f.studentRating);
            const avgRating = ratedFeedbacks.length > 0 
              ? (ratedFeedbacks.reduce((a, b) => a + b.studentRating, 0) / ratedFeedbacks.length).toFixed(1)
              : '--';

            const displayedList = feedbacks.filter(f => {
              if (feedbackFilterStatus !== 'all' && f.status !== feedbackFilterStatus) return false;
              if (feedbackFilterCategory !== 'all' && f.category !== feedbackFilterCategory) return false;
              if (feedbackSearchTerm.trim()) {
                const term = feedbackSearchTerm.toLowerCase();
                const matchName = f.studentName.toLowerCase().includes(term);
                const matchCode = f.studentCode.toLowerCase().includes(term);
                const matchTitle = f.title.toLowerCase().includes(term);
                const matchContent = f.content.toLowerCase().includes(term);
                return matchName || matchCode || matchTitle || matchContent;
              }
              return true;
            });

            return (
              <div className="space-y-6">
                {/* Top KPI Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="neu-card rounded-2xl p-4 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Tổng Phản Hồi</div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {feedbacks.length}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                      <Inbox className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="neu-card rounded-2xl p-4 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-rose-500 uppercase">Chờ Giải Quyết</div>
                      <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {pendingFeedbacks.length}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="neu-card rounded-2xl p-4 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-500 uppercase">Đã Giải Đáp</div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#00dfa2] mt-1">
                        {resolvedFeedbacks.length}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="neu-card rounded-2xl p-4 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-amber-500 uppercase">Hài Lòng Của SV</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
                        {avgRating} <span className="text-xs font-normal text-slate-400">/ 5.0 ⭐</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 fill-amber-500" />
                    </div>
                  </div>
                </div>

                {/* Filter and Export Ribbon */}
                <div className="neu-card rounded-3xl p-4 sm:p-5 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Status Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    {[
                      { id: 'all', label: `Tất cả (${feedbacks.length})` },
                      { id: 'pending', label: `Chờ giải quyết (${pendingFeedbacks.length})` },
                      { id: 'resolved', label: `Đã giải đáp (${resolvedFeedbacks.length})` }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFeedbackFilterStatus(st.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          feedbackFilterStatus === st.id
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Category Dropdown & Search & Excel Export */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={feedbackFilterCategory}
                      onChange={(e) => setFeedbackFilterCategory(e.target.value)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {FEEDBACK_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={feedbackSearchTerm}
                        onChange={(e) => setFeedbackSearchTerm(e.target.value)}
                        placeholder="Tìm tên SV, MSSV, tiêu đề..."
                        className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExportFeedbacksExcel}
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-800 dark:text-[#00dfa2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-[#00dfa2]" />
                      <span>Xuất Báo Cáo Excel</span>
                    </button>
                  </div>
                </div>

                {/* Feedbacks List */}
                <div className="space-y-4">
                  {displayedList.length === 0 ? (
                    <div className="p-12 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Không tìm thấy phản hồi phù hợp</h4>
                      <p className="text-xs text-slate-500">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
                    </div>
                  ) : (
                    displayedList.map(f => {
                      const isPending = f.status === 'pending';
                      const currentReplyDraft = teacherReplyDrafts[f.id] !== undefined 
                        ? teacherReplyDrafts[f.id] 
                        : (f.reply?.content || '');

                      return (
                        <div
                          key={f.id}
                          className={`neu-card rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#0c1424] border shadow-lg space-y-4 transition-all ${
                            isPending
                              ? 'border-amber-300 dark:border-amber-500/30 ring-1 ring-amber-500/15'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {/* Item Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-400">{f.id}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${f.priorityBadge}`}>
                                  {f.priorityLabel}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {f.categoryLabel}
                                </span>
                                {f.isAnonymous && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                    👤 Sinh viên ẩn danh
                                  </span>
                                )}
                              </div>

                              <h4 className="font-extrabold text-base text-slate-900 dark:text-white pt-0.5">
                                {f.title}
                              </h4>

                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                <span>Người gửi: <strong className="text-slate-800 dark:text-slate-200">{f.isAnonymous ? 'Sinh viên ẩn danh' : `${f.studentName} (${f.studentCode})`}</strong></span>
                                <span>•</span>
                                <span>Lớp: {f.studentClass}</span>
                                <span>•</span>
                                <span>Thời gian: {f.createdAt}</span>
                              </div>
                            </div>

                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 self-start ${
                              f.status === 'resolved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}>
                              {f.status === 'resolved' ? '✓ Đã giải đáp' : '⏳ Chờ xử lý'}
                            </span>
                          </div>

                          {/* Visual Progress Stepper 4 steps */}
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Tiến độ giải quyết phản hồi:
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              {[
                                { label: '1. Đã tiếp nhận', done: true, active: false },
                                { label: '2. Đã chuyển GV', done: true, active: false },
                                { label: '3. Đang soạn trả lời', done: f.status === 'resolved', active: f.status === 'pending' },
                                { label: '4. Hoàn tất phản hồi', done: f.status === 'resolved', active: false }
                              ].map((step, sIdx) => (
                                <div key={sIdx} className="space-y-1">
                                  <div className={`h-1.5 rounded-full transition-all ${
                                    step.done 
                                      ? 'bg-emerald-500' 
                                      : step.active 
                                        ? 'bg-amber-500 animate-pulse' 
                                        : 'bg-slate-200 dark:bg-slate-800'
                                  }`} />
                                  <span className={`text-[10px] block truncate ${
                                    step.done 
                                      ? 'font-bold text-emerald-600 dark:text-[#00dfa2]' 
                                      : step.active 
                                        ? 'font-bold text-amber-500' 
                                        : 'text-slate-400'
                                  }`}>
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Student's Question / Feedback Body */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {f.content}
                          </div>

                          {/* Teacher's Existing Reply */}
                          {f.reply && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-cyan-500/10 border border-teal-500/30 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">👨‍🏫</span>
                                  <div>
                                    <span className="font-extrabold text-xs text-teal-900 dark:text-[#00dfa2]">
                                      Câu trả lời của bạn ({f.reply.teacherName})
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-2">{f.reply.repliedAt}</span>
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]">
                                  Đã gửi đến sinh viên
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {f.reply.content}
                              </p>

                              {/* Student Rating Display */}
                              {f.studentRating && (
                                <div className="pt-2 border-t border-teal-500/20 flex items-center gap-2 text-xs">
                                  <span className="text-amber-500 font-bold flex items-center gap-1">
                                    ★ Sinh viên đánh giá: {f.studentRating}/5 Sao
                                  </span>
                                  {f.studentRatingFeedback && (
                                    <span className="text-slate-500 italic">
                                      — "{f.studentRatingFeedback}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reply Composer */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <MessageSquareText className="w-4 h-4 text-teal-600 dark:text-[#00dfa2]" />
                                <span>{f.reply ? 'Cập Nhật / Bổ Sung Câu Trả Lời' : 'Soạn Câu Trả Lời Cho Sinh Viên'}</span>
                              </label>

                              {/* AI Smart Suggest Draft Button */}
                              <button
                                type="button"
                                onClick={() => handleAiSuggestReply(f)}
                                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                <span>Trợ Lý AI Gợi Ý Câu Trả Lời</span>
                              </button>
                            </div>

                            <textarea
                              rows={3}
                              value={currentReplyDraft}
                              onChange={(e) => setTeacherReplyDrafts({ ...teacherReplyDrafts, [f.id]: e.target.value })}
                              placeholder="Nhập câu trả lời hướng dẫn, lời khuyên học phần hoặc hẹn lịch tư vấn trực tiếp..."
                              className="w-full p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                            />

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleTeacherSendReply(f.id)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-[#00dfa2] hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                              >
                                <Send className="w-4 h-4" />
                                <span>Gửi Phản Hồi Cho Sinh Viên</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })()}
          </div>

        </main>
      </div>

      {/* POPUP MODAL: KHÓA SỔ & CHỐT CA ĐIỂM DANH */}
      {showCloseSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowCloseSessionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/25">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Chốt Sổ & Khóa Ca Điểm Danh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lớp: {currentClass.className}
                </p>
              </div>
            </div>

            {/* Summary KPI Block */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Sĩ số</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{mergedCurrentStudents.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-600 font-bold uppercase">Có mặt</div>
                <div className="text-lg font-black text-emerald-600 dark:text-[#00dfa2]">{liveValidCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-600 font-bold uppercase">Vắng mặt</div>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {mergedCurrentStudents.length - liveValidCount}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Lưu ý khi khóa ca học:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hệ thống sẽ ghi nhận vĩnh viễn trạng thái <b className="font-bold">Vắng mặt</b> cho {mergedCurrentStudents.length - liveValidCount} sinh viên chưa quét mã vào SQLite CSDL. Mã QR sẽ ngừng cấp phép điểm danh.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseSessionModal(false)}
                className="py-2.5 px-4 rounded-xl neu-btn text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmCloseSession}
                disabled={isClosingSession}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isClosingSession ? 'Đang khóa...' : 'Xác nhận Khóa Sổ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: XEM MINH CHỨNG ĐƠN NGHỈ HỌC */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-cyan-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Hồ Sơ Minh Chứng: {selectedProof.studentName}
                </h3>
                <p className="text-xs text-slate-500">Mã đơn: {selectedProof.requestCode || selectedProof.id} • Tệp: {selectedProof.proofName}</p>
              </div>
            </div>

            {/* Proof Image Preview */}
            {selectedProof.proofImage && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-slate-900 flex items-center justify-center">
                <img 
                  src={selectedProof.proofImage} 
                  alt="Minh chứng y tế / công tác" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                />
              </div>
            )}

            {/* Detailed Request Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <div>• Sinh viên: <strong className="text-slate-900 dark:text-white">{selectedProof.studentName}</strong> ({selectedProof.studentId})</div>
                <div>• Ngày xin nghỉ: <strong className="text-sky-600 dark:text-[#00b4d8]">{selectedProof.date}</strong></div>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                • <strong>Lý do:</strong> {selectedProof.reason}
              </div>
            </div>

            {/* Teacher Review Note Input */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú & Nhận xét của Giảng viên (tùy chọn):
              </label>
              <input
                type="text"
                value={teacherReviewNoteInput}
                onChange={(e) => setTeacherReviewNoteInput(e.target.value)}
                placeholder="VD: Minh chứng hợp lệ, đồng ý cho phép nghỉ..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Minh chứng y tế hợp lệ', 'Đại diện trường tham gia hoạt động', 'Chưa đủ căn cứ xác minh', 'Nộp quá hạn quy định'].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTeacherReviewNoteInput(tag)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleLeaveDecision(selectedProof.id, 'rejected', teacherReviewNoteInput);
                  setSelectedProof(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer"
              >
                ✕ Từ Chối (Không Phép)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLeaveDecision(selectedProof.id, 'approved', teacherReviewNoteInput);
                  setSelectedProof(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Check className="w-4 h-4" /> Phê Duyệt Có Phép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: XEM TOÀN VĂN CÔNG VĂN GỐC */}
      {previewDispatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setPreviewDispatchModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Toàn Văn Văn Bản / Công Văn Gốc
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Số: {previewDispatchModal.aiSummary?.dispatchNo || 'N/A'} • {previewDispatchModal.title}
                </p>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-text">
              {previewDispatchModal.rawText}
            </div>

            <div className="flex items-center justify-between pt-2 shrink-0 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Đơn vị ban hành: <strong>{previewDispatchModal.aiSummary?.issuer || 'EG Education'}</strong></span>
              <button
                onClick={() => setPreviewDispatchModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: IN BIÊN BẢN HÀNH CHÍNH (Nghị định 30/2020/NĐ-CP) */}
      <PrintMinutesModal
        announcement={printMinutesModalAnnouncement}
        onClose={() => setPrintMinutesModalAnnouncement(null)}
      />

      {/* FULLSCREEN QR PROJECTOR OVERLAY */}
      {isFullscreen && (
        <div
          id="fullscreen-qr-projector"
          className="fixed inset-0 z-[9999] bg-[#060b16] text-white flex flex-col justify-between p-4 sm:p-8 overflow-y-auto"
        >
          {/* Header: Class, Timetable Period, Interval Selector & Exit Fullscreen */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#00dfa2]">
                <Calendar className="w-4 h-4" />
                <span>{timetableNow.dayLabel}, {timetableNow.dateStr} • {timetableNow.timeStr}</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200">
                  {timetableNow.periodDisplay} • {timetableNow.shiftLabel}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
                {currentClass.className} — {currentClass.subject}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Vị trí GPS giảng viên:{' '}
                <b className="text-slate-200">
                  {teacherGps.status === 'granted'
                    ? `${teacherGps.lat.toFixed(5)}°, ${teacherGps.lng.toFixed(5)}° (±${teacherGps.accuracy}m)`
                    : 'Chưa cấp quyền vị trí GPS'}
                </b>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Cycle interval selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-2">Chu kỳ:</span>
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setQrInterval(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      qrInterval === sec
                        ? 'bg-[#00dfa2] text-slate-950 shadow'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <button
                id="btn-exit-fullscreen-qr"
                type="button"
                onClick={() => handleToggleFullscreen(false)}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Thoát Toàn Màn Hình</span>
              </button>
            </div>
          </div>

          {/* Center Stage: Large 360px Projector QR & Live Metrics */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-14 py-6">
            <div className="p-6 rounded-3xl bg-white shadow-2xl border-4 border-[#00dfa2]/50 flex flex-col items-center">
              {activeSession?.status === 'closed' ? (
                <div className="w-[360px] max-w-[78vw] h-[360px] max-h-[78vw] flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl text-center space-y-3">
                  <Lock className="w-14 h-14 text-rose-400" />
                  <h3 className="text-xl font-black text-rose-400 uppercase">Ca Học Đã Khóa Sổ</h3>
                  <p className="text-sm text-slate-300">
                    Có mặt: <b className="text-[#00dfa2]">{liveValidCount}/{mergedCurrentStudents.length}</b> sinh viên
                  </p>
                </div>
              ) : !isAttendanceStarted ? (
                <div className="w-[360px] max-w-[78vw] min-h-[360px] flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl text-center space-y-4">
                  <QrCode className="w-16 h-16 text-amber-400" />
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase">
                    Chờ Giáo Viên Kích Hoạt Điểm Danh
                  </span>
                  <p className="text-sm text-slate-300">
                    Hệ thống nhận diện tiết hiện tại là <b>{timetableNow.periodDisplay}</b>. Bấm nút dưới để phát mã QR lớn lên máy chiếu.
                  </p>
                  <button
                    id="btn-start-qr-attendance-fs"
                    type="button"
                    onClick={handleStartAttendanceSession}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00dfa2] to-teal-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer hover:brightness-110 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bật Điểm Danh Ngay</span>
                  </button>
                </div>
              ) : (
                <QRCodeSVG
                  value={`${getCheckinBaseUrl()}/?checkin=true&s=${activeSession?.id || 1}&t=${encodeURIComponent(qrToken)}`}
                  size={360}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  className="max-w-[70vw] sm:max-w-none h-auto"
                  imageSettings={{
                    src: '/eg-logo-teal.png',
                    x: undefined,
                    y: undefined,
                    height: 64,
                    width: 64,
                    excavate: true
                  }}
                />
              )}
              <div className="mt-3 text-xs font-mono text-slate-700 font-bold text-center break-all">
                {isAttendanceStarted ? `${getCheckinBaseUrl()}/?checkin=true` : 'Chế độ trình chiếu sẵn sàng'}
              </div>
            </div>

            {/* Right Panel: Countdown Ring + Live Ratio + Quick Controls */}
            <div className="space-y-6 text-center lg:text-left max-w-md w-full">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center lg:justify-start gap-6">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center rounded-full bg-slate-950 border border-slate-800">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="38" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      stroke={!isAttendanceStarted ? '#64748b' : countdown <= 1 ? '#ef4444' : '#00dfa2'}
                      strokeWidth="6"
                      strokeDasharray={238.76}
                      strokeDashoffset={isAttendanceStarted ? 238.76 * (1 - countdown / qrInterval) : 238.76}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black text-[#00dfa2]">
                    {isAttendanceStarted ? `${countdown}s` : 'CHỜ'}
                  </span>
                </div>
                <div className="text-left space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tỷ lệ có mặt thực tế</div>
                  <div className="text-3xl font-black text-white">
                    {liveValidCount} <span className="text-lg text-slate-400 font-bold">/ {mergedCurrentStudents.length} SV</span>
                  </div>
                  <div className="text-xs font-bold text-[#00dfa2]">
                    {mergedCurrentStudents.length > 0 ? Math.round((liveValidCount / mergedCurrentStudents.length) * 100) : 0}% Hoàn thành điểm danh
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isAttendanceStarted && activeSession?.status === 'active' ? (
                  <button
                    type="button"
                    onClick={handlePauseAttendanceSession}
                    className="flex-1 py-3 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Tạm dừng phát QR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartAttendanceSession}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[#00dfa2] text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bật Điểm Danh</span>
                  </button>
                )}

                {activeSession?.id && activeSession?.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFullscreen(false);
                      setShowCloseSessionModal(true);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Khóa & Chốt Sổ</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 border-t border-slate-800/80 pt-3">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">ESC</kbd> hoặc bấm <b>Thoát Toàn Màn Hình</b> để trở về bảng điều khiển giảng dạy
          </div>
        </div>
      )}

      {/* COURSE MATERIAL PREVIEW MODAL */}
      {previewCourseMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="neu-card rounded-3xl p-6 sm:p-7 max-w-xl w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30">
                    {previewCourseMaterial.type}
                  </span>
                  {previewCourseMaterial.license && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-cyan-300 border border-cyan-500/30">
                      {previewCourseMaterial.license} • {previewCourseMaterial.pages}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                  {previewCourseMaterial.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewCourseMaterial.uploadedBy || 'ThS. Phạm Văn Thuận'} • {previewCourseMaterial.access} • {previewCourseMaterial.downloads}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCourseMaterial(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {previewCourseMaterial.fileName && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    {previewCourseMaterial.fileName}
                  </span>
                  {previewCourseMaterial.fileSizeLabel && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-[#00dfa2]">
                      {previewCourseMaterial.fileSizeLabel}
                    </span>
                  )}
                </div>
              )}

              {previewCourseMaterial.description && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Mô tả chi tiết:</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {previewCourseMaterial.description}
                  </p>
                </div>
              )}

              {(previewCourseMaterial.tableOfContents || []).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Mục lục & Cấu trúc nội dung:</h4>
                  <div className="space-y-1.5">
                    {previewCourseMaterial.tableOfContents.map((chap, cIdx) => (
                      <div key={cIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00dfa2] shrink-0" />
                        <span>{chap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewCourseMaterial.extractedPreview && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Nội dung trích xuất từ tệp:</h4>
                  <pre className="p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {previewCourseMaterial.extractedPreview}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewCourseMaterial(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCourseMaterial(previewCourseMaterial)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải Học Liệu Xuống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Thanh điều hướng nhanh Giảng viên trên điện thoại"
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-2xl"
      >
        {[
          { id: 'overview', label: 'Tổng quan', icon: BarChart3, action: () => navigateTeacherTab('overview'), active: activeTab === 'overview' },
          { id: 'attendance', label: 'Điểm danh', icon: QrCode, action: () => navigateTeacherTab('attendance'), active: activeTab === 'attendance' },
          { id: 'assignments', label: 'Bài tập', icon: FolderGit2, action: () => navigateTeacherTab('assignments'), active: activeTab === 'assignments' },
          { id: 'gradebook', label: 'Sổ điểm', icon: BookOpen, action: () => navigateTeacherTab('gradebook'), active: activeTab === 'gradebook' },
          { id: 'ai_lesson', label: 'AI Giáo án', icon: Sparkles, action: () => navigateTeacherTab('ai_lesson'), active: activeTab === 'ai_lesson' },
          { id: 'menu', label: 'Menu (16)', icon: Menu, action: () => setIsMobileMenuOpen(true), active: isMobileMenuOpen }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-colors cursor-pointer ${
                item.active
                  ? 'text-emerald-600 dark:text-[#00dfa2] font-extrabold bg-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-400 font-semibold'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
