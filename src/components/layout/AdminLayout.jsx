import { useState } from 'react'
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store'
import {
  Shield,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAdminAuthenticated, adminLogout, selectedShipper } = useAdminStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Redirect to admin login if not authenticated
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  const handleLogout = () => {
    adminLogout()
    navigate('/admin')
  }

  const navigation = [
    { name: 'All Shippers', href: '/admin/dashboard', icon: Users },
  ]

  const isActive = (href) => location.pathname === href

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Admin Panel</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${active
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center h-16 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 ml-4 lg:ml-0">
            <Link
              to="/admin/dashboard"
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
            {selectedShipper && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-white font-medium">
                  {selectedShipper.company || selectedShipper.store_name ||
                   (selectedShipper.firstname ? `${selectedShipper.firstname} ${selectedShipper.lastname || ''}`.trim() : null) ||
                   selectedShipper.name || `Shipper #${selectedShipper.wh_account_id || selectedShipper.id}`}
                </span>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin Mode</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
