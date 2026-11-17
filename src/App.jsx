import React, { useState, useEffect, Suspense, lazy } from 'react';
import AuthCard from './components/AuthCard';
import ThemeToggle from './components/ThemeToggle';
import { authService, authStorage } from './services/api';

const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const MobileCheckInScreen = lazy(() => import('./components/MobileCheckInScreen'));

// One-time cleanup of legacy simulation/mock cache keys when switching to clean official production data
if (typeof window !== 'undefined' && window.localStorage && !localStorage.getItem('eg_official_clean_v3')) {
  const legacyMockKeys = [
    'eg_official_clean_v2',
    'eg_official_clean_v1',
    'eg_announcements_v2',
    'eg_announcements_v1',
    'eg_assignments_v1',
    'eg_assignments_v2',
    'eg_submissions_v1',
    'eg_submissions_v2',
    'eg_student_feedbacks_v1',
    'eg_feedbacks_v1',
    'eg_notifications_v1',
    'eg_gradebook_v2',
    'eg_grade_disputes_v2',
    'eg_leave_ai_packs_v1',
    'eg_group_projects_v1',
    'eg_code_moss_v1',
    'eg_peer_reviews_v1',
    'eg_drl_and_risk_v1',
    'eg_exit_tickets_v1',
    'eg_qa_checkpoints_v1',
    'eg_virtual_room_v1',
    'eg_ai_mindmaps_v1',
    'eg_flash_quiz_v1',
    'eg_lab_queue_v1',
    'eg_gamification_v1',
  ];
  legacyMockKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  });
  try {
    localStorage.setItem('eg_official_clean_v3', '1');
  } catch {
    // Ignore storage errors
  }
}

