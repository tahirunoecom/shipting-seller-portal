import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService, DRIVER_STATUS } from '@/services'
import { Modal } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import {
  notifyDeliveryReminder,
  notifyDeliveryCompleted,
  startDeliveryReminder,
  stopDeliveryReminder,
} from '@/utils/notifications'
import {
  ArrowLeft,
  MapPin,
  Package,
  Navigation,
  Phone,
  CheckCircle,
  Camera,
  RefreshCw,
  Truck,
  ChevronRight,
  X,
  Shield,
  FileText,
  Clock,
  DollarSign,
  ExternalLink,
  User,
  Store,
  CircleDot,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Status configuration
const STATUS_CONFIG = {
  1: { label: 'Go to Pickup', nextStatus: 2, color: 'violet' },
  2: { label: 'Arrived at Store', nextStatus: 4, color: 'violet' },
  4: { label: 'Confirm Pickup', nextStatus: 3, color: 'amber', showModal: true },
  3: { label: 'Start Delivery', nextStatus: 5, color: 'violet' },
  5: { label: 'Arrived at Customer', nextStatus: 6, color: 'blue' },
  6: { label: 'Complete Delivery', nextStatus: 7, color: 'emerald', showDeliveryModal: true },
}

const STATUS_LABELS = {
  1: 'Accepted',
  2: 'Going to Store',
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
      const targetOrderId = parseInt(orderId)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.id,
        order_id: targetOrderId,
      })

      if ((response.status === 1 || response.status === 0) && response.data?.length > 0) {
        const foundOrder = response.data.find(o => o.id === targetOrderId) || response.data[0]
        setOrder(foundOrder)
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
    const statusCode = typeof order.driver_order_status === 'object'
      ? order.driver_order_status?.driver_order_status
      : order.driver_order_status

    if (statusCode && statusCode >= 1 && statusCode < 7) {
      startDeliveryReminder(order, (o) => notifyDeliveryReminder(o, 5), 5)
    }
    return () => {
      if (order?.id) stopDeliveryReminder(order.id)
    }
  }, [order])

  const getStatusCode = () => {
    if (!order) return 0
    const status = order.driver_order_status
    if (typeof status === 'object') return status.driver_order_status || status.status || 0
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
        stopDeliveryReminder(order.id)
        notifyDeliveryCompleted(order)
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

  const getStepIndex = (status) => {
    return STATUS_STEPS.findIndex(s => s.status === status)
  }

  const openNavigation = () => {
    const statusCode = getStatusCode()
    const address = statusCode < 3
      ? `${order.pickup?.store_address || order.pickup?.address}, ${order.pickup?.store_city || order.pickup?.city}`
      : `${order.drop_off?.address}, ${order.drop_off?.city}`
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
  }

  const callContact = () => {
    const statusCode = getStatusCode()
    const phone = statusCode < 3 ? order.shipper_phone : (order.customer_phone || order.phone)
    if (phone) window.open(`tel:${phone}`, '_blank')
    else toast.error('No phone number available')
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) return null

  const statusCode = getStatusCode()
  const buttonConfig = STATUS_CONFIG[statusCode]
  const isDelivered = statusCode === 7
  const orderAmount = order.order_amount || order.total_amount || 0
  const isAtPickup = statusCode < 3
  const currentStepIndex = getStepIndex(statusCode)

  return (
    <div className="space-y-4 pb-24">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Order #{order.id}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                isDelivered ? 'text-emerald-600' : 'text-violet-600'
              }`}>
                <CircleDot className="w-3 h-3" />
                {STATUS_LABELS[statusCode]}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Small buttons */}
        {!isDelivered && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={openNavigation}
              className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              title="Navigate"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={callContact}
              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Order Summary Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              {order.store_img && !imgError ? (
                <img src={order.store_img} alt="" className="w-full h-full object-cover rounded-xl" onError={() => setImgError(true)} />
              ) : (
                <Store className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {order.store_name || order.shipper_name || 'Store'}
              </h3>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {order.total_product || 1} items
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {order.time || order.minutes_to_be_delivered_on || '15'} min
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(orderAmount)}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>

      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delivery Progress</h3>
          <span className="text-xs text-slate-500">{Math.min(currentStepIndex + 1, STATUS_STEPS.length)}/{STATUS_STEPS.length}</span>
        </div>
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
          {/* Progress bar fill */}
          <div
            className="absolute top-3 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step, index) => {
              const isComplete = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isComplete
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  } ${isCurrent ? 'ring-2 ring-violet-200 dark:ring-violet-900/50 ring-offset-1' : ''}`}>
                    {isComplete && index < currentStepIndex ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-[9px] mt-1.5 font-medium text-center ${
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

      {/* Active Location Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
          isAtPickup
            ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {isAtPickup ? 'Pickup Location' : 'Delivery Location'}
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isAtPickup
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
            }`}>
              {isAtPickup ? <Store className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              {isAtPickup ? (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {order.store_name || order.shipper_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {order.pickup?.store_address || order.pickup?.address}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.pickup?.store_city || order.pickup?.city}, {order.pickup?.store_state || order.pickup?.state} {order.pickup?.store_zip_code || order.pickup?.zip_code}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {order.customer_name || order.firstname || 'Customer'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {order.drop_off?.address}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.drop_off?.city}, {order.drop_off?.state} {order.drop_off?.zip_code}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={openNavigation}
              className={`p-2.5 rounded-lg transition-colors ${
                isAtPickup
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Route Overview (Collapsed) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {order.pickup?.store_city || order.pickup?.city}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 text-slate-300 dark:text-slate-600">
            <div className="w-8 h-px bg-current" />
            <span className="text-[10px] font-medium">{order.distance || '0 mi'}</span>
            <div className="w-8 h-px bg-current" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {order.drop_off?.city}
            </p>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Customer Notes */}
      {order.customer_message && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Note</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">{order.customer_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Success */}
      {isDelivered && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">Delivered Successfully</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Order completed</p>
        </div>
      )}

      {/* Fixed Bottom Action Button */}
      {buttonConfig && !isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 lg:left-64">
          <button
            onClick={handleActionClick}
            disabled={processing}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg ${
              buttonConfig.color === 'violet' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/25' :
              buttonConfig.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25' :
              buttonConfig.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/25' :
              'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {buttonConfig.label}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Pickup Confirmation Modal */}
      <Modal isOpen={showPickupModal} onClose={() => setShowPickupModal(false)} title="Confirm Pickup" size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Truck className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{order.store_name || order.shipper_name}</h4>
                <p className="text-sm text-slate-500">{order.total_product} items • {formatCurrency(orderAmount)}</p>
              </div>
            </div>
          </div>

          <div className="text-center py-2">
            <Package className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Have you collected all items?</p>
          </div>

          <button
            onClick={() => handleStatusUpdate(3)}
            disabled={processing}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Pickup'}
          </button>
        </div>
      </Modal>

      {/* Delivery Completion Modal */}
      <Modal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} title="Complete Delivery" size="lg">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Package was</p>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-sm ${
                deliveryForm.package_received_by === 'Received by Person'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
                <input type="radio" name="received_by" className="sr-only" checked={deliveryForm.package_received_by === 'Received by Person'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Received by Person' }))} />
                <User className="w-4 h-4" />
                <span className="font-medium">In Person</span>
              </label>
              <label className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-sm ${
                deliveryForm.package_received_by === 'Safe Dropped'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
                <input type="radio" name="received_by" className="sr-only" checked={deliveryForm.package_received_by === 'Safe Dropped'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Safe Dropped' }))} />
                <Package className="w-4 h-4" />
                <span className="font-medium">Safe Drop</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Photo Proof</p>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4">
              {deliveryForm.delivery_proof_preview ? (
                <div className="flex items-center gap-3">
                  <img src={deliveryForm.delivery_proof_preview} alt="Proof" className="w-16 h-16 rounded-lg object-cover" />
                  <button onClick={() => setDeliveryForm(prev => ({ ...prev, delivery_proof: null, delivery_proof_preview: null }))}
                    className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-4 cursor-pointer">
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Add Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer">
            <input type="checkbox" checked={deliveryForm.visible_drunk}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, visible_drunk: e.target.checked }))}
              className="w-4 h-4 rounded text-violet-500 focus:ring-violet-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Receiver appeared intoxicated</span>
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notes</p>
            <textarea placeholder="Optional notes..." value={deliveryForm.driver_note}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_note: e.target.value }))}
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl resize-none h-20 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-900" />
          </div>

          <button onClick={handleCompleteDelivery} disabled={processing}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
              <><CheckCircle className="w-5 h-5" /> Complete Delivery</>
            )}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default DriverOrderDetailPage
