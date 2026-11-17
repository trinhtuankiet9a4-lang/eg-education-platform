import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  Hand,
  CheckCircle2,
  Send,
  Radio,
  Maximize2,
  Minimize2,
  PenTool,
  Eraser,
  Trash2,
  Download,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

/**
 * Phòng Học Trực Tuyến WebRTC Tích Hợp Camera, Micro, Chia Sẻ Màn Hình & Bảng Trắng Canvas
 * Hoạt động 100% nội bộ trên trình duyệt — không phụ thuộc phòng họp bên ngoài hay lỗi moderator Jitsi.
 */
export default function VirtualClassroomHub({ role = 'teacher', activeStudentCode = '26103043', triggerToast }) {
  const [room, setRoom] = useState(() => extendedFeaturesService.getVirtualRoom());
  const [stageMode, setStageMode] = useState('video'); // 'video' | 'whiteboard'
  const [camEnabled, setCamEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [isStartingMedia, setIsStartingMedia] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Interactive Whiteboard Canvas States
  const [penColor, setPenColor] = useState('#00dfa2');
  const [penWidth, setPenWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);

  // DOM & MediaStream refs
  const stageContainerRef = useRef(null);
  const camVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const camStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadRoom = async () => {
      const res = await extendedFeaturesService.fetchVirtualRoom();
      if (!cancelled && res?.data) {
        setRoom({ ...res.data });
      }
    };
    loadRoom();
    const timer = setInterval(loadRoom, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Cleanup active streams on unmount
  useEffect(() => {
    return () => {
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach camera & screen streams whenever stageMode or flags change
  useEffect(() => {
    if (camVideoRef.current && camStreamRef.current) {
      camVideoRef.current.srcObject = camStreamRef.current;
    }
    if (pipVideoRef.current && camStreamRef.current) {
      pipVideoRef.current.srcObject = camStreamRef.current;
    }
    if (screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [camEnabled, screenSharing, stageMode]);

  // Initialize Canvas background when switching to whiteboard
  useEffect(() => {
    if (stageMode !== 'whiteboard' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas.dataset.initialized) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#090e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Bảng Trắng Tương Tác Lớp CNTT K26 — Kéo chuột hoặc chạm để viết/vẽ trực tiếp', 24, 34);
      canvas.dataset.initialized = 'true';
    }
  }, [stageMode]);

  const handleStartCameraAndJoin = async () => {
    setMediaError(null);
    setIsStartingMedia(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ Camera/Micro (getUserMedia).');
      }
      // Stop existing tracks if restarting
      camStreamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      camStreamRef.current = stream;

      // Apply mic initial state
      const shouldEnableMic = role === 'teacher';
      stream.getAudioTracks().forEach((t) => {
        t.enabled = shouldEnableMic;
      });
      setCamEnabled(true);
      setMicEnabled(shouldEnableMic);

      // Ghi nhận mở / vào phòng trên backend SQLite
      const joinRes = await extendedFeaturesService.joinVirtualRoom({
        role,
        studentCode: activeStudentCode,
        cameraOn: true,
        micOn: shouldEnableMic,
      });
      if (joinRes?.data) {
        setRoom({ ...joinRes.data });
      }
      sound.playSuccess();
      triggerToast?.('📹 Đã mở Camera & vào Phòng học Trực tuyến thành công!');
    } catch (err) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Trình duyệt đang chặn quyền Camera/Micro. Hãy bấm Cho phép (Allow) ở thanh địa chỉ!'
          : err?.name === 'NotFoundError'
          ? 'Không tìm thấy Webcam/Micro trên thiết bị. Bạn vẫn có thể dùng Chia sẻ màn hình hoặc Bảng trắng.'
          : err?.message || 'Không thể mở Camera lúc này.';
      setMediaError(msg);
      triggerToast?.(`⚠️ ${msg}`, 'error');
    } finally {
      setIsStartingMedia(false);
    }
  };

  const handleToggleCamera = () => {
    if (!camStreamRef.current) {
      handleStartCameraAndJoin();
      return;
    }
    const next = !camEnabled;
    camStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamEnabled(next);
    triggerToast?.(next ? '📹 Đã bật Camera' : '📹 Đã tắt Camera');
  };

  const handleToggleMic = async () => {
    if (!camStreamRef.current) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        camStreamRef.current = audioOnly;
        setMicEnabled(true);
        triggerToast?.('🎙️ Đã bật Micro');
      } catch {
        triggerToast?.('⚠️ Hãy cấp quyền Micro trên trình duyệt!', 'error');
      }
      return;
    }
    const audioTracks = camStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      triggerToast?.('⚠️ Không tìm thấy Micro trên thiết bị.', 'error');
      return;
    }
    const next = !micEnabled;
    audioTracks.forEach((t) => {
      t.enabled = next;
    });
    setMicEnabled(next);
    triggerToast?.(next ? '🎙️ Micro: Đang bật' : '🔇 Micro: Đang tắt');
  };

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      triggerToast?.('Đã dừng chia sẻ màn hình.');
      return;
    }

    setMediaError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Trình duyệt không hỗ trợ Chia sẻ màn hình (getDisplayMedia).');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      screenStreamRef.current = stream;
      setScreenSharing(true);
      setStageMode('video');

      // Tự tắt state khi người dùng bấm Stop Sharing của trình duyệt
      const [track] = stream.getVideoTracks();
      if (track) {
        track.onended = () => {
          screenStreamRef.current = null;
          setScreenSharing(false);
        };
      }
      sound.playSuccess();
      triggerToast?.('🖥️ Đang chia sẻ màn hình trực tiếp trong phòng học!');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        const msg = 'Không thể chia sẻ màn hình (hoặc người dùng đã hủy chọn cửa sổ).';
        setMediaError(msg);
        triggerToast?.(`⚠️ ${msg}`);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Whiteboard pointer handlers
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = isEraser ? '#090e1a' : penColor;
    ctx.lineWidth = isEraser ? penWidth * 4 : penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleDownloadWhiteboard = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Bang_Trang_CNTT_K26_${Date.now().toString().slice(-4)}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    triggerToast?.('Đã tải xuống ảnh chụp Bảng trắng (.PNG)!');
  };

  const handleJoinPresenceOnly = async () => {
    const res = await extendedFeaturesService.joinVirtualRoom({
      role,
      studentCode: activeStudentCode,
      cameraOn: camEnabled,
      micOn: micEnabled,
    });
    if (res?.data) {
      setRoom({ ...res.data });
    }
    sound.success();
    triggerToast?.(res?.message || 'Đã ghi nhận tham gia Phòng học Trực tuyến!');
  };

  const participants = room.participants || [];
  const chatMessages = room.chatMessages || [];
  const myParticipant = participants.find((p) => p.studentCode === activeStudentCode);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const sender =
      role === 'teacher'
        ? 'ThS. Phạm Văn Thuận (GV)'
        : `${extendedFeaturesService.resolveStudentName(activeStudentCode)} (SV)`;
    const res = await extendedFeaturesService.sendRoomChat({
      sender,
      studentCode: activeStudentCode,
      role,
      text: chatInput,
    });
    if (res?.data) {
      setRoom({ ...res.data });
    }
    setChatInput('');
    sound.success();
  };

  const handleRaiseHand = async () => {
    const res = await extendedFeaturesService.toggleRaiseHand(activeStudentCode);
    if (res?.data) {
      setRoom({ ...res.data });
    }
    sound.success();
    triggerToast?.(res?.message || '✋ Đã cập nhật trạng thái Giơ tay phát biểu trên màn hình Giảng viên!');
  };

  const handleSyncOnlineAttendance = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await extendedFeaturesService.syncVirtualRoomAttendance();
      if (res?.data) {
        setRoom({ ...res.data });
      }
      sound.success();
      triggerToast?.(
        res?.message || '✅ Đã tự động điểm danh sinh viên tham gia phòng học trực tuyến vào Sổ điểm!'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="module-virtual-classroom" className="mt-0 space-y-4 animate-fadeIn">
      {/* Top Control Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-sky-500/10 to-teal-500/15 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> WebRTC Nội Bộ • Mở Trực Tiếp
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Mã phòng: <b>{room.roomId}</b> • Lớp CNTT K26
              </span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
              {room.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-toggle-stage-mode"
            type="button"
            onClick={() => setStageMode((m) => (m === 'video' ? 'whiteboard' : 'video'))}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0c1424] border border-indigo-500/40 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center gap-1.5"
          >
            {stageMode === 'video' ? <PenTool className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span>{stageMode === 'video' ? 'Mở Bảng Trắng Tương Tác' : 'Quay lại Camera / Màn hình'}</span>
          </button>

          {role === 'teacher' ? (
            <button
              id="btn-sync-online-attendance"
              type="button"
              disabled={isSyncing}
              onClick={handleSyncOnlineAttendance}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSyncing ? 'Đang đồng bộ...' : `Chốt điểm danh tự động (≥${room.autoAttendanceMinMinutes || 35}p)`}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {!myParticipant && (
                <button
                  type="button"
                  onClick={handleJoinPresenceOnly}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ghi danh vào phòng</span>
                </button>
              )}
              <button
                id="btn-student-raise-hand"
                type="button"
                onClick={handleRaiseHand}
                className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md ${
                  myParticipant?.handRaised
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{myParticipant?.handRaised ? 'Đang giơ tay (Bấm để hạ)' : 'Giơ tay phát biểu'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Stage + Chat & Attendance Log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left 2 Columns: Video & Whiteboard Stage */}
        <div
          ref={stageContainerRef}
          className="xl:col-span-2 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between min-h-[430px] p-4 text-white relative"
        >
          {/* Top Stage HUD */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-xs font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${camEnabled || screenSharing ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              {screenSharing
                ? '🖥️ Đang Chia Sẻ Màn Hình Trực Tiếp'
                : camEnabled
                ? '📹 Camera Trực Tiếp (Không Giới Hạn Thời Gian)'
                : stageMode === 'whiteboard'
                ? '✏️ Bảng Trắng Giảng Dạy Tương Tác'
                : 'Phòng Học WebRTC Sẵn Sàng Mở Ngay'}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              WebRTC Native • Không qua Jitsi
            </span>
          </div>

          {mediaError && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{mediaError}</span>
            </div>
          )}

          {/* Stage Center Content */}
          {stageMode === 'whiteboard' ? (
            <div className="flex-1 flex flex-col space-y-2.5 my-1 relative">
              {/* Whiteboard Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  {['#00dfa2', '#38bdf8', '#f59e0b', '#f43f5e', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setIsEraser(false);
                        setPenColor(c);
                      }}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                        !isEraser && penColor === c ? 'border-white scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                      title="Chọn màu bút"
                    />
                  ))}
                  <select
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                    className="ml-2 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-white"
                  >
                    <option value={2}>Nét mảnh (2px)</option>
                    <option value={4}>Vừa (4px)</option>
                    <option value={7}>Đậm (7px)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEraser((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                      isEraser ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" /> Tẩy
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa bảng
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWhiteboard}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Lưu ảnh
                  </button>
                </div>
              </div>

              <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-800 bg-[#090e1a]">
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={420}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  className="w-full h-[300px] sm:h-[330px] cursor-crosshair touch-none"
                />
                {camEnabled && (
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-3 right-3 w-36 h-24 rounded-xl object-cover border-2 border-[#00dfa2] shadow-lg bg-black"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center relative rounded-xl overflow-hidden bg-slate-900/90 border border-slate-800 min-h-[310px] my-1">
              {screenSharing ? (
                <>
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-[320px] sm:h-[360px] object-contain bg-black"
                  />
                  {camEnabled && (
                    <video
                      ref={pipVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-3 right-3 w-40 h-28 rounded-xl object-cover border-2 border-[#00dfa2] shadow-xl bg-black"
                    />
                  )}
                </>
              ) : camEnabled ? (
                <video
                  ref={camVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[320px] sm:h-[360px] object-cover bg-black"
                />
              ) : (
                <div className="p-6 text-center max-w-md space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base sm:text-lg font-black text-white">
                      Phòng Học Trực Tuyến Lớp CNTT K26
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Mở trực tiếp bằng Camera, Micro &amp; Chia sẻ màn hình của trình duyệt (không cần đăng nhập Jitsi Moderator).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      id="btn-start-webrtc-camera"
                      type="button"
                      disabled={isStartingMedia}
                      onClick={handleStartCameraAndJoin}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Video className="w-4 h-4" />
                      <span>{isStartingMedia ? 'Đang kết nối thiết bị...' : 'Mở Camera & Bắt Đầu Phòng Học'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <MonitorUp className="w-4 h-4" />
                      <span>Chia sẻ Màn hình</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  camEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span>{camEnabled ? 'Camera: Bật' : 'Bật Camera'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleMic}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  micEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{micEnabled ? 'Micro: Bật' : 'Bật Micro'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleScreenShare}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  screenSharing ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-sky-300'
                }`}
              >
                {screenSharing ? <MonitorOff className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                <span>{screenSharing ? 'Dừng Chia Sẻ' : 'Chia sẻ Màn hình'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Toàn màn hình"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-xs text-slate-400 font-semibold">
              Chủ trì: <b className="text-white">{room.hostName}</b>
            </div>
          </div>
        </div>

        {/* Right Column: Auto Attendance Tracker & Live Chat */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-xs text-slate-600 dark:text-slate-300">
                Theo dõi Thời lượng &amp; Điểm danh ({participants.length} người)
              </h4>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-[#00dfa2]">
                Đạt chuẩn ≥ {room.autoAttendanceMinMinutes} phút
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {participants.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Chưa có sinh viên tham gia phòng học trực tuyến.
                </div>
              ) : (
                participants.map((p) => (
                  <div key={p.studentCode} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{p.studentName}</span>
                      {p.handRaised && <span className="ml-1.5 text-amber-500">✋ Đang giơ tay</span>}
                      <div className="text-[10px] text-slate-500">Vào lúc {p.joinedAt} • Đã học {p.durationMin} phút</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      p.autoAttended
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2]'
                        : 'bg-amber-500/15 text-amber-700'
                    }`}>
                      {p.autoAttended ? '✓ Đủ giờ' : 'Đang học'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In-Room Chat */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Thảo luận trực tiếp trong phòng</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] text-[11px] text-slate-400 text-center">
                  Chưa có tin nhắn nào trong phòng học.
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] text-xs">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{msg.sender}: </span>
                    <span className="text-slate-700 dark:text-slate-300">{msg.text}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Gửi tin nhắn vào lớp học..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