export default function App() {
  // Detect if user scanned QR code into the check-in URL on their phone/browser
  const [isCheckInMode, setIsCheckInMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('checkin=true') || 
           window.location.search.includes('checkin') || 
           window.location.pathname === '/checkin';
  });

  // Theme state: default to 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('eg_theme') || 'dark';
  });

  // Current logged in user (null = at Auth Screen), restored from persistent storage
  const [currentUser, setCurrentUser] = useState(() => {
    return authStorage.getUser();
  });

  // Synchronize 'dark' class on <html> documentElement and <body>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.className = "min-h-screen bg-[#070b14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden";
    } else {
      root.classList.remove('dark');
      document.body.className = "min-h-screen bg-[#e8f1f2] text-[#1e3639] font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden";
    }
    localStorage.setItem('eg_theme', theme);
  }, [theme]);

  // Verify stored session token with Backend on initial mount
  useEffect(() => {
    const token = authStorage.getToken();
    if (token) {
      authService.getMe()
        .then(res => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
            authStorage.setUser(res.user);
          }
        })
        .catch(() => {
          // Token expired or invalid
          authStorage.clearSession();
          setCurrentUser(null);
        });
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Handle successful login from AuthCard
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    authStorage.setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Quick switch role between Teacher & Student from dashboard
  const handleSwitchToStudent = async () => {
    try {
      const res = await authService.login({
        email: '26103043@sv.ttn.edu.vn',
        password: '26103043',
        role: 'student'
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        return;
      }
    } catch (e) {
      console.warn('Switch to student offline fallback');
    }
    const studentUser = {
      role: 'student',
      name: 'Trịnh Tuấn Kiệt',
      code: '26103043',
      email: '26103043@sv.ttn.edu.vn',
      faculty: 'Khoa Công Nghệ Thông Tin',
      classId: 'K26 CNTT - Lớp A'
    };
    setCurrentUser(studentUser);
    authStorage.setUser(studentUser);
  };

  const handleSwitchToTeacher = async () => {
    try {
      const res = await authService.login({
        email: 'pvthuan@eg.edu.vn',
        password: '123456',
        role: 'teacher'
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        return;
      }
    } catch (e) {
      console.warn('Switch to teacher offline fallback');
    }
    const teacherUser = {
      role: 'teacher',
      name: 'ThS. Phạm Văn Thuận',
      code: 'GV-089',
      email: 'pvthuan@eg.edu.vn',
      faculty: 'Khoa Công Nghệ Thông Tin',
      classId: 'K26 CNTT - Lớp A'
    };
    setCurrentUser(teacherUser);
    authStorage.setUser(teacherUser);
  };

  if (isCheckInMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center"><div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <MobileCheckInScreen 
          currentUser={currentUser} 
          onBack={() => {
            window.location.href = '/';
          }} 
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-[#1e3639] dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative selection:bg-[#598b90] selection:text-white dark:selection:bg-[#00dfa2] dark:selection:text-slate-950 transition-colors duration-300 overflow-x-hidden">
      
      {/* Light Mode Gradient Background with Smooth Cross-Fade - Placed strictly in the background with -z-10 */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#f4f8f8] via-[#e8f1f2] to-[#d6e7e9] opacity-100 dark:opacity-0 transition-opacity duration-300 pointer-events-none -z-10" />

      {/* Dynamic Render based on Auth State - Wrapped with relative z-10 so dashboards are always fully visible */}
      {currentUser ? (
        <div className="relative z-10 flex-1 flex flex-col min-h-screen">
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
            {currentUser.role === 'teacher' ? (
              <TeacherDashboard 
                user={currentUser} 
                onLogout={handleLogout} 
                onSwitchToStudent={handleSwitchToStudent}
                theme={theme}
                setTheme={setTheme}
                toggleTheme={toggleTheme}
              />
            ) : (
              <StudentDashboard 
                user={currentUser} 
                onLogout={handleLogout} 
                onSwitchToTeacher={handleSwitchToTeacher}
                theme={theme}
                setTheme={setTheme}
                toggleTheme={toggleTheme}
              />
            )}
          </Suspense>
        </div>
      ) : (
        /* AUTH SCREEN: FLEXIBLE ON MOBILE, LOCKED TO 1 SCREEN ON DESKTOP */
        <div className="min-h-[100dvh] lg:h-screen w-full flex flex-col justify-between px-3 py-2.5 sm:px-6 sm:py-4 lg:px-8 relative z-10 overflow-y-auto lg:overflow-hidden">
          
          {/* Strictly Contained Ambient Glow Orbs - Cannot leak or cause overflow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#7aa9ad]/20 dark:bg-[#00dfa2]/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-300" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#598b90]/20 dark:bg-[#0099ff]/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-300" />
          </div>
          
          {/* Top Header: Logo + Brand on Left, Theme Toggle on Right */}
          <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 py-2 shrink-0">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00dfa2] to-[#0099ff] p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
                  <div className="w-full h-full bg-[#0a1120] rounded-[14px] flex items-center justify-center">
                    <img src="/eg-logo-teal.png" alt="EG" className="w-6 h-6 object-contain" />
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-white p-1.5 shadow-md border border-[#85b8bc]/40 flex items-center justify-center shrink-0">
                  <img src="/eg-logo.png" alt="EG" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <span className="font-extrabold text-[#1e3639] dark:text-white text-base tracking-wide transition-colors">
                  EG Education
                </span>
                <p className="hidden sm:block text-[10px] text-[#577679] dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Tiện ích giáo dục • Educational Utility
                </p>
              </div>
            </div>

            {/* Segmented Theme Switcher */}
            <div className="flex items-center gap-3">
              <ThemeToggle theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} />
            </div>
          </header>

          {/* Center Card Container: Perfectly centered in remaining space with zero scroll */}
          <main className="w-full flex-1 flex items-center justify-center z-10 py-2 sm:py-3 min-h-0">
            <AuthCard onLoginSuccess={handleLoginSuccess} />
          </main>

        </div>
      )}

    </div>
  );
}
