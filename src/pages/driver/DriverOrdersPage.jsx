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
  Phone,
  XCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

function DriverOrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [isOnline, setIsOnline] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [processing, setProcessing] = useState(null) // order_id being processed
  const [refreshing, setRefreshing] = useState(false)

  // Location state
  const [location, setLocation] = useState({ lat: '', long: '' })

  // Auto-refresh interval
  const pollingRef = useRef(null)
  const POLLING_INTERVAL = 30000 // 30 seconds

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude.toString(),
            long: position.coords.longitude.toString(),
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Use default location if geolocation fails
        }
      )
    }
  }, [])

  // Load available orders
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

  // Initial load
  useEffect(() => {
    if (isOnline) {
      loadOrders()
    }
  }, [loadOrders, isOnline])

  // Auto-polling when online
  useEffect(() => {
    if (isOnline) {
      pollingRef.current = setInterval(() => {
        loadOrders(false)
      }, POLLING_INTERVAL)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [isOnline, loadOrders])

  // Accept order
  const handleAcceptOrder = async (order) => {
    try {
      setProcessing(order.id)
      const response = await driverService.changeDriverOrderStatus({
        order_id: order.id,
        driver_id: user.wh_account_id,
        status: 1, // Accept
      })

      if (response.status === 1 || response.code === 200) {
        toast.success('Order accepted!')
        // Navigate to order detail page
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

  // Toggle online/offline
  const handleToggleOnline = () => {
    setIsOnline(!isOnline)
    if (!isOnline) {
      // Going online - refresh orders
      loadOrders()
    } else {
      // Going offline - clear orders
      setOrders([])
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    loadOrders(false)
  }

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header with Online/Offline Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Available Orders
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">
            {isOnline ? `${orders.length} orders nearby` : 'You are offline'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Online/Offline Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-dark-border rounded-full p-1">
            <button
              onClick={() => !isOnline && handleToggleOnline()}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !isOnline
                  ? 'bg-gray-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Offline
            </button>
            <button
              onClick={() => isOnline || handleToggleOnline()}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isOnline
                  ? 'bg-green-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Online
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-dark-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Map View"
            >
              <Map className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Refresh Button */}
          {isOnline && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors dark:bg-dark-border dark:text-dark-muted dark:hover:bg-dark-border/80"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {isOnline && orders.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 dark:bg-green-900/20 dark:border-green-800">
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">
            You have {orders.length} new requests.
          </p>
        </div>
      )}

      {/* Offline Message */}
      {!isOnline && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              You're Offline
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Go online to start receiving delivery requests
            </p>
            <Button onClick={handleToggleOnline} className="mt-4">
              Go Online
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Map View Placeholder */}
      {isOnline && viewMode === 'map' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              Map View
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Map view coming soon...
            </p>
            <Button variant="outline" onClick={() => setViewMode('list')} className="mt-4">
              Switch to List View
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {isOnline && viewMode === 'list' && (
        <>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Order Header */}
                    <div className="p-4 border-b dark:border-dark-border">
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
                            <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                              {order.store_name || order.shipper_name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {order.total_product} item{order.total_product > 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                {order.distance}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {order.time || order.minutes_to_be_delivered_on} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            {formatCurrency(order.order_amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pickup & Dropoff */}
                    <div className="p-4 space-y-3">
                      {/* Pickup */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          PICK UP
                        </p>
                        <p className="text-sm text-gray-900 dark:text-dark-text">
                          {driverService.formatPickupAddress(order)}
                        </p>
                      </div>

                      {/* Dropoff */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          DROP OFF
                        </p>
                        <p className="text-sm text-gray-900 dark:text-dark-text">
                          {driverService.formatDropoffAddress(order)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 border-t dark:border-dark-border flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                        disabled={processing === order.id}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => handleAcceptOrder(order)}
                        disabled={processing === order.id}
                        isLoading={processing === order.id}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                  No Orders Available
                </h3>
                <p className="text-gray-500 dark:text-dark-muted mt-1">
                  New delivery requests will appear here
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Auto-refreshing every 30 seconds
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default DriverOrdersPage
