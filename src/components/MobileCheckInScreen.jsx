import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  MapPin, 
  Wifi, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  QrCode,
  Smartphone
} from 'lucide-react';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';

export default function MobileCheckInScreen({ currentUser, onBack }) {
  const [sessionId, setSessionId] = useState(null);
  const [token, setToken] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [selectedStudentCode, setSelectedStudentCode] = useState(() => {
    return currentUser?.code || '26103043';
  });
  const [searchStudent, setSearchStudent] = useState('');
  const [locationStatus, setLocationStatus] = useState({
    status: 'idle',
    lat: null,
    lng: null,
    accuracy: 'Chưa cấp quyền vị trí GPS',
    distanceMeters: null,
    isReal: false,
    error: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const requestDeviceLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const fail = {
          status: 'denied',
          lat: null,
          lng: null,
          accuracy: 'Trình duyệt không hỗ trợ GPS',
          distanceMeters: null,
          isReal: false,
          error: 'Trình duyệt không hỗ trợ định vị GPS.'
        };
        setLocationStatus(fail);
        resolve(fail);
        return;
      }

      setLocationStatus((prev) => ({ ...prev, status: 'requesting', error: null }));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 0);
          let dist = null;
          try {
            const v = await api.attendance.verifyLocation({ lat, lng, accuracy: acc });
            if (v?.distanceMeters != null) dist = v.distanceMeters;
          } catch {}
          const ok = {
            status: 'granted',
            lat,
            lng,
            accuracy: `GPS thực tế (±${acc}m)`,
            distanceMeters: dist,
            isReal: true,
            error: null
          };
          setLocationStatus(ok);
          resolve(ok);
        },
        (err) => {
          const msg =
            err.code === 1
              ? 'Bạn cần bấm Cho phép (Allow) truy cập Vị trí trên trình duyệt để điểm danh.'
              : 'Chưa lấy được tọa độ GPS. Hãy bấm Lấy lại vị trí.';
          const denied = {
            status: 'denied',
            lat: null,
            lng: null,
            accuracy: 'Chưa cấp quyền vị trí',
            distanceMeters: null,
            isReal: false,
            error: msg
          };
          setLocationStatus(denied);
          resolve(denied);
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
      );
    });
  };

  // Parse URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = params.get('s') || params.get('sessionId') || params.get('session_id');
    const t = params.get('t') || params.get('token');
    if (sId) setSessionId(sId);
    if (t) setToken(t);

    // Fetch active session info
    api.attendance.getActiveSession().then(res => {
      if (res.success && res.session) {
        setSessionInfo(res.session);
        if (!sId) setSessionId(res.session.id);
        if (!t) setToken(res.session.current_token);
      }
    }).catch(() => {});

    // Fetch full real class roster from SQLite
    api.attendance.getClassRoster('K26 CNTT - Lớp A').then(res => {
      if (res.success && res.students) {
        setRoster(res.students);
      }
    }).catch(() => {});

    // Automatically request real browser GPS permission on load
    requestDeviceLocation();
  }, []);

  const handleConfirmCheckIn = async () => {
    if (!selectedStudentCode) {
      setErrorMsg('Vui lòng chọn hoặc nhập Mã sinh viên!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let coords = locationStatus;
    if (coords.lat == null || coords.lng == null) {
      coords = await requestDeviceLocation();
    }
    if (coords.lat == null || coords.lng == null) {
      setIsSubmitting(false);
      setErrorMsg(coords.error || 'Máy chủ yêu cầu cấp quyền Vị trí (GPS) trước khi điểm danh!');
      return;
    }

    try {
      const res = await api.attendance.checkIn({
        session_id: sessionId || sessionInfo?.id,
        token: token || sessionInfo?.current_token,
        student_code: selectedStudentCode,
        lat: coords.lat,
        lng: coords.lng,
        method: 'mobile_qr_camera'
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMsg(res.message || 'Mã QR đã đổi chu kỳ (3s). Vui lòng quét lại mã mới nhất trên bảng!');
        return;
      }

      sound.playSuccess();
      setResult({
        ...res,
        timeStr: new Date().toLocaleTimeString('vi-VN')
      });
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Lỗi xác thực với máy chủ. Vui lòng thử lại!');
    }
  };

  const currentStudentObj = roster.find(s => s.code === selectedStudentCode) || {
    name: currentUser?.name || 'Trịnh Tuấn Kiệt',
    code: selectedStudentCode || '26103043'
  };

  const filteredRoster = roster.filter(s => 
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) || 
    s.code.includes(searchStudent)
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] p-4 sm:p-6 relative selection:bg-[#00dfa2] selection:text-slate-950">
      
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00dfa2] to-[#0099ff] p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1120] rounded-[10px] flex items-center justify-center">
              <img src="/eg-logo-teal.png" alt="EG" className="w-5 h-5 object-contain" />
            </div>
          </div>
          <div>
            <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <span>EG Smart Attendance</span>
              <span className="w-2 h-2 rounded-full bg-[#00dfa2] animate-ping" />
            </div>
            <div className="text-[10px] text-slate-400">Cổng Điểm Danh Trực Tiếp Trên Điện Thoại</div>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
          >
            Đóng
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-auto py-4">
        {result ? (
          /* SUCCESS CELEBRATION CARD */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1424] border-2 border-emerald-500/40 shadow-2xl text-center space-y-5 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-[#00dfa2] border-2 border-[#00dfa2]/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 text-[#00dfa2] animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-[#00dfa2] border border-emerald-500/40">
                <Sparkles className="w-3.5 h-3.5" />
                {result.tokenMatchType === 'grace_period' ? 'Xác thực Cửa Sổ Trượt 3s' : 'Khớp Dynamic QR 3s Chuẩn'}
              </div>
              <h2 className="text-2xl font-black text-white">ĐIỂM DANH THÀNH CÔNG!</h2>
              <p className="text-xs text-slate-400">
                Màn hình Giảng viên đã ghi nhận sự có mặt của bạn trong phòng học.
              </p>
            </div>

            {/* Attendance Pass Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Học viên:</span>
                <span className="font-bold text-white text-sm">{currentStudentObj.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mã sinh viên:</span>
                <span className="font-bold text-emerald-400">{currentStudentObj.code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Lớp / Học phần:</span>
                <span className="text-slate-200">{sessionInfo?.subject_name || 'Lớp CNTT K26'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Vị trí GPS thực tế:</span>
                <span className="text-slate-200">
                  {locationStatus.lat != null
                    ? `${locationStatus.lat.toFixed(5)}°, ${locationStatus.lng.toFixed(5)}°`
                    : 'Đã xác thực'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-400">Giờ ghi nhận:</span>
                <span className="font-bold text-[#00dfa2]">{result.timeStr}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setResult(null);
                  setErrorMsg(null);
                }}
                className="w-full py-3.5 px-4 rounded-2xl neu-btn font-extrabold text-xs text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-teal-400" />
                <span>Quét lại ca khác hoặc kiểm thử lại</span>
              </button>
            </div>
          </div>
        ) : (
          /* SCAN VERIFICATION FORM */
          <div className="p-6 rounded-3xl bg-[#0c1424] border border-slate-800 shadow-2xl space-y-5">
            
            {/* Session Card Info */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10 border border-teal-500/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-teal-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00dfa2] animate-ping" />
                  Ca điểm danh trực tiếp
                </span>
                <span>Lớp CNTT K26</span>
              </div>
              <div className="text-base font-extrabold text-white">
                {sessionInfo?.subject_name || 'Chưa có ca điểm danh đang mở'}
              </div>
              <div className="text-xs text-slate-400">
                Giảng viên: <strong className="text-slate-200">{sessionInfo?.teacher_name || 'ThS. Phạm Văn Thuận'}</strong>
              </div>
            </div>

            {/* Token Badge */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#00dfa2]" />
                Mã Dynamic QR 3s:
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-[#00dfa2] font-black tracking-wider border border-teal-500/40">
                {token ? token.substring(0, 16) + '...' : 'ĐANG CHỜ MÃ'}
              </span>
            </div>

            {/* Student Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Xác nhận danh tính Sinh viên *
              </label>
              
              {/* If full roster is available, show searchable dropdown or current student card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-[#00dfa2] flex items-center justify-center font-bold text-sm">
                      SV
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">{currentStudentObj.name}</div>
                      <div className="text-xs text-emerald-400 font-mono">MSSV: {currentStudentObj.code}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    K26 CNTT
                  </span>
                </div>

                {/* Change student picker toggle */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Điểm danh cho sinh viên khác trong lớp:
                  </label>
                  <select
                    value={selectedStudentCode}
                    onChange={(e) => setSelectedStudentCode(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-[#00dfa2]"
                  >
                    {roster.map(s => (
                      <option key={s.id} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Location & Permission Request HUD */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 font-semibold ${
                  locationStatus.status === 'granted' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {locationStatus.status === 'granted'
                    ? `GPS: ${locationStatus.lat.toFixed(5)}°, ${locationStatus.lng.toFixed(5)}° (${locationStatus.accuracy})`
                    : locationStatus.status === 'requesting'
                    ? 'Đang xin quyền & lấy vị trí GPS...'
                    : 'Chưa cấp quyền Vị trí (GPS)'}
                </span>
                <button
                  type="button"
                  onClick={requestDeviceLocation}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-[#00dfa2] border border-teal-500/40 font-bold text-[10px] shrink-0 cursor-pointer"
                >
                  📍 Lấy vị trí
                </button>
              </div>
              {locationStatus.distanceMeters != null && (
                <div className="text-[11px] text-cyan-400 font-medium">
                  Khoảng cách thực tế tới giảng viên: <strong>{locationStatus.distanceMeters}m</strong>
                </div>
              )}
              {locationStatus.error && (
                <div className="text-[10px] text-amber-300 leading-snug">
                  {locationStatus.error}
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Big Action Submit Button */}
            <button
              onClick={handleConfirmCheckIn}
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl neu-btn-glow font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>ĐANG ĐỐI SOÁT VỚI MÁY CHỦ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>XÁC NHẬN ĐIỂM DANH (DYNAMIC QR 3S)</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer Security Note */}
      <footer className="max-w-md w-full mx-auto pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#00dfa2]" />
        <span>Bảo mật dữ liệu điểm danh theo Nghị định 13/2023/NĐ-CP • EG Education Platform</span>
      </footer>
    </div>
  );
}
