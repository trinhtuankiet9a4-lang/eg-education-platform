import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  BookOpen, 
  Bot, 
  Library, 
  Award, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Vote, 
  MapPin, 
  Wifi, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  LogOut, 
  RefreshCw, 
  Camera, 
  Search, 
  BookMarked,
  Clock,
  X,
  Check,
  Eye,
  Download,
  Copy,
  Plus,
  AlertCircle,
  TrendingUp,
  FileCheck2,
  UploadCloud,
  ThumbsUp,
  MessageSquare,
  Share2,
  HelpCircle,
  Radio,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  Zap,
  Smartphone,
  FileSpreadsheet,
  Megaphone,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Star,
  Inbox,
  Printer,
  FolderGit2,
  Menu
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import PrintMinutesModal from './PrintMinutesModal';
import StudentGradebook from './StudentGradebook';
import StudentAssignments from './StudentAssignments';
import VirtualClassroomHub from './modules/VirtualClassroomHub';
import AiLectureMindmapHub from './modules/AiLectureMindmapHub';
import LiveFlashQuizHub from './modules/LiveFlashQuizHub';
import LabHelpQueueHub from './modules/LabHelpQueueHub';
import GamificationStreakHub from './modules/GamificationStreakHub';
import LeaveAiAndMakeupAddon from './addons/LeaveAiAndMakeupAddon';
import AttendanceExitAndPickerAddon from './addons/AttendanceExitAndPickerAddon';
import LiveQaAndCheckpointsAddon from './addons/LiveQaAndCheckpointsAddon';
import CollapsibleFeatureSidebar from './CollapsibleFeatureSidebar';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';
import { Html5Qrcode } from 'html5-qrcode';
import { announcementService } from '../services/announcements.js';
import { STUDENTS_K26_A, getStudentCadre } from '../data/students.js';
import CurriculumTreeView from './CurriculumTreeView';
import StudentTimetableView from './StudentTimetableView';
import { K26_COMPLETED_COURSES, CURRICULUM_METADATA, STUDENT_WEEKLY_TIMETABLES } from '../data/curriculumK26.js';
import { feedbackService, ADVISOR_TEACHERS, FEEDBACK_CATEGORIES, FEEDBACK_PRIORITIES } from '../services/feedback.js';

