import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService } from '@/services'
import {
  Card,
  CardContent,
  Button,
  Badge,
  PageLoader,
} from '@/components/ui'
import { formatCurrency } from '@/utils/helpers'
import {
  MapPin,
  Package,
  Clock,
  Navigation,
  Map,
  List,
  Truck,
  Store,
  RefreshCw,
  Circle,
  ChevronRight,
  MapPinned,
  Timer,
  DollarSign,
  Hash,
} from 'lucide-react'
import toast from 'react-hot-toast'

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
        driver_id: user.wh_account_id,
        lat: location.lat,
        long: location.long,
      })

      console.log('Driver orders response:', response)

      if (response.status === 1) {
        setOrders(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      if (showLoader) toast.error('Failed to load available orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user.wh_account_id, location.lat, location.long, isOnline])

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
        driver_id: user.wh_account_id,
        status: 1,
      })

      console.log('Accept order response:', response)

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
    return <PageLoader />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Available Orders
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted">
            {isOnline ? `${orders.length} orders nearby` : 'You are offline'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Online/Offline Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-dark-border rounded-full p-0.5">
            <button
              onClick={() => !isOnline && handleToggleOnline()}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !isOnline ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Offline
            </button>
            <button
              onClick={() => isOnline || handleToggleOnline()}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isOnline ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Online
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-dark-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'map' ? 'bg-white shadow-sm text-primary-600 dark:bg-dark-card' : 'text-gray-400'
              }`}
            >
              <Map className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm text-primary-600 dark:bg-dark-card' : 'text-gray-400'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh */}
          {isOnline && (
            <button
              onClick={() => loadOrders(false)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-border"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {isOnline && orders.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
          <p className="text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
            <Circle className="h-2 w-2 fill-current animate-pulse" />
            You have {orders.length} new requests
          </p>
        </div>
      )}

      {/* Offline State */}
      {!isOnline && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-dark-text">You're Offline</h3>
            <p className="text-sm text-gray-500 mt-1">Go online to receive delivery requests</p>
            <button
              onClick={handleToggleOnline}
              className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Go Online
            </button>
          </CardContent>
        </Card>
      )}

      {/* Map View Placeholder */}
      {isOnline && viewMode === 'map' && (
        <Card>
          <CardContent className="py-16 text-center">
            <Map className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 dark:text-dark-text">Map View</h3>
            <p className="text-sm text-gray-500 mt-1">Coming soon...</p>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {isOnline && viewMode === 'list' && (
        <>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Store Image */}
                        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-dark-border overflow-hidden flex-shrink-0">
                          {order.store_img ? (
                            <img
                              src={order.store_img}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = ''
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-dark-text text-sm">
                            {order.store_name || order.shipper_name || 'Store'}
                          </h3>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {order.id}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {order.total_product} item{order.total_product > 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {order.distance || '0 Miles'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {order.time || order.minutes_to_be_delivered_on || 0} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-dark-text">
                          {formatCurrency(order.order_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="px-4 py-3 space-y-2.5 bg-gray-50/50 dark:bg-dark-bg/50">
                    {/* Pickup */}
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Circle className="w-2 h-2 text-green-600 fill-current" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">PICK UP</p>
                        <p className="text-sm text-gray-700 dark:text-dark-text truncate">
                          {driverService.formatPickupAddress(order)}
                        </p>
                      </div>
                    </div>

                    {/* Connector Line */}
                    <div className="ml-2.5 w-px h-2 bg-gray-300 dark:bg-dark-border"></div>

                    {/* Dropoff */}
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">DROP OFF</p>
                        <p className="text-sm text-gray-700 dark:text-dark-text truncate">
                          {driverService.formatDropoffAddress(order)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 flex gap-2">
                    <button
                      className="flex-1 py-2 px-3 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAcceptOrder(order)}
                      disabled={processing === order.id}
                      className="flex-1 py-2 px-3 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {processing === order.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Accept</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
                  <MapPinned className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-dark-text">No Orders Available</h3>
                <p className="text-sm text-gray-500 mt-1">New delivery requests will appear here</p>
                <p className="text-xs text-gray-400 mt-3">Auto-refreshing every 30 seconds</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default DriverOrdersPage
