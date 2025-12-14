import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Truck, Clock, CheckCircle, Bell } from 'lucide-react'
import { useNotificationStore } from '@/store'

// Toast notifications (bottom-right popups) - separate from the persistent notification store
let toastListeners = []

// Add toast notification (called from notifications.js)
export const addNotification = (notification) => {
  // Also save to persistent store for bell icon
  const store = useNotificationStore.getState()
  store.addNotification(notification)

  // Show toast popup
  const id = Date.now()
  const toast = { id, ...notification, createdAt: Date.now() }
  toastListeners.forEach(listener => listener({ type: 'add', toast }))
  return id
}

// Notification types with icons and colors
const NOTIFICATION_TYPES = {
  new_order: {
    icon: ShoppingCart,
    bgColor: 'bg-emerald-500',
    title: 'New Order',
  },
  status_change: {
    icon: Truck,
    bgColor: 'bg-blue-500',
    title: 'Order Update',
  },
  delivery_request: {
    icon: Truck,
    bgColor: 'bg-violet-500',
    title: 'New Delivery',
  },
  reminder: {
    icon: Clock,
    bgColor: 'bg-amber-500',
    title: 'Reminder',
  },
  completed: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-500',
    title: 'Completed',
  },
  default: {
    icon: Bell,
    bgColor: 'bg-gray-500',
    title: 'Notification',
  },
}

// Single toast item
function ToastItem({ notification, onClose, onClick }) {
  const [isExiting, setIsExiting] = useState(false)
  const config = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.default
  const Icon = config.icon

  const handleClose = (e) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => onClose(notification.id), 300)
  }

  const handleClick = () => {
    if (onClick) {
      onClick(notification)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl shadow-lg cursor-pointer
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        transform transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {notification.title || config.title}
          </p>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        {notification.orderId && (
          <p className="text-xs text-slate-400 mt-1">
            Order #{notification.orderId} - Click to view
          </p>
        )}
      </div>
    </div>
  )
}

// Main toast container (bottom-right popup area)
export function NotificationContainer() {
  const [toasts, setToasts] = useState([])
  const navigate = useNavigate()

  // Subscribe to toast notifications
  useEffect(() => {
    const listener = (action) => {
      if (action.type === 'add') {
        setToasts(prev => {
          // Prevent duplicate toasts
          if (prev.some(t => t.id === action.toast.id)) {
            return prev
          }
          // Add new toast, limit to 5
          return [action.toast, ...prev].slice(0, 5)
        })
      }
    }

    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const handleClose = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleClick = (notification) => {
    // Mark as read in store
    const store = useNotificationStore.getState()
    store.markAsRead(notification.id)

    // Navigate to order
    if (notification.navigateTo) {
      navigate(notification.navigateTo)
    }

    // Close toast
    handleClose(notification.id)
  }

  const handleClearAll = () => {
    setToasts([])
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {/* Clear all button if more than 2 toasts */}
      {toasts.length > 2 && (
        <button
          onClick={handleClearAll}
          className="self-end px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 transition-colors"
        >
          Clear all ({toasts.length})
        </button>
      )}

      {/* Toast list */}
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          notification={toast}
          onClose={handleClose}
          onClick={handleClick}
        />
      ))}
    </div>
  )
}

export default NotificationContainer
