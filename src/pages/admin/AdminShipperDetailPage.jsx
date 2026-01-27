import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store'
import { adminService } from '@/services'
import { whatsappService } from '@/services/whatsapp'
import { productService } from '@/services/products'
import { orderService } from '@/services/orders'
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
  Edit,
  Trash2,
  Plus,
  Send,
  Link,
  Settings,
  ExternalLink,
  Power,
  Zap,
  List,
  ToggleLeft,
  ToggleRight,
  Image,
  MessageCircle,
  Bot,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Tab components
function OverviewTab({ shipper }) {
  // Use shipper data directly - it comes from getAllShippersForAdmin
  const data = shipper || {}

  // Debug: Log shipper data to console to see actual field names
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      console.log('=== Admin Shipper Data Debug ===')
      console.log('Full shipper data:', data)
      console.log('Account type raw values:', {
        scanSell: data.scanSell,
        scan_sell: data.scan_sell,
        localDelivery: data.localDelivery,
        local_delivery: data.local_delivery,
        fulfillment: data.fulfillment,
      })
      console.log('Verification fields:', {
        is_verification_submitted: data.is_verification_submitted,
        approved: data.approved,
        company_icon: data.company_icon,
        drivinglicence: data.drivinglicence,
        zip: data.zip,
        postcode: data.postcode,
      })
    }
  }, [data])

  // Helper to get name from different field names
  const getName = () => {
    if (data.firstname || data.lastname) {
      return `${data.firstname || ''} ${data.lastname || ''}`.trim()
    }
    return data.name || 'N/A'
  }

  // Helper to get store name
  const getStoreName = () => {
    return data.company || data.store_name || 'N/A'
  }

  // Helper to get phone
  const getPhone = () => {
    return data.telephone || data.phone || 'N/A'
  }

  // Helper to get address
  const getAddress = () => {
    const parts = [data.address_1, data.address_2].filter(Boolean)
    return parts.join(', ') || data.address || data.store_address || 'N/A'
  }

  // Helper to get date
  const getCreatedDate = () => {
    const dateStr = data.date_added || data.created_at
    if (dateStr) {
      return new Date(dateStr).toLocaleDateString()
    }
    return 'N/A'
  }

  // Get shipper ID
  const getShipperId = () => {
    return data.wh_account_id || data.id || data.warehouse_user_id || 'N/A'
  }

  // Helper to check if value is truthy (handles multiple formats from API)
  // This matches the logic in SettingsPage.jsx: value === '1' || value === 1
  const isTruthy = (value) => {
    if (value === undefined || value === null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim()
      return v === '1' || v === 'y' || v === 'yes' || v === 'true'
    }
    return false
  }

  const getStatusBadge = (value, labels = { true: 'Yes', false: 'No' }) => {
    const isTrue = typeof value === 'boolean' ? value : isTruthy(value)
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

  // Check account type fields - matches SettingsPage.jsx logic exactly
  // SettingsPage uses: user?.scanSell === '1' || user?.scanSell === 1
  const isSeller = isTruthy(data.scanSell) || isTruthy(data.scan_sell) ||
                   isTruthy(data.is_seller) || isTruthy(data.seller) ||
                   isTruthy(data.scanAndSell) || isTruthy(data.scan_and_sell)

  const isDriver = isTruthy(data.localDelivery) || isTruthy(data.local_delivery) ||
                   isTruthy(data.is_driver) || isTruthy(data.driver)

  const isFulfillment = isTruthy(data.fulfillment) || isTruthy(data.is_fulfillment)

  // Verification status - matches SettingsPage.jsx
  const isApproved = isTruthy(data.approved)
  const isVerificationSubmitted = isTruthy(data.is_verification_submitted)

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

  // Get verification address details
  const getVerificationAddress = () => {
    const address1 = data.address_1 || data.verification_address_1 || ''
    const address2 = data.address_2 || data.verification_address_2 || ''
    return [address1, address2].filter(Boolean).join(', ') || 'Not provided'
  }

  const getVerificationCity = () => data.city || data.verification_city || 'Not provided'
  const getVerificationState = () => data.state || data.verification_state || 'Not provided'
  const getVerificationZip = () => data.zip || data.postcode || data.verification_zip || 'Not provided'
  const getVerificationCountry = () => data.country || data.verification_country || 'Not provided'

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
            <InfoRow icon={Mail} label="Email" value={data.email || 'N/A'} />
            <InfoRow icon={Phone} label="Phone" value={getPhone()} />
            <InfoRow icon={Calendar} label="Created" value={getCreatedDate()} />
            <InfoRow icon={Shield} label="OTP Verified" value={getStatusBadge(data.otp_verification)} isBadge />
          </div>
        </CardContent>
      </Card>

      {/* Account Type - Now with raw values for debugging */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            Account Type
          </h3>
          <div className="space-y-0">
            <InfoRow icon={Store} label="Seller (Scan & Sell)" value={getStatusBadge(isSeller)} isBadge />
            <InfoRow icon={Truck} label="Driver (Local Delivery)" value={getStatusBadge(isDriver)} isBadge />
            <InfoRow icon={Package} label="Fulfillment" value={getStatusBadge(isFulfillment)} isBadge />
          </div>
          {/* Debug: Show raw values */}
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">Raw API Values:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-500">scanSell:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{String(data.scanSell ?? 'undefined')}</span>
              <span className="text-slate-500">localDelivery:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{String(data.localDelivery ?? 'undefined')}</span>
              <span className="text-slate-500">fulfillment:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{String(data.fulfillment ?? 'undefined')}</span>
            </div>
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

          {/* Status Banner - like SettingsPage */}
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3">
            {isApproved ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 w-full">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Account Verified</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Account has been approved</p>
                </div>
              </div>
            ) : isVerificationSubmitted ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 w-full">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Verification Pending</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Under review</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 w-full">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Not Verified</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Verification not submitted</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-0">
            <InfoRow icon={CheckCircle} label="Verification Submitted" value={getStatusBadge(isVerificationSubmitted)} isBadge />
            <InfoRow icon={CheckCircle} label="Approved" value={getStatusBadge(isApproved, { true: 'Approved', false: 'Not Approved' })} isBadge />
            <InfoRow icon={CreditCard} label="Stripe Connected" value={getStatusBadge(data.stripe_connect)} isBadge />
          </div>
        </CardContent>
      </Card>

      {/* Verification Details - Address & Documents (like SettingsPage verification tab) */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Verification Details
          </h3>
          <div className="space-y-0">
            <InfoRow icon={MapPin} label="Address" value={getVerificationAddress()} />
            <InfoRow icon={MapPin} label="City" value={getVerificationCity()} />
            <InfoRow icon={MapPin} label="State" value={getVerificationState()} />
            <InfoRow icon={MapPin} label="ZIP Code" value={getVerificationZip()} />
            <InfoRow icon={Globe} label="Country" value={getVerificationCountry()} />
            <InfoRow icon={Building} label="Company Name" value={data.company || data.company_name || 'Not provided'} />
          </div>

          {/* Document Images */}
          <div className="mt-4 space-y-3">
            {(data.company_icon || data.company_logo) && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Business Logo</p>
                <img
                  src={data.company_icon || data.company_logo}
                  alt="Business Logo"
                  className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                />
              </div>
            )}
            {(data.drivinglicence || data.driving_licence || data.id_document) && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">ID Document / Driver's License</p>
                <img
                  src={data.drivinglicence || data.driving_licence || data.id_document}
                  alt="ID Document"
                  className="h-24 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                />
              </div>
            )}
            {!data.company_icon && !data.company_logo && !data.drivinglicence && !data.driving_licence && !data.id_document && (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No documents uploaded</p>
            )}
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
            <InfoRow icon={MapPin} label="City" value={data.city || data.store_city || 'N/A'} />
            <InfoRow icon={MapPin} label="State" value={data.state || data.store_state || 'N/A'} />
            <InfoRow icon={MapPin} label="ZIP Code" value={data.postcode || data.zip || data.zip_code || data.store_zip_code || 'N/A'} />
            <InfoRow icon={Globe} label="Country" value={data.country || data.store_country || 'N/A'} />
          </div>
        </CardContent>
      </Card>

      {/* IDs */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-500" />
            System IDs
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">User ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data.warehouse_user_id || data.id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WH Account ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{getShipperId()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stripe Account</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1 truncate">{data.stripe_account_id || data.stripe_connect_id || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">WABA ID</p>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-1">{data.waba_id || 'N/A'}</p>
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
        items: 5,
      })
      console.log('=== Dashboard API Response Debug ===')
      console.log('Full response:', response)
      if (response.status === 1) {
        // The API response structure has the data directly
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

  // Extract data from the actual API response structure
  // The response has: latest_ai_orders_count, statementdetails, statement_balance, latest_ai_orders
  const orderCounts = dashboardData?.latest_ai_orders_count || {}
  const statementBalance = dashboardData?.statement_balance || {}
  const recentOrders = dashboardData?.latest_ai_orders || []

  // Order status colors for consistency
  const STATUS_COLORS = {
    Pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    Accepted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    Packed: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
    Shipped: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
    Intransit: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
    Delivered: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
    Cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  }

  // Helper to get order status badge
  const getOrderStatusBadge = (order) => {
    if (order.cancelled === 'Y') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelled</span>
    if (order.delivered === 'Y') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Delivered</span>
    if (order.Shipped === 'Y') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">In Transit</span>
    if (order.packed === 'Y') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">Packed</span>
    if (order.accepted === 'Y') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Accepted</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
  }

  const totalOrders = orderCounts.Total || 0
  const hasData = totalOrders > 0 || recentOrders.length > 0

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
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
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 hover:text-violet-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Main Stats - Order Counts from latest_ai_orders_count */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Total || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.Pending.bg} flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${STATUS_COLORS.Pending.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Pending || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.Accepted.bg} flex items-center justify-center`}>
                <CheckCircle className={`w-5 h-5 ${STATUS_COLORS.Accepted.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Accepted || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.Intransit.bg} flex items-center justify-center`}>
                <Truck className={`w-5 h-5 ${STATUS_COLORS.Intransit.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Intransit || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.Delivered.bg} flex items-center justify-center`}>
                <Package className={`w-5 h-5 ${STATUS_COLORS.Delivered.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Delivered || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_COLORS.Cancelled.bg} flex items-center justify-center`}>
                <XCircle className={`w-5 h-5 ${STATUS_COLORS.Cancelled.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{orderCounts.Cancelled || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Account Statement
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Opening Balance</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  ${statementBalance.opening_balance || '0.00'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Closing Balance</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  ${statementBalance.closing_balance || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Pipeline / Additional Stats */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-500" />
              Order Pipeline
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Packed', count: orderCounts.Packed || 0, color: STATUS_COLORS.Packed },
                { label: 'Shipped', count: orderCounts.Shipped || 0, color: STATUS_COLORS.Shipped },
              ].map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl ${item.color.bg}`}>
                  <p className={`text-xl font-bold ${item.color.text}`}>{item.count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
            {totalOrders > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Fulfillment Rate</span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {Math.round(((orderCounts.Delivered || 0) / totalOrders) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.round(((orderCounts.Delivered || 0) / totalOrders) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Recent Orders
            </h3>
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div key={order.id || index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 dark:text-white">#{order.id}</p>
                      {getOrderStatusBadge(order)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span>{order.name || 'Customer'}</span>
                      <span>{order.order_date || order.date_added}</span>
                      {order.city && <span>{order.city}, {order.state}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">${order.total_amount || 0}</p>
                    {order.shipper_payout && (
                      <p className="text-xs text-emerald-600">Payout: ${order.shipper_payout}</p>
                    )}
                    <p className="text-xs text-slate-400">{order.total_product_quantity || 1} item(s)</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!hasData && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <LayoutDashboard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">No dashboard data available for this period</p>
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
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const itemsPerPage = 12 // 12 for grid (4x3)

  useEffect(() => {
    fetchProducts()
  }, [shipperId])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const fetchProducts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use productService directly with wh_account_id
      const response = await productService.getSellerProducts(shipperId)
      if (response.status === 1) {
        // Handle different response structures
        const productsList = response.data?.products || response.data?.getSellerProducts || response.data || []
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
    return product.name || product.product_name || product.title || product.product_title || 'Unnamed Product'
  }

  // Get product image
  const getProductImage = (product) => {
    return product.image || product.product_image || product.thumbnail || product.main_image || null
  }

  // Get product price
  const getProductPrice = (product) => {
    return product.price || product.selling_price || product.regular_price || product.product_price || 0
  }

  // Check if product is active
  const isProductActive = (product) => {
    return product.status === 'active' || product.status === '1' || product.status === 1 || product.is_active === 1 || product.product_status === 1
  }

  // Toggle product status
  const handleToggleStatus = async (product, e) => {
    if (e) e.stopPropagation()
    try {
      const response = await productService.toggleProductStatus({
        wh_account_id: shipperId,
        product_id: product.product_id || product.id,
        status: isProductActive(product) ? 0 : 1,
      })
      if (response.status === 1) {
        toast.success('Product status updated')
        fetchProducts()
        if (selectedProduct?.id === product.id || selectedProduct?.product_id === product.product_id) {
          setSelectedProduct(null)
        }
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
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

  // Product Detail View
  if (selectedProduct) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedProduct(null)}
          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </button>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product Image */}
              <div className="flex-shrink-0">
                {getProductImage(selectedProduct) ? (
                  <img
                    src={getProductImage(selectedProduct)}
                    alt={getProductName(selectedProduct)}
                    className="w-full md:w-64 h-64 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full md:w-64 h-64 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{getProductName(selectedProduct)}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {selectedProduct.category || selectedProduct.category_name || 'No category'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleToggleStatus(selectedProduct, e)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isProductActive(selectedProduct)
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isProductActive(selectedProduct) ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="text-3xl font-bold text-violet-600">${getProductPrice(selectedProduct)}</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Product ID</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">
                      {selectedProduct.product_id || selectedProduct.id || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">SKU/UPC</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">
                      {selectedProduct.upc || selectedProduct.sku || selectedProduct.barcode || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stock Quantity</p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1">
                      {selectedProduct.quantity ?? selectedProduct.stock ?? 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Weight</p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1">
                      {selectedProduct.weight ? `${selectedProduct.weight} lbs` : 'N/A'}
                    </p>
                  </div>
                </div>

                {(selectedProduct.description || selectedProduct.product_description) && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedProduct.description || selectedProduct.product_description}
                    </p>
                  </div>
                )}

                {selectedProduct.subcategory && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Subcategory</p>
                    <p className="text-sm text-slate-900 dark:text-white mt-1">{selectedProduct.subcategory}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter products by search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true
    const name = getProductName(product).toLowerCase()
    const category = (product.category || product.category_name || '').toLowerCase()
    const searchLower = searchQuery.toLowerCase()
    return name.includes(searchLower) || category.includes(searchLower)
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-4">
      {/* Search and Info Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{filteredProducts.length} products</p>
          {searchQuery && filteredProducts.length !== products.length && (
            <span className="text-xs text-violet-600">({products.length} total)</span>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Eye className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={fetchProducts}
            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No products match your search' : 'No products found'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-violet-600 hover:text-violet-700"
              >
                Clear search
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts.map((product, index) => (
              <Card
                key={product.id || product.product_id || index}
                className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
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
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{product.category || product.category_name || 'No category'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-semibold text-slate-900 dark:text-white">${getProductPrice(product)}</span>
                        <button
                          onClick={(e) => handleToggleStatus(product, e)}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                            isProductActive(product)
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {isProductActive(product) ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-violet-500 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrdersTab({ shipperId }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [shipperId, filter])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const response = await orderService.getShipperOrders({
        wh_account_id: shipperId,
        type: filter,
      })
      if (response.status === 1) {
        const ordersList = response.data?.orders || response.data?.getShipperOrders || response.data || []
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

  // Helper to check truthy values
  const isTruthy = (value) => {
    return value === 1 || value === '1' || value === 'Y' || value === 'y' || value === true
  }

  // Get order status with proper detection
  const getOrderStatus = (order) => {
    // Check for cancelled first - try multiple field names
    if (isTruthy(order.is_cancelled) || order.order_cancelled === 'Y' || order.status === 'cancelled') {
      return 'cancelled'
    }
    // Check for delivered
    if (order.order_delivered === 'Y' || isTruthy(order.is_delivered) || order.status === 'delivered') {
      return 'delivered'
    }
    // Check for shipped
    if (order.order_shipped === 'Y' || isTruthy(order.is_shipped) || order.status === 'shipped') {
      return 'shipped'
    }
    // Check for packed
    if (order.order_packed === 'Y' || isTruthy(order.is_packed) || order.status === 'packed') {
      return 'packed'
    }
    // Check for accepted
    if (order.order_accept === 'Y' || isTruthy(order.is_accepted) || isTruthy(order.order_accepted) || order.status === 'accepted') {
      return 'accepted'
    }
    // Check for order_status field
    if (order.order_status) {
      const status = String(order.order_status).toLowerCase()
      if (status.includes('cancel')) return 'cancelled'
      if (status.includes('deliver')) return 'delivered'
      if (status.includes('ship')) return 'shipped'
      if (status.includes('pack')) return 'packed'
      if (status.includes('accept')) return 'accepted'
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

  // Get customer name - try multiple field combinations
  const getCustomerName = (order) => {
    if (order.customer_name) return order.customer_name
    if (order.shipping_firstname || order.shipping_lastname) {
      return `${order.shipping_firstname || ''} ${order.shipping_lastname || ''}`.trim()
    }
    if (order.firstname || order.lastname) {
      return `${order.firstname || ''} ${order.lastname || ''}`.trim()
    }
    if (order.drop_off?.customer_name) return order.drop_off.customer_name
    if (order.drop_off?.firstname || order.drop_off?.lastname) {
      return `${order.drop_off.firstname || ''} ${order.drop_off.lastname || ''}`.trim()
    }
    if (order.customer?.name) return order.customer.name
    if (order.customer?.firstname || order.customer?.lastname) {
      return `${order.customer.firstname || ''} ${order.customer.lastname || ''}`.trim()
    }
    return 'N/A'
  }

  // Get customer phone
  const getCustomerPhone = (order) => {
    return order.shipping_telephone || order.telephone || order.customer_phone || order.phone ||
           order.drop_off?.telephone || order.drop_off?.phone || order.customer?.phone || 'N/A'
  }

  // Get customer email
  const getCustomerEmail = (order) => {
    return order.email || order.customer_email || order.shipping_email ||
           order.drop_off?.email || order.customer?.email || 'N/A'
  }

  // Get full shipping address
  const getShippingAddress = (order) => {
    // Try to build a complete address
    const name = order.shipping_firstname || order.shipping_lastname
      ? `${order.shipping_firstname || ''} ${order.shipping_lastname || ''}`.trim()
      : null
    const address1 = order.shipping_address_1 || order.address_1 || order.drop_off?.address
    const address2 = order.shipping_address_2 || order.address_2 || order.drop_off?.address_2
    const city = order.shipping_city || order.city || order.drop_off?.city
    const state = order.shipping_zone || order.state || order.zone || order.drop_off?.state
    const postcode = order.shipping_postcode || order.postcode || order.zip_code || order.drop_off?.zip_code
    const country = order.shipping_country || order.country || order.drop_off?.country

    const parts = [name, address1, address2, city, state, postcode, country].filter(Boolean)
    return parts.join(', ') || 'N/A'
  }

  // Update order status
  const handleUpdateStatus = async (order, statusType) => {
    setIsUpdating(true)
    try {
      const response = await orderService.updateOrderStatus({
        wh_account_id: shipperId,
        order_id: getOrderId(order),
        status_type: statusType,
      })
      if (response.status === 1) {
        toast.success('Order status updated')
        fetchOrders()
        setSelectedOrder(null)
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Cancel order
  const handleCancelOrder = async (order) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setIsUpdating(true)
    try {
      const response = await orderService.cancelOrder(getOrderId(order))
      if (response.status === 1) {
        toast.success('Order cancelled')
        fetchOrders()
        setSelectedOrder(null)
      } else {
        toast.error(response.message || 'Failed to cancel order')
      }
    } catch (error) {
      toast.error('Failed to cancel order')
    } finally {
      setIsUpdating(false)
    }
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
    const status = getOrderStatus(selectedOrder)
    const canAccept = status === 'new'
    const canPack = status === 'accepted'
    const canShip = status === 'packed'
    const canDeliver = status === 'shipped'
    const canCancel = status !== 'cancelled' && status !== 'delivered'

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

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <span className="text-sm text-slate-500 mr-2">Actions:</span>
              {canAccept && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder, 'OrderAccept')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
                >
                  Accept Order
                </button>
              )}
              {canPack && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder, 'OrderPacked')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50"
                >
                  Mark Packed
                </button>
              )}
              {canShip && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder, 'OrderShipped')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Mark Shipped
                </button>
              )}
              {canDeliver && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder, 'OrderDelivered')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  Mark Delivered
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}
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
                    <span className="text-slate-900 dark:text-white">${selectedOrder.order_amount || selectedOrder.total_amount || selectedOrder.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.total_product || selectedOrder.items_count || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.date_added || selectedOrder.created_at || selectedOrder.order_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment</span>
                    <span className="text-slate-900 dark:text-white">{selectedOrder.payment_method || selectedOrder.payment_type || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="text-slate-900 dark:text-white">{getCustomerName(selectedOrder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="text-slate-900 dark:text-white">{getCustomerPhone(selectedOrder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-900 dark:text-white">{getCustomerEmail(selectedOrder)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="font-semibold text-slate-900 dark:text-white">Shipping Address</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {getShippingAddress(selectedOrder)}
                </p>
              </div>

              {/* Order Products */}
              {(selectedOrder.products || selectedOrder.order_products || selectedOrder.items) && (
                <div className="space-y-4 md:col-span-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Order Products</h4>
                  <div className="space-y-2">
                    {(selectedOrder.products || selectedOrder.order_products || selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.name || item.product_name || 'Product'}</p>
                            <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                          </div>
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">${item.price || item.total || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
        <button
          onClick={fetchOrders}
          className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
                      <span>{order.total_product || order.items_count || 1} item(s)</span>
                      <span>${order.order_amount || order.total_amount || order.total || 0}</span>
                      <span>{order.date_added || order.created_at || order.order_date || 'N/A'}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Customer: {getCustomerName(order)}
                    </p>
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
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false)

  useEffect(() => {
    fetchWhatsAppData()
  }, [shipperId])

  const fetchWhatsAppData = async () => {
    setIsLoading(true)
    try {
      // Fetch all WhatsApp related data using whatsappService
      const [statusRes, settingsRes, phoneRes, catalogsRes, autoRepliesRes, profileRes] = await Promise.all([
        whatsappService.getWhatsAppStatus(shipperId).catch(() => ({ status: 0 })),
        whatsappService.getBotSettings(shipperId).catch(() => ({ status: 0 })),
        whatsappService.getPhoneStatus(shipperId).catch(() => ({ status: 0 })),
        whatsappService.listCatalogs(shipperId).catch(() => ({ status: 0 })),
        whatsappService.getAutoReplies(shipperId).catch(() => ({ status: 0 })),
        whatsappService.getBusinessProfile(shipperId).catch(() => ({ status: 0 })),
      ])

      // Debug: Log all WhatsApp API responses
      console.log('=== WhatsApp Data Debug ===')
      console.log('Status Response:', statusRes)
      console.log('Settings Response:', settingsRes)
      console.log('Phone Response:', phoneRes)
      console.log('Catalogs Response:', catalogsRes)
      console.log('AutoReplies Response:', autoRepliesRes)
      console.log('Profile Response:', profileRes)

      if (statusRes.status === 1) {
        console.log('WhatsApp Status Data:', statusRes.data)
        setWhatsappStatus(statusRes.data)
      }
      if (settingsRes.status === 1) {
        setBotSettings(settingsRes.data)
      }
      if (phoneRes.status === 1) {
        setPhoneStatus(phoneRes.data)
      }
      if (catalogsRes.status === 1) {
        const catalogData = catalogsRes.data?.catalogs || catalogsRes.data || []
        console.log('Processed Catalogs:', catalogData)
        setCatalogs(catalogData)
      }
      if (autoRepliesRes.status === 1) {
        setAutoReplies(autoRepliesRes.data?.auto_replies || autoRepliesRes.data || [])
      }
      if (profileRes.status === 1) {
        setBusinessProfile(profileRes.data)
      }
    } catch (error) {
      console.error('Error fetching WhatsApp data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync catalog
  const handleSyncCatalog = async () => {
    setIsSyncing(true)
    try {
      const response = await whatsappService.syncCatalog(shipperId)
      if (response.status === 1) {
        toast.success('Catalog synced successfully')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to sync catalog')
      }
    } catch (error) {
      toast.error('Failed to sync catalog')
    } finally {
      setIsSyncing(false)
    }
  }

  // Create catalog
  const handleCreateCatalog = async () => {
    try {
      const response = await whatsappService.createCatalog(shipperId)
      if (response.status === 1) {
        toast.success('Catalog created successfully')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to create catalog')
      }
    } catch (error) {
      toast.error('Failed to create catalog')
    }
  }

  // Toggle auto-reply
  const handleToggleAutoReply = async (replyId) => {
    try {
      const response = await whatsappService.toggleAutoReply(shipperId, replyId)
      if (response.status === 1) {
        toast.success('Auto-reply toggled')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to toggle auto-reply')
      }
    } catch (error) {
      toast.error('Failed to toggle auto-reply')
    }
  }

  // Delete auto-reply
  const handleDeleteAutoReply = async (replyId) => {
    if (!confirm('Are you sure you want to delete this auto-reply?')) return
    try {
      const response = await whatsappService.deleteAutoReply(shipperId, replyId)
      if (response.status === 1) {
        toast.success('Auto-reply deleted')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to delete auto-reply')
      }
    } catch (error) {
      toast.error('Failed to delete auto-reply')
    }
  }

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp for this shipper?')) return
    try {
      const response = await whatsappService.disconnect(shipperId)
      if (response.status === 1) {
        toast.success('WhatsApp disconnected')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect')
    }
  }

  // Check Phone Number Status
  const handleCheckPhoneStatus = async () => {
    setIsCheckingStatus(true)
    try {
      const response = await whatsappService.getPhoneStatus(shipperId)
      if (response.status === 1) {
        setPhoneStatus(response.data)
        toast.success('Phone status updated')
      } else {
        toast.error(response.message || 'Failed to check phone status')
      }
    } catch (error) {
      toast.error('Failed to check phone status')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Load Catalogs from WhatsApp
  const handleLoadCatalogs = async () => {
    setIsLoadingCatalogs(true)
    try {
      const response = await whatsappService.listCatalogs(shipperId)
      if (response.status === 1) {
        setCatalogs(response.data?.catalogs || response.data || [])
        toast.success('Catalogs loaded')
      } else {
        toast.error(response.message || 'Failed to load catalogs')
      }
    } catch (error) {
      toast.error('Failed to load catalogs')
    } finally {
      setIsLoadingCatalogs(false)
    }
  }

  // Select/Set Active Catalog
  const handleSelectCatalog = async (catalogId) => {
    try {
      const response = await whatsappService.setCatalog(shipperId, catalogId)
      if (response.status === 1) {
        toast.success('Catalog selected successfully')
        fetchWhatsAppData()
      } else {
        toast.error(response.message || 'Failed to select catalog')
      }
    } catch (error) {
      toast.error('Failed to select catalog')
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
            <div className="flex items-center gap-2">
              <button
                onClick={fetchWhatsAppData}
                className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Power className="w-4 h-4" />
                  Disconnect
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" />
                Phone Number Status
              </h3>
              <button
                onClick={handleCheckPhoneStatus}
                disabled={isCheckingStatus}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                Check Status
              </button>
            </div>
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

      {/* Catalog Section */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              Catalog
            </h3>
            <div className="flex gap-2">
              {isConnected && (
                <button
                  onClick={handleLoadCatalogs}
                  disabled={isLoadingCatalogs}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <List className={`w-4 h-4 ${isLoadingCatalogs ? 'animate-spin' : ''}`} />
                  Load Catalogs
                </button>
              )}
              {!whatsappStatus?.catalog_id && isConnected && (
                <button
                  onClick={handleCreateCatalog}
                  className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Create Catalog
                </button>
              )}
              {whatsappStatus?.catalog_id && (
                <button
                  onClick={handleSyncCatalog}
                  disabled={isSyncing}
                  className="px-3 py-1.5 text-sm bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Products
                </button>
              )}
            </div>
          </div>

          {/* Current Active Catalog */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Current Catalog</p>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {whatsappStatus?.catalog_id || whatsappStatus?.catalogId || 'Not configured'}
                </p>
              </div>
              {(whatsappStatus?.catalog_id || whatsappStatus?.catalogId) && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
            {(whatsappStatus?.catalog_name || whatsappStatus?.catalogName || whatsappStatus?.name) && (
              <p className="text-xs text-slate-400 mt-2">Name: {whatsappStatus.catalog_name || whatsappStatus.catalogName || whatsappStatus.name}</p>
            )}
            {/* Check all possible catalog type field names */}
            {(() => {
              const catalogType = whatsappStatus?.catalog_type || whatsappStatus?.catalogType ||
                                  whatsappStatus?.type || whatsappStatus?.vertical ||
                                  whatsappStatus?.business_vertical || whatsappStatus?.businessVertical
              return catalogType ? (
                <p className="text-xs text-slate-400 mt-1">Type: {catalogType}</p>
              ) : null
            })()}
            {(whatsappStatus?.product_count !== undefined || whatsappStatus?.productCount !== undefined || whatsappStatus?.products_count !== undefined) && (
              <p className="text-xs text-slate-400 mt-1">Products: {whatsappStatus.product_count ?? whatsappStatus.productCount ?? whatsappStatus.products_count}</p>
            )}
          </div>

          {/* Available Catalogs with Selection */}
          {catalogs.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Available Catalogs ({catalogs.length})</p>
              <div className="space-y-2">
                {catalogs.map((catalog, index) => {
                  const isActive = catalog.id === whatsappStatus?.catalog_id ||
                                   catalog.id === whatsappStatus?.catalogId ||
                                   catalog.is_active
                  // Get catalog type from multiple possible field names
                  const catalogType = catalog.type || catalog.catalog_type || catalog.catalogType ||
                                      catalog.vertical || catalog.business_vertical || catalog.businessVertical
                  const productCount = catalog.product_count ?? catalog.productCount ?? catalog.products_count
                  return (
                    <div key={catalog.id || index} className={`p-3 rounded-lg flex items-center justify-between ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-600/50'}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{catalog.name || `Catalog ${index + 1}`}</p>
                        <p className="text-xs text-slate-500">{catalog.id}</p>
                        {catalogType && (
                          <p className="text-xs text-slate-400 mt-0.5">Type: {catalogType}</p>
                        )}
                        {productCount !== undefined && (
                          <p className="text-xs text-slate-400">Products: {productCount}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectCatalog(catalog.id)}
                            className="px-3 py-1 text-xs bg-violet-500 text-white rounded-lg hover:bg-violet-600"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Catalogs State */}
          {catalogs.length === 0 && isConnected && (
            <div className="mt-4 text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No catalogs loaded</p>
              <p className="text-xs text-slate-400">Click "Load Catalogs" to fetch available catalogs</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Settings */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-500" />
              Bot Settings
            </h3>
          </div>

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
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-500" />
              Auto Replies ({autoReplies.length})
            </h3>
          </div>

          {autoReplies.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-3 text-slate-500 dark:text-slate-400">No auto-replies configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {autoReplies.map((reply, index) => (
                <div key={reply.id || index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900 dark:text-white">{reply.trigger || reply.keyword}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAutoReply(reply.id)}
                        className={`px-2 py-0.5 rounded-full text-xs ${reply.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {reply.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleDeleteAutoReply(reply.id)}
                        className="p-1 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{reply.response || reply.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

function DriverTab({ shipper, shipperId }) {
  const [driverOrders, setDriverOrders] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Helper to check if shipper is a driver (with all possible field names)
  const checkIsDriver = (data) => {
    if (!data) return false
    const isTruthy = (value) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value === 1
      if (typeof value === 'string') {
        const v = value.toLowerCase().trim()
        return v === '1' || v === 'y' || v === 'yes' || v === 'true'
      }
      return false
    }
    return isTruthy(data.localDelivery) || isTruthy(data.local_delivery) ||
           isTruthy(data.is_driver) || isTruthy(data.driver) ||
           (data.service_type && String(data.service_type).toLowerCase().includes('driver')) ||
           (data.account_type && String(data.account_type).toLowerCase().includes('driver')) ||
           (data.user_type && String(data.user_type).toLowerCase().includes('driver'))
  }

  const isDriver = checkIsDriver(shipper)

  useEffect(() => {
    if (isDriver) {
      fetchDriverData()
    } else {
      setIsLoading(false)
    }
  }, [shipper])

  const fetchDriverData = async () => {
    setIsLoading(true)
    try {
      const driverId = shipperId || shipper?.wh_account_id || shipper?.id
      const [ordersRes, activeRes] = await Promise.all([
        adminService.getDriverOrders({ driver_id: driverId }).catch(() => ({ status: 0 })),
        adminService.getDriverActiveOrders({ driver_id: driverId }).catch(() => ({ status: 0 })),
      ])

      if (ordersRes.status === 1) {
        setDriverOrders(ordersRes.data?.orders || ordersRes.data || [])
      }
      if (activeRes.status === 1) {
        setActiveOrders(activeRes.data?.orders || activeRes.data || [])
      }
    } catch (error) {
      console.error('Error fetching driver data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isDriver) {
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Driver Orders</h3>
            <button
              onClick={fetchDriverData}
              className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

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
                        <span className="font-semibold text-slate-900 dark:text-white">Order #{order.order_id || order.id}</span>
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
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)

  // Use selectedShipper from store as primary data source
  // The shipper data comes from getAllShippersForAdmin which has all the info we need
  const shipper = selectedShipper || {}

  useEffect(() => {
    // If no selectedShipper in store, try to fetch it
    if (!selectedShipper && shipperId) {
      fetchShipperDetails()
    }
  }, [shipperId, selectedShipper])

  const fetchShipperDetails = async () => {
    setIsLoading(true)
    try {
      const response = await adminService.getShipperDetails(shipperId)
      if (response.status === 1 && response.data) {
        // Handle nested response
        const details = response.data?.shipper || response.data?.getShipperDetails || response.data
        selectShipper(details)
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    clearSelectedShipper()
    navigate('/admin/dashboard')
  }

  // Get shipper display name
  const getShipperName = () => {
    if (shipper.company) return shipper.company
    if (shipper.store_name) return shipper.store_name
    if (shipper.firstname || shipper.lastname) {
      return `${shipper.firstname || ''} ${shipper.lastname || ''}`.trim()
    }
    return shipper.name || 'Shipper Details'
  }

  // Get shipper ID for display
  const getDisplayId = () => {
    return shipper.wh_account_id || shipper.id || shipperId
  }

  // Helper to check if shipper is a driver (with all possible field names)
  const checkIsDriver = (data) => {
    if (!data) return false
    const isTruthy = (value) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value === 1
      if (typeof value === 'string') {
        const v = value.toLowerCase().trim()
        return v === '1' || v === 'y' || v === 'yes' || v === 'true'
      }
      return false
    }
    return isTruthy(data.localDelivery) || isTruthy(data.local_delivery) ||
           isTruthy(data.is_driver) || isTruthy(data.driver) ||
           (data.service_type && String(data.service_type).toLowerCase().includes('driver')) ||
           (data.account_type && String(data.account_type).toLowerCase().includes('driver')) ||
           (data.user_type && String(data.user_type).toLowerCase().includes('driver'))
  }

  const isShipperDriver = checkIsDriver(shipper)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  // Add driver tab if shipper is also a driver
  if (isShipperDriver) {
    tabs.push({ id: 'driver', label: 'Driver', icon: Truck })
  }

  if (isLoading && !selectedShipper) {
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
            {getShipperName()}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            ID: {getDisplayId()} | {shipper.email || 'No email'}
          </p>
        </div>
        <button
          onClick={fetchShipperDetails}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
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
        {activeTab === 'overview' && <OverviewTab shipper={shipper} />}
        {activeTab === 'dashboard' && <DashboardTab shipperId={shipperId} />}
        {activeTab === 'products' && <ProductsTab shipperId={shipperId} />}
        {activeTab === 'orders' && <OrdersTab shipperId={shipperId} />}
        {activeTab === 'whatsapp' && <WhatsAppTab shipperId={shipperId} />}
        {activeTab === 'billing' && <BillingTab shipper={shipper} />}
        {activeTab === 'driver' && <DriverTab shipper={shipper} shipperId={shipperId} />}
      </div>
    </div>
  )
}

export default AdminShipperDetailPage
