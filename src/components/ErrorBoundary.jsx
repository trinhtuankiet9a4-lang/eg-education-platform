import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application Crash Caught by ErrorBoundary]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.removeItem('eg_auth_token');
      localStorage.removeItem('eg_auth_user');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0d1527] border border-rose-500/30 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-white">Đã xảy ra lỗi giao diện</h2>
              <p className="text-xs text-slate-400 mt-1">
                Hệ thống đã tự động bảo vệ dữ liệu phiên làm việc của bạn.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-left font-mono text-[11px] text-rose-300 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
              >
                <span>Về Đăng Nhập</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
