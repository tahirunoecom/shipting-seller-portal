import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { orderService } from '@/services'
import { Card, CardContent, Button, Badge, Modal, ModalFooter, Input, PageLoader } from '@/components/ui'
import { formatCurrency, formatDateTime, formatDate } from '@/utils/helpers'
import {
  Settings2,
  Search,
  RefreshCw,
  Calendar,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Camera,
  Car,
  AlertCircle,
  PenTool,
} from 'lucide-react'
import toast from 'react-hot-toast'

// CSS for highlight animation (injected inline)
const highlightStyles = `
@keyframes orderMoved {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(34, 197, 94, 0.3);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    transform: scale(1);
  }
}
.order-just-moved {
  animation: orderMoved 1.5s ease-out;
  border-color: rgb(34, 197, 94) !important;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%) !important;
}
`

// Default columns configuration
const DEFAULT_COLUMNS = [
  { id: 'pending', label: 'Pending', color: 'bg-yellow-500', visible: true },
  { id: 'accepted', label: 'Accepted', color: 'bg-blue-500', visible: true },
  { id: 'packed', label: 'Packed', color: 'bg-indigo-500', visible: true },
  { id: 'in_transit', label: 'In Transit', color: 'bg-purple-500', visible: true },
  { id: 'delivered', label: 'Delivered', color: 'bg-green-500', visible: true },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500', visible: false },
]

// Status mapping for API updates
const STATUS_TRANSITIONS = {
  'pending_to_accepted': 'OrderAccept',
  'accepted_to_packed': 'OrderPacked',
  'packed_to_in_transit': 'OrderShipped',
  'in_transit_to_delivered': 'OrderDelivered',
}

function OrderFulfillmentBoardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('fulfillment_columns')
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS
  })
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return {
      start: weekAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    }
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [draggedOrder, setDraggedOrder] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [expandedCards, setExpandedCards] = useState({})
  const [recentlyMovedOrders, setRecentlyMovedOrders] = useState(new Set())

  // Delivery confirmation
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [pendingDelivery, setPendingDelivery] = useState(null)
  const [deliveryForm, setDeliveryForm] = useState({
    package_received_by: '',
    driver_note: '',
    delivery_proof: null,
    customer_signature: null,
  })

  // Auto-refresh
  const pollingRef = useRef(null)
  const POLLING_INTERVAL = 30000

  // Load orders
  const loadOrders = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      const response = await orderService.getShipperOrders({
        wh_account_id: user.wh_account_id,
      })
      if (response.status === 1) {
        setOrders(response.data?.orders || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [user.wh_account_id])

  // Initial load
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Auto-polling for driver orders
  useEffect(() => {
    const hasActiveDriverOrders = orders.some(order =>
      order.delivery_type === 'driver' &&
      order.delivered !== 'Y' &&
      order.cancelled !== 'Y'
    )

    if (hasActiveDriverOrders) {
      pollingRef.current = setInterval(() => {
        loadOrders(false)
      }, POLLING_INTERVAL)
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [orders, loadOrders])

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem('fulfillment_columns', JSON.stringify(columns))
  }, [columns])

  // Get order status
  const getOrderStatus = (order) => {
    if (order.cancelled === 'Y') return 'cancelled'
    if (order.delivered === 'Y' || order.driver_delivered === 'Y') return 'delivered'

    // Driver delivery statuses map to our columns
    if (order.delivery_type === 'driver') {
      if (order.on_the_way_to_the_customer === 'Y' || order.reached_at_customer === 'Y' || order.confirm_pickup === 'Y' || order.go_to_pickup === 'Y') return 'in_transit'
      if (order.packed === 'Y') return 'packed'
      if (order.driver_accepted === 'Y' || order.driver_id) return 'accepted'
      return 'pending'
    }

    // Self delivery
    if (order.Shipped === 'Y') return 'in_transit'
    if (order.packed === 'Y') return 'packed'
    if (order.accepted === 'Y') return 'accepted'
    return 'pending'
  }

  // Get detailed driver status for display
  const getDriverStatusLabel = (order) => {
    if (order.delivery_type !== 'driver') return null
    if (order.driver_delivered === 'Y') return 'Delivered by Driver'
    if (order.reached_at_customer === 'Y') return 'Driver at Customer'
    if (order.on_the_way_to_the_customer === 'Y') return 'Driver En Route'
    if (order.confirm_pickup === 'Y') return 'Driver Picked Up'
    if (order.go_to_pickup === 'Y') return 'Driver Going to Store'
    if (order.packed === 'Y') return 'Waiting for Driver'
    if (order.driver_accepted === 'Y' || order.driver_id) return 'Driver Assigned'
    return 'Searching for Driver'
  }

  // Check if order can be dragged (self-delivery only)
  const canDragOrder = (order) => {
    if (order.delivery_type === 'driver') return false
    if (order.cancelled === 'Y') return false
    if (order.delivered === 'Y') return false
    // Pending orders without delivery type set can't be dragged
    if (!order.delivery_type && order.accepted !== 'Y') return false
    return true
  }

  // Check if drop is valid
  const canDropToColumn = (order, targetColumn) => {
    if (!canDragOrder(order)) return false
    const currentStatus = getOrderStatus(order)

    // Define valid transitions
    const validTransitions = {
      'pending': ['accepted'],
      'accepted': ['packed'],
      'packed': ['in_transit'],
      'in_transit': ['delivered'],
    }

    return validTransitions[currentStatus]?.includes(targetColumn) || false
  }

  // Handle drag start
  const handleDragStart = (e, order) => {
    if (!canDragOrder(order)) {
      e.preventDefault()
      return
    }
    setDraggedOrder(order)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', order.order_id)
  }

  // Handle drag over
  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    if (draggedOrder && canDropToColumn(draggedOrder, columnId)) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverColumn(columnId)
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  // Handle drop
  const handleDrop = async (e, targetColumn) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedOrder || !canDropToColumn(draggedOrder, targetColumn)) {
      setDraggedOrder(null)
      return
    }

    const currentStatus = getOrderStatus(draggedOrder)
    const transitionKey = `${currentStatus}_to_${targetColumn}`
    const statusType = STATUS_TRANSITIONS[transitionKey]

    if (!statusType) {
      toast.error('Invalid status transition')
      setDraggedOrder(null)
      return
    }

    // For delivery, show confirmation modal
    if (targetColumn === 'delivered') {
      setPendingDelivery({ order: draggedOrder, statusType })
      setShowDeliveryModal(true)
      setDraggedOrder(null)
      return
    }

    // Update status
    await updateOrderStatus(draggedOrder.order_id, statusType)
    setDraggedOrder(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedOrder(null)
    setDragOverColumn(null)
  }

  // Mark order as recently moved (with auto-clear)
  const markOrderAsMoved = (orderId) => {
    setRecentlyMovedOrders(prev => new Set([...prev, orderId]))
    // Clear after animation completes
    setTimeout(() => {
      setRecentlyMovedOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }, 3000)
  }

  // Update order status
  const updateOrderStatus = async (orderId, statusType, additionalData = {}) => {
    try {
      setProcessing(true)

      // For pending orders moving to accepted, we need to set delivery type first
      if (statusType === 'OrderAccept') {
        const order = orders.find(o => o.order_id === orderId)
        if (!order.delivery_type) {
          await orderService.changeDeliveryType(orderId, 'self')
        }
      }

      const response = await orderService.updateOrderStatus({
        wh_account_id: user.wh_account_id,
        order_id: orderId,
        status: 'Y',
        status_type: statusType,
        ...additionalData,
      })

      if (response.status === 1) {
        const messages = {
          'OrderAccept': 'Order accepted!',
          'OrderPacked': 'Order packed!',
          'OrderShipped': 'Order out for delivery!',
          'OrderDelivered': 'Order delivered!',
        }
        toast.success(messages[statusType] || 'Status updated!')
        // Mark order as recently moved for visual feedback
        markOrderAsMoved(orderId)
        loadOrders(false)
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setProcessing(false)
    }
  }

  // Handle delivery confirmation
  const handleDeliveryConfirm = async () => {
    if (!pendingDelivery) return

    // Signature is required by the API
    if (!deliveryForm.customer_signature) {
      toast.error('Customer signature is required')
      return
    }

    await updateOrderStatus(pendingDelivery.order.order_id, pendingDelivery.statusType, {
      package_received_by: deliveryForm.package_received_by,
      driver_note: deliveryForm.driver_note,
      delivery_proof: deliveryForm.delivery_proof,
      customer_signature: deliveryForm.customer_signature,
    })

    setShowDeliveryModal(false)
    setPendingDelivery(null)
    setDeliveryForm({ package_received_by: '', driver_note: '', delivery_proof: null, customer_signature: null })
  }

  // Quick action to set delivery type and accept
  const handleQuickAccept = async (order, deliveryType) => {
    try {
      setProcessing(true)
      await orderService.changeDeliveryType(order.order_id, deliveryType)

      if (deliveryType === 'self') {
        await updateOrderStatus(order.order_id, 'OrderAccept')
      } else {
        toast.success('Searching for driver...')
        markOrderAsMoved(order.order_id)
        loadOrders(false)
      }
    } catch (error) {
      toast.error('Failed to process order')
    } finally {
      setProcessing(false)
    }
  }

  // Filter orders by date and search
  const filterOrders = (columnOrders) => {
    return columnOrders.filter(order => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          order.order_id?.toString().includes(query) ||
          order.name?.toLowerCase().includes(query) ||
          order.phone?.includes(query)
        if (!matchesSearch) return false
      }

      // Date filter - for delivered orders, only show from date range
      // For non-delivered, show all
      const orderDate = new Date(order.order_date)
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)

      if (getOrderStatus(order) === 'delivered') {
        return orderDate >= startDate && orderDate <= endDate
      }

      return true
    })
  }

  // Group orders by status
  const getOrdersByColumn = () => {
    const grouped = {}
    columns.forEach(col => {
      grouped[col.id] = filterOrders(orders.filter(order => getOrderStatus(order) === col.id))
    })
    return grouped
  }

  const ordersByColumn = getOrdersByColumn()
  const visibleColumns = columns.filter(col => col.visible)

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ))
  }

  // Toggle card expansion
  const toggleCardExpand = (orderId) => {
    setExpandedCards(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Inject highlight animation styles */}
      <style>{highlightStyles}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Order Fulfillment Board
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">
            Drag and drop orders to update their status
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(true)}
          >
            <Settings2 className="h-4 w-4" />
            Customize Columns
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-dark-card dark:border-dark-border dark:text-dark-text w-40 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Date Range */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="h-4 w-4" />
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </Button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 p-4 bg-white dark:bg-dark-card rounded-lg shadow-lg border dark:border-dark-border z-50">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-dark-muted">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-dark-bg dark:border-dark-border dark:text-dark-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-dark-muted">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-dark-bg dark:border-dark-border dark:text-dark-text text-sm"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setShowDatePicker(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-h-[600px]" style={{ minWidth: `${visibleColumns.length * 300}px` }}>
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className={`flex-1 min-w-[280px] max-w-[350px] flex flex-col rounded-xl bg-gray-100 dark:bg-dark-bg transition-colors ${
                dragOverColumn === column.id && canDropToColumn(draggedOrder, column.id)
                  ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-card'
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                    {column.label}
                  </h3>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-dark-border rounded-full text-gray-600 dark:text-dark-muted">
                  {ordersByColumn[column.id]?.length || 0}
                </span>
              </div>

              {/* Drop Zone */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {/* Drop hint */}
                {ordersByColumn[column.id]?.length === 0 && (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg">
                    <p className="text-sm text-gray-400 dark:text-dark-muted">
                      Drop orders here
                    </p>
                  </div>
                )}

                {/* Order Cards */}
                {ordersByColumn[column.id]?.map((order) => {
                  const isDraggable = canDragOrder(order)
                  const isDriverOrder = order.delivery_type === 'driver'
                  const driverStatus = getDriverStatusLabel(order)
                  const isExpanded = expandedCards[order.order_id]
                  const isPending = getOrderStatus(order) === 'pending' && !order.delivery_type
                  const isRecentlyMoved = recentlyMovedOrders.has(order.order_id)

                  return (
                    <div
                      key={order.order_id}
                      draggable={isDraggable}
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-dark-card rounded-lg shadow-sm border dark:border-dark-border overflow-hidden transition-all ${
                        isDraggable
                          ? 'cursor-grab active:cursor-grabbing hover:shadow-md'
                          : 'cursor-default'
                      } ${
                        draggedOrder?.order_id === order.order_id ? 'opacity-50' : ''
                      } ${
                        isRecentlyMoved ? 'order-just-moved' : ''
                      }`}
                    >
                      {/* Card Header */}
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => toggleCardExpand(order.order_id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {isDraggable && (
                              <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-dark-text">
                                #{order.order_id}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-dark-muted truncate">
                                {order.name || 'Customer'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isDriverOrder && (
                              <Badge variant="info" className="text-xs">
                                <Car className="h-3 w-3 mr-1" />
                                Driver
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Basic Info */}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(order.order_date)}
                          </span>
                          <span className="font-semibold text-primary-600">
                            {formatCurrency(order.total_amount || order.order_amount)}
                          </span>
                        </div>

                        {/* Driver Status */}
                        {isDriverOrder && driverStatus && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            {driverStatus}
                          </div>
                        )}

                        {/* Pending - Choose Delivery Type */}
                        {isPending && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAccept(order, 'self')
                              }}
                              disabled={processing}
                            >
                              Self
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAccept(order, 'driver')
                              }}
                              disabled={processing}
                            >
                              Find Driver
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t dark:border-dark-border p-3 space-y-3 bg-gray-50 dark:bg-dark-bg">
                          {/* Customer Info */}
                          <div className="space-y-1 text-xs">
                            {order.phone && (
                              <p className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                                <Phone className="h-3 w-3" />
                                <a href={`tel:${order.phone}`} className="text-primary-600 hover:underline">
                                  {order.phone}
                                </a>
                              </p>
                            )}
                            <p className="flex items-start gap-2 text-gray-600 dark:text-dark-muted">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                {order.address}
                                {order.city && `, ${order.city}`}
                                {order.zip_code && ` ${order.zip_code}`}
                              </span>
                            </p>
                          </div>

                          {/* Items */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-1">
                              Items ({order.total_product_quantity || order.OrderProducts?.length || 0})
                            </p>
                            <div className="space-y-1">
                              {(order.OrderProducts || []).slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 dark:text-dark-text truncate flex-1">
                                    {item.quantity}x {item.title}
                                  </span>
                                  <span className="text-gray-500 dark:text-dark-muted ml-2">
                                    {formatCurrency(item.total_price || item.price)}
                                  </span>
                                </div>
                              ))}
                              {(order.OrderProducts?.length || 0) > 3 && (
                                <p className="text-xs text-gray-400">
                                  +{order.OrderProducts.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Driver order notice */}
                          {isDriverOrder && !['delivered', 'cancelled'].includes(getOrderStatus(order)) && (
                            <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>Driver is handling this delivery. Status updates automatically.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Settings Modal */}
      <Modal
        isOpen={showColumnSettings}
        onClose={() => setShowColumnSettings(false)}
        title="Customize Columns"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-dark-muted">
            Choose which columns to display on the board.
          </p>
          {columns.map((column) => (
            <label
              key={column.id}
              className="flex items-center justify-between p-3 rounded-lg border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <span className="font-medium text-gray-900 dark:text-dark-text">
                  {column.label}
                </span>
              </div>
              <input
                type="checkbox"
                checked={column.visible}
                onChange={() => toggleColumnVisibility(column.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          ))}
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setColumns(DEFAULT_COLUMNS)
              localStorage.removeItem('fulfillment_columns')
            }}
          >
            Reset to Default
          </Button>
          <Button onClick={() => setShowColumnSettings(false)}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delivery Confirmation Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => {
          setShowDeliveryModal(false)
          setPendingDelivery(null)
        }}
        title="Confirm Delivery"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-dark-muted">
            Please fill in delivery confirmation details for Order #{pendingDelivery?.order?.order_id}
          </p>

          <div>
            <label className="label">Received By</label>
            <Input
              placeholder="Name of person who received the order"
              value={deliveryForm.package_received_by}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, package_received_by: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Delivery Note (Optional)</label>
            <Input
              placeholder="Any notes about the delivery"
              value={deliveryForm.driver_note}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_note: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Delivery Proof (Optional)</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border">
                <Camera className="h-4 w-4" />
                <span className="text-sm">Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, delivery_proof: e.target.files[0] }))}
                />
              </label>
              {deliveryForm.delivery_proof && (
                <span className="text-sm text-green-600">Photo selected</span>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              Customer Signature <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-dark-muted mb-2">
              Upload an image of the customer's signature
            </p>
            <div className="flex items-center gap-4">
              <label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border ${!deliveryForm.customer_signature ? 'border-red-300' : 'border-green-500'}`}>
                <PenTool className="h-4 w-4" />
                <span className="text-sm">Upload Signature</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, customer_signature: e.target.files[0] }))}
                />
              </label>
              {deliveryForm.customer_signature && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Signature uploaded
                </span>
              )}
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeliveryModal(false)
                setPendingDelivery(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeliveryConfirm}
              disabled={processing}
              isLoading={processing}
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Delivery
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}

export default OrderFulfillmentBoardPage
