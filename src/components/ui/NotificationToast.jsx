import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Truck, Clock, CheckCircle, Bell } from 'lucide-react'

// Global notification state
let notificationListeners = []
let notificationId = 0

// Add notification function (can be called from anywhere)
export const addNotification = (notification) => {
  const id = ++notificationId
  const newNotification = {
    id,
    ...notification,
    createdAt: Date.now(),
  }
  notificationListeners.forEach(listener => listener(newNotification))
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

// Single notification item
function NotificationItem({ notification, onClose, onClick }) {
  const [isExiting, setIsExiting] = useState(false)
  const config = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.default
  const Icon = config.icon

  const handleClose = (e) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => onClose(notification.id), 300)
  }

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick()
    }
    if (onClick) {
      onClick(notification)
    }
    handleClose({ stopPropagation: () => {} })
  }

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(notification.id), 300)
    }, 8000)
    return () => clearTimeout(timer)
  }, [notification.id, onClose])

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-start gap-3 p-4 mb-3 rounded-xl shadow-lg cursor-pointer
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
            Order #{notification.orderId} • Click to view
          </p>
        )}
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${config.bgColor} animate-shrink`}
          style={{ animation: 'shrink 8s linear forwards' }}
        />
      </div>
    </div>
  )
}

// Main notification container
export function NotificationContainer() {
  const [notifications, setNotifications] = useState([])
  const navigate = useNavigate()

  // Subscribe to notifications
  useEffect(() => {
    const listener = (notification) => {
      setNotifications(prev => {
        // Limit to 5 notifications max
        const updated = [notification, ...prev].slice(0, 5)
        return updated
      })
    }

    notificationListeners.push(listener)
    return () => {
      notificationListeners = notificationListeners.filter(l => l !== listener)
    }
  }, [])

  const handleClose = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const handleClick = useCallback((notification) => {
    if (notification.orderId && notification.navigateTo) {
      navigate(notification.navigateTo)
    }
  }, [navigate])

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={handleClose}
          onClick={handleClick}
        />
      ))}

      {/* Clear all button if more than 2 notifications */}
      {notifications.length > 2 && (
        <button
          onClick={() => setNotifications([])}
          className="self-end mb-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 transition-colors"
        >
          Clear all ({notifications.length})
        </button>
      )}
    </div>
  )
}

// CSS animation (add to global styles or use inline)
const style = document.createElement('style')
style.textContent = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`
if (typeof document !== 'undefined' && !document.getElementById('notification-styles')) {
  style.id = 'notification-styles'
  document.head.appendChild(style)
}

export default NotificationContainer
