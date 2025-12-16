import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageLoader } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { dashboardService, productService } from '@/services'
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  ArrowRight,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  PackageCheck,
  RefreshCw,
  Wallet,
  Calendar,
  User,
  MapPin,
  Phone,
  Box,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

// Period options with corresponding days
const PERIOD_OPTIONS = [
  { key: 'day', label: 'Today', days: 1 },
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: '3months', label: '3 Months', days: 90 },
  { key: 'year', label: 'Year', days: 365 },
]

// Order status colors
const STATUS_COLORS = {
  Pending: '#F59E0B',
  Accepted: '#3B82F6',
  Packed: '#8B5CF6',
  Shipped: '#06B6D4',
  Intransit: '#6366F1',
  Delivered: '#10B981',
  Cancelled: '#EF4444',
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendValue, onClick }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-dark-muted">
              {title}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-dark-text">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-400 dark:text-dark-muted">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="mt-1.5 flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OrderStatusCard({ status, count, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-dark-muted">{status}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-dark-text">{count}</p>
      </div>
    </div>
  )
}

function getOrderStatusBadge(order) {
  if (order.cancelled === 'Y') return <Badge variant="danger">Cancelled</Badge>
  if (order.delivered === 'Y') return <Badge variant="success">Delivered</Badge>
  if (order.Shipped === 'Y') return <Badge variant="info">In Transit</Badge>
  if (order.packed === 'Y') return <Badge variant="purple">Packed</Badge>
  if (order.accepted === 'Y') return <Badge variant="primary">Accepted</Badge>
  return <Badge variant="warning">Pending</Badge>
}

