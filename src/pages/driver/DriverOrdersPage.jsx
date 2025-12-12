import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService } from '@/services'
import { formatCurrency } from '@/utils/helpers'
import {
  MapPin,
  Package,
  Navigation,
  Map,
  List,
  Truck,
  RefreshCw,
  ChevronRight,
  Timer,
  Zap,
  Power,
  PowerOff,
  ArrowRight,
  Route,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Reusable Order Card Component
function OrderCard({ order, onAccept, processing }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group relative">
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300" />

      <div className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-violet-500/10">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

        {/* Card Content */}
        <div className="p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Store Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
                  {order.store_img && !imgError ? (
                    <img
                      src={order.store_img}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <Truck className="w-6 h-6 text-violet-500" />
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-800" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {order.store_name || order.shipper_name || 'Pickup Point'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Order #{order.id}
                </p>
              </div>
            </div>

            {/* Price Badge */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 px-4 py-2 rounded-xl">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(order.order_amount || order.total_amount)}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Package className="w-4 h-4" />
              <span className="text-sm">{order.total_product || 1} items</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Route className="w-4 h-4" />
              <span className="text-sm">{order.distance || '2.5 mi'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Timer className="w-4 h-4" />
              <span className="text-sm">{order.time || order.minutes_to_be_delivered_on || 15} min</span>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-900/50" />
                <div className="w-0.5 h-12 bg-gradient-to-b from-violet-500 to-indigo-500 my-1" />
                <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/50" />
              </div>

              {/* Addresses */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Pickup</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                    {driverService.formatPickupAddress(order) || 'Store Location'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Dropoff</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                    {driverService.formatDropoffAddress(order) || 'Customer Location'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onAccept(order)}
            disabled={processing === order.id}
            className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {processing === order.id ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Accept Order
                  <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </span>
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DriverOrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [isOnline, setIsOnline] = useState(true)
  const [viewMode, setViewMode] = useState('list')
  const [processing, setProcessing] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [location, setLocation] = useState({ lat: '', long: '' })

  const pollingRef = useRef(null)
  const POLLING_INTERVAL = 30000

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude.toString(),
            long: position.coords.longitude.toString(),
          })
        },
        (error) => console.error('Error getting location:', error)
      )
    }
  }, [])

  const loadOrders = useCallback(async (showLoader = true) => {
    if (!isOnline) return

    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)

      const response = await driverService.getDriverOrders({
        driver_id: user.id,
        lat: location.lat,
        long: location.long,
      })

      if (response.status === 1 || response.status === 0) {
        setOrders(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      if (showLoader) toast.error('Failed to load available orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user.id, location.lat, location.long, isOnline])

  useEffect(() => {
    if (isOnline) loadOrders()
  }, [loadOrders, isOnline])

  useEffect(() => {
    if (isOnline) {
      pollingRef.current = setInterval(() => loadOrders(false), POLLING_INTERVAL)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isOnline, loadOrders])

  const handleAcceptOrder = async (order) => {
    try {
      setProcessing(order.id)
      const response = await driverService.changeDriverOrderStatus({
        order_id: order.id,
        driver_id: user.id,
        user_id: user.id,
        status: 1,
      })

      if (response.status === 1 || response.code === 200 || response.status === 0) {
        toast.success('Order accepted!')
        navigate(`/driver/order/${order.id}`)
      } else {
        toast.error(response.message || 'Failed to accept order')
        loadOrders(false)
      }
    } catch (error) {
      console.error('Failed to accept order:', error)
      toast.error('Failed to accept order')
    } finally {
      setProcessing(null)
    }
  }

  const handleToggleOnline = () => {
    setIsOnline(!isOnline)
    if (!isOnline) loadOrders()
    else setOrders([])
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse mx-auto" />
            <Truck className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" />
            Available Orders
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isOnline ? `${orders.length} delivery requests nearby` : 'You are currently offline'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Status Toggle */}
          <button
            onClick={handleToggleOnline}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              isOnline
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isOnline ? (
              <>
                <Power className="w-4 h-4" />
                <span>Online</span>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
              </>
            ) : (
              <>
                <PowerOff className="w-4 h-4" />
                <span>Offline</span>
              </>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          {isOnline && (
            <button
              onClick={() => loadOrders(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <PowerOff className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">You're Offline</h3>
            <p className="text-slate-400 mb-6">Go online to start receiving delivery requests</p>
            <button
              onClick={handleToggleOnline}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Power className="w-5 h-5" />
              Go Online
            </button>
          </div>
        </div>
      )}

      {/* Map View Placeholder */}
      {isOnline && viewMode === 'map' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-12 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-700 shadow-lg flex items-center justify-center mx-auto mb-4">
              <Map className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Map View</h3>
            <p className="text-slate-500 dark:text-slate-400">Coming soon...</p>
          </div>
        </div>
      )}

      {/* Orders List */}
      {isOnline && viewMode === 'list' && (
        <>
          {/* Active orders banner */}
          {orders.length > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3">
              <div className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-violet-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                {orders.length} new delivery {orders.length === 1 ? 'request' : 'requests'} available
              </p>
            </div>
          )}

          {orders.length > 0 ? (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAcceptOrder}
                  processing={processing}
                />
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-12 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center mx-auto mb-6">
                  <Navigation className="w-12 h-12 text-slate-300 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Orders Yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-2">
                  New delivery requests will appear here
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Auto-refreshing every 30 seconds
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DriverOrdersPage
