import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService } from '@/services'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  ChevronRight,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  1: 'Accepted',
  2: 'Going to Pickup',
  3: 'Picked Up',
  4: 'At Store',
  5: 'On The Way',
  6: 'At Customer',
  7: 'Delivered',
}

// Order Card with state-based image handling
function DeliveryCard({ order, onClick, statusCode, isCompleted }) {
  const [imgError, setImgError] = useState(false)
  const orderAmount = order.order_amount || order.total_amount || 0

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* Hover glow */}
      <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 ${
        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-indigo-600'
      }`} />

      <div className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 group-hover:shadow-xl">
        {/* Status bar */}
        <div className={`h-1 ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
            : 'bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500'
        }`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Store Image */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
                {order.store_img && !imgError ? (
                  <img
                    src={order.store_img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Truck className="w-5 h-5 text-violet-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {order.store_name || order.shipper_name || 'Store'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Order #{order.id}
                </p>
              </div>
            </div>

            {/* Status & Price */}
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
              }`}>
                {STATUS_LABELS[statusCode] || 'Unknown'}
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(orderAmount)}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              {order.total_product || 1} items
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDateTime(order.order_date)}
            </span>
          </div>

          {/* Route Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
                {order.pickup?.store_city || order.pickup?.city || 'Pickup'}
              </span>
              <Route className="w-4 h-4 text-slate-400" />
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-indigo-500" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
                {order.drop_off?.city || 'Delivery'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Continue Button for active deliveries */}
          {!isCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="w-full mt-4 relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all group/btn"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Continue Delivery
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </span>
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
        driver_id: user.id,
        status: 0,
      })

      if (response.status === 1 || response.status === 0) {
        setOrders(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('Failed to load deliveries')
    } finally {
      setLoading(false)
    }
  }, [user.id])

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
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse mx-auto" />
            <Package className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Navigation className="w-6 h-6 text-violet-500" />
          My Deliveries
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Track your active and completed deliveries
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          Active
          {activeCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
            }`}>
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Completed
          {completedCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'completed'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              {completedCount}
            </span>
          )}
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="grid gap-4">
          {filteredOrders.map((order) => {
            const statusCode = getStatusCode(order)
            const isCompleted = statusCode === 7

            return (
              <DeliveryCard
                key={order.id}
                order={order}
                statusCode={statusCode}
                isCompleted={isCompleted}
                onClick={() => navigate(`/driver/order/${order.id}`)}
              />
            )
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-12 text-center">
          {activeTab === 'active' ? (
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center mx-auto mb-6">
                <Truck className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Deliveries</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Accept orders to start delivering</p>
              <button
                onClick={() => navigate('/driver/orders')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
              >
                <Sparkles className="w-5 h-5" />
                View Available Orders
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Completed Deliveries</h3>
              <p className="text-slate-500 dark:text-slate-400">Your completed deliveries will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DriverDeliveriesPage
