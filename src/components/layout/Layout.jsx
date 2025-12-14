import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { requestNotificationPermission } from '@/utils/notifications'
import Sidebar from './Sidebar'
import Header from './Header'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, userTypes, activeMode } = useAuthStore()

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to mode selection if user has multiple roles but hasn't selected one
  const hasMultipleRoles = userTypes?.scanSell && userTypes?.localDelivery
  if (hasMultipleRoles && !activeMode) {
    return <Navigate to="/select-mode" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
