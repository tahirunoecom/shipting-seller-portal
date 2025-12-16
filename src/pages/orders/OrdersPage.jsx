import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { orderService } from '@/services'
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Modal,
  ModalFooter,
  PageLoader,
} from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import {
  notifyNewOrder,
  notifyOrderStatusChange,
  trackOrdersForNotifications,
  trackOrderStatusForNotifications,
} from '@/utils/notifications'
import {
  Search,
  Eye,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
  ShoppingBag,
  User,
  Navigation,
  Car,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'

const ORDER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
]

const STATUS_COLORS = {
  Pending: 'warning',
  'Searching for Driver': 'info',
  'Driver Assigned': 'success',
  'Packed - Waiting for Driver': 'info',
  'Driver On Way to Store': 'primary',
  'Driver Picked Up': 'primary',
  'Out for Delivery': 'primary',
  'Reached Customer': 'primary',
  Accepted: 'info',
  Packed: 'info',
  Shipped: 'primary',
  'In Transit': 'primary',
  Delivered: 'success',
  Cancelled: 'danger',
}

function OrdersPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState({})

  // Auto-expand order from URL query param (from notification click)
  // Also set active tab from URL query param (from dashboard click)
  useEffect(() => {
    const expandOrderId = searchParams.get('expand')
    const tabParam = searchParams.get('tab')

    if (expandOrderId) {
      setExpandedOrders(prev => ({ ...prev, [expandOrderId]: true }))
    }

    if (tabParam && ['all', 'pending', 'accepted', 'packed', 'shipped', 'delivered'].includes(tabParam)) {
      setActiveTab(tabParam)
    }

    // Clear the query params after processing
    if (expandOrderId || tabParam) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Delivery confirmation form
  const [deliveryForm, setDeliveryForm] = useState({
    package_received_by: '',
    driver_note: '',
    visible_drunk: 'N',
    delivery_proof: null,
    customer_signature: null,
  })

  // Auto-polling interval ref
  const pollingRef = useRef(null)
  const POLLING_INTERVAL = 30000 // 30 seconds

  // Load orders (with loading spinner)
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await orderService.getShipperOrders({
        wh_account_id: user.wh_account_id,
      })
      console.log('Orders API response:', response)
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

  // Silent refresh (no loading spinner) for polling
  const silentRefresh = useCallback(async () => {
    try {
      const response = await orderService.getShipperOrders({
        wh_account_id: user.wh_account_id,
      })
      if (response.status === 1) {
        const newOrders = response.data?.orders || []

        // Track for new order notifications
        trackOrdersForNotifications(newOrders, (order) => {
          notifyNewOrder(order)
        })

        // Track for status change notifications
        trackOrderStatusForNotifications(newOrders, (order, newStatus) => {
          notifyOrderStatusChange(order, newStatus)
        })

        setOrders(newOrders)
      }
    } catch (error) {
      console.error('Silent refresh failed:', error)
    }
  }, [user.wh_account_id])

  // Check if any orders need auto-refresh (driver delivery in progress)
  const hasDriverOrdersInProgress = useCallback(() => {
    return orders.some(order => {
      if (order.delivery_type !== 'driver') return false
      if (order.delivered === 'Y' || order.cancelled === 'Y' || order.driver_delivered === 'Y') return false
      // Auto-refresh for: searching for driver, driver assigned, or any driver delivery in progress
      return true
    })
  }, [orders])

  // Initial load
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Auto-polling when there are driver orders in progress
  useEffect(() => {
    if (hasDriverOrdersInProgress()) {
      // Start polling
      pollingRef.current = setInterval(() => {
        console.log('Auto-refreshing orders (driver delivery in progress)...')
        silentRefresh()
      }, POLLING_INTERVAL)
    } else {
      // Stop polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [hasDriverOrdersInProgress, silentRefresh])

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  // Change delivery type (self/driver)
  const handleDeliveryTypeChange = async (orderId, type) => {
    try {
      setProcessing(true)
      const response = await orderService.changeDeliveryType(orderId, type)
      if (response.status === 1) {
        if (type === 'self') {
          // Self delivery: accept the order immediately
          toast.success('Self delivery selected')
          await handleUpdateStatus(orderId, 'OrderAccept')
        } else {
          // Driver: just change delivery type, don't accept - will show "Searching for Driver"
          toast.success('Searching for nearest driver...')
          loadOrders()
        }
      } else {
        toast.error(response.message || 'Failed to change delivery type')
      }
    } catch (error) {
      toast.error('Failed to change delivery type')
    } finally {
      setProcessing(false)
    }
  }

  // Update order status
  const handleUpdateStatus = async (orderId, statusType, additionalData = {}) => {
    try {
      setProcessing(true)
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
          'OrderShipped': 'Order is out for delivery!',
          'OrderDelivered': 'Order delivered successfully!',
        }
        toast.success(messages[statusType] || 'Status updated!')
        loadOrders()
        setShowOrderModal(false)
        setShowDeliveryModal(false)
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      setProcessing(true)
      const response = await orderService.cancelOrder(orderId)
      if (response.status === 1) {
        toast.success('Order cancelled!')
        loadOrders()
        setShowOrderModal(false)
      } else {
        toast.error(response.message || 'Failed to cancel order')
      }
    } catch (error) {
      toast.error('Failed to cancel order')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeliveryConfirm = async () => {
    if (!selectedOrder) return
    await handleUpdateStatus(selectedOrder.order_id, 'OrderDelivered', {
      package_received_by: deliveryForm.package_received_by,
      driver_note: deliveryForm.driver_note,
      visible_drunk: deliveryForm.visible_drunk,
      delivery_proof: deliveryForm.delivery_proof,
      customer_signature: deliveryForm.customer_signature,
    })
    setDeliveryForm({
      package_received_by: '',
      driver_note: '',
      visible_drunk: 'N',
      delivery_proof: null,
      customer_signature: null,
    })
  }

  // Get order status from flags
  const getOrderStatus = (order) => {
    if (order.cancelled === 'Y') return 'Cancelled'
    if (order.delivered === 'Y') return 'Delivered'

    // For driver delivery, show driver-specific statuses
    if (order.delivery_type === 'driver') {
      if (order.driver_delivered === 'Y') return 'Delivered'
      if (order.reached_at_customer === 'Y') return 'Reached Customer'
      if (order.on_the_way_to_the_customer === 'Y') return 'Out for Delivery'
      if (order.confirm_pickup === 'Y') return 'Driver Picked Up'
      if (order.go_to_pickup === 'Y') return 'Driver On Way to Store'
      if (order.packed === 'Y') return 'Packed - Waiting for Driver'
      if (order.driver_accepted === 'Y' || order.driver_id) return 'Driver Assigned'
      return 'Searching for Driver'
    }

    // For self delivery
    if (order.Shipped === 'Y') return 'In Transit'
    if (order.packed === 'Y') return 'Packed'
    if (order.accepted === 'Y') return 'Accepted'
    return 'Pending'
  }

  // Filter orders by tab
  const filteredOrders = orders.filter((order) => {
    const status = getOrderStatus(order)
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'pending' && status === 'Pending') ||
      (activeTab === 'accepted' && status === 'Accepted') ||
      (activeTab === 'packed' && status === 'Packed') ||
      (activeTab === 'shipped' && (status === 'In Transit' || status === 'Shipped')) ||
      (activeTab === 'delivered' && status === 'Delivered')

    const matchesSearch = !searchQuery ||
      order.order_id?.toString().includes(searchQuery) ||
      order.name?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Count orders by status
  const getStatusCounts = () => {
    const counts = { all: orders.length, pending: 0, accepted: 0, packed: 0, shipped: 0, delivered: 0 }
    orders.forEach((order) => {
      const status = getOrderStatus(order)
      if (status === 'Pending') counts.pending++
      else if (status === 'Accepted') counts.accepted++
      else if (status === 'Packed') counts.packed++
      else if (status === 'In Transit' || status === 'Shipped') counts.shipped++
      else if (status === 'Delivered') counts.delivered++
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  // Get next action buttons based on status
  const getActionButtons = (order) => {
    const status = getOrderStatus(order)
    const buttons = []
    const isDriverDelivery = order.delivery_type === 'driver'

    if (status === 'Pending') {
      // Show delivery type options
      buttons.push(
        <div key="delivery-options" className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeliveryTypeChange(order.order_id, 'self')}
            disabled={processing}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <Navigation className="h-4 w-4" />
            Self Delivery
          </Button>
          <Button
            size="sm"
            onClick={() => handleDeliveryTypeChange(order.order_id, 'driver')}
            disabled={processing}
          >
            <Car className="h-4 w-4" />
            Find Driver
          </Button>
        </div>
      )
    } else if (status === 'Searching for Driver') {
      // Waiting for driver to accept
      buttons.push(
        <span key="waiting" className="text-sm text-gray-500 italic flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Waiting for driver... (auto-refreshing)
        </span>
      )
    } else if (status === 'Driver Assigned') {
      // Driver accepted - seller can now pack the order
      buttons.push(
        <Button
          key="pack"
          size="sm"
          onClick={() => handleUpdateStatus(order.order_id, 'OrderPacked')}
          disabled={processing}
        >
          <Package className="h-4 w-4" />
          Mark Packed
        </Button>
      )
    } else if (isDriverDelivery && ['Packed - Waiting for Driver', 'Driver On Way to Store', 'Driver Picked Up', 'Out for Delivery', 'Reached Customer'].includes(status)) {
      // Driver delivery after packed - show status with auto-refresh, no action buttons
      buttons.push(
        <span key="driver-status" className="text-sm text-primary-600 font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
          {status} (auto-refreshing)
        </span>
      )
    } else if (status === 'Accepted') {
      // Self delivery - accepted, can pack
      buttons.push(
        <Button
          key="pack"
          size="sm"
          onClick={() => handleUpdateStatus(order.order_id, 'OrderPacked')}
          disabled={processing}
        >
          <Package className="h-4 w-4" />
          Mark Packed
        </Button>
      )
    } else if (status === 'Packed' && !isDriverDelivery) {
      // Self delivery - packed, can ship
      buttons.push(
        <Button
          key="ship"
          size="sm"
          onClick={() => handleUpdateStatus(order.order_id, 'OrderShipped')}
          disabled={processing}
        >
          <Truck className="h-4 w-4" />
          Out for Delivery
        </Button>
      )
    } else if (status === 'In Transit' && !isDriverDelivery) {
      // Self delivery - in transit, can mark delivered
      buttons.push(
        <Button
          key="deliver"
          size="sm"
          variant="success"
          onClick={() => {
            setSelectedOrder(order)
            setShowDeliveryModal(true)
          }}
          disabled={processing}
        >
          <CheckCircle className="h-4 w-4" />
          Mark Delivered
        </Button>
      )
    }

    return buttons
  }

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Orders</h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Manage and fulfill customer orders
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
            }`}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
              }`}>
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by Order ID or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const status = getOrderStatus(order)
            const isExpanded = expandedOrders[order.order_id]

            return (
              <Card key={order.order_id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border"
                    onClick={() => toggleOrderExpand(order.order_id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                              Order #{order.order_id}
                            </h3>
                            <Badge variant={STATUS_COLORS[status] || 'default'}>
                              {status}
                            </Badge>
                            {order.delivery_type === 'driver' && status === 'In Transit' && (
                              <Badge variant="info">Driver Assigned</Badge>
                            )}
                            {order.delivery_type === 'self' && (
                              <Badge variant="secondary">Self Delivery</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-dark-muted mt-1">
                            {order.name || 'Customer'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(order.order_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {order.total_product_quantity || order.OrderProducts?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            {formatCurrency(order.total_amount || order.order_amount)}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t dark:border-dark-border">
                      {/* Customer & Address */}
                      <div className="p-4 bg-gray-50 dark:bg-dark-bg grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Customer</h4>
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {order.name || 'Customer'}
                            </p>
                            {order.phone && (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <a href={`tel:${order.phone}`} className="text-primary-600 hover:underline">
                                  {order.phone}
                                </a>
                              </p>
                            )}
                            {order.email && (
                              <p className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                {order.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Delivery Address</h4>
                          <p className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <span>
                              {order.address}
                              {order.city && `, ${order.city}`}
                              {order.state && `, ${order.state}`}
                              {order.zip_code && ` ${order.zip_code}`}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Products */}
                      <div className="p-4">
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Order Items</h4>
                        <div className="space-y-3">
                          {(order.OrderProducts || []).map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-dark-border overflow-hidden shrink-0">
                                {item.images || item.image ? (
                                  <img
                                    src={item.images || item.image}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-dark-text truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.ai_category_name} &bull; Qty: {item.quantity}
                                </p>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-dark-text">
                                {formatCurrency(item.total_price || item.price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-4 border-t dark:border-dark-border flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {/* Cancel button only visible before choosing delivery type (Pending status) */}
                          {status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelOrder(order.order_id)
                              }}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {getActionButtons(order)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-dark-muted dark:hover:bg-dark-border'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              No orders found
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Orders will appear here when customers place them'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delivery Confirmation Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title="Confirm Delivery"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-dark-muted">
            Please fill in delivery confirmation details for Order #{selectedOrder?.order_id}
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

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeliveryModal(false)}>
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

export default OrdersPage
