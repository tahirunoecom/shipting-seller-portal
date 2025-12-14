import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { orderService, driverService } from '@/services'
import {
  requestNotificationPermission,
  notifyNewOrder,
  notifyOrderStatusChange,
  notifyNewDeliveryRequest,
  trackOrdersForNotifications,
  trackOrderStatusForNotifications,
  trackDriverOrdersForNotifications,
} from '@/utils/notifications'
import { NotificationContainer } from '@/components/ui/NotificationToast'
import Sidebar from './Sidebar'
import Header from './Header'

const POLLING_INTERVAL = 30000 // 30 seconds

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, userTypes, activeMode, user } = useAuthStore()
  const pollingRef = useRef(null)

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Global polling for notifications (works on ALL pages)
  const pollForNotifications = useCallback(async () => {
    if (!user) return

    try {
      // Poll based on active mode
      if (activeMode === 'driver') {
        // Driver mode - poll for new delivery requests
        const response = await driverService.getDriverOrders({
          driver_id: user.id,
        })
        if (response.status === 1) {
          const orders = response.data?.orders || []
          // Track for new delivery request notifications
          trackDriverOrdersForNotifications(orders, (order) => {
            notifyNewDeliveryRequest(order)
          })
        }
      } else {
        // Seller mode - poll for new orders and status changes
        const response = await orderService.getShipperOrders({
          wh_account_id: user.wh_account_id,
        })
        if (response.status === 1) {
          const orders = response.data?.orders || []
          // Track for new order notifications
          trackOrdersForNotifications(orders, (order) => {
            notifyNewOrder(order)
          })
          // Track for status change notifications
          trackOrderStatusForNotifications(orders, (order, newStatus) => {
            notifyOrderStatusChange(order, newStatus)
          })
        }
      }
    } catch (error) {
      console.error('Notification polling failed:', error)
    }
  }, [user, activeMode])

  // Start/stop polling based on authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initial poll
      pollForNotifications()

      // Start interval polling
      pollingRef.current = setInterval(pollForNotifications, POLLING_INTERVAL)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isAuthenticated, user, pollForNotifications])

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
    <>
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

      {/* In-app toast notifications */}
      <NotificationContainer />
    </>
  )
}

export default Layout
