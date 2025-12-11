import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageLoader } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { orderService, productService } from '@/services'
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Sample chart data - replace with real data
const chartData = [
  { name: 'Mon', orders: 12, revenue: 340 },
  { name: 'Tue', orders: 19, revenue: 520 },
  { name: 'Wed', orders: 15, revenue: 410 },
  { name: 'Thu', orders: 22, revenue: 680 },
  { name: 'Fri', orders: 28, revenue: 890 },
  { name: 'Sat', orders: 35, revenue: 1100 },
  { name: 'Sun', orders: 24, revenue: 750 },
]

function StatCard({ title, value, change, changeType, icon: Icon, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-dark-muted">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-dark-text">
              {value}
            </p>
            {change && (
              <div className="mt-2 flex items-center gap-1">
                {changeType === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    changeType === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {change}
                </span>
                <span className="text-sm text-gray-500 dark:text-dark-muted">
                  vs last week
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { user, userDetails } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Load orders
      const ordersResponse = await orderService.getShipperOrders(user.wh_account_id, {
        limit: 5,
      })
      
      if (ordersResponse.status === 1) {
        setRecentOrders(ordersResponse.data?.orders || [])
        setStats((prev) => ({
          ...prev,
          totalOrders: ordersResponse.data?.total || 0,
          pendingOrders: ordersResponse.data?.pending || 0,
        }))
      }

      // Load products count
      const productsResponse = await productService.getShipperProductsTotalCount(
        user.wh_account_id
      )
      if (productsResponse.status === 1) {
        setStats((prev) => ({
          ...prev,
          totalProducts: productsResponse.data?.total || 0,
        }))
      }

      // Set revenue from user data
      setStats((prev) => ({
        ...prev,
        totalRevenue: parseFloat(user.Shipper_earnings || 0),
      }))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Welcome back, {user?.firstname}!
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex gap-2">
          {['day', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-text'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          change="+12%"
          changeType="up"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Package}
          color="orange"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          change="+5"
          changeType="up"
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          change="+8%"
          changeType="up"
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Charts and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-500" />
              Orders Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8BC34A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8BC34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#8BC34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
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
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        #{order.id}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted">
                        {formatDate(order.date_added)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        {formatCurrency(order.total)}
                      </p>
                      <Badge
                        variant={
                          order.status === 'Delivered'
                            ? 'success'
                            : order.status === 'Pending'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-dark-muted">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent orders</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
              <p className="text-sm text-gray-500 dark:text-dark-muted">Opening Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">
                {formatCurrency(0)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">Total Earnings</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-lg dark:bg-primary-900/20">
              <p className="text-sm text-primary-600 dark:text-primary-400">Closing Balance</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
