import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService, DRIVER_STATUS_LABELS } from '@/services'
import {
  Card,
  CardContent,
  Button,
  Badge,
  PageLoader,
} from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import {
  MapPin,
  Package,
  Clock,
  Navigation,
  Store,
  CheckCircle,
  Truck,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Status badge colors
const STATUS_COLORS = {
  1: 'info',      // Accepted
  2: 'info',      // Going to pickup
  3: 'primary',   // Pickup confirmed
  4: 'info',      // Reached store
  5: 'primary',   // On the way
  6: 'warning',   // Reached customer
  7: 'success',   // Delivered
}

function DriverDeliveriesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'completed'

  // Show completion toast if coming from completed delivery
  useEffect(() => {
    if (location.state?.completed) {
      toast.success(`Delivery #${location.state.completed.id} completed!`)
      // Clear the state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.wh_account_id,
        status: 0, // Get all
      })

      if (response.status === 1) {
        setOrders(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('Failed to load deliveries')
    } finally {
      setLoading(false)
    }
  }, [user.wh_account_id])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Get status code from order
  const getStatusCode = (order) => {
    const status = order.driver_order_status
    if (typeof status === 'object') {
      return status.driver_order_status || 0
    }
    return status || 0
  }

  // Filter orders by tab
  const filteredOrders = orders.filter(order => {
    const statusCode = getStatusCode(order)
    if (activeTab === 'active') {
      return statusCode > 0 && statusCode < 7
    }
    return statusCode === 7
  })

  // Get status label
  const getStatusLabel = (order) => {
    const statusCode = getStatusCode(order)
    return DRIVER_STATUS_LABELS[statusCode] || 'Unknown'
  }

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          My Deliveries
        </h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Track your active and completed deliveries
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
          }`}
        >
          Active
          {orders.filter(o => getStatusCode(o) > 0 && getStatusCode(o) < 7).length > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'active' ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
            }`}>
              {orders.filter(o => getStatusCode(o) > 0 && getStatusCode(o) < 7).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
          }`}
        >
          Completed
          {orders.filter(o => getStatusCode(o) === 7).length > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'completed' ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
            }`}>
              {orders.filter(o => getStatusCode(o) === 7).length}
            </span>
          )}
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusCode = getStatusCode(order)
            const isCompleted = statusCode === 7

            return (
              <Card
                key={order.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/driver/order/${order.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Store Image */}
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-dark-border overflow-hidden shrink-0">
                        {order.store_img ? (
                          <img
                            src={order.store_img}
                            alt={order.store_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Store className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                            #{order.id}
                          </h3>
                          <Badge variant={STATUS_COLORS[statusCode] || 'default'}>
                            {getStatusLabel(order)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-muted">
                          {order.store_name || order.shipper_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {order.total_product} items
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(order.order_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary-600">
                        {formatCurrency(order.order_amount)}
                      </p>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Quick Address Info */}
                  <div className="mt-3 pt-3 border-t dark:border-dark-border grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 uppercase">From</p>
                      <p className="text-gray-900 dark:text-dark-text truncate">
                        {order.pickup?.store_city || order.pickup?.city || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase">To</p>
                      <p className="text-gray-900 dark:text-dark-text truncate">
                        {order.drop_off?.city || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Continue Button for Active Orders */}
                  {!isCompleted && (
                    <Button
                      className="w-full mt-3 bg-[#c8e651] hover:bg-[#b8d641] text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/driver/order/${order.id}`)
                      }}
                    >
                      Continue Delivery
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            {activeTab === 'active' ? (
              <>
                <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                  No Active Deliveries
                </h3>
                <p className="text-gray-500 dark:text-dark-muted mt-1">
                  Accept orders to start delivering
                </p>
                <Button onClick={() => navigate('/driver/orders')} className="mt-4">
                  View Available Orders
                </Button>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                  No Completed Deliveries
                </h3>
                <p className="text-gray-500 dark:text-dark-muted mt-1">
                  Your completed deliveries will appear here
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DriverDeliveriesPage
