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
        <span className="text-sm font-medium text-slate-900 dark:text-white">{value || 'N/A'}</span>
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
            <InfoRow icon={User} label="Name" value={data?.name} />
            <InfoRow icon={Mail} label="Email" value={data?.email} />
            <InfoRow icon={Phone} label="Phone" value={data?.phone} />
            <InfoRow icon={Calendar} label="Created" value={data?.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'} />
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
            <InfoRow icon={Building} label="Store Name" value={data?.store_name} />
            <InfoRow icon={MapPin} label="Address" value={data?.address || data?.store_address} />
            <InfoRow icon={MapPin} label="City" value={data?.city || data?.store_city} />
            <InfoRow icon={MapPin} label="State" value={data?.state || data?.store_state} />
            <InfoRow icon={MapPin} label="ZIP Code" value={data?.zip_code || data?.store_zip_code} />
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
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data?.id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WH Account ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data?.wh_account_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stripe Account</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1 truncate">{data?.stripe_account_id || 'N/A'}</p>
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

  useEffect(() => {
    fetchProducts()
  }, [shipperId])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await adminService.getShipperProducts(shipperId)
      if (response.status === 1) {
        setProducts(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{products.length} products</p>
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
          {products.map((product) => (
            <Card key={product.id} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{product.name || product.product_name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{product.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-semibold text-slate-900 dark:text-white">${product.price || product.selling_price || 0}</span>
                      {product.status === 'active' || product.status === '1' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactive</span>
                      )}
                    </div>
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
        setOrders(response.data?.orders || response.data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getOrderStatusBadge = (order) => {
    const status = order.order_status || order.status
    if (order.is_cancelled === 1 || order.is_cancelled === '1') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Cancelled</span>
    }
    if (status === 'delivered' || order.order_delivered === 'Y') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Delivered</span>
    }
    if (status === 'shipped' || order.order_shipped === 'Y') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Shipped</span>
    }
    if (status === 'packed' || order.order_packed === 'Y') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">Packed</span>
    }
    if (status === 'accepted' || order.order_accept === 'Y') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">Accepted</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">New</span>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
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
          {orders.map((order) => (
            <Card key={order.id} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Order #{order.id}</h4>
                      {getOrderStatusBadge(order)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{order.total_product || 1} item(s)</span>
                      <span>${order.order_amount || order.total_amount || 0}</span>
                      <span>{order.created_at || order.order_date}</span>
                    </div>
                    {order.customer_name && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Customer: {order.customer_name}
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchWhatsAppData()
  }, [shipperId])

  const fetchWhatsAppData = async () => {
    setIsLoading(true)
    try {
      const [statusRes, settingsRes] = await Promise.all([
        adminService.getWhatsAppStatus(shipperId).catch(() => ({ status: 0 })),
        adminService.getWhatsAppBotSettings(shipperId).catch(() => ({ status: 0 })),
      ])

      if (statusRes.status === 1) {
        setWhatsappStatus(statusRes.data)
      }
      if (settingsRes.status === 1) {
        setBotSettings(settingsRes.data)
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

  const isConnected = whatsappStatus?.is_connected || whatsappStatus?.connected

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            WhatsApp Connection
          </h3>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <MessageSquare className={`w-6 h-6 ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              {whatsappStatus?.phone_number && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{whatsappStatus.phone_number}</p>
              )}
            </div>
          </div>

          {whatsappStatus && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">WABA ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{whatsappStatus.waba_id || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{whatsappStatus.phone_number_id || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Business ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{whatsappStatus.business_id || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Catalog ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">{whatsappStatus.catalog_id || 'N/A'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Settings */}
      {botSettings && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Bot Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="text-sm text-slate-600 dark:text-slate-400">Bot Enabled</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${botSettings.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-400'}`}>
                  {botSettings.enabled ? 'Yes' : 'No'}
                </span>
              </div>
              {botSettings.welcome_message && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Welcome Message</p>
                  <p className="text-sm text-slate-900 dark:text-white">{botSettings.welcome_message}</p>
                </div>
              )}
            </div>
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
