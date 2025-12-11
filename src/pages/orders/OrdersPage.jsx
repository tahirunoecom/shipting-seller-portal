import { useState, useEffect } from 'react'
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
  Search,
  Filter,
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
} from 'lucide-react'
import toast from 'react-hot-toast'

const ORDER_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS = {
  Pending: 'warning',
  Accepted: 'info',
  Packed: 'info',
  Shipped: 'info',
  'In Transit': 'info',
  Delivered: 'success',
  Cancelled: 'danger',
}

function OrdersPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [activeTab])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getShipperOrders(user.wh_account_id, {
        status: activeTab === 'all' ? undefined : activeTab,
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
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  const handleAcceptOrder = async (orderId) => {
    try {
      setProcessing(true)
      const response = await orderService.acceptOrder(orderId, user.wh_account_id)
      if (response.status === 1) {
        toast.success('Order accepted!')
        loadOrders()
        setShowOrderModal(false)
      } else {
        toast.error(response.message || 'Failed to accept order')
      }
    } catch (error) {
      toast.error('Failed to accept order')
    } finally {
      setProcessing(false)
    }
  }

  const handlePackOrder = async (orderId) => {
    try {
      setProcessing(true)
      const response = await orderService.packOrder(orderId, user.wh_account_id)
      if (response.status === 1) {
        toast.success('Order marked as packed!')
        loadOrders()
        setShowOrderModal(false)
      } else {
        toast.error(response.message || 'Failed to update order')
      }
    } catch (error) {
      toast.error('Failed to update order')
    } finally {
      setProcessing(false)
    }
  }

  const handleShipOrder = async (orderId) => {
    try {
      setProcessing(true)
      const response = await orderService.shipOrder(orderId, user.wh_account_id)
      if (response.status === 1) {
        toast.success('Order shipped!')
        loadOrders()
        setShowOrderModal(false)
      } else {
        toast.error(response.message || 'Failed to ship order')
      }
    } catch (error) {
      toast.error('Failed to ship order')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      setProcessing(true)
      const response = await orderService.cancelOrder(orderId, user.wh_account_id)
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id?.toString().includes(searchQuery) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getStatusCounts = () => {
    const counts = {
      all: orders.length,
      pending: 0,
      accepted: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    orders.forEach((order) => {
      const status = order.status?.toLowerCase()
      if (counts.hasOwnProperty(status)) {
        counts[status]++
      }
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Orders</h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Manage and track your customer orders
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {statusCounts[tab.key] > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by order ID or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                          Order #{order.id}
                        </h3>
                        <Badge variant={STATUS_COLORS[order.status] || 'default'}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
                        {order.customer_name || 'Customer'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(order.date_added)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {order.items_count || 1} items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.payment_status || 'Paid'}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => handleViewOrder(order)}>
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

      {/* Order Detail Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={`Order #${selectedOrder?.id}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge
                variant={STATUS_COLORS[selectedOrder.status] || 'default'}
                className="text-sm px-3 py-1"
              >
                {selectedOrder.status}
              </Badge>
              <span className="text-sm text-gray-500">
                {formatDateTime(selectedOrder.date_added)}
              </span>
            </div>

            {/* Customer Info */}
            <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
              <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">
                Customer Information
              </h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                  <span className="font-medium text-gray-900 dark:text-dark-text">
                    {selectedOrder.customer_name || 'Customer'}
                  </span>
                </p>
                {selectedOrder.customer_email && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Mail className="h-4 w-4" />
                    {selectedOrder.customer_email}
                  </p>
                )}
                {selectedOrder.customer_phone && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Phone className="h-4 w-4" />
                    {selectedOrder.customer_phone}
                  </p>
                )}
                {selectedOrder.shipping_address && (
                  <p className="flex items-start gap-2 text-gray-600 dark:text-dark-muted">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    {selectedOrder.shipping_address}
                  </p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">
                Order Items
              </h4>
              <div className="border rounded-lg divide-y dark:border-dark-border dark:divide-dark-border">
                {(selectedOrder.items || []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-text">
                          {item.name || item.title}
                        </p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Total */}
            <div className="border-t pt-4 dark:border-dark-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
              {selectedOrder.delivery_fee > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <ModalFooter>
              {selectedOrder.status === 'Pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleAcceptOrder(selectedOrder.id)}
                    disabled={processing}
                    isLoading={processing}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept Order
                  </Button>
                </>
              )}
              {selectedOrder.status === 'Accepted' && (
                <Button
                  onClick={() => handlePackOrder(selectedOrder.id)}
                  disabled={processing}
                  isLoading={processing}
                >
                  <Package className="h-4 w-4" />
                  Mark as Packed
                </Button>
              )}
              {selectedOrder.status === 'Packed' && (
                <Button
                  onClick={() => handleShipOrder(selectedOrder.id)}
                  disabled={processing}
                  isLoading={processing}
                >
                  <Truck className="h-4 w-4" />
                  Ship Order
                </Button>
              )}
              {['Delivered', 'Cancelled'].includes(selectedOrder.status) && (
                <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OrdersPage
