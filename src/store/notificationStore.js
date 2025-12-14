import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      // All notifications (for bell icon panel)
      notifications: [],

      // Unread count
      unreadCount: 0,

      // Add a new notification
      addNotification: (notification) => {
        const id = Date.now()
        const newNotification = {
          id,
          ...notification,
          read: false,
          createdAt: Date.now(),
        }

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
          unreadCount: state.unreadCount + 1,
        }))

        return id
      },

      // Mark notification as read
      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id)
          if (notification && !notification.read) {
            return {
              notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }
          }
          return state
        })
      },

      // Mark all as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      },

      // Remove notification
      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id)
          const wasUnread = notification && !notification.read
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          }
        })
      },

      // Clear all notifications
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 })
      },
    }),
    {
      name: 'notification-storage',
    }
  )
)