function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('month')
  const [dashboardData, setDashboardData] = useState(null)
  const [totalProducts, setTotalProducts] = useState(0)

  // Navigate to orders page with specific tab filter
  const navigateToOrders = (tab = 'all') => {
    navigate(`/orders?tab=${tab}`)
  }

  // Navigate to specific order
  const navigateToOrder = (orderId) => {
    navigate(`/orders?expand=${orderId}`)
  }

  useEffect(() => {
    loadDashboardData()
  }, [period])

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const selectedPeriod = PERIOD_OPTIONS.find(p => p.key === period) || PERIOD_OPTIONS[2]

      // Load dashboard data
      const response = await dashboardService.getDashboardData({
        wh_account_id: user?.wh_account_id,
        days: selectedPeriod.days,
        items: 5,
      })

      if (response.status === 1) {
        setDashboardData(response.data)
      }

      // Load products count
      const productsResponse = await productService.getShipperProductsTotalCount(
        user?.wh_account_id
      )
      if (productsResponse.status === 1) {
        setTotalProducts(productsResponse.data?.total || 0)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData(true)
  }

  // Prepare chart data from order counts
  const getOrderStatusChartData = () => {
    if (!dashboardData?.latest_ai_orders_count) return []

    const counts = dashboardData.latest_ai_orders_count
    return [
      { name: 'Pending', value: counts.Pending || 0, color: STATUS_COLORS.Pending },
      { name: 'Accepted', value: counts.Accepted || 0, color: STATUS_COLORS.Accepted },
      { name: 'Packed', value: counts.Packed || 0, color: STATUS_COLORS.Packed },
      { name: 'In Transit', value: counts.Intransit || 0, color: STATUS_COLORS.Intransit },
      { name: 'Delivered', value: counts.Delivered || 0, color: STATUS_COLORS.Delivered },
      { name: 'Cancelled', value: counts.Cancelled || 0, color: STATUS_COLORS.Cancelled },
    ].filter(item => item.value > 0)
  }

  // Get earnings from statement details
  const getEarnings = () => {
    if (!dashboardData?.statementdetails) return []
    return dashboardData.statementdetails.flatMap(section =>
      section.section_value?.map(item => ({
        name: item.head_name,
        value: parseFloat(item.total_val) || 0,
      })) || []
    )
  }

  if (loading) {
    return <PageLoader />
  }

  const orderCounts = dashboardData?.latest_ai_orders_count || {}
  const statementBalance = dashboardData?.statement_balance || {}
  const recentOrders = dashboardData?.latest_ai_orders || []
  const chartData = getOrderStatusChartData()
  const earnings = getEarnings()
  const totalEarnings = earnings.reduce((sum, e) => sum + e.value, 0)

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Welcome back, {user?.firstname}!
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">
            Here's your store performance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-gray-100 dark:bg-dark-border rounded-lg p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === p.key
                    ? 'bg-white dark:bg-dark-bg text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-dark-muted dark:hover:text-dark-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Orders"
          value={orderCounts.Total || 0}
          icon={ShoppingCart}
          color="blue"
          onClick={() => navigateToOrders('all')}
        />
        <StatCard
          title="Pending"
          value={orderCounts.Pending || 0}
          icon={Clock}
          color="orange"
          onClick={() => navigateToOrders('pending')}
        />
        <StatCard
          title="Accepted"
          value={orderCounts.Accepted || 0}
          icon={CheckCircle}
          color="blue"
          onClick={() => navigateToOrders('accepted')}
        />
        <StatCard
          title="In Transit"
          value={orderCounts.Intransit || 0}
          icon={Truck}
          color="indigo"
          onClick={() => navigateToOrders('shipped')}
        />
        <StatCard
          title="Delivered"
          value={orderCounts.Delivered || 0}
          icon={PackageCheck}
          color="green"
          onClick={() => navigateToOrders('delivered')}
        />
        <StatCard
          title="Cancelled"
          value={orderCounts.Cancelled || 0}
          icon={XCircle}
          color="red"
          onClick={() => navigateToOrders('all')}
        />
      </div>

      {/* Charts and Order Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-500" />
              Order Status Breakdown
            </CardTitle>
            <span className="text-sm text-gray-500 dark:text-dark-muted">
              Last {PERIOD_OPTIONS.find(p => p.key === period)?.days || 30} days
            </span>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [value, 'Orders']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 dark:text-dark-muted">No orders in this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-600 dark:text-primary-400">Total Products</p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{totalProducts}</p>
                </div>
                <Box className="h-8 w-8 text-primary-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <OrderStatusCard
                status="Packed"
                count={orderCounts.Packed || 0}
                color={STATUS_COLORS.Packed}
                icon={Package}
              />
              <OrderStatusCard
                status="Shipped"
                count={orderCounts.Shipped || 0}
                color={STATUS_COLORS.Shipped}
                icon={Truck}
              />
            </div>

            {/* Order Fulfillment Rate */}
            <div className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-dark-muted">Fulfillment Rate</span>
                <span className="text-sm font-semibold text-green-600">
                  {orderCounts.Total > 0
                    ? Math.round((orderCounts.Delivered / orderCounts.Total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${orderCounts.Total > 0
                      ? Math.round((orderCounts.Delivered / orderCounts.Total) * 100)
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Statement & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              Account Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
              <p className="text-sm text-gray-500 dark:text-dark-muted">Opening Balance</p>
              <p className="text-xl font-bold text-gray-900 dark:text-dark-text mt-1">
                {formatCurrency(statementBalance.opening_balance || 0)}
              </p>
            </div>

            {/* Earnings Breakdown */}
            {earnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-dark-text">Earnings</p>
                {earnings.map((earning, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-green-700 dark:text-green-400">{earning.name}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(earning.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-600 dark:text-primary-400">Closing Balance</p>
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                {formatCurrency(statementBalance.closing_balance || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Recent Orders
            </CardTitle>
            <Link
              to="/orders"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigateToOrder(order.id)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-dark-text">
                            #{order.invoice_no}
                          </span>
                          {getOrderStatusBadge(order)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-muted">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {order.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(order.order_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <MapPin className="h-3 w-3" />
                          {order.city}, {order.state}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-dark-text">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Payout: {formatCurrency(order.shipper_payout)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.total_product_quantity} item{order.total_product_quantity > 1 ? 's' : ''}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 dark:text-dark-muted">No orders in this period</p>
                <p className="text-sm text-gray-400 mt-1">
                  Orders will appear here when customers place them
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Order Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {[
              { label: 'Pending', count: orderCounts.Pending || 0, color: STATUS_COLORS.Pending, icon: Clock },
              { label: 'Accepted', count: orderCounts.Accepted || 0, color: STATUS_COLORS.Accepted, icon: CheckCircle },
              { label: 'Packed', count: orderCounts.Packed || 0, color: STATUS_COLORS.Packed, icon: Package },
              { label: 'Shipped', count: orderCounts.Shipped || 0, color: STATUS_COLORS.Shipped, icon: Truck },
              { label: 'In Transit', count: orderCounts.Intransit || 0, color: STATUS_COLORS.Intransit, icon: Truck },
              { label: 'Delivered', count: orderCounts.Delivered || 0, color: STATUS_COLORS.Delivered, icon: PackageCheck },
            ].map((stage, index, array) => (
              <div key={stage.label} className="flex items-center">
                <div className="text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    <stage.icon className="h-6 w-6" style={{ color: stage.color }} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stage.count}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">{stage.label}</p>
                </div>
                {index < array.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-300 mx-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
