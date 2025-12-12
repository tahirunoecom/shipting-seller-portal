import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { useAuthStore } from '@/store'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  Settings,
  CreditCard,
  FileText,
  LogOut,
  Store,
  Truck,
  X,
  MapPin,
  Clock,
  Navigation,
  ArrowLeftRight,
} from 'lucide-react'

// Seller/Store Owner menu items
const sellerMenuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Catalog',
    href: '/catalog',
    icon: Store,
  },
  {
    title: 'WhatsApp Bot',
    href: '/whatsapp',
    icon: MessageSquare,
  },
  {
    title: 'Find Driver',
    href: '/drivers',
    icon: Truck,
  },
  {
    title: 'Payments',
    href: '/payments',
    icon: CreditCard,
  },
  {
    title: 'Billing',
    href: '/billing',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

// Driver menu items
const driverMenuItems = [
  {
    title: 'Available Orders',
    href: '/driver/orders',
    icon: MapPin,
  },
  {
    title: 'My Deliveries',
    href: '/driver/deliveries',
    icon: Navigation,
  },
  {
    title: 'Earnings',
    href: '/driver/earnings',
    icon: CreditCard,
  },
  {
    title: 'History',
    href: '/driver/history',
    icon: Clock,
  },
  {
    title: 'Settings',
    href: '/driver/settings',
    icon: Settings,
  },
]

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, userDetails, userTypes, activeMode, setActiveMode, user } = useAuthStore()

  // Determine if user has multiple roles
  const hasMultipleRoles = userTypes.scanSell && userTypes.localDelivery

  // Get menu items based on active mode
  const menuItems = activeMode === 'driver' ? driverMenuItems : sellerMenuItems

  // Check if a nav item should be active (handles nested routes)
  const isNavActive = (href) => {
    const currentPath = location.pathname

    // Exact match
    if (currentPath === href) return true

    // Handle driver order detail page - should highlight "My Deliveries"
    if (currentPath.startsWith('/driver/order/') && href === '/driver/deliveries') {
      return true
    }

    // For other routes, check if path starts with href (but not for root paths)
    if (href !== '/' && href.length > 1 && currentPath.startsWith(href + '/')) {
      return true
    }

    return false
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchMode = () => {
    const newMode = activeMode === 'seller' ? 'driver' : 'seller'
    setActiveMode(newMode)
    // Navigate to the appropriate home page
    if (newMode === 'driver') {
      navigate('/driver/orders')
    } else {
      navigate('/dashboard')
    }
    onClose?.()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto dark:bg-dark-card dark:border-dark-border',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <img
                src="https://stageshipper.shipting.com/provider/images/newlogo.png"
                alt="Shipting"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-gray-900 dark:text-dark-text">
                Shipting
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-dark-border"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Indicator & Store/Driver Info */}
          <div className="px-4 py-4 border-b border-gray-200 dark:border-dark-border">
            {activeMode === 'driver' ? (
              <>
                <p className="text-xs text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Driver Mode
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-dark-text truncate">
                  {user?.firstname} {user?.lastname}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Store
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-dark-text truncate">
                  {userDetails?.company || 'My Store'}
                </p>
              </>
            )}
          </div>

          {/* Mode Switcher (only for users with multiple roles) */}
          {hasMultipleRoles && (
            <div className="px-3 py-3 border-b border-gray-200 dark:border-dark-border">
              <button
                onClick={handleSwitchMode}
                className="flex items-center justify-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Switch to {activeMode === 'seller' ? 'Driver' : 'Seller'} Mode
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const active = isNavActive(item.href)
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-muted dark:hover:bg-dark-border dark:hover:text-dark-text'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