export default function StudentDashboard({ user, onLogout, onSwitchToTeacher, theme, setTheme, toggleTheme }) {
  // Navigation workspaces in Student Portal (2-Tier Navigation):
  // 'overview' (default) | 'attendance' | 'assignments' | 'gradebook' | 'aitutor' | 'polls'
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-tab states inside each workspace
  const [classroomSubTab, setClassroomSubTab] = useState('qr_scan'); // 'qr_scan' | 'exit_ticket' | 'virtual_class' | 'live_quiz'
  const [practiceSubTab, setPracticeSubTab] = useState('assignments_main'); // 'assignments_main' | 'lab_queue'
  const [academicSubTab, setAcademicSubTab] = useState('gradebook_main'); // 'gradebook_main' | 'leave_request' | 'schedule'
  const [leaveView, setLeaveView] = useState('ai_submit'); // 'ai_submit' | 'classic_history'
  const [aiSubTab, setAiSubTab] = useState('chat_tutor'); // 'chat_tutor' | 'mindmap' | 'library'
  const [communitySubTab, setCommunitySubTab] = useState('polls_main'); // 'polls_main' | 'live_qa' | 'contributor'
  const [qaView, setQaView] = useState('qa'); // 'qa' | 'feedback'

  // Collapsible Left Sidebar State (Drawer Collapse + Group Accordions)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedSidebarGroups, setCollapsedSidebarGroups] = useState({});

  const handleToggleSidebarGroup = (groupId) => {
    setCollapsedSidebarGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Backward-compatible Smart Router mapping all legacy & workspace keys
  const navigateStudentTab = (tabKey) => {
    setIsMobileMenuOpen(false);
    switch (tabKey) {
      case 'overview':
        setActiveTab('overview');
        break;
      case 'attendance':
      case 'qr_scan':
        setActiveTab('attendance');
        setClassroomSubTab('qr_scan');
        break;
      case 'exit_ticket':
        setActiveTab('attendance');
        setClassroomSubTab('exit_ticket');
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
      case 'leave_request':
        setActiveTab('gradebook');
        setAcademicSubTab('leave_request');
        break;
      case 'schedule':
        setActiveTab('gradebook');
        setAcademicSubTab('schedule');
        break;
      case 'curriculum':
        setActiveTab('gradebook');
        setAcademicSubTab('curriculum');
        break;
      case 'aitutor':
      case 'chat_tutor':
        setActiveTab('aitutor');
        setAiSubTab('chat_tutor');
        break;
      case 'mindmap':
        setActiveTab('aitutor');
        setAiSubTab('mindmap');
        break;
      case 'lecture_recap':
        setActiveTab('aitutor');
        setAiSubTab('lecture_recap');
        break;
      case 'library':
        setActiveTab('aitutor');
        setAiSubTab('library');
        break;
      case 'polls':
      case 'polls_main':
        setActiveTab('polls');
        setCommunitySubTab('polls_main');
        break;
      case 'live_qa':
        setActiveTab('polls');
        setCommunitySubTab('live_qa');
        setQaView('qa');
        break;
      case 'feedback':
        setActiveTab('polls');
        setCommunitySubTab('live_qa');
        setQaView('feedback');
        break;
      case 'contributor':
        setActiveTab('polls');
        setCommunitySubTab('contributor');
        break;
      default:
        setActiveTab('overview');
        break;
    }
  };

  // Scanner & Camera status
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [useRealCamera, setUseRealCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const html5QrCodeRef = useRef(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back'); // 'back' | 'front'

  // Real Browser Geolocation State for Student Attendance
  const [studentGps, setStudentGps] = useState({
    status: 'idle', // 'idle' | 'requesting' | 'granted' | 'denied'
    lat: null,
    lng: null,
    accuracy: null,
    distanceMeters: null,
    error: null
  });

  const requestStudentLocation = () => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const fail = {
          status: 'denied',
          lat: null,
          lng: null,
          accuracy: null,
          distanceMeters: null,
          error: 'Trình duyệt không hỗ trợ định vị GPS (Geolocation API).'
        };
        setStudentGps(fail);
        triggerToast('⚠️ Trình duyệt không hỗ trợ định vị GPS!');
        resolve(fail);
        return;
      }

      setStudentGps((prev) => ({ ...prev, status: 'requesting', error: null }));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy || 0);
          let distanceMeters = null;
          try {
            const vRes = await api.attendance.verifyLocation({ lat, lng, accuracy });
            if (vRes?.distanceMeters != null) {
              distanceMeters = vRes.distanceMeters;
            }
          } catch {}
          const ok = { status: 'granted', lat, lng, accuracy, distanceMeters, error: null };
          setStudentGps(ok);
          resolve(ok);
        },
        (err) => {
          const msg =
            err.code === 1
              ? 'Trình duyệt chưa cấp quyền Vị trí (Location). Hãy bấm Cho phép (Allow) trên thanh địa chỉ!'
              : 'Không thể lấy vị trí GPS lúc này. Hãy thử bấm Lấy lại vị trí.';
          const denied = { status: 'denied', lat: null, lng: null, accuracy: null, distanceMeters: null, error: msg };
          setStudentGps(denied);
          triggerToast(`⚠️ ${msg}`);
          resolve(denied);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    if (activeTab === 'attendance' && studentGps.status === 'idle') {
      requestStudentLocation();
    }
  }, [activeTab]);
  const [toast, setToast] = useState(null);

  // Student Attendance Log filter
  const [attendanceSubjectFilter, setAttendanceSubjectFilter] = useState('all'); // 'all' | 'Cấu trúc dữ liệu & GT' | ...
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Leave Requests state (Đơn xin nghỉ học)
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Leave Request Form inputs
  const [newLeaveSubject, setNewLeaveSubject] = useState('Kỹ thuật lập trình (KC213013)');
  const [newLeaveDate, setNewLeaveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newLeavePeriod, setNewLeavePeriod] = useState('Tiết 1 - 3 (Buổi Sáng)');
  const [newLeaveCategory, setNewLeaveCategory] = useState('medical');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [newLeaveProof, setNewLeaveProof] = useState(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [selectedProofModal, setSelectedProofModal] = useState(null);

  // Chat messages for AI Tutor Pro
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Chào ${user?.name || 'bạn'}, tôi là Trợ lý AI Tutor Pro (Hybrid RAG & Tri thức Mở CNTT). Bên cạnh giáo trình nội bộ lớp CNTT K26, tôi được kết nối nguồn dữ liệu bên ngoài để trả lời MỌI câu hỏi thuộc ngành Công nghệ Thông tin: Lập trình (Python/C++/Java/JS), Cấu trúc dữ liệu & Giải thuật, Web/Mobile, Cơ sở dữ liệu SQL, Mạng & Hệ điều hành, Docker/DevOps, AI/ML và Bảo mật. Hôm nay bạn cần hỗ trợ chủ đề CNTT nào?`,
      citations: null
    }
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const [tutorEngineLabel, setTutorEngineLabel] = useState('AI Backend (Deep SQLite RAG + Academic NLP)');
  const tutorChatStreamRef = useRef(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Digital Library resources
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFaculty, setLibraryFaculty] = useState('all');
  const [libraryType, setLibraryType] = useState('all');
  const [libraryLicense, setLibraryLicense] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [showContributeModal, setShowContributeModal] = useState(false);

  const DEFAULT_LIBRARY_RESOURCES = [];

  const [libraryResources, setLibraryResources] = useState(DEFAULT_LIBRARY_RESOURCES);

  useEffect(() => {
    let isMounted = true;
    api.aiMindmaps.getMaterials('all').then(res => {
      if (!isMounted || !res?.success || !Array.isArray(res.materials)) return;
      const mapped = res.materials.map((m, idx) => ({
        id: m.id || `MAT-${idx}`,
        title: m.title,
        author: m.author || `${m.uploadedBy || 'ThS. Phạm Văn Thuận'} • EG Education`,
        faculty: m.faculty || 'it',
        type: m.categoryKey || 'book',
        license: m.license || 'CC BY-NC',
        pages: m.pages || m.pagesLabel || '',
        downloads: typeof m.downloadsCount === 'number' ? m.downloadsCount : 0,
        rating: m.rating || 0,
        votes: typeof m.votes === 'number' ? m.votes : 0,
        desc: m.description || `Tài liệu học phần do ${m.uploadedBy || 'Giảng viên'} xuất bản (${m.fileName || 'PDF'}).`,
        tableOfContents: Array.isArray(m.tableOfContents) && m.tableOfContents.length > 0
          ? m.tableOfContents
          : ['Mục 1: Tài liệu học phần chính thức']
      }));
      setLibraryResources(mapped);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [activeTab, aiSubTab]);

  // Fetch active AI Tutor Engine config on mount and when entering AI Tutor workspace
  useEffect(() => {
    let isMounted = true;
    api.aiMindmaps.getEngineConfig().then(res => {
      if (isMounted && res?.success && res?.config?.activeEngineLabel) {
        setTutorEngineLabel(res.config.activeEngineLabel);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [activeTab, aiSubTab]);

  // Auto-scroll AI Tutor chat stream when new messages or thinking indicator appear
  useEffect(() => {
    if (activeTab === 'aitutor' && aiSubTab === 'chat_tutor' && tutorChatStreamRef.current && (messages.length > 1 || isTutorThinking)) {
      tutorChatStreamRef.current.scrollTop = tutorChatStreamRef.current.scrollHeight;
    }
  }, [messages, isTutorThinking, activeTab, aiSubTab]);

  // Shared Announcements & AI Dispatch Summarizer state
  const [announcements, setAnnouncements] = useState(() => announcementService.getAll());
  const [selectedVoteOptions, setSelectedVoteOptions] = useState({});
  const [previewDispatchModal, setPreviewDispatchModal] = useState(null);
  const [printMinutesModalAnnouncement, setPrintMinutesModalAnnouncement] = useState(null);

  // Auto-sync announcements when visiting polls workspace
  useEffect(() => {
    if (activeTab === 'polls' && communitySubTab === 'polls_main') {
      const all = announcementService.getAll();
      setAnnouncements(all);
    }
  }, [activeTab, communitySubTab]);

  // Active student identity (directly follows authenticated user & Excel roster)
  const activeTestingStudentCode = user?.code || '26103043';
  const currentCadreInfo = getStudentCadre(activeTestingStudentCode);
  const currentStudentRecord = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || STUDENTS_K26_A[0];
  const myAbsences = Number(currentStudentRecord?.absences) || 0;

  // Cadre Creation Studio State (Only accessible by Lớp Trưởng, Bí Thư, Lớp Phó)
  const [showCadreStudio, setShowCadreStudio] = useState(true);
  const [rawDispatchInput, setRawDispatchInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState(null);
  const [hasAttachedPoll, setHasAttachedPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState([]);
  const [pollDeadline, setPollDeadline] = useState('26/10/2026 23:59');
  const [pollTargetClass, setPollTargetClass] = useState('K26 CNTT - Lớp A');

  // AI Summarize handler for Cadre
  const handleRunAiSummarize = async () => {
    if (!rawDispatchInput.trim()) {
      triggerToast('Vui lòng dán nội dung công văn hoặc thông báo!', 'error');
      return;
    }
    setIsAiSummarizing(true);
    try {
      const summary = await announcementService.summarizeDispatch(rawDispatchInput);
      setExtractedSummary(summary);
      if (summary.hasPoll) {
        setHasAttachedPoll(true);
        if (summary.pollQuestion) setPollQuestion(summary.pollQuestion);
        if (summary.pollOptions && summary.pollOptions.length > 0) setPollOptions(summary.pollOptions);
      } else {
        setHasAttachedPoll(false);
      }
      triggerToast('Trợ lý AI đã trích xuất & tóm tắt công văn cho Ban Cán Sự!');
    } catch {
      triggerToast('Có lỗi khi phân tích công văn!', 'error');
    } finally {
      setIsAiSummarizing(false);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 6) {
      triggerToast('Tối đa 6 phương án!', 'error');
      return;
    }
    setPollOptions([...pollOptions, `Phương án mới ${pollOptions.length + 1}`]);
  };

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length <= 2) {
      triggerToast('Cần tối thiểu 2 phương án!', 'error');
      return;
    }
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const handleUpdatePollOption = (idx, text) => {
    const updated = [...pollOptions];
    updated[idx] = text;
    setPollOptions(updated);
  };

  // Cadre publishes announcement to class
  const handleCadrePublishAnnouncement = () => {
    const title = extractedSummary?.title || 'Thông báo mới từ Ban Cán Sự Lớp';
    const activeStudent = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || user;
    const authorName = `${currentCadreInfo.title} • ${activeStudent?.name || 'Trịnh Tuấn Kiệt'}`;

    announcementService.createAnnouncement({
      title,
      author: authorName,
      targetClass: pollTargetClass,
      subject: 'Thông báo & Khảo sát Ban Cán Sự',
      urgency: extractedSummary?.urgency || 'normal',
      urgencyLabel: extractedSummary?.urgencyLabel || 'THÔNG BÁO LỚP',
      badgeColor: extractedSummary?.badgeColor,
      deadline: pollDeadline,
      rawText: rawDispatchInput,
      aiSummary: extractedSummary,
      hasPoll: hasAttachedPoll,
      pollQuestion,
      pollOptions: pollOptions.filter(o => o.trim())
    });

    setAnnouncements(announcementService.getAll());
    triggerToast(`Ban Cán Sự đã phát hành thông báo "${title}" đến toàn thể 88 sinh viên thành công!`);
  };

  // Cadre export Excel
  const handleCadreExportExcel = (ann) => {
    try {
      const fileName = announcementService.exportPollToExcel(ann);
      triggerToast(`Đã xuất báo cáo Excel thành công: ${fileName}!`);
    } catch (err) {
      triggerToast(err.message || 'Lỗi xuất file Excel!', 'error');
    }
  };

  const handleStudentVote = (announcementId, optionId) => {
    try {
      const activeStudent = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || user;
      announcementService.votePoll(announcementId, optionId, activeStudent);
      setAnnouncements(announcementService.getAll());
      sound.success();
      triggerToast(`Đã ghi nhận biểu quyết của ${activeStudent?.name || 'sinh viên'} vào cơ sở dữ liệu!`);
    } catch (err) {
      triggerToast(err.message || 'Lỗi khi gửi biểu quyết!', 'error');
    }
  };

  // Class Polls state
  const [polls, setPolls] = useState([
    {
      id: 1,
      title: 'Bình chọn lịch học bù môn Lập trình Web & Mobile (Do GV bận công tác)',
      author: 'ThS. Nguyễn Văn Toàn',
      deadline: '23:59 - 25/10/2026',
      totalVotes: 38,
      votedOption: null,
      options: [
        { id: 'opt1', text: 'Sáng Thứ 7 (07:30 - 10:00) - Phòng Lab 02', votes: 22 },
        { id: 'opt2', text: 'Chiều Thứ 7 (13:30 - 16:00) - Phòng Lab 02', votes: 11 },
        { id: 'opt3', text: 'Sáng Chủ Nhật (08:00 - 10:30) - Học trực tuyến', votes: 5 }
      ]
    },
    {
      id: 2,
      title: 'Khảo sát hình thức báo cáo bài tập lớn môn Cấu trúc dữ liệu & GT',
      author: 'ThS. Phạm Văn Thuận',
      deadline: '17:00 - 28/10/2026',
      totalVotes: 42,
      votedOption: 'opt_cdio1',
      options: [
        { id: 'opt_cdio1', text: 'Báo cáo thuyết trình trực tiếp tại giảng đường (10 phút/nhóm)', votes: 28 },
        { id: 'opt_cdio2', text: 'Quay video demo sản phẩm + Nộp mã nguồn GitHub', votes: 14 }
      ]
    }
  ]);

  // =========================================================================
  // STUDENT FEEDBACK TO ADVISOR TEACHERS STATE
  // =========================================================================
  const [feedbacks, setFeedbacks] = useState(() => feedbackService.getAll());
  const [feedbackTargetTeacher, setFeedbackTargetTeacher] = useState(ADVISOR_TEACHERS[0].code);
  const [feedbackCategory, setFeedbackCategory] = useState(FEEDBACK_CATEGORIES[0].id);
  const [feedbackPriority, setFeedbackPriority] = useState('normal');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackIsAnonymous, setFeedbackIsAnonymous] = useState(false);
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState('all'); // 'all' | 'pending' | 'resolved'
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState({});

  // Sync feedbacks in real time across components
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbacks(feedbackService.getAll());
    };
    window.addEventListener('eg_feedback_updated', handleFeedbackUpdate);
    return () => window.removeEventListener('eg_feedback_updated', handleFeedbackUpdate);
  }, []);

  const handleSendFeedback = (e) => {
    if (e) e.preventDefault();
    if (!feedbackTitle.trim()) {
      triggerToast('Vui lòng nhập tiêu đề phản hồi!', 'error');
      return;
    }
    if (!feedbackContent.trim()) {
      triggerToast('Vui lòng nhập nội dung chi tiết phản hồi!', 'error');
      return;
    }

    const activeStudent = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || user;
    feedbackService.createFeedback({
      student: {
        code: activeStudent?.code || activeTestingStudentCode,
        name: activeStudent?.name || 'Trịnh Tuấn Kiệt',
        cadreTitle: currentCadreInfo?.title || 'Sinh Viên',
        class: activeStudent?.class || 'K26 CNTT - Lớp A',
        email: activeStudent?.email || `${activeStudent?.code || activeTestingStudentCode}@sv.ttn.edu.vn`
      },
      targetTeacherCode: feedbackTargetTeacher,
      category: feedbackCategory,
      priority: feedbackPriority,
      title: feedbackTitle,
      content: feedbackContent,
      isAnonymous: feedbackIsAnonymous
    });

    setFeedbacks(feedbackService.getAll());
    setFeedbackTitle('');
    setFeedbackContent('');
    setFeedbackIsAnonymous(false);
    triggerToast('Đã gửi phản hồi thành công đến Giảng viên hướng dẫn!');
  };

  const handleRateFeedback = (feedbackId, stars) => {
    const comment = feedbackCommentDraft[feedbackId] || '';
    feedbackService.rateFeedback(feedbackId, stars, comment);
    setFeedbacks(feedbackService.getAll());
    triggerToast(`Đã gửi đánh giá ${stars} sao cho câu trả lời của Giảng viên!`);
  };

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // State to hold rich scan verification details (3s cycle / grace window)
  const [scanVerificationResult, setScanVerificationResult] = useState(null);

  // Unified Check-in Pipeline for both Camera Scan and Quick 1-Click Scan
  const handleProcessScannedCode = async (rawCode, scanMethod = 'dynamic_qr_3s') => {
    if (isScanning || scanSuccess) return;
    setIsScanning(true);
    setScanVerificationResult(null);

    // Stop real camera stream if scanning
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {}
    }

    let parsedToken = rawCode;
    let sessionId = null;

    try {
      if (typeof rawCode === 'string') {
        if (rawCode.includes('?') && (rawCode.includes('checkin') || rawCode.includes('t='))) {
          const urlObj = new URL(rawCode, 'http://localhost:5173');
          const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('token');
          const sParam = urlObj.searchParams.get('s') || urlObj.searchParams.get('sessionId') || urlObj.searchParams.get('session_id');
          if (tParam) parsedToken = tParam;
          if (sParam) sessionId = sParam;
        } else if (rawCode.trim().startsWith('{') || rawCode.trim().startsWith('[')) {
          const payload = JSON.parse(rawCode);
          if (payload.token) parsedToken = payload.token;
          if (payload.sessionId) sessionId = payload.sessionId;
        }
      }
    } catch (e) {}

    // Require real browser GPS coordinates before checking in
    let coords = studentGps;
    if (coords.lat == null || coords.lng == null) {
      coords = await requestStudentLocation();
    }
    if (coords.lat == null || coords.lng == null) {
      setIsScanning(false);
      triggerToast('⚠️ Máy chủ yêu cầu cho phép lấy Vị trí (GPS) trên trình duyệt để xác thực điểm danh!');
      return;
    }

    // If sessionId is missing, get from active session
    let activeSubjectName = 'Lớp CNTT K26';
    if (!sessionId) {
      try {
        const activeRes = await api.attendance.getActiveSession();
        if (activeRes.session) {
          sessionId = activeRes.session.id;
          activeSubjectName = activeRes.session.subject_name || activeSubjectName;
          if (!parsedToken) {
            parsedToken = activeRes.session.current_token;
          }
        }
      } catch (e) {}
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    try {
      const checkInRes = await api.attendance.checkIn({
        session_id: sessionId,
        token: parsedToken,
        method: scanMethod,
        lat: coords.lat,
        lng: coords.lng
      });

      if (!checkInRes.success) {
        setIsScanning(false);
        triggerToast(`⚠️ ${checkInRes.message || 'Mã QR không hợp lệ hoặc đã đổi chu kỳ mới!'}`);
        return;
      }

      const realDist = checkInRes.record?.distance_meters ?? coords.distanceMeters ?? null;
      if (realDist != null) {
        setStudentGps((prev) => ({ ...prev, distanceMeters: realDist }));
      }

      setIsScanning(false);
      setScanSuccess(true);
      sound.playSuccess();

      const matchType = checkInRes.tokenMatchType || 'current';
      const isGrace = matchType === 'grace_period';

      setScanVerificationResult({
        matchType,
        message: checkInRes.message,
        timeStr,
        isGrace,
        distanceMeters: realDist,
        methodLabel: scanMethod === 'camera_real' ? 'Camera QR (Webcam)' : 'Xác Thực Phiên Trực Tiếp',
        studentName: checkInRes.record?.student_name || user?.name || 'Sinh viên'
      });

      // Prepend real check-in record
      setAttendanceRecords(prev => [
        {
          id: Date.now(),
          date: 'Hôm nay',
          subject: activeSubjectName,
          slot: realDist != null ? `GPS thực tế (${realDist}m)` : `GPS: ${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`,
          time: timeStr,
          method: isGrace ? 'QR (Cửa sổ trượt) + GPS' : (scanMethod === 'camera_real' ? 'Camera QR + GPS thực tế' : 'Dynamic QR + GPS thực tế'),
          status: 'valid'
        },
        ...prev
      ]);

      if (isGrace) {
        triggerToast('⚡ Điểm danh thành công (Xác thực qua Cửa sổ trượt 3s)!');
      } else {
        triggerToast(checkInRes.message || '🎖️ Đã quét mã Dynamic QR 3s & Điểm danh thành công!');
      }
    } catch (err) {
      setIsScanning(false);
      triggerToast('⚠️ Không thể xác thực với máy chủ. Vui lòng quét lại!');
    }
  };

  // Direct verification against the teacher's active QR session (fallback when camera is unavailable)
  const handleVerifyActiveSession = async () => {
    setIsScanning(true);
    setScanSuccess(false);
    setScanVerificationResult(null);

    try {
      const activeRes = await api.attendance.getActiveSession();
      if (!activeRes?.session?.current_token) {
        setIsScanning(false);
        triggerToast('⚠️ Giảng viên chưa bật ca điểm danh QR nào ở thời điểm hiện tại.');
        return;
      }
      setIsScanning(false);
      handleProcessScannedCode(activeRes.session.current_token, 'qr_scan_fast');
    } catch {
      setIsScanning(false);
      triggerToast('⚠️ Không thể kết nối máy chủ điểm danh. Vui lòng thử lại!');
    }
  };

  // Real Camera Scanner Lifecycle using Html5Qrcode
  useEffect(() => {
    let isMounted = true;
    let scannerInstance = null;

    async function startCameraScanner() {
      if (!useRealCamera || scanSuccess || activeTab !== 'attendance' || classroomSubTab !== 'qr_scan') {
        return;
      }

      try {
        setIsCameraStarting(true);
        setCameraError(null);
        await new Promise(r => setTimeout(r, 250));
        const el = document.getElementById('qr-camera-stream');
        if (!el || !isMounted) return;

        // Clear previous scanner if any
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
          } catch (e) {}
        }

        scannerInstance = new Html5Qrcode('qr-camera-stream');
        html5QrCodeRef.current = scannerInstance;

        await scannerInstance.start(
          { facingMode: cameraFacing === 'back' ? 'environment' : 'user' },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            console.log('[Real Camera Scanned QR]:', decodedText);
            handleProcessScannedCode(decodedText, 'camera_real');
          },
          () => {
            // Ignore non-QR frames
          }
        );

        if (isMounted) setIsCameraStarting(false);
      } catch (err) {
        console.warn('[Camera Scanner Init Failed]:', err);
        if (isMounted) {
          setIsCameraStarting(false);
          setCameraError(err.message || 'Không thể mở Camera thực tế (thiếu quyền truy cập webcam). Bạn có thể dùng chế độ Quét Nhanh.');
        }
      }
    }

    startCameraScanner();

    return () => {
      isMounted = false;
      if (scannerInstance) {
        try {
          if (scannerInstance.isScanning) {
            scannerInstance.stop().catch(() => {});
          }
        } catch (e) {}
      }
      html5QrCodeRef.current = null;
    };
  }, [useRealCamera, scanSuccess, cameraFacing, activeTab, classroomSubTab]);

  // Reset scanner to scan again or test
  const handleResetScan = () => {
    setScanSuccess(false);
    setIsScanning(false);
    setScanVerificationResult(null);
    setCameraError(null);
    triggerToast('Đã sẵn sàng quét lại mã Dynamic QR 3s.');
  };

  // Toggle Torch simulation
  const handleToggleTorch = () => {
    setTorchOn(prev => {
      const next = !prev;
      triggerToast(next ? 'Đã bật đèn flash trợ sáng camera' : 'Đã tắt đèn flash');
      return next;
    });
  };

  // Toggle Camera Facing simulation
  const handleToggleCamera = () => {
    setCameraFacing(prev => {
      const next = prev === 'back' ? 'front' : 'back';
      triggerToast(`Đã chuyển sang ${next === 'back' ? 'Camera Sau (Mặc định)' : 'Camera Trước'}`);
      return next;
    });
  };

  // Synchronize leave requests from real backend database
  const fetchStudentLeaveRequests = async () => {
    try {
      const res = await api.leaveRequests.getAll();
      if (res.success && Array.isArray(res.requests)) {
        setLeaveRequests(res.requests.map(r => ({
          id: r.request_code || `REQ-${r.id}`,
          rawId: r.id,
          subject: r.subject_name || 'Cấu trúc dữ liệu & Giải thuật (IT204)',
          date: r.leave_date,
          period: `${r.sessions_count || 1} buổi`,
          reasonCategory: r.reason_category || 'medical',
          reason: r.reason,
          proofName: r.proof_file_name || 'Minh_chung_y_te.jpg',
          proofUrl: r.proof_url || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
          status: r.status,
          teacherNote: r.review_note || (r.status === 'pending' ? 'Đang chờ Giảng viên xem xét...' : 'Đã hoàn tất đối soát.'),
          createdAt: r.created_at
        })));
      }
    } catch (err) {
      console.warn('[Fetch Leave Requests Error]', err);
    }
  };

  useEffect(() => {
    fetchStudentLeaveRequests();

    api.attendance.getMyHistory().then(res => {
      if (res.success && Array.isArray(res.records)) {
        setAttendanceRecords(res.records.map(r => ({
          id: r.id,
          date: r.check_in_time ? r.check_in_time.split(' ')[0] : 'Gần đây',
          subject: r.subject_name || 'Lớp CNTT K26',
          slot: r.distance_meters != null ? `GPS thực tế (${r.distance_meters}m)` : 'GPS đã xác thực',
          time: r.check_in_time ? r.check_in_time.split(' ')[1] : '--:--:--',
          method: r.method === 'qr_scan' ? 'Dynamic QR + GPS' : (r.method || 'GPS'),
          status: r.status === 'present' ? 'valid' : (r.status === 'excused' ? 'excused' : 'late')
        })));
      }
    }).catch(() => {});
  }, []);

  // Handle Submit Leave Request
  const handleSubmitLeaveRequest = async (e) => {
    e.preventDefault();
    if (!newLeaveReason.trim()) {
      triggerToast('Vui lòng nhập lý do xin nghỉ học cụ thể!');
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const res = await api.leaveRequests.submit({
        subjectName: newLeaveSubject,
        leaveDate: newLeaveDate,
        sessionsCount: newLeavePeriod.includes('Cả ngày') ? 2 : 1,
        reasonCategory: newLeaveCategory,
        reason: newLeaveReason,
        proofFileName: newLeaveProof ? newLeaveProof.name : 'Giay_kham_benh_BVDK.jpg',
        proofUrl: newLeaveProof?.dataUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80'
      });

      if (res.success) {
        sound.playSuccess();
        triggerToast('✓ Đã gửi đơn xin nghỉ học thành công đến Giảng viên!');
        setNewLeaveReason('');
        setNewLeaveProof(null);
        await fetchStudentLeaveRequests();
      } else {
        triggerToast(res.message || 'Lỗi khi gửi đơn xin nghỉ học!');
      }
    } catch (err) {
      console.error('[Submit Leave Error]', err);
      triggerToast('Lỗi khi gửi đơn xin nghỉ học!');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Cancel Leave Request
  const handleCancelLeaveRequest = async (item) => {
    try {
      const targetId = item.rawId || item.id;
      const res = await api.leaveRequests.cancel(targetId);
      if (res.success) {
        sound.playSuccess();
        triggerToast('✓ Đã thu hồi đơn xin nghỉ học thành công!');
        await fetchStudentLeaveRequests();
      } else {
        triggerToast(res.message || 'Không thể thu hồi đơn này!');
      }
    } catch (err) {
      console.error('[Cancel Leave Error]', err);
      triggerToast('Lỗi khi thu hồi đơn nghỉ học!');
    }
  };

  // Handle Send Question to AI
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const userQ = inputQuestion.trim();
    if (!userQ || isTutorThinking) return;

    const historyPayload = messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
    setInputQuestion('');

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userQ, citations: null }
    ]);
    setIsTutorThinking(true);

    try {
      const res = await api.aiMindmaps.askTutor({
        question: userQ,
        classId: 'K26 CNTT - Lớp A',
        studentName: user?.name || 'Trịnh Tuấn Kiệt',
        history: historyPayload
      });

      if (res?.success && res?.answer) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: res.answer,
            citations: Array.isArray(res.citations) && res.citations.length > 0 ? res.citations : null,
            summary: res.summary || null,
            engineUsed: res.engineUsed || null,
            ragSourcesCount: typeof res.ragSourcesCount === 'number' ? res.ragSourcesCount : 0
          }
        ]);
        sound.playSuccess();
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `⚠️ Không thể nhận phản hồi từ AI Tutor (${res?.message || 'Lỗi kết nối máy chủ'}). Vui lòng kiểm tra kết nối backend hoặc thử gửi lại câu hỏi.`,
            citations: null
          }
        ]);
        sound.playError();
        triggerToast(res?.message || 'AI Tutor tạm thời gián đoạn, vui lòng thử lại!');
      }
    } catch (err) {
      console.error('[AI Tutor Chat Error]', err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ Đã xảy ra lỗi khi truy vấn AI Tutor (${err?.message || 'Lỗi mạng'}). Vui lòng thử gửi lại câu hỏi.`,
          citations: null
        }
      ]);
      sound.playError();
      triggerToast('Không thể kết nối tới AI Tutor, vui lòng thử lại!');
    } finally {
      setIsTutorThinking(false);
    }
  };

  // Quick prompt click
  const handleQuickPrompt = (promptText) => {
    setInputQuestion(promptText);
  };

  // Handle Poll Vote
  const handleVotePoll = (pollId, optionId) => {
    setPolls(prev => prev.map(p => {
      if (p.id !== pollId) return p;
      if (p.votedOption === optionId) return p; // already voted same option

      const prevVote = p.votedOption;
      const updatedOptions = p.options.map(opt => {
        if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
        if (opt.id === prevVote) return { ...opt, votes: Math.max(0, opt.votes - 1) };
        return opt;
      });

      return {
        ...p,
        votedOption: optionId,
        totalVotes: prevVote ? p.totalVotes : p.totalVotes + 1,
        options: updatedOptions
      };
    }));

    triggerToast('Đã ghi nhận biểu quyết của bạn vào hệ thống!');
  };

  // Handle Library Download simulation & SQLite download counter sync
  const handleSimulateDownload = (resource) => {
    setDownloadingId(resource.id);
    setDownloadProgress(10);

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloadingId(null);
          if (String(resource.id).startsWith('MAT-')) {
            api.aiMindmaps.downloadMaterial(resource.id).then(res => {
              if (res?.success && res.material) {
                setLibraryResources(curr => curr.map(r =>
                  r.id === resource.id ? { ...r, downloads: res.material.downloadsCount } : r
                ));
              }
            }).catch(() => {});
          }
          triggerToast(`Tải xuống hoàn tất: ${resource.title} (${resource.license})`);
          return 0;
        }
        return prev + 30;
      });
    }, 250);
  };

  // Toggle Bookmark
  const handleToggleBookmark = (id) => {
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    triggerToast(bookmarkedIds.includes(id) ? 'Đã gỡ khỏi tủ sách cá nhân' : 'Đã lưu vào tủ sách cá nhân!');
  };

  // Filtered Library
  const filteredLibrary = libraryResources.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(librarySearch.toLowerCase()) || 
                        item.author.toLowerCase().includes(librarySearch.toLowerCase()) ||
                        item.desc.toLowerCase().includes(librarySearch.toLowerCase());
    const matchFaculty = libraryFaculty === 'all' || item.faculty === libraryFaculty;
    const matchType = libraryType === 'all' || item.type === libraryType;
    const matchLicense = libraryLicense === 'all' || item.license.toLowerCase().includes(libraryLicense.toLowerCase());
    return matchSearch && matchFaculty && matchType && matchLicense;
  });

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length;
  const resolvedFeedbackCount = feedbacks.filter(
    f => (f.studentCode === activeTestingStudentCode || f.isAnonymous) && f.status === 'resolved'
  ).length;

  // Dynamic header title & subtitle reflecting active workspace + sub-tab
  const getHeaderInfo = () => {
    if (activeTab === 'overview') {
      return {
        title: 'Tổng Quan Học Tập & Tiến Độ Cá Nhân',
        subtitle: 'Giám sát chuyên cần học kỳ, thời lượng AI Tutor, tủ sách OER và lịch học sắp tới'
      };
    }
    if (activeTab === 'attendance') {
      if (classroomSubTab === 'exit_ticket') {
        return {
          title: 'Vé Ra Về (Exit Ticket) & Vòng Quay Lớp Học',
          subtitle: 'Hoàn thành phiếu phản hồi cuối buổi học và theo dõi vòng quay gọi tên ngẫu nhiên'
        };
      }
      if (classroomSubTab === 'virtual_class') {
        return {
          title: 'Phòng Học Online Trực Tiếp (WebRTC)',
          subtitle: 'Tham gia lớp học trực tuyến, bảng trắng tương tác và trao đổi cùng giảng viên'
        };
      }
      if (classroomSubTab === 'live_quiz') {
        return {
          title: 'Đố Vui Flash Quiz Giảng Đường (+0.5đ)',
          subtitle: 'Trả lời nhanh câu hỏi trắc nghiệm trực tiếp trên lớp để tích lũy điểm thưởng'
        };
      }
      return {
        title: 'Điểm Danh Dynamic QR (3s) & Geofencing',
        subtitle: 'Quét mã QR thời gian thực • Xác thực GPS phòng học • Tuân thủ Nghị định 13/2023/NĐ-CP'
      };
    }
    if (activeTab === 'assignments') {
      if (practiceSubTab === 'lab_queue') {
        return {
          title: 'Hàng Đợi Hỗ Trợ Phòng Lab',
          subtitle: 'Đăng ký lượt hỗ trợ kỹ thuật trực tiếp với giảng viên và trợ giảng tại phòng máy'
        };
      }
      return {
        title: 'Bài Tập Lab, Đồ Án & Chấm Chéo (IT204)',
        subtitle: 'Nộp mã nguồn GitHub hoặc tệp nén • Checklist nhóm & liên thông điểm Lab 30%'
      };
    }
    if (activeTab === 'gradebook') {
      if (academicSubTab === 'leave_request') {
        return {
          title: 'Xin Nghỉ Phép & Gói Học Bù AI',
          subtitle: 'Nộp đơn minh chứng thông minh với AI hoặc theo dõi lịch sử xét duyệt đơn nghỉ học'
        };
      }
      if (academicSubTab === 'schedule') {
        return {
          title: 'Thời Khóa Biểu Tuần • Trường Đại học Tây Nguyên',
          subtitle: 'Lịch học chính thức lớp CNTT K26 từ 16/11/2026 đến 20/12/2026 (Lập trình Python & Tiếng Anh 1)'
        };
      }
      if (academicSubTab === 'curriculum') {
        return {
          title: 'Cây Tiến Trình Đào Tạo & Biểu Đồ Tiến Độ (HK1 – HK8)',
          subtitle: 'Chương trình Chính quy 2025 - 2026 • K26 CNTT đã hoàn thành 10/15 TC HK 1 (66.7%)'
        };
      }
      return {
        title: 'Kết Quả Học Tập, ĐRL & Điểm Quá Trình (K26 CNTT)',
        subtitle: 'Theo dõi kết quả 5 phân môn HK 1 đã học xong, điểm rèn luyện và khiếu nại trực tuyến'
      };
    }
    if (activeTab === 'aitutor') {
      if (aiSubTab === 'mindmap') {
        return {
          title: 'AI Tạo Sơ Đồ Tư Duy & Infographic',
          subtitle: 'Nhập chủ đề hoặc tải tài liệu để AI tự động vẽ sơ đồ tư duy & Infographic trực quan'
        };
      }
      if (aiSubTab === 'lecture_recap') {
        return {
          title: 'Tổng Hợp Bài Cũ Theo Môn Học (Mindmap & File Bài Giảng)',
          subtitle: 'Xem lại bài học cũ của từng môn bằng sơ đồ tư duy tổng hợp kèm file bài giảng đính kèm'
        };
      }
      if (aiSubTab === 'library') {
        return {
          title: 'Kho Học Liệu Mở Toàn Diện (OER)',
          subtitle: 'Tra cứu giáo trình, slide và đề thi chuẩn Creative Commons (CC BY, CC BY-NC)'
        };
      }
      return {
        title: 'Gia Sư AI Chuyên Ngành CNTT 24/7 (Nguồn Dữ Liệu Mở + RAG)',
        subtitle: 'Giải đáp mọi câu hỏi ngành Công nghệ Thông tin kết hợp nguồn dữ liệu bên ngoài & học liệu nội bộ'
      };
    }
    if (activeTab === 'polls') {
      if (communitySubTab === 'live_qa') {
        if (qaView === 'feedback') {
          return {
            title: 'Hòm Thư Góp Ý Môn Học & Cố Vấn Học Tập',
            subtitle: 'Gửi ý kiến thắc mắc, đề xuất nguyện vọng trực tiếp tới Giảng viên hướng dẫn'
          };
        }
        return {
          title: 'Hỏi Đáp Lớp Học (Q&A) & Điểm Dừng Slide',
          subtitle: 'Đặt câu hỏi ẩn danh, upvote câu hỏi hay và đánh dấu nội dung cần giảng lại'
        };
      }
      if (communitySubTab === 'contributor') {
        return {
          title: 'Chuỗi Chuyên Cần & Bảng Vinh Danh',
          subtitle: 'Tích lũy chuỗi điểm danh liên tiếp, đổi vé miễn trễ và xếp hạng đóng góp học liệu'
        };
      }
      return {
        title: 'Thông Báo Lớp Học & Biểu Quyết Trực Tuyến',
        subtitle: 'Cập nhật công văn AI tóm tắt từ Ban Cán Sự và tham gia biểu quyết lớp học'
      };
    }
    return {
      title: 'Cổng Thông Tin Học Tập Sinh Viên',
      subtitle: 'EG Education Platform'
    };
  };

  const headerInfo = getHeaderInfo();

  // 16 Major Features grouped for Left Collapsible Sidebar
  const studentFeatureGroups = [
    {
      id: 'general',
      title: 'Điều Hành Chung',
      items: [
        {
          key: 'overview',
          navId: 'nav-btn-student-overview',
          label: 'Tổng quan Học tập',
          icon: BarChart3,
          iconClass: 'text-sky-600 dark:text-[#00b4d8]',
          activeClass: 'text-sky-700 dark:text-[#00b4d8] bg-cyan-500/15 border border-cyan-500/40 shadow-sm',
          badge: 'KPI',
          badgeClass: 'bg-cyan-500/20 text-sky-800 dark:text-[#00b4d8]',
          isActive: activeTab === 'overview'
        }
      ]
    },
    {
      id: 'classroom',
      title: 'Giảng Đường & Học Tập Live',
      items: [
        {
          key: 'qr_scan',
          navId: 'nav-btn-student-qr_scan',
          label: 'Quét QR Điểm danh Động',
          icon: QrCode,
          iconClass: 'text-teal-600 dark:text-[#00dfa2]',
          activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          badge: 'LIVE',
          badgeClass: 'bg-rose-500 text-white',
          isActive: activeTab === 'attendance' && classroomSubTab === 'qr_scan'
        },
        {
          key: 'exit_ticket',
          navId: 'nav-btn-student-exit_ticket',
          label: 'Vé ra về (Exit Ticket) & Vòng quay',
          icon: RefreshCw,
          iconClass: 'text-emerald-600 dark:text-emerald-400',
          activeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          isActive: activeTab === 'attendance' && classroomSubTab === 'exit_ticket'
        },
        {
          key: 'virtual_class',
          navId: 'nav-btn-student-virtual_class',
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
          navId: 'nav-btn-student-live_quiz',
          label: 'Đố vui Flash Quiz (+0.5đ)',
          icon: Clock,
          iconClass: 'text-amber-600 dark:text-amber-400',
          activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-sm',
          badge: '+0.5đ',
          badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
          isActive: activeTab === 'attendance' && classroomSubTab === 'live_quiz'
        }
      ]
    },
    {
      id: 'practice',
      title: 'Bài Tập Lab & Đồ Án',
      items: [
        {
          key: 'assignments_main',
          navId: 'nav-btn-student-assignments_main',
          label: 'Nộp bài Lab, Đồ án & Chấm chéo',
          icon: FolderGit2,
          iconClass: 'text-purple-600 dark:text-purple-400',
          activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/40 shadow-sm',
          badge: '30%',
          badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
          isActive: activeTab === 'assignments' && practiceSubTab === 'assignments_main'
        },
        {
          key: 'lab_queue',
          navId: 'nav-btn-student-lab_queue',
          label: 'Gọi Hỗ trợ Phòng Lab',
          icon: HelpCircle,
          iconClass: 'text-violet-600 dark:text-violet-400',
          activeClass: 'text-violet-700 dark:text-violet-300 bg-violet-500/15 border border-violet-500/40 shadow-sm',
          isActive: activeTab === 'assignments' && practiceSubTab === 'lab_queue'
        }
      ]
    },
    {
      id: 'academic',
      title: 'Học Tập & Học Vụ',
      items: [
        {
          key: 'gradebook_main',
          navId: 'nav-btn-student-gradebook_main',
          label: 'Bảng điểm, ĐRL & Dự tính điểm',
          icon: Award,
          iconClass: 'text-indigo-600 dark:text-indigo-400',
          activeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/40 shadow-sm',
          badge: 'HK 1',
          badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono',
          isActive: activeTab === 'gradebook' && academicSubTab === 'gradebook_main'
        },
        {
          key: 'leave_request',
          navId: 'nav-btn-student-leave_request',
          label: 'Xin nghỉ phép & Học bù AI',
          icon: FileText,
          iconClass: 'text-amber-600 dark:text-amber-400',
          activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-sm',
          badge: pendingLeaveCount > 0 ? pendingLeaveCount : null,
          badgeClass: 'bg-amber-500 text-white',
          isActive: activeTab === 'gradebook' && academicSubTab === 'leave_request'
        },
        {
          key: 'schedule',
          navId: 'nav-btn-student-schedule',
          label: 'Thời khóa biểu Tuần',
          icon: Calendar,
          iconClass: 'text-sky-600 dark:text-sky-400',
          activeClass: 'text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/40 shadow-sm',
          badge: '16/11–20/12',
          badgeClass: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 font-mono',
          isActive: activeTab === 'gradebook' && academicSubTab === 'schedule'
        },
        {
          key: 'curriculum',
          navId: 'nav-btn-student-curriculum',
          label: 'Cây Tiến Trình & Biểu Đồ',
          icon: BarChart3,
          iconClass: 'text-emerald-600 dark:text-[#00dfa2]',
          activeClass: 'text-emerald-700 dark:text-[#00dfa2] bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          badge: 'HK1-8',
          badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-[#00dfa2] font-mono',
          isActive: activeTab === 'gradebook' && academicSubTab === 'curriculum'
        }
      ]
    },
    {
      id: 'ai',
      title: 'Gia Sư AI & Học Liệu Mở',
      items: [
        {
          key: 'chat_tutor',
          navId: 'nav-btn-student-chat_tutor',
          label: 'Gia sư AI Tutor 24/7',
          icon: Bot,
          iconClass: 'text-purple-600 dark:text-purple-400',
          activeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/40 shadow-sm',
          badge: 'RAG',
          badgeClass: 'bg-purple-500/25 text-purple-800 dark:text-purple-200',
          isActive: activeTab === 'aitutor' && aiSubTab === 'chat_tutor'
        },
        {
          key: 'mindmap',
          navId: 'nav-btn-student-mindmap',
          label: 'AI Tạo Sơ đồ Tư duy',
          icon: PieChart,
          iconClass: 'text-fuchsia-600 dark:text-fuchsia-400',
          activeClass: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/40 shadow-sm',
          badge: 'AI',
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300',
          isActive: activeTab === 'aitutor' && aiSubTab === 'mindmap'
        },
        {
          key: 'lecture_recap',
          navId: 'nav-btn-student-lecture_recap',
          label: 'Bài cũ & Sơ đồ Ôn tập',
          icon: BookMarked,
          iconClass: 'text-teal-600 dark:text-[#00dfa2]',
          activeClass: 'text-teal-700 dark:text-[#00dfa2] bg-teal-500/15 border border-teal-500/40 shadow-sm',
          badge: 'Slide',
          badgeClass: 'bg-teal-500/20 text-teal-700 dark:text-[#00dfa2]',
          isActive: activeTab === 'aitutor' && aiSubTab === 'lecture_recap'
        },
        {
          key: 'library',
          navId: 'nav-btn-student-library',
          label: 'Kho Học liệu Mở (OER)',
          icon: Library,
          iconClass: 'text-emerald-600 dark:text-emerald-400',
          activeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 shadow-sm',
          isActive: activeTab === 'aitutor' && aiSubTab === 'library'
        }
      ]
    },
    {
      id: 'community',
      title: 'Bản Tin, Hỏi Đáp & Vinh Danh',
      items: [
        {
          key: 'polls_main',
          navId: 'nav-btn-student-polls_main',
          label: 'Thông báo & Biểu quyết Lớp',
          icon: Vote,
          iconClass: 'text-indigo-600 dark:text-indigo-400',
          activeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/40 shadow-sm',
          isActive: activeTab === 'polls' && communitySubTab === 'polls_main'
        },
        {
          key: 'live_qa',
          navId: 'nav-btn-student-live_qa',
          label: 'Hỏi đáp Lớp học & Góp ý GV',
          icon: MessageSquare,
          iconClass: 'text-rose-600 dark:text-rose-400',
          activeClass: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/40 shadow-sm',
          badge: resolvedFeedbackCount > 0 ? resolvedFeedbackCount : null,
          badgeClass: 'bg-rose-500 text-white',
          isActive: activeTab === 'polls' && communitySubTab === 'live_qa'
        },
        {
          key: 'contributor',
          navId: 'nav-btn-student-contributor',
          label: 'Chuỗi Chuyên cần & Vinh danh',
          icon: Sparkles,
          iconClass: 'text-amber-600 dark:text-amber-400',
          activeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-sm',
          isActive: activeTab === 'polls' && communitySubTab === 'contributor'
        }
      ]
    }
  ];

  const currentStudentFeatureKey =
    activeTab === 'overview'
      ? 'overview'
      : activeTab === 'attendance'
      ? classroomSubTab
      : activeTab === 'assignments'
      ? practiceSubTab
      : activeTab === 'gradebook'
      ? academicSubTab
      : activeTab === 'aitutor'
      ? aiSubTab
      : communitySubTab;

  // Unified Segmented Sub-tab Bar helper across all workspaces (Mobile only — Desktop promoted to Left Sidebar)
  const renderSegmentedSubTabs = (tabs, currentSubTab, onSelect) => (
    <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar mb-4">
      {tabs.map((tab) => {
        const isActive = currentSubTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm whitespace-nowrap shrink-0 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2'
            }
          >
            <span>{tab.label}</span>
            {tab.badge ? (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

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
            id="btn-student-mobile-menu"
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Mở menu 16 tính năng"
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => navigateStudentTab('overview')}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden text-left cursor-pointer group focus:outline-none"
            title="Về trang Tổng quan Học tập"
          >
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0c1424] p-1 border border-[#85b8bc]/40 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <img 
                src={theme === 'dark' ? '/eg-logo-teal.png' : '/eg-logo.png'} 
                alt="EG" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5 min-w-0">
                <span className="truncate">EG Education</span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-[#00b4d8] border border-cyan-500/30 whitespace-nowrap shrink-0">Sinh Viên</span>
              </span>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">Tiện ích giáo dục • Educational Utility</p>
            </div>
          </button>
        </div>

        {/* CENTER: Global Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-2 items-center gap-2 bg-slate-100/90 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/15 rounded-2xl px-3.5 py-2 neu-inset transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && librarySearch.trim()) {
                navigateStudentTab('library');
              }
            }}
            placeholder="AI Semantic Search: Tìm giáo trình, đề thi..." 
            className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-medium"
          />
          {librarySearch && (
            <button
              type="button"
              onClick={() => setLibrarySearch('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* RIGHT: Controls, Student Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} />
            <NotificationCenter role="student" onNavigateTab={navigateStudentTab} />
          </div>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-sky-700 dark:text-[#00b4d8] font-bold text-xs flex items-center justify-center border border-cyan-500/30 shadow-sm shrink-0">
              SV
            </div>
            <div className="text-left whitespace-nowrap shrink-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{user?.name || 'Trịnh Tuấn Kiệt'}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">CNTT K26 • MSSV: {activeTestingStudentCode}</div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="p-2 sm:p-2.5 rounded-xl border border-transparent text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all cursor-pointer shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex min-w-0 relative">
        
        {/* LEFT SIDEBAR NAVIGATION (Collapsible 16-Feature Toolbar Drawer) */}
        <CollapsibleFeatureSidebar
          sidebarId="student-left-sidebar"
          toggleBtnId="btn-student-toggle-sidebar"
          edgeHandleId="btn-student-sidebar-edge-handle"
          accentColor="cyan"
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          collapsedGroups={collapsedSidebarGroups}
          onToggleGroup={handleToggleSidebarGroup}
          featureGroups={studentFeatureGroups}
          onSelectFeature={navigateStudentTab}
          collapsedAvatarText="SV"
          collapsedAvatarTitle={`${user?.name || 'Trịnh Tuấn Kiệt'} • K26 CNTT`}
          profileCard={
            <div className="p-3 rounded-2xl bg-white dark:bg-[#0f192e] border border-slate-200 dark:border-slate-800 space-y-2 neu-flat">
              <div className="flex items-center justify-between gap-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Trịnh Tuấn Kiệt'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-[#00b4d8] font-bold shrink-0">K26 CNTT</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Số buổi nghỉ (Ktra): <strong className="text-teal-600 dark:text-[#00dfa2]">{myAbsences} buổi</strong></p>
            </div>
          }
          securityBadge={
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bảo Mật Quyền Riêng Tư</div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">DPIA &amp; NĐ 13/2023/NĐ-CP Mã hóa On-device</span>
              </div>
            </div>
          }
          footerStatusText="Chế độ On-device Security"
          footerVersionText="EG Education Platform • Trực Tuyến"
        />

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 overflow-y-auto space-y-5">
          
          {/* Streamlined Header Title Banner */}
          <div className="flex flex-col gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-sky-700 dark:text-[#00b4d8] text-[11px] font-semibold mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-[#00b4d8] animate-ping" />
                  PHÂN HỆ HỌC VIÊN • {user?.name || 'TRỊNH TUẤN KIỆT'} (MSSV: {activeTestingStudentCode})
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {headerInfo.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {headerInfo.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="px-3 py-1 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-sky-700 dark:text-[#00b4d8] text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  🎓 Không Gian: Sinh Viên
                </span>
              </div>
            </div>

            {/* Mobile Workspace Switcher for Small Screens */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'attendance', label: 'Lớp học & QR' },
                { id: 'assignments', label: 'Lab & Đồ án' },
                { id: 'gradebook', label: 'Kết quả & Học vụ' },
                { id: 'aitutor', label: 'AI & Thư viện' },
                { id: 'polls', label: 'Bảng tin & Hỏi đáp' }
              ].map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => navigateStudentTab(ws.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    activeTab === ws.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          </div>

          <div key={currentStudentFeatureKey} className="workspace-stage-anim space-y-5">
            {/* ========================================================================= */}
            {/* WORKSPACE 1: TỔNG QUAN HỌC TẬP (PERSONAL ACADEMIC OVERVIEW)               */}
            {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Header Overview Welcome Card */}
              <div className="p-5 sm:p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-600 p-0.5 shadow-md shadow-sky-500/20 shrink-0">
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-sky-400 font-extrabold text-lg">
                      🎓
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        Xin chào, {user?.name || 'Trịnh Tuấn Kiệt'}!
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-[#00b4d8] font-extrabold text-[10px] border border-cyan-500/30">
                        K26 CNTT
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lớp: K26 CNTT - Lớp A • MSSV: {currentStudentRecord?.code || activeTestingStudentCode} • Số buổi nghỉ (cột Ktra): {myAbsences} buổi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button 
                    onClick={() => navigateStudentTab('attendance')}
                    className="px-3.5 py-2 rounded-xl neu-btn-glow font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Điểm Danh Ngay</span>
                  </button>
                  <button 
                    onClick={() => navigateStudentTab('aitutor')}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Hỏi AI Tutor</span>
                  </button>
                </div>
              </div>

              {/* 4 PERSONAL KPI METRIC CARDS (REAL DATA FROM EXCEL & LIVE DB) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* KPI 1: Số buổi nghỉ (cột Ktra) */}
                <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-teal-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Số Buổi Nghỉ (Ktra)</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{myAbsences} Buổi</span>
                      <span className={`text-[11px] font-bold ${myAbsences >= 4 ? 'text-rose-500' : myAbsences === 3 ? 'text-amber-500' : 'text-emerald-600 dark:text-[#00dfa2]'}`}>
                        {myAbsences >= 4 ? 'Cấm thi (≥4 buổi)' : myAbsences === 3 ? 'Cảnh báo (3 buổi)' : 'Đủ điều kiện'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo danh sách kiểm tra lớp K26 CNTT - Lớp A</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${myAbsences >= 4 ? 'bg-rose-500' : myAbsences === 3 ? 'bg-amber-500' : 'bg-gradient-to-r from-teal-500 to-[#00dfa2]'}`} style={{ width: `${Math.min(100, Math.round((myAbsences / 4) * 100))}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Quy chế: Vắng ≥ 4 buổi cấm thi</span>
                    <span className="font-semibold">Lần điểm danh QR: {attendanceRecords.length}</span>
                  </div>
                </div>

                {/* KPI 2: AI Tutor */}
                <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Tutor Đồng Hành</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <Bot className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{Math.max(0, messages.filter(m => m.sender === 'user').length)} Câu hỏi</span>
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">RAG 3 Tầng</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Số câu hỏi đã trao đổi trong phiên hiện tại</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${messages.filter(m => m.sender === 'user').length > 0 ? 100 : 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Sẵn sàng hỗ trợ 24/7</span>
                    <button
                      onClick={() => navigateStudentTab('aitutor')}
                      className="text-purple-600 dark:text-purple-300 hover:underline font-bold cursor-pointer"
                    >
                      Mở AI Tutor →
                    </button>
                  </div>
                </div>

                {/* KPI 3: Tủ sách cá nhân & học liệu */}
                <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-sky-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tủ Sách Cá Nhân</span>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-sky-600 dark:text-[#00b4d8] flex items-center justify-center border border-cyan-500/20">
                      <BookMarked className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{bookmarkedIds.length} Bộ</span>
                      <span className="text-[11px] font-bold text-sky-600 dark:text-[#00b4d8]">Đã lưu</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{libraryResources.length} học liệu hiện có trên hệ thống</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: `${libraryResources.length > 0 ? 100 : 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Kho học liệu OER</span>
                    <button 
                      onClick={() => navigateStudentTab('library')}
                      className="text-sky-600 dark:text-[#00b4d8] hover:underline font-bold cursor-pointer"
                    >
                      Mở kho sách →
                    </button>
                  </div>
                </div>

                {/* KPI 4: Đơn xin nghỉ phép */}
                <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đơn Xin Nghỉ Phép</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{leaveRequests.length} Đơn</span>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300">
                        {pendingLeaveCount} chờ duyệt
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Đơn xin nghỉ phép đã gửi trên hệ thống</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${leaveRequests.length > 0 ? 100 : 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Đồng bộ trực tiếp SQLite</span>
                    <button 
                      onClick={() => navigateStudentTab('leave_request')}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      Quản lý đơn →
                    </button>
                  </div>
                </div>

              </div>

              {/* REAL PROFILE & EXCEL ATTENDANCE RECORD */}
              <div className="p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                      Thông Tin Hồ Sơ &amp; Chuyên Cần Thực Tế (Từ File Excel Lớp Học)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quy định tín chỉ: Sinh viên nghỉ vượt quá 20% (≥ 4 buổi) sẽ bị cấm thi kết thúc học phần
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    myAbsences >= 4
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : myAbsences === 3
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-800 dark:text-[#00dfa2] border-emerald-500/30'
                  }`}>
                    {myAbsences >= 4 ? `⚠ Vắng ${myAbsences} buổi (Cấm thi)` : myAbsences === 3 ? '⚠ Vắng 3 buổi (Cảnh báo)' : `✓ Đủ điều kiện dự thi (Nghỉ ${myAbsences} buổi)`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên • MSSV</span>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">{currentStudentRecord?.name || user?.name}</div>
                    <div className="font-mono text-slate-500">MSSV: {currentStudentRecord?.code || activeTestingStudentCode}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Ngày Sinh &amp; Lớp</span>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">{currentStudentRecord?.dob || 'Chưa cập nhật'}</div>
                    <div className="text-slate-500">{currentStudentRecord?.classId || 'K26 CNTT - Lớp A'}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Số Điện Thoại &amp; Zalo</span>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm font-mono">{currentStudentRecord?.phone || 'Chưa cập nhật'}</div>
                    <div className="text-slate-500">Zalo: {currentStudentRecord?.zaloName || 'Chưa cập nhật'}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Số Buổi Nghỉ (Cột Ktra)</span>
                    <div className={`font-extrabold text-lg ${myAbsences >= 4 ? 'text-rose-500' : myAbsences === 3 ? 'text-amber-500' : 'text-teal-600 dark:text-[#00dfa2]'}`}>
                      {myAbsences} buổi
                    </div>
                    <div className="text-slate-500">Chức vụ: {currentCadreInfo.title}</div>
                  </div>
                </div>
              </div>

              {/* TWO COLUMNS: QUICK LAUNCHPADS & LIVE SCHEDULE/NOTICES */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Quick Action Launchpad (Col 6) */}
                <div className="lg:col-span-6 p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-sky-600 dark:text-[#00b4d8]" />
                      Lối Tắt Tiện Ích Học Tập Nhanh
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Truy cập 1-chạm vào các chức năng thường dùng hàng ngày
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <button
                      onClick={() => navigateStudentTab('attendance')}
                      className="p-4 rounded-2xl bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 text-left space-y-1.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Quét QR Điểm Danh</span>
                      <p className="text-[10px] text-slate-500">Xác thực GPS phòng học & Wi-Fi</p>
                    </button>

                    <button
                      onClick={() => navigateStudentTab('aitutor')}
                      className="p-4 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 text-left space-y-1.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bot className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Hỏi AI Tutor Pro</span>
                      <p className="text-[10px] text-slate-500">Strict RAG đối chiếu giáo trình</p>
                    </button>

                    <button
                      onClick={() => navigateStudentTab('library')}
                      className="p-4 rounded-2xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/20 text-left space-y-1.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-[#00b4d8] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Library className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Kho Học Liệu Mở</span>
                      <p className="text-[10px] text-slate-500">Tài liệu do giảng viên đăng tải</p>
                    </button>

                    <button
                      onClick={() => navigateStudentTab('leave_request')}
                      className="p-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-left space-y-1.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Lập Đơn Xin Nghỉ</span>
                      <p className="text-[10px] text-slate-500">Đính kèm minh chứng y tế/công tác</p>
                    </button>
                  </div>
                </div>

                {/* Live Notices & Timetable Status (Col 6) */}
                <div className="lg:col-span-6 p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          Lịch Học Thực Tế (16/11 – 06/12/2026)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Cập nhật theo thời khóa biểu Trường Đại học Tây Nguyên ({STUDENT_WEEKLY_TIMETABLES.length} tuần)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateStudentTab('schedule')}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[11px] font-extrabold border border-indigo-500/30 cursor-pointer shrink-0"
                      >
                        Xem Thời khóa biểu →
                      </button>
                    </div>

                    <div className="space-y-2.5 mt-3 text-xs">
                      <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-500/30 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">Lập trình Python (Tiết 7–10 • Chiều)</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">GV: <strong>Từ Ngọc Thảo</strong> • Phòng: <strong>Online</strong></div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold shrink-0">
                          T3/T5/T2
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-500/30 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">Tiếng Anh 1 (Tiết 7–10 / 7–8 • Chiều)</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">GV: <strong>Tôn Nữ Hồng Hà</strong> • Phòng: <strong>9.2.11</strong></div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold shrink-0">
                          Thứ 6
                        </span>
                      </div>
                      {announcements.length > 0 && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          Hiện có <strong className="text-slate-900 dark:text-white">{announcements.length} thông báo/công văn</strong> từ giảng viên hoặc Ban Cán Sự lớp.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tuần 07/12 – 20/12/2026: Chưa có lịch học</span>
                    <button 
                      onClick={() => navigateStudentTab('schedule')}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      Chi tiết 5 tuần →
                    </button>
                  </div>
                </div>

              </div>

              {/* CÂY TIẾN TRÌNH ĐÀO TẠO K26 CNTT (HK 1 — ĐÃ HOÀN THÀNH 5 PHÂN MÔN + BIỂU ĐỒ TIẾN ĐỘ) */}
              <div className="p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-emerald-200 dark:border-emerald-500/30 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Tiến Trình Đào Tạo {CURRICULUM_METADATA.className} ({CURRICULUM_METADATA.cohort})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      HK 1: Đã hoàn thành <strong>10/15 Tín chỉ (66.7%)</strong> với 5 phân môn; đang học <strong>5/15 TC (33.3%)</strong> là Lập trình Python &amp; Tiếng Anh 1
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateStudentTab('curriculum')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Xem Cây Tiến Trình &amp; Biểu Đồ</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Thanh tiến độ trực quan HK 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-200">Tiến độ hoàn thành Học kỳ 1 (15 TC):</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400">✓ Đã xong: 10 TC (66.7%)</span>
                      <span className="text-amber-600 dark:text-amber-400">◷ Đang học: 5 TC (33.3%)</span>
                    </div>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: '66.7%' }} />
                    <div className="h-full bg-amber-400" style={{ width: '33.3%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {K26_COMPLETED_COURSES.map((course) => (
                    <div
                      key={course.code}
                      className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-500/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[11px] font-extrabold text-blue-700 dark:text-blue-300">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          {course.credits} TC
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                        {course.name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Đã học xong ({course.semester})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 2: LỚP HỌC & ĐIỂM DANH LIVE (QR, EXIT TICKET, WEBRTC, QUIZ)     */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-5">
              {renderSegmentedSubTabs(
                [
                  { id: 'qr_scan', label: '📱 Quét QR Điểm danh Động' },
                  { id: 'exit_ticket', label: '🎫 Vé ra về (Exit Ticket) & Vòng quay' },
                  { id: 'virtual_class', label: '🎥 Phòng học Online WebRTC' },
                  { id: 'live_quiz', label: '⚡ Đố vui Flash Quiz (+0.5đ)' }
                ],
                classroomSubTab,
                setClassroomSubTab
              )}

              {classroomSubTab === 'qr_scan' && (
                <div className="space-y-5">
                  {/* 1. COMPACT SESSION BANNER: PHIÊN ĐIỂM DANH ĐANG DIỄN RA */}
                  <div className="p-3.5 sm:p-4 rounded-2xl neu-card bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-500/30 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] text-[11px] font-extrabold border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            ĐIỂM DANH LỚP HỌC • CNTT K26
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            88 Sinh viên (HK 1)
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                          Lớp CNTT K26 • ThS. Phạm Văn Thuận
                        </h3>
                      </div>

                      {/* Quick status pill on the right */}
                      <div className="shrink-0 flex items-center gap-2.5">
                        {scanSuccess ? (
                          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-[#00dfa2] flex items-center gap-2 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-[#00dfa2]" />
                            <div>
                              <div className="text-xs font-extrabold">ĐÃ CÓ MẶT HỢP LỆ</div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                                {studentGps.distanceMeters != null
                                  ? `GPS thực tế (${studentGps.distanceMeters}m)`
                                  : studentGps.status === 'granted'
                                  ? `GPS ±${studentGps.accuracy}m`
                                  : 'Đã xác thực GPS'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <div>
                              <div className="text-xs font-extrabold">CHƯA ĐIỂM DANH</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Quét Dynamic QR bên dưới</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

              {/* 2. MAIN 12-COL GRID: SCANNER TERMINAL (7 COLS) + AUDIT LOG & COMPLIANCE (5 COLS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COL 7: CAMERA SCANNER TERMINAL */}
                <div className="lg:col-span-7 neu-card rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-[#0c1424]">
                  
                  {/* Scanner Header with Mode Switcher & Camera Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Camera className="w-5 h-5 text-teal-600 dark:text-[#00dfa2]" />
                        Camera Quét Dynamic QR Thời Gian Thực
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Xử lý on-device • Tự động giải mã Dynamic QR 3s chu kỳ trượt & đối soát GPS
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Mode Switcher Pill */}
                      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setUseRealCamera(false);
                            setCameraError(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            !useRealCamera
                              ? 'bg-teal-600 dark:bg-[#00dfa2] text-white dark:text-slate-950 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          🔑 Xác Thực Phiên Trực Tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUseRealCamera(true);
                            setScanSuccess(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                            useRealCamera
                              ? 'bg-teal-600 dark:bg-[#00dfa2] text-white dark:text-slate-950 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📷 Camera Thật</span>
                        </button>
                      </div>

                      {/* Camera Hardware controls */}
                      {useRealCamera && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleToggleTorch}
                            className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              torchOn 
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-sm' 
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Bật/Tắt đèn Flash trợ sáng"
                          >
                            <Zap className={`w-4 h-4 ${torchOn ? 'fill-current' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleCamera}
                            className="p-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                            title="Đổi camera trước / sau"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HIGH-TECH CAMERA VIEWFINDER */}
                  <div className="relative h-72 sm:h-80 rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-between p-4 text-center shadow-inner">
                    
                    {/* Viewfinder Top HUD Bar */}
                    <div className="w-full flex items-center justify-between text-[10px] text-slate-400 z-10 px-1 font-mono">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {useRealCamera ? 'CAMERA HARDWARE: 60FPS' : 'LIVE HUD: 1080p • 60FPS'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-sky-400">
                        CHU KỲ: 3 GIÂY/LẦN
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-300">
                        CAM: {cameraFacing === 'back' ? 'SAU' : 'TRƯỚC'}
                      </span>
                    </div>

                    {/* Viewfinder Target Area / Camera Stream */}
                    {useRealCamera ? (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden my-auto rounded-xl">
                        {/* DOM container where html5-qrcode attaches the real camera video */}
                        <div id="qr-camera-stream" className="w-full h-full max-h-56 object-cover flex items-center justify-center text-slate-500 text-xs" />

                        {isCameraStarting && (
                          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 z-20">
                            <div className="w-8 h-8 border-2 border-[#00dfa2] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-[#00dfa2] font-semibold">Đang kích hoạt Camera...</span>
                          </div>
                        )}

                        {cameraError && (
                          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2.5 p-4 z-20 text-rose-400">
                            <AlertCircle className="w-7 h-7 text-rose-500 animate-bounce" />
                            <p className="text-xs font-semibold text-center max-w-xs">{cameraError}</p>
                            <button
                              onClick={() => {
                                setUseRealCamera(false);
                                setCameraError(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-extrabold cursor-pointer hover:bg-teal-400 transition-all shadow-md"
                            >
                              Chuyển sang Xác Thực Phiên Trực Tiếp
                            </button>
                          </div>
                        )}

                        {/* Scanner Overlay HUD for real camera */}
                        {!scanSuccess && !cameraError && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl border-2 border-dashed border-[#00dfa2]/70 relative">
                              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00dfa2]" />
                              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00dfa2]" />
                              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00dfa2]" />
                              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00dfa2]" />
                              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00dfa2] to-transparent shadow-[0_0_15px_#00dfa2] animate-bounce top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl border-2 border-dashed border-[#00dfa2]/60 flex items-center justify-center relative overflow-hidden my-auto">
                        {/* Corner target brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00dfa2]" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00dfa2]" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00dfa2]" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00dfa2]" />
                        
                        {/* Dynamic laser scan line */}
                        {isScanning && (
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00dfa2] to-transparent shadow-[0_0_15px_#00dfa2] animate-bounce top-1/2 -translate-y-1/2" />
                        )}

                        {/* State in Viewfinder */}
                        {isScanning ? (
                          <div className="flex flex-col items-center gap-2 text-xs text-[#00dfa2] font-bold z-10 p-2">
                            <div className="w-9 h-9 border-2 border-[#00dfa2] border-t-transparent rounded-full animate-spin" />
                            <span>Đang giải mã Dynamic QR 3s...</span>
                            <span className="text-[10px] text-slate-300 font-normal">Đang đối soát vị trí GPS thực tế</span>
                          </div>
                        ) : scanSuccess ? (
                          <div className="flex flex-col items-center gap-1.5 text-xs text-emerald-400 font-bold z-10 p-2">
                            <CheckCircle2 className="w-12 h-12 text-[#00dfa2] animate-bounce" />
                            <span className="text-sm tracking-wide">XÁC THỰC THÀNH CÔNG!</span>
                            <span className="text-[10px] text-slate-300 font-normal">Đã ghi nhận có mặt đúng giờ</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-2 z-10">
                            <QrCode className="w-10 h-10 text-slate-500 animate-pulse" />
                            <span className="text-xs text-slate-400 max-w-[130px] leading-tight font-medium">
                              Căn chỉnh mã Dynamic QR của giảng viên vào khung
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Real Geolocation Status HUD (Backend yêu cầu quyền lấy vị trí) */}
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] bg-slate-900/90 py-1.5 px-3 rounded-xl border border-slate-800 z-10">
                      <span className={`flex items-center gap-1.5 font-medium ${
                        studentGps.status === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> 
                        {studentGps.status === 'granted'
                          ? `GPS: ${studentGps.lat.toFixed(5)}°, ${studentGps.lng.toFixed(5)}° (±${studentGps.accuracy}m)`
                          : studentGps.status === 'requesting'
                          ? 'Đang yêu cầu quyền lấy vị trí GPS...'
                          : 'Chưa cấp quyền Vị trí (GPS)'}
                      </span>
                      <button
                        type="button"
                        onClick={requestStudentLocation}
                        className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-[#00dfa2] border border-teal-500/40 font-bold text-[10px] cursor-pointer shrink-0"
                      >
                        📍 {studentGps.status === 'granted' ? 'Cập nhật GPS' : 'Cấp quyền & Lấy GPS'}
                      </button>
                    </div>
                  </div>

                  {/* Primary Scan Action Buttons */}
                  <div className="space-y-3">
                    {!scanSuccess ? (
                      useRealCamera ? (
                        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-[#00dfa2] text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#00dfa2] animate-ping" />
                          <span>Hướng Camera về phía mã QR 3s trên màn hình Giảng viên để tự động quét</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleVerifyActiveSession}
                          disabled={isScanning}
                          className="w-full py-4 px-6 rounded-2xl neu-btn-glow font-extrabold text-sm tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg hover:shadow-teal-500/25 transition-all"
                        >
                          <QrCode className="w-5 h-5" />
                          <span>{isScanning ? 'ĐANG XÁC THỰC PHIÊN ĐIỂM DANH...' : 'XÁC THỰC ĐIỂM DANH CA HIỆN TẠI'}</span>
                        </button>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-[#00dfa2] text-xs font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Đã Điểm Danh Thành Công</span>
                          </div>
                          <button
                            onClick={handleResetScan}
                            className="py-3 px-4 rounded-xl neu-btn text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2]" />
                            <span>Quét Lại Mã QR</span>
                          </button>
                        </div>

                        {/* Real-time Verification Badge */}
                        {scanVerificationResult && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-fadeIn">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center font-extrabold text-sm shrink-0">
                                ✓
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  <span>{scanVerificationResult.isGrace 
                                    ? '⚡ Xác thực Cửa sổ mạng trượt (Grace Window)' 
                                    : '🎖️ Xác thực Dynamic QR 3s Tức Thì'}</span>
                                  <span className="text-[10px] text-teal-600 dark:text-[#00dfa2] font-semibold">({scanVerificationResult.methodLabel})</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Học viên: <b className="text-slate-700 dark:text-slate-300">{scanVerificationResult.studentName}</b> • Khớp GPS Geofencing lúc {scanVerificationResult.timeStr}
                                </div>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shrink-0">
                              {scanVerificationResult.isGrace ? 'Grace +3s' : 'Khớp QR 3s'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DPIA Security & Privacy Guarantee Footer */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800/80 flex items-start gap-3 text-xs">
                    <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-[#00dfa2] shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300">Bảo mật Quyền riêng tư theo Nghị định 13/2023/NĐ-CP:</strong> Dữ liệu vị trí GPS được đối soát nội bộ trên thiết bị của học viên (On-device Processing), chỉ dùng để xác nhận khoảng cách phòng học tại thời điểm quét mã QR và không lưu trữ lịch sử di chuyển cá nhân.
                    </div>
                  </div>

                </div>

                {/* COL 5: SECURITY CRITERIA & ATTENDANCE AUDIT LOG */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Security Verification Criteria Card (Real GPS Permission & Verification) */}
                  <div className="p-5 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 gap-2">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-[#00dfa2]" />
                        Yêu Cầu Định Vị GPS Từ Backend
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        studentGps.status === 'granted'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2]'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}>
                        {studentGps.status === 'granted' ? 'Đã cấp quyền GPS' : 'Chờ cấp quyền GPS'}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className={`w-4 h-4 shrink-0 ${studentGps.status === 'granted' ? 'text-emerald-500' : 'text-amber-500'}`} />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white">Định vị trình duyệt (Geolocation)</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {studentGps.status === 'granted'
                                ? `${studentGps.lat.toFixed(5)}°, ${studentGps.lng.toFixed(5)}° (±${studentGps.accuracy}m)`
                                : studentGps.error || 'Chưa nhận được tọa độ GPS từ trình duyệt'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-student-request-gps"
                          onClick={requestStudentLocation}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 text-[11px] font-bold shrink-0 cursor-pointer"
                        >
                          {studentGps.status === 'granted' ? '✓ Cập nhật' : '📍 Cấp quyền'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-500 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">Xác thực thiết bị &amp; tài khoản</div>
                            <div className="text-[10px] text-slate-500">MSSV: {activeTestingStudentCode} • Lớp CNTT K26</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">✓ Sẵn sàng</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance History Audit Log Card */}
                  <div className="p-5 sm:p-6 rounded-3xl neu-card bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                          Nhật Ký Điểm Danh Học Kỳ Này
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Đồng bộ trực tiếp với SQLite (đã reset sạch dữ liệu test)
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] font-extrabold border border-emerald-500/30 shrink-0">
                        Nghỉ (Ktra): {myAbsences} buổi
                      </span>
                    </div>

                    {/* Filter chips for real active subjects */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'Lập trình Python', label: 'Lập trình Python' },
                        { key: 'Tiếng Anh 1', label: 'Tiếng Anh 1' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setAttendanceSubjectFilter(tab.key)}
                          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                            attendanceSubjectFilter === tab.key
                              ? 'bg-teal-600 text-white dark:bg-[#00dfa2] dark:text-slate-950 shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Records List */}
                    <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                      {attendanceRecords.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                          Chưa có lượt điểm danh trực tuyến nào được ghi nhận.
                        </div>
                      ) : (
                        attendanceRecords
                          .filter(r => attendanceSubjectFilter === 'all' || (r.subject || '').includes(attendanceSubjectFilter))
                          .map((row) => (
                          <div 
                            key={row.id} 
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs hover:border-teal-500/40 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="font-extrabold text-slate-900 dark:text-white">{row.subject}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {row.date} • {row.slot}
                              </div>
                              <div className="text-[10px] text-teal-600 dark:text-[#00dfa2] font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Quét lúc: {row.time} • {row.method}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] font-bold text-[10px] border border-emerald-500/30 shrink-0">
                              ✓ Có mặt
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Summary bar */}
                    <div className="p-3 rounded-2xl neu-inset text-xs flex justify-between items-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                      <span>Quét QR: <b className="text-slate-900 dark:text-white">{attendanceRecords.length} buổi</b></span>
                      <span>Số buổi nghỉ tích lũy (Ktra): <b className={myAbsences >= 4 ? 'text-rose-500' : 'text-teal-600 dark:text-[#00dfa2]'}>{myAbsences} buổi</b></span>
                    </div>

                    {/* Quick navigation to leave request if sick/busy */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => navigateStudentTab('leave_request')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Bạn bị ốm hoặc có việc đột xuất? Nộp đơn xin nghỉ học tại đây →
                      </button>
                    </div>

                  </div>

                </div>

              </div>

                </div>
              )}

              {classroomSubTab === 'exit_ticket' && (
                <AttendanceExitAndPickerAddon role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
              )}

              {classroomSubTab === 'virtual_class' && (
                <VirtualClassroomHub role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
              )}

              {classroomSubTab === 'live_quiz' && (
                <LiveFlashQuizHub role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 5: GIA SƯ AI & THƯ VIỆN OER (CHAT, MINDMAP, OER LIBRARY)       */}
          {/* ========================================================================= */}
          {activeTab === 'aitutor' && (
            <div className="space-y-5">
              {renderSegmentedSubTabs(
                [
                  { id: 'chat_tutor', label: '🤖 Gia sư AI Tutor 24/7' },
                  { id: 'mindmap', label: '✨ AI Tạo Sơ đồ Tư duy' },
                  { id: 'lecture_recap', label: '📖 Bài cũ & Sơ đồ Ôn tập' },
                  { id: 'library', label: '📚 Kho Học liệu Mở (OER)' }
                ],
                aiSubTab,
                setAiSubTab
              )}

              {aiSubTab === 'chat_tutor' && (
                <div className="neu-card rounded-3xl p-5 sm:p-6 space-y-5 border border-purple-200 dark:border-purple-500/30 shadow-xl bg-white dark:bg-[#0c1424]">
                  {/* Header and Vector DB sources */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      AI Tutor Pro • Chuyên Ngành CNTT (Hybrid Mở + RAG)
                    </h3>
                    <span
                      id="tutor-engine-badge"
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[11px]"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      {tutorEngineLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kết nối nguồn tri thức mở (Wikipedia / Docs quốc tế) &amp; giáo trình hệ thống để giải đáp mọi câu hỏi ngành CNTT.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Nguồn tri thức kết nối:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30 font-semibold text-[11px]">
                    🌐 Nguồn Tri thức CNTT Mở Quốc tế
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-sky-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold text-[11px]">
                    📚 Kho Học liệu Nội bộ CNTT K26
                  </span>
                </div>
              </div>

              {/* Quick Prompts Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-semibold shrink-0">Gợi ý câu hỏi CNTT:</span>
                {[
                  '🌐 RESTful API, JWT Authentication & cách kết nối React - Node.js',
                  '🐍 Python: So sánh List, Tuple, Set, Dictionary & ứng dụng',
                  '⚡ So sánh Dijkstra vs Floyd-Warshall kèm code C++',
                  '🛢️ SQL Index B-Tree & Chuẩn hóa CSDL 1NF, 2NF, 3NF'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(chip)}
                    className="px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold whitespace-nowrap transition-all cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div ref={tutorChatStreamRef} className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                {messages.map((m, index) => (
                  <div 
                    key={index}
                    className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'ai' && (
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 mt-1">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl rounded-2xl p-4 space-y-3 text-xs leading-relaxed ${
                      m.sender === 'user' 
                        ? 'bg-teal-50 dark:bg-teal-950/20 text-slate-900 dark:text-white border border-teal-300 dark:border-[#00dfa2]/40'
                        : 'bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}>
                      {m.sender === 'ai' && m.engineUsed && (
                        <div className="flex flex-wrap items-center gap-1.5 pb-1.5 border-b border-slate-200/70 dark:border-slate-800/80">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-[10px] font-semibold">
                            <Zap className="w-3 h-3 shrink-0" />
                            <span>{m.engineUsed}</span>
                            {m.ragSourcesCount > 0 && (
                              <span className="text-emerald-700 dark:text-[#00dfa2] font-bold">
                                • {m.ragSourcesCount} nguồn SQLite RAG
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* Comparison Table if present */}
                      {m.table && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 my-2">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-100 dark:bg-[#0f172a] text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700/60">
                              <tr>
                                <th className="p-2.5">Tiêu chí</th>
                                <th className="p-2.5">Thuật toán Dijkstra</th>
                                <th className="p-2.5">Thuật toán Floyd–Warshall</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {m.table.map((row, rIndex) => (
                                <tr key={rIndex} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                                  <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{row.criteria}</td>
                                  <td className="p-2.5 text-slate-700 dark:text-slate-300">{row.dijkstra}</td>
                                  <td className="p-2.5 text-slate-700 dark:text-slate-300">{row.floyd}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Interactive Quiz Data if present */}
                      {m.quizData && (
                        <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              Câu Hỏi Trắc Nghiệm Củng Cố Kiến Thức:
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                              Thang Bloom: Phân tích
                            </span>
                          </div>
                          
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {m.quizData.question}
                          </p>

                          <div className="space-y-1.5">
                            {m.quizData.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  setSelectedQuizAnswer(optIdx);
                                  setShowQuizResult(true);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                                  selectedQuizAnswer === optIdx
                                    ? optIdx === m.quizData.correct
                                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-[#00dfa2] font-bold'
                                      : 'bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-200 font-bold'
                                    : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-purple-400'
                                }`}
                              >
                                <span>{opt}</span>
                                {showQuizResult && selectedQuizAnswer === optIdx && (
                                  optIdx === m.quizData.correct 
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#00dfa2] shrink-0" />
                                    : <X className="w-4 h-4 text-rose-500 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>

                          {showQuizResult && (
                            <div className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                              selectedQuizAnswer === m.quizData.correct
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                            }`}>
                              <strong>{selectedQuizAnswer === m.quizData.correct ? '✓ Rất tốt! ' : '❌ Chưa chính xác: '}</strong>
                              {m.quizData.explanation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* RAG Citations */}
                      {Array.isArray(m.citations) && m.citations.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-500/30 space-y-1">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-[#00dfa2] uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Nguồn Trích Dẫn RAG 3 Tầng Xác Thực:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(m.text);
                                triggerToast('Đã sao chép nội dung câu trả lời!');
                              }}
                              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[10px] cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Sao chép
                            </button>
                          </div>
                          {m.citations.map((c, cIndex) => (
                            <div key={cIndex} className="text-[11px] text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-emerald-500/50">
                              {c}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      {m.summary && (
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 text-[11px] text-purple-900 dark:text-purple-200">
                          <span className="font-bold">📑 AI Summary: </span>
                          {m.summary}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTutorThinking && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 mt-1">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="max-w-2xl rounded-2xl px-4 py-3 text-xs bg-slate-50 dark:bg-[#090e1a] border border-purple-300/60 dark:border-purple-500/30 text-slate-700 dark:text-slate-300 flex items-center gap-2.5 shadow-sm">
                      <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-spin shrink-0" />
                      <span className="font-medium">Đang truy xuất Kho học liệu SQLite &amp; suy luận AI...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2">
                <input 
                  id="input-tutor-question"
                  type="text" 
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="Hỏi mọi câu hỏi ngành CNTT (Python, C++, Web, SQL, Thuật toán, Mạng, AI) hoặc tài liệu lớp..."
                  className="flex-1 bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500 dark:focus:border-[#00dfa2]/60 neu-inset font-medium"
                />
                <button
                  id="btn-tutor-send"
                  type="submit"
                  disabled={isTutorThinking}
                  className="px-5 py-3 rounded-xl neu-btn-glow font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTutorThinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isTutorThinking ? 'ĐANG HỎI...' : 'HỎI AI'}</span>
                </button>
              </form>
                </div>
              )}

              {(aiSubTab === 'mindmap' || aiSubTab === 'lecture_recap') && (
                <AiLectureMindmapHub
                  role="student"
                  initialFeatureTab={aiSubTab === 'lecture_recap' ? 'course_recap' : 'ai_generator'}
                  triggerToast={triggerToast}
                />
              )}

              {aiSubTab === 'library' && (
                <div className="neu-card rounded-3xl p-5 sm:p-6 space-y-5 border border-cyan-200 dark:border-cyan-500/30 shadow-xl bg-white dark:bg-[#0c1424]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Library className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
                    Kho Học Liệu Mở Toàn Diện (Creative Commons OER)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    18 loại học liệu mở chuẩn Creative Commons (CC BY, CC BY-NC) kết nối chia sẻ rộng rãi
                  </p>
                </div>

                <button 
                  onClick={() => setShowContributeModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-600/30 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đóng Góp Học Liệu Mới (Quy Trình 6 Bước)</span>
                </button>
              </div>

              {/* Metadata Filter Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Khối Ngành / Khoa</span>
                  <select 
                    value={libraryFaculty} 
                    onChange={(e) => setLibraryFaculty(e.target.value)}
                    className="w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700/60 rounded-lg p-2 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="all">Tất Cả Khối Ngành</option>
                    <option value="it">Khoa Công Nghệ Thông Tin</option>
                    <option value="math">Khoa Toán - Tin Học</option>
                    <option value="edu">Khoa Sư Phạm</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Loại Tài Nguyên</span>
                  <select 
                    value={libraryType} 
                    onChange={(e) => setLibraryType(e.target.value)}
                    className="w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700/60 rounded-lg p-2 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="all">Tất Cả 18 Loại Học Liệu</option>
                    <option value="book">Giáo Trình Chuẩn</option>
                    <option value="quiz">Ngân Hàng Đề Thi</option>
                    <option value="slide">Slide Bài Giảng</option>
                    <option value="exam">Đề Cương & Bài Tập Lớn</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Giấy Phép Bản Quyền</span>
                  <select 
                    value={libraryLicense} 
                    onChange={(e) => setLibraryLicense(e.target.value)}
                    className="w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700/60 rounded-lg p-2 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="all">Tất Cả Giấy Phép</option>
                    <option value="CC BY">Creative Commons (CC BY)</option>
                    <option value="CC BY-NC">Creative Commons (CC BY-NC)</option>
                    <option value="CC BY-SA">Creative Commons (CC BY-SA)</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Tủ Sách Đã Lưu</span>
                  <div className="flex items-center h-9 px-3 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 font-bold">
                    <BookMarked className="w-4 h-4 text-teal-600 dark:text-[#00dfa2] mr-2" />
                    <span>{bookmarkedIds.length} tài liệu đã lưu</span>
                  </div>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLibrary.map((item) => (
                  <div key={item.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 dark:hover:border-[#00dfa2]/40 transition-all space-y-3 shadow-sm flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{item.author}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleBookmark(item.id)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              bookmarkedIds.includes(item.id)
                                ? 'text-teal-600 dark:text-[#00dfa2]'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                            title={bookmarkedIds.includes(item.id) ? 'Bỏ lưu' : 'Lưu vào tủ sách'}
                          >
                            <BookMarked className="w-4 h-4" />
                          </button>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-cyan-300 font-bold text-[10px] border border-cyan-500/30">
                            {item.license}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                      {downloadingId === item.id && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-teal-600 dark:text-[#00dfa2] font-bold">
                            <span>Đang tải xuống tài liệu...</span>
                            <span>{downloadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-teal-500 dark:bg-[#00dfa2] transition-all duration-300" 
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.pages} • {item.downloads} lượt tải • ⭐ {item.rating}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setPreviewMaterial(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem Mục Lục
                          </button>
                          <button 
                            onClick={() => handleSimulateDownload(item)}
                            disabled={downloadingId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-cyan-300 font-semibold text-xs border border-sky-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Tải PDF
                          </button>
                          <button 
                            onClick={() => {
                              navigateStudentTab('aitutor');
                              triggerToast(`Đã nạp giáo trình "${item.title}" vào Trợ lý AI Tutor Pro!`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-[#00dfa2] font-semibold text-xs border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5" /> Hỏi AI
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 4: KẾT QUẢ HỌC TẬP & HỌC VỤ (GRADEBOOK, LEAVE, SCHEDULE)        */}
          {/* ========================================================================= */}
          {activeTab === 'gradebook' && (
            <div className="space-y-5">
              {renderSegmentedSubTabs(
                [
                  { id: 'gradebook_main', label: '📊 Bảng điểm, ĐRL & Dự tính điểm' },
                  {
                    id: 'leave_request',
                    label: '📝 Xin nghỉ phép & Học bù AI',
                    badge: pendingLeaveCount > 0 ? pendingLeaveCount : null
                  },
                  { id: 'schedule', label: '📅 Thời khóa biểu Tuần (16/11 – 20/12)' },
                  { id: 'curriculum', label: '🌳 Cây Tiến Trình & Biểu Đồ Tiến Độ (HK1 – HK8)' }
                ],
                academicSubTab,
                setAcademicSubTab
              )}

              {academicSubTab === 'gradebook_main' && (
                <StudentGradebook
                  activeStudentCode={activeTestingStudentCode}
                  triggerToast={triggerToast}
                />
              )}

              {academicSubTab === 'leave_request' && (
                <div className="space-y-5">
                  {/* Sleek 2-button sub-switcher: AI Submit & Makeup vs Classic Form & History */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-[#0c1424] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setLeaveView('ai_submit')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          leaveView === 'ai_submit'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🤖 Nộp đơn AI &amp; Học bù</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveView('classic_history')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          leaveView === 'classic_history'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>📋 Nộp đơn chuẩn &amp; Lịch sử đơn</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            leaveView === 'classic_history'
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {leaveRequests.length}
                        </span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nộp trong vòng 48 giờ kèm minh chứng y tế/công tác hợp lệ
                    </span>
                  </div>

                  {leaveView === 'ai_submit' && (
                    <LeaveAiAndMakeupAddon role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
                  )}

                  {leaveView === 'classic_history' && (
                    <div className="space-y-5">
                      {/* Compact Notice */}
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs leading-relaxed">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Quy định nộp đơn xin nghỉ học tín chỉ:</strong> Sinh viên cần nộp đơn trước giờ học hoặc trong vòng 48 giờ sau buổi vắng kèm minh chứng hợp lệ (Giấy khám bệnh hoặc quyết định cử tham gia hoạt động).
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form to Create New Leave Request (Col 5) */}
                <div className="lg:col-span-5 neu-card rounded-3xl p-6 sm:p-7 space-y-4 border border-slate-200 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[#0c1424]">
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      Lập Đơn Xin Nghỉ Mới
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Điền thông tin buổi học và đính kèm tệp minh chứng
                    </p>
                  </div>

                  <form onSubmit={handleSubmitLeaveRequest} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Học Phần Xin Nghỉ *
                      </label>
                      <select 
                        value={newLeaveSubject}
                        onChange={(e) => setNewLeaveSubject(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-slate-800 dark:text-white neu-inset font-medium focus:outline-none"
                      >
                        <option value="Kỹ thuật lập trình (KC213013)">Kỹ thuật lập trình (KC213013 - 3 TC • Đã học xong)</option>
                        <option value="Nhập môn ngành CNTT (KC212681)">Nhập môn ngành CNTT (KC212681 - 2 TC • Đã học xong)</option>
                        <option value="Tin học đại cương (KC211038)">Tin học đại cương (KC211038 - 2 TC • Đã học xong)</option>
                        <option value="Toán cho Công nghệ Thông tin (KC211085)">Toán cho Công nghệ Thông tin (KC211085 - 2 TC • Đã học xong)</option>
                        <option value="Giáo dục thể chất 1 (SP211032)">Giáo dục thể chất 1 (SP211032 - 1 TC • Đã học xong)</option>
                        <option value="Lập trình Python (KC213042)">Lập trình Python (KC213042 - 3 TC • HK 1)</option>
                        <option value="Tiếng Anh 1 (FL211020)">Tiếng Anh 1 (FL211020 - 2 TC • HK 1)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Ngày Nghỉ Học *
                        </label>
                        <input 
                          type="date"
                          value={newLeaveDate}
                          onChange={(e) => setNewLeaveDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-slate-800 dark:text-white neu-inset font-medium focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Ca Học / Tiết *
                        </label>
                        <select 
                          value={newLeavePeriod}
                          onChange={(e) => setNewLeavePeriod(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-slate-800 dark:text-white neu-inset font-medium focus:outline-none"
                        >
                          <option>Tiết 1 - 3 (Buổi Sáng)</option>
                          <option>Tiết 4 - 6 (Buổi Sáng)</option>
                          <option>Tiết 7 - 9 (Buổi Chiều)</option>
                          <option>Cả ngày (Tiết 1 - 9)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Chuyên Mục Lý Do Nghỉ *
                      </label>
                      <select 
                        value={newLeaveCategory}
                        onChange={(e) => setNewLeaveCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-slate-800 dark:text-white neu-inset font-medium focus:outline-none"
                      >
                        <option value="medical">Khám chữa bệnh / Nhập viện điều trị (Y tế)</option>
                        <option value="competition">Đại diện trường thi đấu / NCKH / Hoạt động Đoàn</option>
                        <option value="family">Việc hiếu hỉ / Gia đình có biến cố đột xuất</option>
                        <option value="other">Lý do chính đáng khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lý Do Nghỉ Học Chi Tiết *
                      </label>
                      <textarea 
                        rows={3}
                        value={newLeaveReason}
                        onChange={(e) => setNewLeaveReason(e.target.value)}
                        placeholder="Nêu rõ lý do khách quan (ốm đau sốt xuất huyết, việc gia đình đột xuất, đại diện thi đấu...)"
                        className="w-full bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-slate-800 dark:text-white neu-inset font-medium focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tệp Minh Chứng Đính Kèm (PDF, JPG, PNG) *
                      </label>

                      {/* Hidden Real File Input */}
                      <input
                        type="file"
                        id="studentProofFileInput"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (loadEvt) => {
                              setNewLeaveProof({
                                name: file.name,
                                size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                                dataUrl: loadEvt.target.result
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />

                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-amber-500/50 transition-colors bg-slate-50/50 dark:bg-[#090e1a]/50">
                        {newLeaveProof ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0f192e] border border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                <div className="text-left">
                                  <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{newLeaveProof.name}</p>
                                  <p className="text-[10px] text-slate-400">{newLeaveProof.size || '1.4 MB'} • Đã tải lên</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setNewLeaveProof(null)}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {newLeaveProof.dataUrl && newLeaveProof.dataUrl.startsWith('data:image') && (
                              <div className="max-h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                <img src={newLeaveProof.dataUrl} alt="Minh chứng" className="w-full h-32 object-cover" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-slate-700 dark:text-slate-300 font-semibold">Nhấn để chọn tệp hoặc kéo thả vào đây</p>
                            <p className="text-[10px] text-slate-500">Giấy khám bệnh, đơn thuốc hoặc giấy triệu tập</p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => document.getElementById('studentProofFileInput')?.click()}
                                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-800 dark:text-[#00b4d8] font-semibold text-[11px] border border-sky-500/30 cursor-pointer inline-flex items-center gap-1"
                              >
                                <UploadCloud className="w-3.5 h-3.5" /> Chọn tệp từ máy
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewLeaveProof({ 
                                  name: 'Giay_Kham_Benh_BVDKTW.jpg', 
                                  size: '1.2 MB',
                                  dataUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80' 
                                })}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-semibold text-[11px] border border-amber-500/30 cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Dùng ảnh mẫu y tế
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLeave}
                      className="w-full py-3.5 px-4 rounded-xl neu-btn-glow font-extrabold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
                    >
                      {isSubmittingLeave ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>ĐANG GỬI ĐƠN...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>GỬI ĐƠN ĐẾN GIẢNG VIÊN</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* List of Submitted Leave Requests (Col 7) */}
                <div className="lg:col-span-7 neu-card rounded-3xl p-6 sm:p-7 space-y-4 border border-slate-200 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[#0c1424]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileCheck2 className="w-5 h-5 text-sky-600 dark:text-[#00b4d8]" />
                        Lịch Sử Đơn Đã Nộp & Trạng Thái Xét Duyệt
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Theo dõi kết quả phê duyệt từ giảng viên phụ trách học phần
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {leaveRequests.length} đơn
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {leaveRequests.map((req) => (
                      <div 
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-amber-500/5 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">{req.subject}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({req.id})</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Ngày vắng: <strong>{req.date}</strong> • {req.period}
                            </p>
                          </div>

                          {/* Status Badge */}
                          {req.status === 'approved' && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-[#00dfa2] font-extrabold text-[11px] border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Có phép
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold text-[11px] border border-rose-500/40 flex items-center gap-1 shrink-0">
                              <X className="w-3.5 h-3.5" /> Không phép
                            </span>
                          )}
                          {req.status === 'pending' && (
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] border border-amber-500/40 flex items-center gap-1 shrink-0">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> Đang chờ duyệt
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-white/70 dark:bg-[#0f192e] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <p className="text-slate-700 dark:text-slate-300">
                            <strong>Lý do:</strong> {req.reason}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Nhận xét giảng viên:</span> {req.teacherNote}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedProofModal(req)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2]" />
                              <span>Xem minh chứng</span>
                            </button>
                          </div>

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleCancelLeaveRequest(req)}
                              className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                            >
                              Hủy đơn này
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: THỜI KHÓA BIỂU TUẦN ĐẠI HỌC TÂY NGUYÊN (16/11 – 20/12/2026) */}
              {academicSubTab === 'schedule' && (
                <StudentTimetableView />
              )}

              {/* SUB-TAB: CÂY TIẾN TRÌNH ĐÀO TẠO & BIỂU ĐỒ TIẾN ĐỘ (CHỈ DÀNH CHO SINH VIÊN) */}
              {academicSubTab === 'curriculum' && (
                <div className="space-y-6">
                  <div className="neu-card rounded-3xl p-6 sm:p-7 space-y-4 border border-emerald-200 dark:border-emerald-500/30 shadow-xl bg-white dark:bg-[#0c1424]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-[#00dfa2]" />
                          Cây Tiến Trình &amp; Biểu Đồ Tiến Độ Học Tập • Lớp CNTT K26
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Số buổi nghỉ hiện tại của bạn (cột Ktra): <strong>{myAbsences} buổi</strong> • Đã học xong 5 phân môn HK 1 (10/15 TC = 66.7%), đang học Lập trình Python &amp; Tiếng Anh 1
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30 self-start sm:self-auto">
                        88 Sinh viên chính thức
                      </span>
                    </div>
                  </div>

                  {/* CÂY TIẾN TRÌNH ĐÀO TẠO NGÀNH CNTT (8 HỌC KỲ) + BIỂU ĐỒ TRỰC QUAN */}
                  <CurriculumTreeView classLabel="CNTT K26" />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 3: BÀI TẬP LAB & ĐỒ ÁN (ASSIGNMENTS & LAB HELP QUEUE)           */}
          {/* ========================================================================= */}
          {activeTab === 'assignments' && (
            <div className="space-y-5">
              {renderSegmentedSubTabs(
                [
                  { id: 'assignments_main', label: '💻 Nộp bài Lab, Đồ án & Chấm chéo' },
                  { id: 'lab_queue', label: '🙋 Gọi Hỗ trợ Phòng Lab' }
                ],
                practiceSubTab,
                setPracticeSubTab
              )}

              {practiceSubTab === 'assignments_main' && (
                <StudentAssignments
                  activeStudentCode={activeTestingStudentCode}
                  triggerToast={triggerToast}
                />
              )}

              {practiceSubTab === 'lab_queue' && (
                <LabHelpQueueHub
                  role="student"
                  activeStudentCode={activeTestingStudentCode}
                  triggerToast={triggerToast}
                />
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 6: BẢNG TIN, HỎI ĐÁP & THÀNH TÍCH (POLLS, Q&A, STREAK)         */}
          {/* ========================================================================= */}
          {activeTab === 'polls' && (
            <div className="space-y-5">
              {renderSegmentedSubTabs(
                [
                  { id: 'polls_main', label: '📢 Thông báo & Biểu quyết Lớp' },
                  {
                    id: 'live_qa',
                    label: '🙋 Hỏi đáp Lớp học & Góp ý GV',
                    badge: resolvedFeedbackCount > 0 ? resolvedFeedbackCount : null
                  },
                  { id: 'contributor', label: '🔥 Chuỗi Chuyên cần & Bảng Vinh danh' }
                ],
                communitySubTab,
                setCommunitySubTab
              )}

              {communitySubTab === 'polls_main' && (
                <div className="space-y-5">
                  {/* Compact Top Status Banner */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-teal-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Vote className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Bảng Thông Báo Công Văn AI & Khảo Sát Trực Tuyến
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Tự động tóm tắt công văn từ Ban Đào Tạo và cập nhật biểu quyết lớp học thời gian thực.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {announcements.length} Thông báo
                      </span>
                      <span className={`px-2.5 py-1 rounded-xl border font-bold ${currentCadreInfo.badgeColor}`}>
                        {currentCadreInfo.badge}: {STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode)?.name || 'Sinh viên'} ({activeTestingStudentCode})
                      </span>
                    </div>
                  </div>

              {/* STUDIO BAN CÁN SỰ LỚP (Chỉ hiển thị khi là Lớp Trưởng, Bí Thư hoặc Lớp Phó) */}
              {currentCadreInfo.isCadre ? (
                <div className="neu-card rounded-3xl p-5 sm:p-7 border border-teal-500/30 shadow-xl bg-white dark:bg-[#0c1424] space-y-6">
                  {/* Studio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                            Studio Ban Cán Sự Lớp • Khởi Tạo Thông Báo & Khảo Sát
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30">
                            {currentCadreInfo.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Trợ lý AI tự động tóm tắt công văn từ Ban Đào Tạo, lập phiếu biểu quyết gửi đến 50 bạn học và xuất báo cáo Excel.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCadreStudio(!showCadreStudio)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      {showCadreStudio ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{showCadreStudio ? 'Thu gọn Studio' : 'Mở rộng Studio'}</span>
                    </button>
                  </div>

                  {showCadreStudio && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Step 1: Dán công văn hoặc thông báo */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Bước 1: Dán nội dung công văn hoặc thông báo của Khoa / Trường</span>
                          </label>
                          <span className="text-[11px] text-teal-600 dark:text-[#00dfa2] font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> AI Parser tự động bóc tách & tạo bình chọn
                          </span>
                        </div>

                        <div className="relative">
                          <textarea
                            rows={4}
                            value={rawDispatchInput}
                            onChange={(e) => setRawDispatchInput(e.target.value)}
                            placeholder="Dán toàn văn nội dung công văn, thông báo từ Phòng Đào Tạo hoặc Khoa..."
                            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                          />
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRunAiSummarize}
                              disabled={isAiSummarizing || !rawDispatchInput.trim()}
                              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                                isAiSummarizing
                                  ? 'bg-slate-400 text-white cursor-not-allowed'
                                  : 'bg-gradient-to-r from-teal-500 to-[#00dfa2] hover:opacity-95 text-slate-950 font-black'
                              }`}
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>{isAiSummarizing ? 'AI đang phân tích...' : 'AI Tóm Tắt & Trích Xuất'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Live AI Summary Preview */}
                      {extractedSummary && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${extractedSummary.badgeColor}`}>
                                {extractedSummary.urgencyLabel}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                Số: {extractedSummary.dispatchNo}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-[#00dfa2]">
                              ⚡ {extractedSummary.readingTime}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                            {extractedSummary.title}
                          </h4>

                          <div className="space-y-1.5">
                            {extractedSummary.keyPoints?.map((kp, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0 font-extrabold text-[10px] mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{kp}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-emerald-500/20 text-xs">
                            <strong className="text-rose-600 dark:text-rose-400">Hành động yêu cầu: </strong>
                            <span className="text-slate-800 dark:text-slate-200">{extractedSummary.actionRequired}</span>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Thiết lập khảo sát bình chọn */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="hasPollCheck"
                              checked={hasAttachedPoll}
                              onChange={(e) => setHasAttachedPoll(e.target.checked)}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <label htmlFor="hasPollCheck" className="text-xs font-extrabold text-slate-900 dark:text-white cursor-pointer">
                              Đính kèm Phiếu Khảo Sát / Biểu Quyết Toàn Lớp
                            </label>
                          </div>
                          <span className="text-[11px] text-slate-500">Mục tiêu: K26 CNTT - Lớp A (88 SV)</span>
                        </div>

                        {hasAttachedPoll && (
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Câu hỏi biểu quyết:
                                </label>
                                <input
                                  type="text"
                                  value={pollQuestion}
                                  onChange={(e) => setPollQuestion(e.target.value)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Thời hạn chót biểu quyết:
                                </label>
                                <input
                                  type="text"
                                  value={pollDeadline}
                                  onChange={(e) => setPollDeadline(e.target.value)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                  Danh sách phương án biểu quyết ({pollOptions.length}/6):
                                </label>
                                <button
                                  type="button"
                                  onClick={handleAddPollOption}
                                  className="text-xs font-bold text-teal-600 dark:text-[#00dfa2] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Thêm phương án
                                </button>
                              </div>

                              <div className="space-y-2">
                                {pollOptions.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="w-6 text-xs font-bold text-slate-400 text-center font-mono">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdatePollOption(idx, e.target.value)}
                                      className="flex-1 p-2 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePollOption(idx)}
                                      disabled={pollOptions.length <= 2}
                                      className={`p-2 rounded-xl border ${
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
                      </div>

                      {/* Step 4: Nút Phát hành thông báo */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-500">
                          Khởi tạo với tư cách: <strong className="text-slate-800 dark:text-slate-200">{currentCadreInfo.title} ({STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode)?.name || 'Sinh viên'})</strong>
                        </div>

                        <button
                          type="button"
                          onClick={handleCadrePublishAnnouncement}
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-[#00dfa2] hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Megaphone className="w-4 h-4" />
                          <span>Ban Cán Sự Phát Hành Thông Báo Đến Toàn Lớp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Khối thông báo khi Sinh Viên Thường đăng nhập */
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Chế độ Sinh Viên: {STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode)?.name} (MSSV: {activeTestingStudentCode})
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Theo quy chế lớp học, quyền kích hoạt AI tóm tắt công văn và tạo khảo sát lớp được phân quyền riêng cho <strong>Lớp trưởng, Bí thư và Lớp phó</strong>. Bạn có quyền theo dõi toàn bộ thông báo và tham gia biểu quyết phương án của mình dưới đây.
                    </p>
                  </div>
                </div>
              )}

              {/* Feed of Announcements (Cho cả Ban Cán Sự và Toàn thể Sinh Viên) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Danh Sách Thông Báo & Khảo Sát Hiện Hành Của Lớp
                  </h4>
                  <span className="text-xs text-slate-400">
                    {announcements.length} thông báo chính thức
                  </span>
                </div>

                {announcements.map((ann) => {
                  const activeStudent = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || {
                    code: activeTestingStudentCode,
                    name: 'Sinh Viên',
                    class: 'K26 CNTT - Lớp A'
                  };
                  const studentCode = activeTestingStudentCode;
                  const userVote = ann.poll?.votesList?.find(v => v.studentCode === studentCode);
                  const currentSelectedOpt = selectedVoteOptions[ann.id] !== undefined 
                    ? selectedVoteOptions[ann.id] 
                    : (userVote ? userVote.optionId : null);

                  return (
                    <div 
                      key={ann.id} 
                      className={`neu-card rounded-3xl p-5 sm:p-7 space-y-5 border shadow-xl bg-white dark:bg-[#0c1424] transition-all ${
                        ann.urgency === 'emergency'
                          ? 'border-rose-300 dark:border-rose-500/30 ring-1 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700/50'
                      }`}
                    >
                      {/* Announcement Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${ann.badgeColor}`}>
                              {ann.urgencyLabel}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                              Số: {ann.aiSummary?.dispatchNo || 'N/A'}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              Người phát hành: <strong className="text-slate-700 dark:text-slate-300">{ann.author}</strong>
                            </span>
                          </div>

                          <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                            {ann.title}
                          </h4>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                            <span>Lớp: <strong className="text-slate-700 dark:text-slate-300">{ann.targetClass}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                              <Clock className="w-3.5 h-3.5" /> Hạn chót: {ann.deadline}
                            </span>
                            {(ann.sourceFileName || ann.aiSummary?.sourceFileName) && (
                              <>
                                <span>•</span>
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-[#00dfa2] text-[11px] font-bold"
                                  title="Tệp công văn đính kèm"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Tệp công văn: {ann.sourceFileName || ann.aiSummary?.sourceFileName}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Nút xuất Excel (Chỉ Ban Cán Sự Lớp mới được dùng) */}
                          {currentCadreInfo.isCadre && ann.hasPoll && ann.poll && (
                            <button
                              onClick={() => handleCadreExportExcel(ann)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-800 dark:text-[#00dfa2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00dfa2]" />
                              <span>Xuất Excel ({ann.poll.totalVotes}/88 SV)</span>
                            </button>
                          )}

                          {/* Nút In Biên Bản Họp Lớp PDF */}
                          {ann.hasPoll && (
                            <button
                              onClick={() => setPrintMinutesModalAnnouncement(ann)}
                              className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="In hoặc lưu PDF biên bản họp lớp biểu quyết theo thể thức văn bản hành chính"
                            >
                              <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2]" />
                              <span>In Biên Bản PDF</span>
                            </button>
                          )}

                          <button
                            onClick={() => setPreviewDispatchModal(ann)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem công văn gốc</span>
                          </button>
                        </div>
                      </div>

                      {/* AI Summary Card */}
                      {ann.aiSummary && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-500" />
                              <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-700 dark:text-[#00dfa2]">
                                Bản Tóm Tắt AI Của Công Văn
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {ann.aiSummary.readingTime}
                            </span>
                          </div>

                          {/* Bullet points */}
                          <div className="space-y-1.5">
                            {ann.aiSummary.keyPoints?.map((kp, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0 font-extrabold text-[10px] mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed">{kp}</span>
                              </div>
                            ))}
                          </div>

                          {/* Action required */}
                          <div className="pt-2 border-t border-emerald-500/15 flex items-start gap-2 text-xs">
                            <span className="font-extrabold text-rose-600 dark:text-rose-400 shrink-0">Hành động:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">{ann.aiSummary.actionRequired}</span>
                          </div>
                        </div>
                      )}

                      {/* Interactive Poll Section */}
                      {ann.hasPoll && ann.poll && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                            <div>
                              <div className="text-[11px] font-extrabold text-teal-600 dark:text-[#00dfa2] uppercase tracking-wider flex items-center gap-1.5">
                                <Radio className="w-3.5 h-3.5" /> Khảo Sát & Biểu Quyết Lớp Học
                              </div>
                              <h5 className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                                {ann.poll.question}
                              </h5>
                            </div>

                            <span className="text-xs text-slate-500 shrink-0">
                              Đã nhận <strong>{ann.poll.totalVotes}</strong> / 50 phiếu bầu (Sĩ số lớp)
                            </span>
                          </div>

                          {/* Options Radio List */}
                          <div className="space-y-2.5">
                            {ann.poll.options.map((opt, i) => {
                              const pct = ann.poll.totalVotes > 0 
                                ? Math.round((opt.votes / ann.poll.totalVotes) * 100) 
                                : 0;
                              const isChecked = currentSelectedOpt === opt.id;
                              const isUserExistingVote = userVote?.optionId === opt.id;

                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelectedVoteOptions({ ...selectedVoteOptions, [ann.id]: opt.id })}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                                    isChecked
                                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-sm'
                                      : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 hover:border-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between relative z-10 gap-3">
                                    <div className="flex items-center gap-3 truncate">
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        isChecked 
                                          ? 'border-emerald-500 bg-emerald-500 text-white' 
                                          : 'border-slate-400 dark:border-slate-600'
                                      }`}>
                                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />}
                                      </div>

                                      <div className="truncate">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                          {String.fromCharCode(65 + i)}. {opt.text}
                                        </div>
                                        {isUserExistingVote && (
                                          <div className="text-[10px] text-emerald-600 dark:text-[#00dfa2] font-extrabold flex items-center gap-1 mt-0.5">
                                            <CheckCircle2 className="w-3 h-3" /> Lựa chọn đã biểu quyết của bạn ({userVote.votedAt?.split(' ')[1] || userVote.votedAt})
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-extrabold text-teal-600 dark:text-[#00dfa2]">
                                        {pct}%
                                      </span>
                                      <span className="text-[11px] text-slate-400 ml-1">
                                        ({opt.votes} phiếu)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress bar fill */}
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-emerald-500/10 dark:bg-emerald-500/15 transition-all duration-700 pointer-events-none"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Submit Action Row */}
                          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              {userVote ? (
                                <span className="text-emerald-600 dark:text-[#00dfa2] font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" /> Bạn ({activeStudent.name}) đã hoàn tất biểu quyết hợp lệ
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  {activeStudent.name} ({activeStudent.code}) chưa biểu quyết • Vui lòng chọn 1 phương án và bấm xác nhận
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                if (!currentSelectedOpt) {
                                  triggerToast('Vui lòng chọn 1 phương án trước khi xác nhận!', 'error');
                                  return;
                                }
                                handleStudentVote(ann.id, currentSelectedOpt);
                              }}
                              disabled={!currentSelectedOpt || currentSelectedOpt === userVote?.optionId}
                              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                !currentSelectedOpt || currentSelectedOpt === userVote?.optionId
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>{userVote ? 'Đổi Phương Án Biểu Quyết' : 'Xác Nhận Biểu Quyết'}</span>
                            </button>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

                </div>
              )}

              {/* SUB-TAB: CHUỖI CHUYÊN CẦN & BẢNG VINH DANH */}
              {communitySubTab === 'contributor' && (
                <div className="space-y-6">
                  <GamificationStreakHub role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
                </div>
              )}

              {/* SUB-TAB: HỎI ĐÁP LỚP HỌC & GÓP Ý GIẢNG VIÊN */}
              {communitySubTab === 'live_qa' && (() => {
            const studentFeedbacks = feedbacks.filter(f => f.studentCode === activeTestingStudentCode || f.isAnonymous);
            const pendingStudentCount = studentFeedbacks.filter(f => f.status === 'pending').length;
            const resolvedStudentCount = studentFeedbacks.filter(f => f.status === 'resolved').length;
            const displayedFeedbacks = studentFeedbacks.filter(f => {
              if (feedbackFilterStatus === 'all') return true;
              return f.status === feedbackFilterStatus;
            });
            const activeStudent = STUDENTS_K26_A.find(s => s.code === activeTestingStudentCode) || user;

            const getInstantFaqMatch = (text) => {
              if (!text || text.trim().length < 4) return null;
              const lower = text.toLowerCase();
              if (lower.includes('học bổng') || lower.includes('khuyến khích')) {
                return {
                  topic: 'Quy Chế Học Bổng Khuyến Khích Học Tập',
                  content: 'Căn cứ Điều 14 Quy chế đào tạo EG Education: Sinh viên có điểm TBC tích lũy từ 3.20/4.0 trở lên và điểm rèn luyện Tốt (≥ 80 điểm) được tự động xét cấp học bổng khuyến khích học tập theo quỹ khen thưởng học kỳ.',
                  citation: 'Điều 14, Sổ tay Sinh viên EG Education (QĐ 48/QĐ-EGEDU).'
                };
              }
              if (lower.includes('học bù') || lower.includes('nghỉ học') || lower.includes('bù giờ')) {
                return {
                  topic: 'Quy Định Tổ Chức Ca Học Bù Học Phần',
                  content: 'Khi buổi học tạm hoãn, Ban Cán Sự Lớp (Lớp trưởng/Bí thư) sẽ phát động biểu quyết toàn thể 88 SV để chọn ca học bù phù hợp. Sau 3 ngày, Ban Đào Tạo sẽ cấp phòng học chính thức.',
                  citation: 'Quy định quản lý giảng đường & thực hành, Mục 4.2.'
                };
              }
              if (lower.includes('đồ án') || lower.includes('cdio') || lower.includes('khóa luận') || lower.includes('tốt nghiệp')) {
                return {
                  topic: 'Quy Trình Thực Hiện Đồ Án Chuyên Ngành CDIO',
                  content: 'Mỗi nhóm đồ án 3–4 sinh viên thực hiện 4 giai đoạn Conceive - Design - Implement - Operate. Lịch tư vấn trực tiếp với Giảng viên ThS. Phạm Văn Thuận diễn ra chiều Thứ Sáu (14h00 – 16h30) tại Phòng C.302.',
                  citation: 'Hướng dẫn số 88/HD-CDIO, Khoa Công Nghệ Thông Tin.'
                };
              }
              if (lower.includes('chuyên cần') || lower.includes('điểm danh') || lower.includes('vắng')) {
                return {
                  topic: 'Quy Chế Chuyên Cần & Điều Kiện Dự Thi',
                  content: 'Sinh viên phải tham gia tối thiểu 80% số tiết học phần mới đủ điều kiện dự thi. Điểm danh qua Dynamic QR đổi mã 10s có xác thực Geofencing GPS. Vắng có lý do (đơn kèm minh chứng) được bảo lưu quyền thi.',
                  citation: 'Quy chế đào tạo tín chỉ, Điều 9, Khoản 2.'
                };
              }
              return null;
            };

            const instantFaq = getInstantFaqMatch(`${feedbackTitle} ${feedbackContent}`);

            return (
              <div className="space-y-5">
                {/* Clean 2-button toggle: Live Q&A vs Feedback Box */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-[#0c1424] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQaView('qa')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        qaView === 'qa'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🙋 Hỏi đáp Q&amp;A Upvote &amp; Điểm dừng Slide</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQaView('feedback')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        qaView === 'feedback'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>💬 Hòm thư Góp ý Môn học</span>
                      {resolvedStudentCount > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            qaView === 'feedback'
                              ? 'bg-white/20 text-white'
                              : 'bg-teal-500/15 text-teal-700 dark:text-[#00dfa2]'
                          }`}
                        >
                          {resolvedStudentCount} đã đáp
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {qaView === 'qa' && (
                  <LiveQaAndCheckpointsAddon role="student" activeStudentCode={activeTestingStudentCode} triggerToast={triggerToast} />
                )}

                {qaView === 'feedback' && (
                  <div className="space-y-5">
                    {/* Compact Header Hero Banner */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center shrink-0">
                          <MessageSquarePlus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            Hòm Thư Phản Hồi & Tư Vấn Cố Vấn Học Tập
                          </h3>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Gửi thắc mắc học phần, kiến nghị đề tài hoặc góp ý trực tiếp tới Giảng viên hướng dẫn.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {studentFeedbacks.length} phản hồi
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-[#00dfa2] font-bold">
                          {resolvedStudentCount} đã giải đáp
                        </span>
                      </div>
                    </div>

                {/* 2-Column Grid: Left = Form Soạn Phản Hồi, Right = Danh Sách Lịch Sử */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Form Soạn Phản Hồi Mới (Col 5) */}
                  <div className="lg:col-span-5 neu-card rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <Send className="w-4 h-4 text-teal-600 dark:text-[#00dfa2]" />
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                        Soạn Phản Hồi Mới
                      </h4>
                    </div>

                    {/* 1. Chọn Giảng viên nhận */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        1. Chọn Giảng Viên Hướng Dẫn / Cố Vấn Nhận:
                      </label>
                      <div className="space-y-2">
                        {ADVISOR_TEACHERS.map((teacher) => {
                          const isSelected = feedbackTargetTeacher === teacher.code;
                          return (
                            <div
                              key={teacher.code}
                              onClick={() => setFeedbackTargetTeacher(teacher.code)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-teal-500/10 border-teal-500 text-teal-950 dark:text-teal-200 ring-1 ring-teal-500/40 shadow-sm'
                                  : 'bg-slate-50 dark:bg-[#080d19] border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl shrink-0">{teacher.avatar}</span>
                                <div>
                                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                                    <span>{teacher.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({teacher.code})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                    {teacher.title}
                                  </div>
                                </div>
                              </div>
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-400'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Chọn Danh Mục Phản Hồi */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        2. Danh Mục Vấn Đề:
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-teal-500"
                      >
                        {FEEDBACK_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Mức Độ Ưu Tiên */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        3. Mức Độ Ưu Tiên:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {FEEDBACK_PRIORITIES.map(p => {
                          const isSelected = feedbackPriority === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setFeedbackPriority(p.id)}
                              className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-teal-500/15 border-teal-500 text-teal-800 dark:text-[#00dfa2] ring-1 ring-teal-500/30'
                                  : 'bg-slate-50 dark:bg-[#080d19] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Tiêu Đề */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        4. Tiêu Đề Phản Hồi:
                      </label>
                      <input
                        type="text"
                        value={feedbackTitle}
                        onChange={(e) => setFeedbackTitle(e.target.value)}
                        placeholder="VD: Thắc mắc về cấu trúc dữ liệu đồ thị trong bài tập lớn..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* 5. Nội Dung Chi Tiết */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        5. Nội Dung Chi Tiết Cần Trao Đổi:
                      </label>
                      <textarea
                        rows={4}
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                        placeholder="Trình bày cụ thể bối cảnh, câu hỏi hoặc ý kiến góp ý của em gửi tới Thầy/Cô..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* 6. Tùy Chọn Ẩn Danh */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <label htmlFor="anonCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="anonCheck"
                          checked={feedbackIsAnonymous}
                          onChange={(e) => setFeedbackIsAnonymous(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Gửi dưới dạng Ẩn Danh (Giữ bí mật danh tính)</span>
                      </label>
                    </div>

                    {/* Info badge */}
                    <div className="text-[11px] text-slate-500">
                      Người gửi: <strong className="text-slate-700 dark:text-slate-300">{activeStudent?.name || 'Sinh viên'} ({activeTestingStudentCode})</strong>
                    </div>

                    {/* Instant AI FAQ Triage Box */}
                    {instantFaq && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-teal-500/10 to-sky-500/10 border border-purple-500/30 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="font-extrabold text-[11px] uppercase tracking-wider text-purple-900 dark:text-purple-300">
                              Trợ Lý AI Gợi Ý Nhanh Từ Sổ Tay Sinh Viên:
                            </span>
                          </div>
                          <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded-full">
                            Tự động
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {instantFaq.topic}
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                          {instantFaq.content}
                        </p>
                        <div className="text-[10px] text-slate-500 italic pt-1 border-t border-purple-500/20 flex items-center justify-between">
                          <span>Trích dẫn: {instantFaq.citation}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackTitle('');
                              setFeedbackContent('');
                              triggerToast('Tuyệt vời! Bạn đã tìm được câu trả lời trong Sổ tay Sinh viên.');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition-all cursor-pointer shrink-0 ml-2 shadow-sm"
                          >
                            ✓ Đã Rõ (Hủy Gửi)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={handleSendFeedback}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-[#00dfa2] hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Gửi Phản Hồi Cho Giảng Viên</span>
                    </button>
                  </div>

                  {/* Danh Sách Phản Hồi & Giải Đáp (Col 7) */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Bộ lọc trạng thái */}
                    <div className="neu-card rounded-2xl p-3 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {[
                          { id: 'all', label: `Tất cả (${studentFeedbacks.length})` },
                          { id: 'pending', label: `Chờ giải đáp (${pendingStudentCount})` },
                          { id: 'resolved', label: `Đã giải đáp (${resolvedStudentCount})` }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFeedbackFilterStatus(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                              feedbackFilterStatus === tab.id
                                ? 'bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Danh sách items */}
                    {displayedFeedbacks.length === 0 ? (
                      <div className="p-8 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-center space-y-2">
                        <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                        <p className="text-xs text-slate-500">Chưa có phản hồi nào trong mục này.</p>
                      </div>
                    ) : (
                      displayedFeedbacks.map(f => (
                        <div
                          key={f.id}
                          className={`neu-card rounded-3xl p-5 bg-white dark:bg-[#0c1424] border space-y-4 shadow-md transition-all ${
                            f.status === 'resolved'
                              ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400">{f.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${f.priorityBadge}`}>
                                  {f.priorityLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {f.categoryLabel}
                                </span>
                                {f.isAnonymous && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                    Ẩn danh
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                {f.title}
                              </h4>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                                <span>Gửi tới: <strong className="text-slate-700 dark:text-slate-300">{f.targetTeacherName}</strong></span>
                                <span>•</span>
                                <span>{f.createdAt}</span>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 self-start ${
                              f.status === 'resolved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}>
                              {f.status === 'resolved' ? '✓ Đã giải đáp' : '⏳ Chờ phản hồi'}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#090e1a] p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                            {f.content}
                          </div>

                          {/* Visual Progress Stepper 4 steps */}
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Tiến độ xử lý phản hồi:
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              {[
                                { label: '1. Đã tiếp nhận', done: true, active: false },
                                { label: '2. Chuyển Thầy/Cô', done: true, active: false },
                                { label: '3. Đang nghiên cứu', done: f.status === 'resolved', active: f.status === 'pending' },
                                { label: '4. Đã giải đáp', done: f.status === 'resolved', active: false }
                              ].map((step, sIdx) => (
                                <div key={sIdx} className="space-y-1">
                                  <div className={`h-1.5 rounded-full transition-all ${
                                    step.done 
                                      ? 'bg-teal-500' 
                                      : step.active 
                                        ? 'bg-amber-500 animate-pulse' 
                                        : 'bg-slate-200 dark:bg-slate-800'
                                  }`} />
                                  <span className={`text-[10px] block truncate ${
                                    step.done 
                                      ? 'font-bold text-teal-600 dark:text-[#00dfa2]' 
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

                          {/* Teacher's Reply Section */}
                          {f.reply ? (
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-cyan-500/10 border border-teal-500/30 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">👨‍🏫</span>
                                  <div>
                                    <span className="font-extrabold text-xs text-teal-900 dark:text-[#00dfa2]">
                                      Câu Trả Lời Từ {f.reply.teacherName}
                                    </span>
                                    <div className="text-[10px] text-slate-500">{f.reply.repliedAt}</div>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]">
                                  Phản hồi chính thức
                                </span>
                              </div>

                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {f.reply.content}
                              </p>

                              {/* Student Rating Box */}
                              <div className="pt-2 border-t border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                  {f.studentRating ? (
                                    <span className="text-amber-500 flex items-center gap-1">
                                      ★ Bạn đã đánh giá: {f.studentRating}/5 Sao
                                      {f.studentRatingFeedback && <span className="text-slate-500 font-normal ml-1">("{f.studentRatingFeedback}")</span>}
                                    </span>
                                  ) : (
                                    <span>Đánh giá mức độ hài lòng với câu trả lời này:</span>
                                  )}
                                </div>

                                {!f.studentRating && (
                                  <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRateFeedback(f.id, star)}
                                        className="text-slate-300 hover:text-amber-400 text-lg transition-transform hover:scale-125 cursor-pointer"
                                        title={`${star} sao`}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>Giảng viên hướng dẫn đang xem xét và sẽ sớm phản hồi câu hỏi của bạn.</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
                  </div>
                )}

              </div>
            );
          })()}

            </div>
          )}
          </div>

        </main>
      </div>



      {/* ========================================================================= */}
      {/* MODAL: XEM MINH CHỨNG ĐÍNH KÈM CỦA ĐƠN XIN NGHỈ HỌC                         */}
      {/* ========================================================================= */}
      {selectedProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="neu-card rounded-3xl p-6 sm:p-7 max-w-lg w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Minh Chứng: {selectedProofModal.proofName}
              </h3>
              <button 
                onClick={() => setSelectedProofModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Proof Image Preview */}
            {selectedProofModal.proofUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 bg-slate-900 flex items-center justify-center">
                <img 
                  src={selectedProofModal.proofUrl} 
                  alt="Minh chứng đính kèm" 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}

            {/* Document Preview Mockup */}
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                  <span className="text-[10px] text-slate-400">EG-VERIFIED</span>
                </div>
                <div className="text-center py-2">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">GIẤY XÁC NHẬN / KHÁM BỆNH CHUYÊN KHOA</h4>
                  <p className="text-[10px] text-slate-500">Mã hồ sơ bệnh án: BV-DK-2026-9941</p>
                </div>
                <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                  <p>• Bệnh nhân: <strong>{user?.name || 'Trịnh Tuấn Kiệt'}</strong> (MSSV: 26103043)</p>
                  <p>• Ngày khám / tiếp nhận: <strong>{selectedProofModal.date}</strong></p>
                  <p>• Chẩn đoán y khoa: {selectedProofModal.reason}</p>
                  <p>• Đề nghị: Nghỉ ngơi điều trị trong ngày theo chỉ định của bác sĩ chuyên khoa.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                <span>Chữ ký số & Dấu mộc y tế đã được đối soát</span>
                <span className="text-emerald-600 dark:text-[#00dfa2] font-bold">✓ HỢP LỆ THEO QUY CHẾ</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProofModal(null)}
              className="w-full py-2.5 rounded-xl neu-btn text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ĐÓNG CỬA SỔ
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XEM MỤC LỤC & CHI TIẾT TÀI LIỆU KHO HỌC LIỆU MỞ                      */}
      {/* ========================================================================= */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="neu-card rounded-3xl p-6 sm:p-7 max-w-xl w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-sky-700 dark:text-cyan-300 font-bold border border-cyan-500/30">
                    {previewMaterial.license} • {previewMaterial.pages}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">
                    {previewMaterial.title}
                  </h3>
                  <p className="text-xs text-slate-500">{previewMaterial.author}</p>
                </div>
                <button 
                  onClick={() => setPreviewMaterial(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Mô tả tóm tắt:</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{previewMaterial.desc}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Đề cương chi tiết & Mục lục:</h4>
                  <div className="space-y-1.5">
                    {previewMaterial.tableOfContents.map((chap, cIdx) => (
                      <div key={cIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2] shrink-0" />
                        <span>{chap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ĐÓNG
              </button>
              <button
                onClick={() => {
                  const item = previewMaterial;
                  setPreviewMaterial(null);
                  handleSimulateDownload(item);
                }}
                className="w-1/2 py-2.5 rounded-xl neu-btn-glow text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>TẢI TÀI LIỆU XUỐNG</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: ĐÓNG GÓP HỌC LIỆU MỚI (6-STEP QUALITY ASSURANCE)                     */}
      {/* ========================================================================= */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="neu-card rounded-3xl p-6 sm:p-7 max-w-lg w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-500" />
                Đóng Góp Học Liệu Mở Mới
              </h3>
              <button 
                onClick={() => setShowContributeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mọi tài liệu chia sẻ trên hệ thống EG Education đều trải qua quy trình thẩm định 6 bước nghiêm ngặt:
            </p>

            <div className="space-y-2 text-xs">
              {[
                { step: '1', title: 'Tải lên tệp tài liệu', desc: 'Định dạng PDF, PPTX, DOCX, ZIP mã nguồn' },
                { step: '2', title: 'Khai báo Metadata Dublin Core', desc: 'Tiêu đề, tác giả, học phần, từ khóa tra cứu' },
                { step: '3', title: 'Kiểm tra giấy phép Creative Commons', desc: 'Xác định quyền phân phối (CC BY, CC BY-NC)' },
                { step: '4', title: 'Quét chống đạo văn AI', desc: 'Hệ thống tự động rà soát trùng lặp dưới 15%' },
                { step: '5', title: 'Hội đồng chuyên môn phản biện', desc: 'Giảng viên thẩm định tính học thuật và nội dung' },
                { step: '6', title: 'Công bố & Tích lũy 300 XP', desc: 'Đưa vào kho học liệu mở và cấp chứng nhận' }
              ].map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-700 dark:text-cyan-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-sky-500/30">
                    {s.step}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{s.title}</span>
                    <span className="text-[10px] text-slate-500">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowContributeModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={() => {
                  setShowContributeModal(false);
                  triggerToast('Đã gửi đề xuất học liệu vào hàng đợi thẩm định của Hội đồng chuyên môn!');
                }}
                className="w-1/2 py-2.5 rounded-xl neu-btn-glow text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>BẮT ĐẦU TẢI LÊN</span>
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

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Thanh điều hướng nhanh Sinh viên trên điện thoại"
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-2xl"
      >
        {[
          { id: 'overview', label: 'Tổng quan', icon: BarChart3, action: () => navigateStudentTab('overview'), active: activeTab === 'overview' },
          { id: 'attendance', label: 'Điểm danh', icon: QrCode, action: () => navigateStudentTab('attendance'), active: activeTab === 'attendance' },
          { id: 'assignments', label: 'Lab & Đồ án', icon: FolderGit2, action: () => navigateStudentTab('assignments'), active: activeTab === 'assignments' },
          { id: 'gradebook', label: 'Học vụ', icon: BookOpen, action: () => navigateStudentTab('gradebook'), active: activeTab === 'gradebook' },
          { id: 'aitutor', label: 'Gia sư AI', icon: Bot, action: () => navigateStudentTab('aitutor'), active: activeTab === 'aitutor' },
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
                  ? 'text-sky-600 dark:text-[#00b4d8] font-extrabold bg-cyan-500/10'
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