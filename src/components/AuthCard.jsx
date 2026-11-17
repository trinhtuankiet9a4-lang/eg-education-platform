import React, { useState } from 'react';
import { 
  School, 
  GraduationCap,
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  QrCode,
  Bot,
  Library,
  FileText
} from 'lucide-react';
import { authService } from '../services/api';

export default function AuthCard({ onLoginSuccess }) {
  // Current active mode: 'student' (default) or 'teacher'
  const [activeRole, setActiveRole] = useState('student');
  const [isAnimating, setIsAnimating] = useState(false);

  // Student credentials (EMPTY by default)
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);

  // Teacher credentials (EMPTY by default)
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPass, setTeacherPass] = useState('');
  const [showTeacherPass, setShowTeacherPass] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDisabledSsoClick = (providerName) => {
    showToast(
      `Tính năng đăng nhập ${providerName} hiện chưa hoạt động. Vui lòng đăng nhập bằng tài khoản nhà trường cấp!`,
      'error'
    );
  };

  // Trigger double-slider animation between Student and Teacher portals
  const handleToggleRole = () => {
    setIsAnimating(true);
    setActiveRole(prev => (prev === 'student' ? 'teacher' : 'student'));
    setTimeout(() => {
      setIsAnimating(false);
    }, 1100);
  };

  // Submit Student Login with Backend API
  const handleStudentLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const emailToUse = studentEmail.trim() || '26103043@sv.ttn.edu.vn';
    const passToUse = studentPass.trim() || '123456';
    
    setLoading(true);
    try {
      const res = await authService.login({
        email: emailToUse,
        password: passToUse,
        role: 'student'
      });

      showToast(res.message || 'Đăng nhập thành công vào Không Gian Học Viên!');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Teacher Login with Backend API
  const handleTeacherLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const emailToUse = teacherEmail.trim() || 'pvthuan@eg.edu.vn';
    const passToUse = teacherPass.trim() || '123456';

    setLoading(true);
    try {
      const res = await authService.login({
        email: emailToUse,
        password: passToUse,
        role: 'teacher'
      });

      showToast(res.message || 'Đăng nhập thành công vào Không Gian Giảng Viên!');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1160px] min-h-0 lg:min-h-[580px] lg:h-[620px] relative neu-card rounded-3xl sm:rounded-[32px] overflow-hidden flex flex-col lg:flex-row shadow-2xl transition-[box-shadow,border-color] duration-300">
      
      {/* Dynamic Background Cross-Fade Layers */}
      <div className="absolute inset-0 bg-white opacity-100 dark:opacity-0 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_130%_at_50%_0%,#0f192d_0%,#0a1120_100%)] opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Toast Alert */}
      {toastMsg && (
        <div className={`fixed sm:absolute top-4 sm:top-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-max sm:max-w-lg z-[300] px-4 sm:px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold border backdrop-blur-lg ${
          toastMsg.type === 'error' 
            ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-500/50' 
            : 'bg-[#eef7f7] dark:bg-emerald-950/90 text-[#255458] dark:text-[#00dfa2] border-[#9fc4c7] dark:border-[#00dfa2]/40'
        }`}>
          <Sparkles className="w-4 h-4 shrink-0 text-[#4f8389] dark:text-[#00dfa2]" />
          <span className="leading-snug">{toastMsg.msg}</span>
        </div>
      )}

      {/* Mobile Quick Role Switcher */}
      <div className="relative z-20 lg:hidden px-4 pt-4">
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl neu-inset">
          <button
            type="button"
            onClick={() => {
              if (activeRole !== 'student') handleToggleRole();
            }}
            className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeRole === 'student'
                ? 'neu-btn-glow-cyan shadow-md'
                : 'text-[#4c6f72] dark:text-slate-400 hover:text-[#1a3336] dark:hover:text-white'
            }`}
          >
            <span>🎓 Cổng Học Viên</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeRole !== 'teacher') handleToggleRole();
            }}
            className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeRole === 'teacher'
                ? 'neu-btn-glow shadow-md'
                : 'text-[#4c6f72] dark:text-slate-400 hover:text-[#1a3336] dark:hover:text-white'
            }`}
          >
            <span>🏫 Cổng Giảng Viên</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTAINER A (LEFT FORM): CỔNG ĐĂNG NHẬP GIẢNG VIÊN                        */}
      {/* ========================================================================= */}
      <div 
        className={`w-full lg:w-1/2 h-full p-5 sm:p-8 lg:p-12 flex flex-col justify-center items-center relative z-10 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          activeRole === 'teacher' 
            ? 'opacity-100 lg:translate-x-0' 
            : 'opacity-0 pointer-events-none lg:translate-x-12 hidden lg:flex'
        }`}
      >
        <div className="max-w-[450px] w-full mx-auto space-y-4 sm:space-y-4.5 my-auto">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf6f6] dark:bg-emerald-500/10 border border-[#a2c8cb] dark:border-emerald-500/30 text-[#326165] dark:text-[#00dfa2] text-xs sm:text-sm font-bold tracking-wide">
              <School className="w-4 h-4" /> Giảng Viên & Chuyên Gia
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#1a3336] dark:text-white tracking-tight">
              Đăng Nhập Giảng Viên
            </h2>
            <p className="text-xs sm:text-sm text-[#577679] dark:text-slate-400">
              Sử dụng email giáo dục do nhà trường cấp để quản lý giảng đường
            </p>
          </div>

          {/* Teacher Login Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleTeacherLogin(e); }} className="space-y-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#294a4d] dark:text-slate-300 mb-1.5">
                Email giáo dục do nhà trường cấp *
              </label>
              <div className="relative flex items-center neu-inset rounded-2xl px-4 py-3 sm:py-3.5">
                <Mail className="w-5 h-5 text-[#659196] dark:text-slate-400 mr-3 shrink-0" />
                <input 
                  type="email" 
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="Nhập email giáo dục do nhà trường cấp"
                  className="w-full bg-transparent text-base sm:text-sm text-[#1a3336] dark:text-white focus:outline-none placeholder:text-[#839e9f] dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#294a4d] dark:text-slate-300">Mật khẩu *</label>
                <a 
                  href="#support" 
                  onClick={(e) => { e.preventDefault(); showToast('Vui lòng liên hệ Quản trị viên hệ thống để cấp lại mật khẩu!', 'error'); }}
                  className="text-xs sm:text-sm text-[#3b6f75] dark:text-[#00dfa2] hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative flex items-center neu-inset rounded-2xl px-4 py-3 sm:py-3.5">
                <Lock className="w-5 h-5 text-[#659196] dark:text-slate-400 mr-3 shrink-0" />
                <input 
                  type={showTeacherPass ? 'text' : 'password'} 
                  value={teacherPass}
                  onChange={(e) => setTeacherPass(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản giảng viên"
                  className="w-full bg-transparent text-base sm:text-sm text-[#1a3336] dark:text-white focus:outline-none placeholder:text-[#839e9f] dark:placeholder:text-slate-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowTeacherPass(!showTeacherPass)}
                  className="text-[#659196] hover:text-[#294a4d] dark:text-slate-400 dark:hover:text-slate-200 ml-2"
                >
                  {showTeacherPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-xs sm:text-sm text-[#4c6f72] dark:text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#edf5f6] dark:bg-slate-900 border-[#b5ced1] dark:border-slate-700 text-[#40767c] dark:text-[#00dfa2] focus:ring-0 cursor-pointer"
                />
                <span>Duy trì đăng nhập an toàn</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-teacher-login"
              type="submit"
              onClick={handleTeacherLogin}
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl neu-btn-glow font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg mt-1"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>VÀO KHÔNG GIAN GIẢNG VIÊN</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Đăng nhập nhanh bằng tài khoản liên kết */}
          <div className="space-y-3 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#d8e6e8] dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#0c1424] px-3.5 text-xs text-[#5e8184] dark:text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                Hoặc đăng nhập nhanh bằng
              </span>
              <div className="border-t border-[#d8e6e8] dark:border-slate-800 w-full" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Microsoft 365 (Chưa mở) */}
              <button
                type="button"
                aria-disabled="true"
                title="Tính năng hiện chưa hoạt động"
                onClick={() => handleDisabledSsoClick('Microsoft 365')}
                className="min-h-[46px] py-2.5 sm:py-3 px-2.5 sm:px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-[#244245] dark:text-slate-300 border border-[#cbe0e2] dark:border-slate-700/50 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-not-allowed opacity-70 select-none shadow-sm dark:shadow-none"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span>Microsoft 365</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">Chưa mở</span>
              </button>

              {/* Google Workspace (Chưa mở) */}
              <button
                type="button"
                aria-disabled="true"
                title="Tính năng hiện chưa hoạt động"
                onClick={() => handleDisabledSsoClick('Google')}
                className="min-h-[46px] py-2.5 sm:py-3 px-2.5 sm:px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-[#244245] dark:text-slate-300 border border-[#cbe0e2] dark:border-slate-700/50 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-not-allowed opacity-70 select-none shadow-sm dark:shadow-none"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">Chưa mở</span>
              </button>
            </div>
          </div>

          {/* Mobile toggle link */}
          <div className="text-center pt-2 lg:hidden">
            <p className="text-xs sm:text-sm text-[#577679] dark:text-slate-400">
              Bạn là Học viên?{' '}
              <button 
                type="button" 
                onClick={handleToggleRole}
                className="text-[#3b6f75] dark:text-[#00dfa2] font-semibold underline underline-offset-4"
              >
                Chuyển sang Cổng Học Viên
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTAINER B (RIGHT FORM): CỔNG ĐĂNG NHẬP HỌC VIÊN / SINH VIÊN             */}
      {/* ========================================================================= */}
      <div 
        className={`w-full lg:w-1/2 h-full p-5 sm:p-8 lg:p-12 flex flex-col justify-center items-center relative z-10 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          activeRole === 'student' 
            ? 'opacity-100 lg:translate-x-0' 
            : 'opacity-0 pointer-events-none lg:-translate-x-12 hidden lg:flex'
        }`}
      >
        <div className="max-w-[450px] w-full mx-auto space-y-4 sm:space-y-4.5 my-auto">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf5f8] dark:bg-cyan-500/10 border border-[#a2c8d5] dark:border-cyan-500/30 text-[#2c5f70] dark:text-[#00b4d8] text-xs sm:text-sm font-bold tracking-wide">
              <GraduationCap className="w-4 h-4" /> Học Viên & Sinh Viên
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#1a3336] dark:text-white tracking-tight">
              Đăng Nhập Học Viên
            </h2>
            <p className="text-xs sm:text-sm text-[#577679] dark:text-slate-400">
              Sử dụng email giáo dục do nhà trường cấp để vào lớp học
            </p>
          </div>

          {/* Student Login Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleStudentLogin(e); }} className="space-y-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#294a4d] dark:text-slate-300 mb-1.5">
                Email hoặc Mã số học viên *
              </label>
              <div className="relative flex items-center neu-inset rounded-2xl px-4 py-3 sm:py-3.5">
                <Mail className="w-5 h-5 text-[#659196] dark:text-slate-400 mr-3 shrink-0" />
                <input 
                  type="text" 
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="Email giáo dục hoặc Mã SV (VD: 26103043)"
                  className="w-full bg-transparent text-base sm:text-sm text-[#1a3336] dark:text-white focus:outline-none placeholder:text-[#839e9f] dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#294a4d] dark:text-slate-300">Mật khẩu *</label>
                <a 
                  href="#support" 
                  onClick={(e) => { e.preventDefault(); showToast('Vui lòng kiểm tra email hoặc liên hệ Quản trị viên để đặt lại mật khẩu!', 'error'); }}
                  className="text-xs sm:text-sm text-[#3b6f75] dark:text-[#00b4d8] hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative flex items-center neu-inset rounded-2xl px-4 py-3 sm:py-3.5">
                <Lock className="w-5 h-5 text-[#659196] dark:text-slate-400 mr-3 shrink-0" />
                <input 
                  type={showStudentPass ? 'text' : 'password'} 
                  value={studentPass}
                  onChange={(e) => setStudentPass(e.target.value)}
                  placeholder="Mật khẩu là Mã SV (VD: 26103043)"
                  className="w-full bg-transparent text-base sm:text-sm text-[#1a3336] dark:text-white focus:outline-none placeholder:text-[#839e9f] dark:placeholder:text-slate-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPass(!showStudentPass)}
                  className="text-[#659196] hover:text-[#294a4d] dark:text-slate-400 dark:hover:text-slate-200 ml-2"
                >
                  {showStudentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-xs sm:text-sm text-[#4c6f72] dark:text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#edf5f6] dark:bg-slate-900 border-[#b5ced1] dark:border-slate-700 text-[#40767c] dark:text-[#00b4d8] focus:ring-0 cursor-pointer"
                />
                <span>Duy trì đăng nhập an toàn</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-student-login"
              type="submit"
              onClick={handleStudentLogin}
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl neu-btn-glow-cyan font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg mt-1"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>VÀO KHÔNG GIAN HỌC VIÊN</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Đăng nhập nhanh bằng tài khoản liên kết */}
          <div className="space-y-3 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#d8e6e8] dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#0c1424] px-3.5 text-xs text-[#5e8184] dark:text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                Hoặc đăng nhập nhanh bằng
              </span>
              <div className="border-t border-[#d8e6e8] dark:border-slate-800 w-full" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Microsoft 365 (Chưa mở) */}
              <button
                type="button"
                aria-disabled="true"
                title="Tính năng hiện chưa hoạt động"
                onClick={() => handleDisabledSsoClick('Microsoft 365')}
                className="min-h-[46px] py-2.5 sm:py-3 px-2.5 sm:px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-[#244245] dark:text-slate-300 border border-[#cbe0e2] dark:border-slate-700/50 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-not-allowed opacity-70 select-none shadow-sm dark:shadow-none"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span>Microsoft 365</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">Chưa mở</span>
              </button>

              {/* Google Workspace (Chưa mở) */}
              <button
                type="button"
                aria-disabled="true"
                title="Tính năng hiện chưa hoạt động"
                onClick={() => handleDisabledSsoClick('Google')}
                className="min-h-[46px] py-2.5 sm:py-3 px-2.5 sm:px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-[#244245] dark:text-slate-300 border border-[#cbe0e2] dark:border-slate-700/50 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-not-allowed opacity-70 select-none shadow-sm dark:shadow-none"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">Chưa mở</span>
              </button>
            </div>
          </div>

          {/* Mobile toggle link */}
          <div className="text-center pt-2 lg:hidden">
            <p className="text-xs sm:text-sm text-[#577679] dark:text-slate-400">
              Bạn là Giảng viên?{' '}
              <button 
                type="button" 
                onClick={handleToggleRole}
                className="text-[#3b6f75] dark:text-[#00dfa2] font-semibold underline underline-offset-4"
              >
                Chuyển sang Cổng Giảng Viên
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OVERLAY SLIDING PANEL (CƠ CHẾ TRƯỢT: CHUYỂN GIỮA GV VÀ SV)                 */}
      {/* ========================================================================= */}
      <div 
        className={`hidden lg:block absolute top-0 left-0 w-1/2 h-full z-40 transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          activeRole === 'teacher' ? 'translate-x-full' : 'translate-x-0'
        } ${isAnimating ? 'anim-expanding' : ''}`}
      >
        <div className="w-full h-full relative overflow-hidden p-8 sm:p-10 lg:p-12 flex flex-col justify-between border-r border-[#bed8da] dark:border-slate-700/30 shadow-2xl transition-[border-color] duration-300">
          
          {/* Light Mode Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#edf6f7] via-[#ddecee] to-[#c7dfde] opacity-100 dark:opacity-0 transition-opacity duration-300 pointer-events-none" />

          {/* Dark Mode Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c182d] via-[#091122] to-[#060b16] opacity-0 dark:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Neumorphic 3D Decorative Circles: Sage in Light, Original Cyber Navy in Dark */}
          <div className={`switch-circle-bg ${activeRole === 'teacher' ? 'translate-x-12' : ''}`} />
          <div className={`switch-circle-top ${activeRole === 'teacher' ? '-translate-x-12' : ''}`} />

          {/* Subtle Ambient Glow */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
            activeRole === 'teacher' ? 'bg-[#598b90]/15 dark:bg-[#00dfa2]/15' : 'bg-[#4a7d88]/15 dark:bg-[#00b4d8]/15'
          }`} />

          {/* Top Brand Banner inside Slider */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-[#9ac2c5] dark:border-slate-700/60 shadow-sm">
              <img src="/eg-logo.png" alt="EG" className="w-5 h-5 object-contain inline dark:hidden" />
              <img src="/eg-logo-teal.png" alt="EG" className="w-5 h-5 object-contain hidden dark:inline" />
              <span className="text-xs sm:text-sm font-bold text-[#1f4245] dark:text-slate-200 tracking-wide">EG Education</span>
            </div>
            <div className="text-xs uppercase font-bold px-3 py-1.5 rounded-full bg-[#bad9dc]/60 dark:bg-emerald-500/10 text-[#244f53] dark:text-[#00dfa2] border border-[#a2c9cc] dark:border-emerald-500/30">
              {activeRole === 'teacher' ? 'Phân hệ Học Viên' : 'Phân hệ Giảng Viên'}
            </div>
          </div>

          {/* Middle Dynamic Content: Rich Feature Highlights */}
          <div className="relative z-10 my-auto space-y-3.5 py-1">
            {activeRole === 'teacher' ? (
              // When active form is Teacher (panel moved to Right), show Student Teaser to invite switching to Student
              <div className="space-y-3.5 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="text-3xl sm:text-[32px] lg:text-[34px] font-extrabold text-[#173033] dark:text-white leading-tight">
                    Không Gian Học Tập <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2c5f70] to-[#40767c] dark:from-[#00b4d8] dark:to-[#00dfa2]">
                      Dành Cho Học Viên
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#466669] dark:text-slate-300 leading-relaxed mt-1">
                    Trải nghiệm tiện ích giáo dục số thông minh: điểm danh GPS 1-chạm, hỏi đáp AI giáo trình và kho học liệu trực tuyến.
                  </p>
                </div>

                {/* 3 Styled Feature Cards */}
                <div className="space-y-3 pt-0.5">
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-[#3f7277] dark:text-[#00b4d8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">Điểm danh Camera + Geofencing</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">Xác thực GPS phòng học thông minh chỉ 3 giây</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 shrink-0">GPS</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-[#3f7277] dark:text-[#00b4d8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">Trợ lý AI Tutor Pro 24/7</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">Đối chiếu học liệu chuẩn, giải đáp tức thì</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">AI RAG</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Library className="w-5 h-5 text-[#3f7277] dark:text-[#00b4d8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">Kho Học Liệu Mở Toàn Diện</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">1.000+ bài giảng & tài liệu bản quyền mở</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">Open Edu</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-toggle-to-student"
                    type="button"
                    onClick={handleToggleRole}
                    className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-white hover:bg-[#f7fafb] dark:bg-transparent dark:hover:bg-transparent dark:neu-btn text-[#1f4043] dark:text-white font-extrabold text-xs sm:text-sm tracking-wide border border-[#9ac2c5] hover:border-[#6b9a9e] dark:border-cyan-500/40 dark:hover:border-cyan-400 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg hover:shadow-xl dark:shadow-xl group"
                  >
                    <span>CHUYỂN SANG CỔNG HỌC VIÊN</span>
                    <ArrowRight className="w-5 h-5 text-[#3f7277] dark:text-[#00b4d8] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              // When active form is Student (panel on Left), show Teacher Teaser to invite switching to Teacher
              <div className="space-y-3.5 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="text-3xl sm:text-[32px] lg:text-[34px] font-extrabold text-[#173033] dark:text-white leading-tight">
                    Quản Trị Giảng Đường <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2e6066] to-[#4c7f84] dark:from-[#00dfa2] dark:to-[#00b4d8]">
                      Dành Cho Giảng Viên
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#466669] dark:text-slate-300 leading-relaxed mt-1">
                    Hệ thống số hóa phục vụ giảng dạy: chiếu mã QR động chống gian lận, AI soạn giáo án và phê duyệt đơn từ trực tuyến.
                  </p>
                </div>

                {/* 3 Styled Feature Cards */}
                <div className="space-y-3 pt-0.5">
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-[#3f7277] dark:text-[#00dfa2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">Dynamic QR 10s Đổi Mã</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">Trình chiếu chống điểm danh hộ 0đ thiết bị</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-[#00dfa2] shrink-0">10s Auto</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#3f7277] dark:text-[#00dfa2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">AI Soạn Bài & Thang Bloom</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">Phân tích giáo án, sinh slide & trắc nghiệm</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0">Bloom AI</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 backdrop-blur-sm shadow-sm transition-all hover:translate-x-1">
                    <div className="w-10 h-10 rounded-xl bg-[#3f7277]/10 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-[#3f7277] dark:text-[#00dfa2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a3336] dark:text-white truncate">Phê Duyệt Đơn Từ 1-Chạm</div>
                      <div className="text-[11px] sm:text-xs text-[#577679] dark:text-slate-400 truncate">Xử lý minh chứng đơn nghỉ học trực tuyến</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0">1-Touch</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-toggle-to-teacher"
                    type="button"
                    onClick={handleToggleRole}
                    className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-white hover:bg-[#f7fafb] dark:bg-transparent dark:hover:bg-transparent dark:neu-btn text-[#1f4043] dark:text-white font-extrabold text-xs sm:text-sm tracking-wide border border-[#9ac2c5] hover:border-[#6b9a9e] dark:border-emerald-500/40 dark:hover:border-[#00dfa2] flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg hover:shadow-xl dark:shadow-xl group"
                  >
                    <span>CHUYỂN SANG CỔNG GIẢNG VIÊN</span>
                    <ArrowRight className="w-5 h-5 text-[#3f7277] dark:text-[#00dfa2] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
