import { create } from 'zustand'

export interface AppNotification {
  id: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (message: string) => void
  markAllRead: () => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (message) =>
    set((state) => ({
      notifications: [
        { id: crypto.randomUUID(), message, timestamp: new Date(), read: false },
        ...state.notifications,
      ].slice(0, 20),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearAll: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
