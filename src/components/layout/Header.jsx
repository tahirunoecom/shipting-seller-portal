import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useNotificationStore } from '@/store'
import { Avatar } from '@/components/ui'
import { formatDistanceToNow } from '@/utils/helpers'
import toast from 'react-hot-toast'
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  Check,
  Trash2,
} from 'lucide-react'

// Notification type icons
const NOTIFICATION_ICONS = {
  new_order: ShoppingCart,
  status_change: Truck,
  delivery_request: Truck,
  reminder: Clock,
  completed: CheckCircle,
  default: Bell,
}

const NOTIFICATION_COLORS = {
  new_order: 'bg-emerald-500',
  status_change: 'bg-blue-500',
  delivery_request: 'bg-violet-500',
  reminder: 'bg-amber-500',
  completed: 'bg-emerald-500',
  default: 'bg-gray-500',
}

function Header({ onMenuClick }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()
  const { user, userDetails, logout, activeMode } = useAuthStore()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    if (notification.navigateTo) {
      const isDriverRoute = notification.navigateTo.startsWith('/driver')
      const isSellerRoute = !isDriverRoute

      // Check if navigation matches current mode
      if (isDriverRoute && activeMode !== 'driver') {
        toast.error('Switch to Driver Mode to view this order')
        setShowNotifications(false)
        return
      }
      if (isSellerRoute && activeMode === 'driver') {
        toast.error('Switch to Seller Mode to view this order')
        setShowNotifications(false)
        return
      }

      navigate(notification.navigateTo)
    }
    setShowNotifications(false)
  }

  const fullName = user ? `${user.firstname} ${user.lastname}` : 'User'

  // Filter notifications based on current mode
  const filteredNotifications = notifications.filter(notification => {
    if (!notification.navigateTo) return true
    const isDriverNotification = notification.navigateTo.startsWith('/driver')
    if (activeMode === 'driver') return isDriverNotification
    return !isDriverNotification // Seller mode shows non-driver notifications
  })

  const filteredUnreadCount = filteredNotifications.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 dark:bg-dark-card dark:border-dark-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden dark:text-dark-muted dark:hover:bg-dark-border"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-dark-muted dark:hover:bg-dark-border"
            >
              <Bell className="h-5 w-5" />
              {filteredUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {filteredUnreadCount > 99 ? '99+' : filteredUnreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-20 animate-fade-in dark:bg-dark-card dark:border-dark-border overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                      Notifications
                    </h3>
                    <div className="flex items-center gap-2">
                      {filteredUnreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                      {filteredNotifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Clear all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification) => {
                        const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default
                        const bgColor = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.default

                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border border-b border-gray-100 dark:border-dark-border last:border-b-0 transition-colors ${
                              !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                            }`}
                          >
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-dark-text`}>
                                  {notification.title}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeNotification(notification.id)
                                  }}
                                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(notification.createdAt)}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.read && (
                              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-primary-500 rounded-full" />
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="py-12 text-center">
                        <Bell className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-dark-muted text-sm">
                          No notifications yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              <Avatar name={fullName} size="sm" src={user?.profile_img} />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                  {fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-muted">
                  {userDetails?.company || 'Seller'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in dark:bg-dark-card dark:border-dark-border">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                      {fullName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-muted truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate('/settings')
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-border"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate('/settings')
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-border"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 py-1 dark:border-dark-border">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
