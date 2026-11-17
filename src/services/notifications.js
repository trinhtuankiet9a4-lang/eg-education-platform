import { api } from './api.js';

const STORAGE_KEY = 'eg_notifications_v1';

let memStore = null;
const safeStorage = {
  get: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : null;
      }
    } catch {}
    return memStore;
  },
  set: (data, triggerEvent = true) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {}
    memStore = data;
    if (triggerEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eg_notifications_updated', { detail: data }));
    }
  }
};

const DEFAULT_NOTIFICATIONS = [];

let isSyncing = false;
let lastSyncTime = 0;

export const notificationService = {
  getAll: (role = null) => {
    // Background sync with backend: throttled to once every 60 seconds
    const now = Date.now();
    if (!isSyncing && (now - lastSyncTime > 60000) && typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('eg_auth_token')) {
      isSyncing = true;
      lastSyncTime = now;
      api.notifications.getAll().then(res => {
        if (res.success && Array.isArray(res.notifications)) {
          safeStorage.set(res.notifications, false);
        }
      }).catch(() => {}).finally(() => {
        isSyncing = false;
      });
    }

    let list = safeStorage.get();
    if (!list || !Array.isArray(list)) {
      list = DEFAULT_NOTIFICATIONS;
    }
    if (!role) return list;
    return list.filter(n => n.role === role);
  },

  markAsRead: (id) => {
    // Optimistic UI update
    const list = notificationService.getAll();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    safeStorage.set(updated);

    // Sync to backend
    api.notifications.markAsRead(id).catch(() => {});
    return updated;
  },

  markAllAsRead: (role) => {
    const list = notificationService.getAll();
    const updated = list.map(n => {
      if (!role || n.role === role) return { ...n, read: true };
      return n;
    });
    safeStorage.set(updated);

    // Sync to backend
    api.notifications.markAllAsRead().catch(() => {});
    return updated;
  },

  addNotification: (notif) => {
    const list = notificationService.getAll();
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      time: 'Vừa xong',
      read: false,
      priority: 'normal',
      ...notif
    };
    safeStorage.set([newNotif, ...list]);
    return newNotif;
  },

  clearAll: (role) => {
    const list = notificationService.getAll();
    const remaining = role ? list.filter(n => n.role !== role) : [];
    safeStorage.set(remaining);

    // Sync to backend
    api.notifications.clearAll().catch(() => {});
    return remaining;
  }
};
