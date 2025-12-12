import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService } from '@/services'
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
  ChevronRight,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'

function DriverHistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])

  // Load completed orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.id,
        status: 0,
      })

      if (response.status === 1) {
        // Filter only completed orders (status 7)
        const completedOrders = (response.data || []).filter(order => {
          const status = order.driver_order_status
          const statusCode = typeof status === 'object' ? status.driver_order_status : status
          return statusCode === 7
        })
        setOrders(completedOrders)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
      toast.error('Failed to load delivery history')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Group orders by date
  const groupedOrders = orders.reduce((groups, order) => {
    const date = new Date(order.order_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(order)
    return groups
  }, {})

  if (loading && orders.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          Delivery History
        </h1>
        <p className="text-gray-500 dark:text-dark-muted">
          View your past deliveries
        </p>
      </div>

      {/* Orders by Date */}
      {Object.keys(groupedOrders).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-medium text-gray-500">{date}</h2>
              </div>
              <div className="space-y-3">
                {dateOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/driver/order/${order.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                                #{order.id}
                              </h3>
                              <Badge variant="success">Delivered</Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-dark-muted">
                              {order.store_name || order.shipper_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-green-600">
                            +{formatCurrency(order.order_amount)}
                          </p>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {order.total_product} items
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(order.order_date)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              No Delivery History
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Your completed deliveries will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DriverHistoryPage
