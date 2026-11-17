import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  MessageSquare, 
  Vote, 
  FileCheck2, 
  BookOpen, 
  QrCode, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { notificationService } from '../services/notifications.js';

export default function NotificationCenter({ role, onNavigateTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [notifications, setNotifications] = useState(() => notificationService.getAll(role));
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(notificationService.getAll(role));
    };
    window.addEventListener('eg_notifications_updated', handleUpdate);
    return () => window.removeEventListener('eg_notifications_updated', handleUpdate);
  }, [role]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const displayedList = filterUnread 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const handleItemClick = (notif) => {
    notificationService.markAsRead(notif.id);
    if (notif.targetTab && onNavigateTab) {
      onNavigateTab(notif.targetTab);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(role);
  };

  const handleClearAll = () => {
    notificationService.clearAll(role);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'feedback':
        return <MessageSquare className="w-4 h-4 text-teal-500" />;
      case 'poll':
        return <Vote className="w-4 h-4 text-rose-500" />;
      case 'leave':
        return <FileCheck2 className="w-4 h-4 text-amber-500" />;
      case 'library':
        return <BookOpen className="w-4 h-4 text-sky-500" />;
      case 'attendance':
        return <QrCode className="w-4 h-4 text-emerald-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-teal-500/15 border-teal-500 text-teal-700 dark:text-[#00dfa2] ring-2 ring-teal-500/30'
            : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
        }`}
        title="Thông báo hệ thống"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 animate-ping opacity-75" />
          </>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-[68px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-[#00dfa2] flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  Thông Báo Hệ Thống
                </h4>
                <p className="text-[10px] text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter & Action Bar */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#080d19] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterUnread(false)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  !filterUnread 
                    ? 'bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUnread(true)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterUnread 
                    ? 'bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-teal-600 dark:text-[#00dfa2] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đọc hết</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Xóa tất cả thông báo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không có thông báo nào.
              </div>
            ) : (
              displayedList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative ${
                    notif.read
                      ? 'bg-white dark:bg-[#0c1424] opacity-80 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-[#0f1a2e]'
                      : 'bg-teal-500/5 dark:bg-teal-500/10 hover:bg-teal-500/15'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h5 className={`text-xs truncate ${notif.read ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-extrabold text-slate-900 dark:text-white'}`}>
                        {notif.title}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                      <span>{notif.time}</span>
                      <span>•</span>
                      <span className="text-teal-600 dark:text-[#00dfa2] flex items-center gap-0.5 font-bold">
                        Xem chi tiết <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
