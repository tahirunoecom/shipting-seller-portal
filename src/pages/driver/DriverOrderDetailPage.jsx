import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService, DRIVER_STATUS } from '@/services'
import { Modal } from '@/components/ui'
import { formatCurrency } from '@/utils/helpers'
import {
  ArrowLeft,
  MapPin,
  Package,
  Navigation,
  Map,
  Trash2,
  Phone,
  CheckCircle,
  Camera,
  Timer,
  RefreshCw,
  Truck,
  ChevronRight,
  Sparkles,
  Route,
  Clock,
  X,
  Shield,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Status configuration with violet/indigo theme
const STATUS_CONFIG = {
  1: { label: 'Go to Pickup', nextStatus: 2, gradient: 'from-violet-600 to-indigo-600' },
  2: { label: 'Reached at Store', nextStatus: 4, gradient: 'from-violet-600 to-indigo-600' },
  4: { label: 'Confirm Pickup', nextStatus: 3, gradient: 'from-amber-500 to-orange-500', showModal: true },
  3: { label: 'On The Way', nextStatus: 5, gradient: 'from-violet-600 to-indigo-600' },
  5: { label: 'Reached at Customer', nextStatus: 6, gradient: 'from-blue-500 to-cyan-500' },
  6: { label: 'Complete Delivery', nextStatus: 7, gradient: 'from-emerald-500 to-teal-500', showDeliveryModal: true },
}

const STATUS_LABELS = {
  1: 'Order Accepted',
  2: 'Going to Pickup',
  3: 'Picked Up',
  4: 'At Store',
  5: 'On The Way',
  6: 'At Customer',
  7: 'Delivered',
}

const STATUS_STEPS = [
  { status: 1, label: 'Accepted' },
  { status: 2, label: 'Going' },
  { status: 4, label: 'At Store' },
  { status: 3, label: 'Picked Up' },
  { status: 5, label: 'En Route' },
  { status: 6, label: 'Arrived' },
  { status: 7, label: 'Done' },
]

function DriverOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [pickupTime, setPickupTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [imgError, setImgError] = useState(false)

  const [deliveryForm, setDeliveryForm] = useState({
    package_received_by: 'Received by Person',
    delivery_proof: null,
    delivery_proof_preview: null,
    customer_signature: null,
    visible_drunk: false,
    driver_note: '',
  })

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.id,
        order_id: parseInt(orderId),
      })

      if ((response.status === 1 || response.status === 0) && response.data?.length > 0) {
        setOrder(response.data[0])
      } else {
        toast.error('Order not found')
        navigate('/driver/orders')
      }
    } catch (error) {
      console.error('Failed to load order:', error)
      toast.error('Failed to load order details')
      navigate('/driver/orders')
    } finally {
      setLoading(false)
    }
  }, [orderId, user.id, navigate])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  useEffect(() => {
    if (!order) return
    const interval = setInterval(() => {
      const orderDate = new Date(order.order_date)
      const now = new Date()
      const diff = Math.floor((now - orderDate) / 1000)
      setPickupTime({
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [order])

  const getStatusCode = () => {
    if (!order) return 0
    const status = order.driver_order_status
    if (typeof status === 'object') {
      return status.driver_order_status || status.status || 0
    }
    return status || 0
  }

  const handleStatusUpdate = async (nextStatus) => {
    try {
      setProcessing(true)
      const response = await driverService.changeDriverOrderStatus({
        order_id: order.id,
        driver_id: user.id,
        user_id: user.id,
        status: nextStatus,
      })

      if (response.status === 1 || response.code === 200 || response.status === 0) {
        toast.success('Status updated!')
        loadOrder()
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setProcessing(false)
      setShowPickupModal(false)
    }
  }

  const handleCompleteDelivery = async () => {
    try {
      setProcessing(true)
      const response = await driverService.completeDelivery({
        order_id: order.id,
        driver_id: user.id,
        user_id: user.id,
        package_received_by: deliveryForm.package_received_by,
        driver_note: deliveryForm.driver_note,
        visible_drunk: deliveryForm.visible_drunk,
        delivery_proof: deliveryForm.delivery_proof,
        customer_signature: deliveryForm.customer_signature,
      })

      if (response.status === 1 || response.code === 200 || response.status === 0) {
        toast.success('Delivery completed!')
        navigate('/driver/deliveries', { state: { completed: order } })
      } else {
        toast.error(response.message || 'Failed to complete delivery')
      }
    } catch (error) {
      console.error('Failed to complete delivery:', error)
      toast.error('Failed to complete delivery')
    } finally {
      setProcessing(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setDeliveryForm(prev => ({
        ...prev,
        delivery_proof: file,
        delivery_proof_preview: URL.createObjectURL(file),
      }))
    }
  }

  const handleActionClick = () => {
    const statusCode = getStatusCode()
    const config = STATUS_CONFIG[statusCode]
    if (!config) return
    if (config.showModal) setShowPickupModal(true)
    else if (config.showDeliveryModal) setShowDeliveryModal(true)
    else handleStatusUpdate(config.nextStatus)
  }

  const formatTimer = () => {
    const { hours, minutes, seconds } = pickupTime
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Get step index for progress
  const getStepIndex = (status) => {
    return STATUS_STEPS.findIndex(s => s.status === status)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse mx-auto" />
            <Package className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) return null

  const statusCode = getStatusCode()
  const buttonConfig = STATUS_CONFIG[statusCode]
  const isDelivered = statusCode === 7
  const orderAmount = order.order_amount || order.total_amount || 0
  const currentStepIndex = getStepIndex(statusCode)

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Order #{order.id}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{STATUS_LABELS[statusCode] || 'Processing'}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-medium text-sm ${
          isDelivered
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
        }`}>
          {isDelivered ? 'Completed' : 'Active'}
        </div>
      </div>

      {/* Timer Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Timer className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Elapsed Time</p>
              <p className="text-white text-2xl font-mono font-bold">{formatTimer()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Earnings</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(orderAmount)}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Delivery Progress</h3>
          <span className="text-xs text-slate-500">{Math.min(currentStepIndex + 1, STATUS_STEPS.length)}/{STATUS_STEPS.length}</span>
        </div>
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-3 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          {/* Progress bar fill */}
          <div
            className="absolute top-3 left-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step, index) => {
              const isComplete = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isComplete
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  } ${isCurrent ? 'ring-4 ring-violet-200 dark:ring-violet-900/50' : ''}`}>
                    {isComplete && index < currentStepIndex ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-2 font-medium ${
                    isComplete ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Store & Route Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Store Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
                {order.store_img && !imgError ? (
                  <img
                    src={order.store_img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Truck className="w-7 h-7 text-violet-500" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                {order.store_name || order.shipper_name || 'Pickup Point'}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Package className="w-4 h-4" />
                  {order.total_product || 1} items
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Route className="w-4 h-4" />
                  {order.distance || '2.5 mi'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Route Visualization */}
        <div className="p-5">
          <div className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
              <div className="w-0.5 flex-1 my-2 bg-gradient-to-b from-violet-500 via-purple-500 to-indigo-500" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Addresses */}
            <div className="flex-1 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Pickup Location</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {order.pickup?.store_address || order.pickup?.address || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {order.pickup?.store_city || order.pickup?.city || ''}, {order.pickup?.store_state || order.pickup?.state || ''} {order.pickup?.store_zip_code || order.pickup?.zip_code || ''}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Dropoff Location</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {order.drop_off?.address || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {order.drop_off?.city || ''}, {order.drop_off?.state || ''} {order.drop_off?.zip_code || ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Notes */}
        {order.customer_message && (
          <div className="px-5 pb-5">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Customer Notes</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{order.customer_message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!isDelivered && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              const address = statusCode < 3
                ? `${order.pickup?.store_address || order.pickup?.address}, ${order.pickup?.store_city || order.pickup?.city}`
                : `${order.drop_off?.address}, ${order.drop_off?.city}`
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
          >
            <Map className="w-6 h-6" />
            <span className="text-xs font-semibold">Navigate</span>
          </button>
          <button
            onClick={() => {
              const phone = statusCode < 3 ? order.shipper_phone : (order.customer_phone || order.phone)
              if (phone) window.open(`tel:${phone}`, '_blank')
              else toast.error('No phone number available')
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
          >
            <Phone className="w-6 h-6" />
            <span className="text-xs font-semibold">Call</span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <X className="w-6 h-6" />
            <span className="text-xs font-semibold">Cancel</span>
          </button>
        </div>
      )}

      {/* Main Action Button */}
      {buttonConfig && !isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 lg:left-64">
          <button
            onClick={handleActionClick}
            disabled={processing}
            className={`w-full relative overflow-hidden bg-gradient-to-r ${buttonConfig.gradient} text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {buttonConfig.label}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </span>
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>
        </div>
      )}

      {/* Delivered State */}
      {isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 lg:left-64">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl py-4 text-center font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25">
            <CheckCircle className="w-6 h-6" />
            Delivered Successfully
          </div>
        </div>
      )}

      {/* Pickup Confirmation Modal */}
      <Modal
        isOpen={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        title="Confirm Pickup"
        size="md"
      >
        <div className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                <Truck className="w-7 h-7 text-violet-500" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{order.store_name || order.shipper_name}</h4>
                <p className="text-sm text-slate-500">{order.total_product} items • {formatCurrency(orderAmount)}</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Have you collected all items from the store?
            </p>
          </div>

          <button
            onClick={() => handleStatusUpdate(3)}
            disabled={processing}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
          >
            {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Yes, Confirm Pickup'}
          </button>
        </div>
      </Modal>

      {/* Delivery Completion Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title="Complete Delivery"
        size="lg"
      >
        <div className="space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Delivery Type */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Package was</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                deliveryForm.package_received_by === 'Received by Person'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="received_by"
                  className="sr-only"
                  checked={deliveryForm.package_received_by === 'Received by Person'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Received by Person' }))}
                />
                <Shield className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium">Received by Person</span>
              </label>
              <label className={`flex items-center justify-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                deliveryForm.package_received_by === 'Safe Dropped'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="received_by"
                  className="sr-only"
                  checked={deliveryForm.package_received_by === 'Safe Dropped'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Safe Dropped' }))}
                />
                <Package className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium">Safe Dropped</span>
              </label>
            </div>
          </div>

          {/* Proof of Delivery */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Proof of Delivery</p>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              {deliveryForm.delivery_proof_preview ? (
                <div className="flex items-center gap-4">
                  <img src={deliveryForm.delivery_proof_preview} alt="Proof" className="w-20 h-20 rounded-xl object-cover" />
                  <button
                    onClick={() => setDeliveryForm(prev => ({ ...prev, delivery_proof: null, delivery_proof_preview: null }))}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove photo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                  <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3">
                    <Camera className="w-7 h-7 text-violet-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tap to upload photo</span>
                  <span className="text-xs text-slate-500 mt-1">Optional but recommended</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryForm.visible_drunk}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, visible_drunk: e.target.checked }))}
              className="w-5 h-5 rounded text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Receiver appeared intoxicated</span>
          </label>

          {/* Notes */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Notes (Optional)</p>
            <textarea
              placeholder="Add any delivery notes..."
              value={deliveryForm.driver_note}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_note: e.target.value }))}
              className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl resize-none h-24 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-900"
            />
          </div>

          {/* Complete Button */}
          <button
            onClick={handleCompleteDelivery}
            disabled={processing}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Delivery
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default DriverOrderDetailPage
