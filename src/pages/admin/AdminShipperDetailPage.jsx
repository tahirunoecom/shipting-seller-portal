import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store'
import { adminService } from '@/services'
import { DRIVER_STATUS_LABELS } from '@/services/driver'
import { Card, CardContent } from '@/components/ui'
import {
  ArrowLeft,
  User,
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  Truck,
  Store,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Calendar,
  DollarSign,
  Eye,
  FileText,
  Shield,
  Key,
  Building,
  Globe,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Tab components
function OverviewTab({ shipper, shipperDetails }) {
  const data = shipperDetails || shipper

  // Helper to get name from different field names
  const getName = () => {
    if (data?.firstname || data?.lastname) {
      return `${data?.firstname || ''} ${data?.lastname || ''}`.trim()
    }
    return data?.name || 'N/A'
  }

  // Helper to get store name
  const getStoreName = () => {
    return data?.company || data?.store_name || 'N/A'
  }

  // Helper to get phone
  const getPhone = () => {
    return data?.telephone || data?.phone || 'N/A'
  }

  // Helper to get address
  const getAddress = () => {
    const parts = [data?.address_1, data?.address_2].filter(Boolean)
    return parts.join(', ') || data?.address || data?.store_address || 'N/A'
  }

  // Helper to get date
  const getCreatedDate = () => {
    const dateStr = data?.date_added || data?.created_at
    if (dateStr) {
      return new Date(dateStr).toLocaleDateString()
    }
    return 'N/A'
  }

  const getStatusBadge = (value, labels = { true: 'Yes', false: 'No' }) => {
    const isTrue = value === 1 || value === '1' || value === true
    return isTrue ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle className="w-3 h-3" />
        {labels.true}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
        <XCircle className="w-3 h-3" />
        {labels.false}
      </span>
    )
  }

  const InfoRow = ({ icon: Icon, label, value, isBadge }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      {isBadge ? value : (
        <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-[200px] truncate">{value || 'N/A'}</span>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Login Details */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-500" />
            Login Details
          </h3>
          <div className="space-y-0">
            <InfoRow icon={User} label="Name" value={getName()} />
            <InfoRow icon={Mail} label="Email" value={data?.email} />
            <InfoRow icon={Phone} label="Phone" value={getPhone()} />
            <InfoRow icon={Calendar} label="Created" value={getCreatedDate()} />
            <InfoRow icon={Shield} label="OTP Verified" value={getStatusBadge(data?.otp_verification)} isBadge />
          </div>
        </CardContent>
      </Card>

      {/* Store Details */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            Store Details
          </h3>
          <div className="space-y-0">
            <InfoRow icon={Building} label="Store/Company" value={getStoreName()} />
            <InfoRow icon={MapPin} label="Address" value={getAddress()} />
            <InfoRow icon={MapPin} label="City" value={data?.city || data?.store_city} />
            <InfoRow icon={MapPin} label="State" value={data?.state || data?.store_state} />
            <InfoRow icon={MapPin} label="ZIP Code" value={data?.postcode || data?.zip_code || data?.store_zip_code} />
            <InfoRow icon={Globe} label="Country" value={data?.country || data?.store_country} />
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Verification Status
          </h3>
          <div className="space-y-0">
            <InfoRow icon={CheckCircle} label="Verification Submitted" value={getStatusBadge(data?.is_verification_submitted)} isBadge />
            <InfoRow icon={CheckCircle} label="Approved" value={getStatusBadge(data?.approved, { true: 'Approved', false: 'Not Approved' })} isBadge />
            <InfoRow icon={CreditCard} label="Stripe Connected" value={getStatusBadge(data?.stripe_connect)} isBadge />
            {data?.license_number && (
              <InfoRow icon={FileText} label="License Number" value={data?.license_number} />
            )}
            {data?.ein_number && (
              <InfoRow icon={FileText} label="EIN Number" value={data?.ein_number} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Type */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            Account Type
          </h3>
          <div className="space-y-0">
            <InfoRow icon={Store} label="Seller (Scan & Sell)" value={getStatusBadge(data?.scanSell)} isBadge />
            <InfoRow icon={Truck} label="Driver (Local Delivery)" value={getStatusBadge(data?.localDelivery)} isBadge />
            <InfoRow icon={Package} label="Fulfillment" value={getStatusBadge(data?.fulfillment)} isBadge />
          </div>
        </CardContent>
      </Card>

      {/* IDs */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm lg:col-span-2">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-500" />
            System IDs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">User ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data?.warehouse_user_id || data?.id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WH Account ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data?.wh_account_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stripe Account</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1 truncate">{data?.stripe_account_id || data?.stripe_connect_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WABA ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data?.waba_id || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardTab({ shipperId }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchDashboard()
  }, [shipperId, days])

  const fetchDashboard = async () => {
    setIsLoading(true)
    try {
      const response = await adminService.getShipperDashboard({
        wh_account_id: shipperId,
        days: days,
      })
      if (response.status === 1) {
        setDashboardData(response.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const stats = dashboardData || {}

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[{ label: 'Today', value: 1 }, { label: '7 Days', value: 7 }, { label: '30 Days', value: 30 }, { label: 'Year', value: 365 }].map((period) => (
          <button
            key={period.value}
            onClick={() => setDays(period.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              days === period.value
                ? 'bg-violet-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_orders || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">${stats.total_revenue || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_products || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending_orders || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {stats.recent_orders && stats.recent_orders.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats.recent_orders.map((order, index) => (
                <div key={order.id || index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Order #{order.id}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{order.created_at}</p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">${order.total_amount || order.order_amount || 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProductsTab({ shipperId }) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [shipperId])

  const fetchProducts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminService.getShipperProducts(shipperId)
      if (response.status === 1) {
        // Handle different response structures
        const productsList = response.data?.products || response.data || []
        setProducts(Array.isArray(productsList) ? productsList : [])
      } else {
        setError(response.message || 'Failed to fetch products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to fetch products')
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Get product name
  const getProductName = (product) => {
    return product.name || product.product_name || product.title || 'Unnamed Product'
  }

  // Get product image
  const getProductImage = (product) => {
    return product.image || product.product_image || product.thumbnail || null
  }

  // Get product price
  const getProductPrice = (product) => {
    return product.price || product.selling_price || product.regular_price || 0
  }

  // Check if product is active
  const isProductActive = (product) => {
    return product.status === 'active' || product.status === '1' || product.status === 1 || product.is_active === 1
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{products.length} products</p>
        <button
          onClick={fetchProducts}
          className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {products.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">No products found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => (
            <Card key={product.id || product.product_id || index} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={getProductName(product)} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{getProductName(product)}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{product.category || product.category_name || 'No category'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-semibold text-slate-900 dark:text-white">${getProductPrice(product)}</span>
                      {isProductActive(product) ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactive</span>
                      )}
                    </div>
                    {product.quantity !== undefined && (
                      <p className="text-xs text-slate-400 mt-1">Stock: {product.quantity}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function OrdersTab({ shipperId }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [shipperId, filter])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const response = await adminService.getShipperOrders({
        wh_account_id: shipperId,
        type: filter,
      })
      if (response.status === 1) {
        const ordersList = response.data?.orders || response.data || []
        setOrders(Array.isArray(ordersList) ? ordersList : [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  // Get order ID - try different field names
  const getOrderId = (order) => {
    return order.order_id || order.id || order.order_number || 'N/A'
  }

  // Get order status with proper detection
  const getOrderStatus = (order) => {
    // Check for cancelled first
    if (order.is_cancelled === 1 || order.is_cancelled === '1' || order.order_cancelled === 'Y') {
      return 'cancelled'
    }
    // Check for delivered
    if (order.order_delivered === 'Y' || order.is_delivered === 1 || order.is_delivered === '1') {
      return 'delivered'
    }
    // Check for shipped
    if (order.order_shipped === 'Y' || order.is_shipped === 1 || order.is_shipped === '1') {
      return 'shipped'
    }
    // Check for packed
    if (order.order_packed === 'Y' || order.is_packed === 1 || order.is_packed === '1') {
      return 'packed'
    }
    // Check for accepted
    if (order.order_accept === 'Y' || order.is_accepted === 1 || order.is_accepted === '1') {
      return 'accepted'
    }
    return 'new'
  }

  const getOrderStatusBadge = (order) => {
    const status = getOrderStatus(order)
    const badges = {
      cancelled: <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Cancelled</span>,
      delivered: <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Delivered</span>,
      shipped: <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Shipped</span>,
      packed: <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">Packed</span>,
      accepted: <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">Accepted</span>,
      new: <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">New</span>,
    }
    return badges[status] || badges.new
  }

  // Get customer name
  const getCustomerName = (order) => {
    if (order.customer_name) return order.customer_name
    if (order.shipping_firstname || order.shipping_lastname) {
      return `${order.shipping_firstname || ''} ${order.shipping_lastname || ''}`.trim()
    }
    if (order.drop_off?.customer_name) return order.drop_off.customer_name
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  // Order Detail Modal
  if (selectedOrder) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Order #{getOrderId(selectedOrder)}
              </h3>
              {getOrderStatusBadge(selectedOrder)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID</span>
                    <span className="text-slate-900 dark:text-white">{getOrderId(selectedOrder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-slate-900 dark:text-white">${selectedOrder.order_amount || selectedOrder.total_amount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.total_product || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.date_added || selectedOrder.created_at || selectedOrder.order_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.payment_method || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="text-slate-900 dark:text-white">{getCustomerName(selectedOrder) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.shipping_telephone || selectedOrder.customer_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="font-semibold text-slate-900 dark:text-white">Shipping Address</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {[
                    selectedOrder.shipping_address_1 || selectedOrder.drop_off?.address,
                    selectedOrder.shipping_city || selectedOrder.drop_off?.city,
                    selectedOrder.shipping_zone || selectedOrder.drop_off?.state,
                    selectedOrder.shipping_postcode || selectedOrder.drop_off?.zip_code,
                    selectedOrder.shipping_country || selectedOrder.drop_off?.country,
                  ].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'New', 'Accepted', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-violet-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{orders.length} orders</p>

      {orders.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order, index) => (
            <Card
              key={order.id || order.order_id || index}
              className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Order #{getOrderId(order)}</h4>
                      {getOrderStatusBadge(order)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{order.total_product || 1} item(s)</span>
                      <span>${order.order_amount || order.total_amount || 0}</span>
                      <span>{order.date_added || order.created_at || order.order_date || 'N/A'}</span>
                    </div>
                    {getCustomerName(order) && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Customer: {getCustomerName(order)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function WhatsAppTab({ shipperId }) {
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [botSettings, setBotSettings] = useState(null)
  const [phoneStatus, setPhoneStatus] = useState(null)
  const [catalogs, setCatalogs] = useState([])
  const [autoReplies, setAutoReplies] = useState([])
  const [businessProfile, setBusinessProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchWhatsAppData()
  }, [shipperId])

  const fetchWhatsAppData = async () => {
    setIsLoading(true)
    try {
      // Fetch all WhatsApp related data
      const [statusRes, settingsRes] = await Promise.all([
        adminService.getWhatsAppStatus(shipperId).catch(() => ({ status: 0 })),
        adminService.getWhatsAppBotSettings(shipperId).catch(() => ({ status: 0 })),
      ])

      if (statusRes.status === 1) {
        setWhatsappStatus(statusRes.data)
        // Extract nested data if available
        if (statusRes.data?.phone_status) setPhoneStatus(statusRes.data.phone_status)
        if (statusRes.data?.catalogs) setCatalogs(statusRes.data.catalogs || [])
        if (statusRes.data?.business_profile) setBusinessProfile(statusRes.data.business_profile)
      }
      if (settingsRes.status === 1) {
        setBotSettings(settingsRes.data)
        if (settingsRes.data?.auto_replies) setAutoReplies(settingsRes.data.auto_replies || [])
      }
    } catch (error) {
      console.error('Error fetching WhatsApp data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const isConnected = whatsappStatus?.is_connected || whatsappStatus?.connected || whatsappStatus?.waba_id

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              WhatsApp Connection
            </h3>
            <button
              onClick={fetchWhatsAppData}
              className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <MessageSquare className={`w-7 h-7 ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {isConnected ? 'Connected' : 'Not Connected'}
                </p>
                {isConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              {whatsappStatus?.phone_number && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{whatsappStatus.phone_number}</p>
              )}
              {whatsappStatus?.display_name && (
                <p className="text-xs text-slate-400 mt-0.5">Display: {whatsappStatus.display_name}</p>
              )}
            </div>
            {isConnected && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Status */}
      {isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-500" />
              Phone Number Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Quality Rating</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {phoneStatus?.quality_rating || whatsappStatus?.quality_rating || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Messaging Limit</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {phoneStatus?.messaging_limit || whatsappStatus?.messaging_limit || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Name Status</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {phoneStatus?.name_status || whatsappStatus?.name_status || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Verified</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {phoneStatus?.is_verified || whatsappStatus?.verified_name ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account IDs */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-500" />
            WhatsApp Account IDs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WABA ID</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white mt-1 break-all">{whatsappStatus?.waba_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number ID</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white mt-1 break-all">{whatsappStatus?.phone_number_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Business ID</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white mt-1 break-all">{whatsappStatus?.business_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Access Token</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white mt-1 truncate">
                {whatsappStatus?.access_token ? `${whatsappStatus.access_token.substring(0, 20)}...` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Information */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Catalog
          </h3>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Catalog ID</p>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {whatsappStatus?.catalog_id || 'Not configured'}
                </p>
              </div>
              {whatsappStatus?.catalog_id && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
            {whatsappStatus?.catalog_name && (
              <p className="text-xs text-slate-400 mt-2">Name: {whatsappStatus.catalog_name}</p>
            )}
            {whatsappStatus?.product_count !== undefined && (
              <p className="text-xs text-slate-400 mt-1">Products: {whatsappStatus.product_count}</p>
            )}
          </div>

          {catalogs.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Available Catalogs</p>
              <div className="space-y-2">
                {catalogs.map((catalog, index) => (
                  <div key={catalog.id || index} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-600/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{catalog.name || `Catalog ${index + 1}`}</p>
                      <p className="text-xs text-slate-500">{catalog.id}</p>
                    </div>
                    {catalog.is_active && (
                      <span className="text-xs text-emerald-600">Active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Settings */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-500" />
            Bot Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Bot Status</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Auto-reply functionality</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${botSettings?.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-400'}`}>
                {botSettings?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {botSettings?.welcome_message && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Welcome Message</p>
                <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{botSettings.welcome_message}</p>
              </div>
            )}

            {botSettings?.away_message && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Away Message</p>
                <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{botSettings.away_message}</p>
              </div>
            )}

            {botSettings?.business_hours && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Business Hours</p>
                <p className="text-sm text-slate-900 dark:text-white">{botSettings.business_hours}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto Replies */}
      {autoReplies.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Auto Replies ({autoReplies.length})</h3>
            <div className="space-y-3">
              {autoReplies.map((reply, index) => (
                <div key={reply.id || index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900 dark:text-white">{reply.trigger || reply.keyword}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${reply.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {reply.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{reply.response || reply.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Profile */}
      {businessProfile && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-500" />
              Business Profile
            </h3>
            <div className="space-y-3">
              {businessProfile.about && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">About</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-1">{businessProfile.about}</p>
                </div>
              )}
              {businessProfile.description && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Description</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-1">{businessProfile.description}</p>
                </div>
              )}
              {businessProfile.address && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Address</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-1">{businessProfile.address}</p>
                </div>
              )}
              {businessProfile.email && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-sm text-slate-900 dark:text-white mt-1">{businessProfile.email}</p>
                </div>
              )}
              {businessProfile.websites && businessProfile.websites.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Websites</p>
                  {businessProfile.websites.map((website, i) => (
                    <a key={i} href={website} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 hover:text-violet-700 block mt-1">
                      {website}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Connected State */}
      {!isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">WhatsApp Not Connected</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This shipper has not connected their WhatsApp Business Account yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BillingTab({ shipper }) {
  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-violet-500" />
          Billing Information
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Stripe Connect</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Payment processing</p>
              </div>
            </div>
            {shipper?.stripe_connect === 1 || shipper?.stripe_connect === '1' ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Connected</span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-400">Not Connected</span>
            )}
          </div>

          {shipper?.stripe_account_id && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stripe Account ID</p>
              <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{shipper.stripe_account_id}</p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
            <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Detailed billing history and invoices will be available here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DriverTab({ shipper }) {
  const [driverOrders, setDriverOrders] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (shipper?.localDelivery === 1 || shipper?.localDelivery === '1') {
      fetchDriverData()
    } else {
      setIsLoading(false)
    }
  }, [shipper])

  const fetchDriverData = async () => {
    setIsLoading(true)
    try {
      const driverId = shipper.id || shipper.wh_account_id
      const [ordersRes, activeRes] = await Promise.all([
        adminService.getDriverOrders({ driver_id: driverId }).catch(() => ({ status: 0 })),
        adminService.getDriverActiveOrders({ driver_id: driverId }).catch(() => ({ status: 0 })),
      ])

      if (ordersRes.status === 1) {
        setDriverOrders(ordersRes.data?.orders || ordersRes.data || [])
      }
      if (activeRes.status === 1) {
        setActiveOrders(activeRes.data || [])
      }
    } catch (error) {
      console.error('Error fetching driver data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!(shipper?.localDelivery === 1 || shipper?.localDelivery === '1')) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">This shipper is not registered as a driver</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const getDriverStatusBadge = (status) => {
    const statusCode = typeof status === 'object' ? status.driver_order_status : status
    const label = DRIVER_STATUS_LABELS[statusCode] || 'Unknown'
    const colors = {
      0: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400',
      1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      2: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      4: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      5: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      6: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      7: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[statusCode] || colors[0]}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Driver Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{driverOrders.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeOrders.filter(o => (o.driver_order_status?.driver_order_status || o.driver_order_status) < 7).length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeOrders.filter(o => (o.driver_order_status?.driver_order_status || o.driver_order_status) === 7).length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Driver Orders</h3>

          {activeOrders.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-3 text-slate-500 dark:text-slate-400">No driver orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">Order #{order.id}</span>
                        {getDriverStatusBadge(order.driver_order_status)}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {order.store_name || 'Store'} - {order.customer_name || 'Customer'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main Component
function AdminShipperDetailPage() {
  const { shipperId } = useParams()
  const navigate = useNavigate()
  const { selectedShipper, selectShipper, clearSelectedShipper } = useAdminStore()
  const [shipperDetails, setShipperDetails] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchShipperDetails()
    return () => {
      // Don't clear on unmount to keep breadcrumb working
    }
  }, [shipperId])

  const fetchShipperDetails = async () => {
    setIsLoading(true)
    try {
      const response = await adminService.getShipperDetails(shipperId)
      if (response.status === 1) {
        const details = response.data
        setShipperDetails(details)
        selectShipper(details)
      } else {
        toast.error('Failed to fetch shipper details')
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
      toast.error('Failed to fetch shipper details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    clearSelectedShipper()
    navigate('/admin/dashboard')
  }

  const shipper = shipperDetails || selectedShipper

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  // Add driver tab if shipper is also a driver
  if (shipper?.localDelivery === 1 || shipper?.localDelivery === '1') {
    tabs.push({ id: 'driver', label: 'Driver', icon: Truck })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {shipper?.store_name || shipper?.name || 'Shipper Details'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            ID: {shipperId} | {shipper?.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab shipper={shipper} shipperDetails={shipperDetails} />}
        {activeTab === 'dashboard' && <DashboardTab shipperId={shipperId} />}
        {activeTab === 'products' && <ProductsTab shipperId={shipperId} />}
        {activeTab === 'orders' && <OrdersTab shipperId={shipperId} />}
        {activeTab === 'whatsapp' && <WhatsAppTab shipperId={shipperId} />}
        {activeTab === 'billing' && <BillingTab shipper={shipper} />}
        {activeTab === 'driver' && <DriverTab shipper={shipper} />}
      </div>
    </div>
  )
}

export default AdminShipperDetailPage
