import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store'
import { adminService } from '@/services'
import { Card, CardContent } from '@/components/ui'
import {
  Users,
  Store,
  Search,
  ChevronRight,
  Truck,
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  LogIn,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const { setShippers, shippers: storeShippers, selectShipper, setLoading, isLoading } = useAdminStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, approved, pending, rejected
  const [authError, setAuthError] = useState(false)

  // Ensure shippers is always an array
  const shippers = Array.isArray(storeShippers) ? storeShippers : []

  // Fetch shippers on mount
  useEffect(() => {
    fetchShippers()
  }, [])

  const fetchShippers = async () => {
    setLoading(true)
    setAuthError(false)
    try {
      const response = await adminService.getAllShippers()
      if (response.status === 1) {
        // API returns data nested in getAllShippersForAdmin
        const shippersList = response.data?.getAllShippersForAdmin || response.data || []
        setShippers(shippersList)
      } else {
        toast.error(response.message || 'Failed to fetch shippers')
      }
    } catch (error) {
      console.error('Error fetching shippers:', error)
      if (error.response?.status === 401 || error.isAdminAuthError) {
        setAuthError(true)
      } else {
        toast.error('Failed to fetch shippers')
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper to get shipper display name
  const getShipperName = (shipper) => {
    if (shipper.company) return shipper.company
    if (shipper.store_name) return shipper.store_name
    if (shipper.firstname || shipper.lastname) {
      return `${shipper.firstname || ''} ${shipper.lastname || ''}`.trim()
    }
    return shipper.name || 'Unnamed Shipper'
  }

  // Filter shippers based on search and status
  const filteredShippers = shippers.filter(shipper => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const shipperName = getShipperName(shipper).toLowerCase()
    const matchesSearch = !searchQuery ||
      shipperName.includes(searchLower) ||
      (shipper.email?.toLowerCase().includes(searchLower)) ||
      (shipper.phone?.includes(searchQuery)) ||
      (shipper.telephone?.includes(searchQuery)) ||
      (shipper.wh_account_id?.toString().includes(searchQuery)) ||
      (shipper.id?.toString().includes(searchQuery))

    // Status filter
    const isApproved = shipper.approved === 1 || shipper.approved === '1'
    const isRejected = shipper.rejected === 1 || shipper.rejected === '1'
    const isPending = !isApproved && !isRejected

    let matchesStatus = true
    if (filterStatus === 'approved') matchesStatus = isApproved
    else if (filterStatus === 'pending') matchesStatus = isPending
    else if (filterStatus === 'rejected') matchesStatus = isRejected

    return matchesSearch && matchesStatus
  })

  const handleSelectShipper = (shipper) => {
    selectShipper(shipper)
    navigate(`/admin/shipper/${shipper.wh_account_id || shipper.id}`)
  }

  const getStatusBadge = (shipper) => {
    const isApproved = shipper.approved === 1 || shipper.approved === '1'
    const isRejected = shipper.rejected === 1 || shipper.rejected === '1'

    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      )
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }

  // Helper to check if value is truthy (handles 1, '1', 'Y', 'y', true)
  const isTruthy = (value) => {
    return value === 1 || value === '1' || value === 'Y' || value === 'y' || value === true
  }

  const getAccountTypeBadges = (shipper) => {
    const badges = []
    // Check multiple possible field names for seller
    const isSeller = isTruthy(shipper.scanSell) || isTruthy(shipper.scan_sell) || isTruthy(shipper.is_seller)
    // Check multiple possible field names for driver
    const isDriver = isTruthy(shipper.localDelivery) || isTruthy(shipper.local_delivery) || isTruthy(shipper.is_driver)

    if (isSeller) {
      badges.push(
        <span key="seller" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Store className="w-3 h-3" />
          Seller
        </span>
      )
    }
    if (isDriver) {
      badges.push(
        <span key="driver" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
          <Truck className="w-3 h-3" />
          Driver
        </span>
      )
    }

    return badges.length > 0 ? badges : (
      <span className="text-xs text-slate-400">No type set</span>
    )
  }

  // Stats
  const totalShippers = shippers.length
  const approvedCount = shippers.filter(s => isTruthy(s.approved)).length
  const pendingCount = shippers.filter(s => {
    const isApproved = isTruthy(s.approved)
    const isRejected = isTruthy(s.rejected)
    return !isApproved && !isRejected
  }).length
  const sellerCount = shippers.filter(s => isTruthy(s.scanSell) || isTruthy(s.scan_sell) || isTruthy(s.is_seller)).length
  const driverCount = shippers.filter(s => isTruthy(s.localDelivery) || isTruthy(s.local_delivery) || isTruthy(s.is_driver)).length

  // Show auth error state
  if (authError) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Authentication Required
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                To access the Admin Panel, you need to be logged in as a shipper first.
                The admin features work alongside your shipper account session.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  Login as Shipper
                </Link>
                <button
                  onClick={fetchShippers}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Shippers</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and view all registered shippers
          </p>
        </div>
        <button
          onClick={fetchShippers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalShippers}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{approvedCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Approved</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{sellerCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sellers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{driverCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Drivers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone, or ID..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2">
              {['all', 'approved', 'pending', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shippers List */}
      {isLoading ? (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="mt-4 text-slate-500 dark:text-slate-400">Loading shippers...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredShippers.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">
                {searchQuery || filterStatus !== 'all'
                  ? 'No shippers match your search criteria'
                  : 'No shippers found'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShippers.map((shipper) => (
            <Card
              key={shipper.id || shipper.wh_account_id}
              className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectShipper(shipper)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {shipper.logo ? (
                      <img
                        src={shipper.logo}
                        alt={getShipperName(shipper)}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {getShipperName(shipper).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {getShipperName(shipper)}
                      </h3>
                      {getStatusBadge(shipper)}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {shipper.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400">
                        ID: {shipper.wh_account_id || shipper.id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span className="text-xs text-slate-400">
                        {shipper.telephone || shipper.phone || 'No phone'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <div className="flex items-center gap-1">
                        {getAccountTypeBadges(shipper)}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredShippers.length > 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredShippers.length} of {totalShippers} shippers
        </p>
      )}
    </div>
  )
}

export default AdminDashboardPage
