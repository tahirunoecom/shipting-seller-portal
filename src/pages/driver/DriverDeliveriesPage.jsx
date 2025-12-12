import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService, DRIVER_STATUS_LABELS } from '@/services'
import {
  Card,
  CardContent,
  Badge,
  PageLoader,
} from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import {
  Package,
  Clock,
  Store,
  CheckCircle,
  Truck,
  ChevronRight,
  Circle,
  MapPin,
  Hash,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  1: 'info',
  2: 'info',
  3: 'primary',
  4: 'info',
  5: 'primary',
  6: 'warning',
  7: 'success',
}

const STATUS_LABELS = {
  1: 'Accepted',
  2: 'Going to Pickup',
  3: 'Picked Up',
  4: 'At Store',
  5: 'On The Way',
  6: 'At Customer',
  7: 'Delivered',
}

function DriverDeliveriesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    if (location.state?.completed) {
      toast.success(`Delivery #${location.state.completed.id} completed!`)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.wh_account_id,
        status: 0,
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

  const getStatusCode = (order) => {
    const status = order.driver_order_status
    if (typeof status === 'object') {
      return status.driver_order_status || status.status || 0
    }
    return status || 0
  }

  const filteredOrders = orders.filter(order => {
    const statusCode = getStatusCode(order)
    if (activeTab === 'active') {
      return statusCode > 0 && statusCode < 7
    }
    return statusCode === 7
  })

  const activeCount = orders.filter(o => getStatusCode(o) > 0 && getStatusCode(o) < 7).length
  const completedCount = orders.filter(o => getStatusCode(o) === 7).length

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">My Deliveries</h1>
        <p className="text-sm text-gray-500 dark:text-dark-muted">Track your active and completed deliveries</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'active'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
          }`}
        >
          Active
          {activeCount > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'active' ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
            }`}>
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
          }`}
        >
          Completed
          {completedCount > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'completed' ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-bg'
            }`}>
              {completedCount}
            </span>
          )}
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusCode = getStatusCode(order)
            const isCompleted = statusCode === 7
            const orderAmount = order.order_amount || order.total_amount || 0

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/driver/order/${order.id}`)}
                className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-border overflow-hidden flex-shrink-0">
                        {order.store_img ? (
                          <img
                            src={order.store_img}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {order.id}
                          </span>
                          <Badge variant={STATUS_COLORS[statusCode] || 'default'}>
                            {STATUS_LABELS[statusCode] || 'Unknown'}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-dark-text text-sm mt-0.5">
                          {order.store_name || order.shipper_name || 'Store'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-dark-text">
                        {formatCurrency(orderAmount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {order.total_product} items
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(order.order_date)}
                    </span>
                  </div>

                  {/* Route Summary */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2 text-xs">
                      <Circle className="h-2.5 w-2.5 text-emerald-500 fill-current" />
                      <span className="text-gray-600 dark:text-dark-muted truncate flex-1">
                        {order.pickup?.store_city || order.pickup?.city || 'Pickup'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <MapPin className="h-3 w-3 text-red-500" />
                      <span className="text-gray-600 dark:text-dark-muted truncate flex-1">
                        {order.drop_off?.city || 'Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Continue Button */}
                  {!isCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/driver/order/${order.id}`)
                      }}
                      className="w-full mt-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Continue Delivery
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
          {activeTab === 'active' ? (
            <>
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
                <Truck className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-dark-text">No Active Deliveries</h3>
              <p className="text-sm text-gray-500 mt-1">Accept orders to start delivering</p>
              <button
                onClick={() => navigate('/driver/orders')}
                className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                View Available Orders
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-dark-text">No Completed Deliveries</h3>
              <p className="text-sm text-gray-500 mt-1">Your completed deliveries will appear here</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DriverDeliveriesPage
