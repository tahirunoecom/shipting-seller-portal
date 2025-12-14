/**
 * Browser Notification Service
 * Handles push notifications for orders and status updates
 */

// Import in-app toast notification
import { addNotification } from '@/components/ui/NotificationToast'

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window
}

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Check if notifications are enabled
export const isNotificationEnabled = () => {
  return isNotificationSupported() && Notification.permission === 'granted'
}

// Show a notification
export const showNotification = (title, options = {}) => {
  if (!isNotificationEnabled()) {
    console.log('Notifications not enabled')
    return null
  }

  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    ...options,
  }

  try {
    const notification = new Notification(title, defaultOptions)

    // Auto close after 5 seconds if not requiring interaction
    if (!defaultOptions.requireInteraction) {
      setTimeout(() => notification.close(), 5000)
    }

    // Handle click
    notification.onclick = () => {
      window.focus()
      if (options.onClick) {
        options.onClick()
      }
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Failed to show notification:', error)
    return null
  }
}

// Play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      // Autoplay might be blocked
      console.log('Could not play notification sound')
    })
  } catch (error) {
    console.log('Notification sound not available')
  }
}

// ============================================
// SELLER NOTIFICATIONS
// ============================================

export const notifyNewOrder = (order) => {
  playNotificationSound()

  // Show in-app toast notification
  addNotification({
    type: 'new_order',
    title: 'New Order Received!',
    message: `Order #${order.id} - ${order.total_product || 1} item(s) - $${order.order_amount || order.total_amount || 0}`,
    orderId: order.id,
    navigateTo: `/orders/${order.id}`,
  })

  // Show browser notification
  return showNotification('🛒 New Order Received!', {
    body: `Order #${order.id} - ${order.total_product || 1} item(s) - $${order.order_amount || order.total_amount || 0}`,
    tag: `new-order-${order.id}`,
    requireInteraction: true,
    data: { orderId: order.id, type: 'new_order' },
  })
}

export const notifyOrderStatusChange = (order, newStatus) => {
  const statusMessages = {
    1: 'Driver accepted your order',
    2: 'Driver is heading to pickup',
    3: 'Order picked up by driver',
    4: 'Driver reached your store',
    5: 'Driver is on the way to customer',
    6: 'Driver reached customer location',
    7: 'Order delivered successfully!',
  }

  const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`

  playNotificationSound()

  // Show in-app toast notification
  addNotification({
    type: newStatus === 7 ? 'completed' : 'status_change',
    title: `Order #${order.id} Update`,
    message: message,
    orderId: order.id,
    navigateTo: `/orders/${order.id}`,
  })

  // Show browser notification
  return showNotification(`📦 Order #${order.id} Update`, {
    body: message,
    tag: `order-status-${order.id}`,
    data: { orderId: order.id, type: 'status_change', status: newStatus },
  })
}

// ============================================
// DRIVER NOTIFICATIONS
// ============================================

export const notifyNewDeliveryRequest = (order) => {
  playNotificationSound()

  // Show in-app toast notification
  addNotification({
    type: 'delivery_request',
    title: 'New Delivery Request!',
    message: `${order.store_name || 'Store'} - ${order.distance || '0'} miles away`,
    orderId: order.id,
    navigateTo: `/driver/order/${order.id}`,
  })

  // Show browser notification
  return showNotification('🚗 New Delivery Request!', {
    body: `${order.store_name || 'Store'} - ${order.distance || '0'} miles away`,
    tag: `delivery-request-${order.id}`,
    requireInteraction: true,
    data: { orderId: order.id, type: 'delivery_request' },
  })
}

export const notifyDeliveryReminder = (order, minutesElapsed) => {
  playNotificationSound()

  // Show in-app toast notification
  addNotification({
    type: 'reminder',
    title: 'Delivery Reminder',
    message: `Order #${order.id} has been pending for ${minutesElapsed} minutes. Please update the status.`,
    orderId: order.id,
    navigateTo: `/driver/order/${order.id}`,
  })

  // Show browser notification
  return showNotification('⏰ Delivery Reminder', {
    body: `Order #${order.id} has been pending for ${minutesElapsed} minutes. Please update the status.`,
    tag: `delivery-reminder-${order.id}`,
    requireInteraction: true,
    data: { orderId: order.id, type: 'reminder' },
  })
}

export const notifyDeliveryCompleted = (order) => {
  // Show in-app toast notification
  addNotification({
    type: 'completed',
    title: 'Delivery Completed!',
    message: `Order #${order.id} delivered successfully. Great job!`,
    orderId: order.id,
    navigateTo: `/driver/deliveries`,
  })

  // Show browser notification
  return showNotification('✅ Delivery Completed!', {
    body: `Order #${order.id} delivered successfully. Great job!`,
    tag: `delivery-complete-${order.id}`,
    data: { orderId: order.id, type: 'completed' },
  })
}

// ============================================
// NOTIFICATION TRACKING (for detecting changes)
// ============================================

// Store previous order IDs to detect new orders
let previousOrderIds = new Set()
let previousOrderStatuses = new Map()

export const trackOrdersForNotifications = (orders, onNewOrder) => {
  const currentIds = new Set(orders.map(o => o.id))

  // Find new orders
  orders.forEach(order => {
    if (!previousOrderIds.has(order.id)) {
      onNewOrder(order)
    }
  })

  previousOrderIds = currentIds
}

export const trackOrderStatusForNotifications = (orders, onStatusChange) => {
  orders.forEach(order => {
    const orderId = order.id
    const currentStatus = typeof order.driver_order_status === 'object'
      ? order.driver_order_status?.driver_order_status
      : order.driver_order_status

    const previousStatus = previousOrderStatuses.get(orderId)

    if (previousStatus !== undefined && previousStatus !== currentStatus) {
      onStatusChange(order, currentStatus, previousStatus)
    }

    previousOrderStatuses.set(orderId, currentStatus)
  })
}

// Reset tracking (call on logout)
export const resetNotificationTracking = () => {
  previousOrderIds = new Set()
  previousOrderStatuses = new Map()
}

// ============================================
// DRIVER REMINDER SYSTEM
// ============================================

const activeReminders = new Map()

export const startDeliveryReminder = (order, onReminder, intervalMinutes = 5) => {
  const orderId = order.id

  // Clear existing reminder for this order
  stopDeliveryReminder(orderId)

  // Set up new reminder
  const intervalId = setInterval(() => {
    onReminder(order)
  }, intervalMinutes * 60 * 1000) // Convert minutes to milliseconds

  activeReminders.set(orderId, intervalId)
}

export const stopDeliveryReminder = (orderId) => {
  const intervalId = activeReminders.get(orderId)
  if (intervalId) {
    clearInterval(intervalId)
    activeReminders.delete(orderId)
  }
}

export const stopAllReminders = () => {
  activeReminders.forEach((intervalId) => {
    clearInterval(intervalId)
  })
  activeReminders.clear()
}

export default {
  isNotificationSupported,
  requestNotificationPermission,
  isNotificationEnabled,
  showNotification,
  playNotificationSound,
  notifyNewOrder,
  notifyOrderStatusChange,
  notifyNewDeliveryRequest,
  notifyDeliveryReminder,
  notifyDeliveryCompleted,
  trackOrdersForNotifications,
  trackOrderStatusForNotifications,
  resetNotificationTracking,
  startDeliveryReminder,
  stopDeliveryReminder,
  stopAllReminders,
}
