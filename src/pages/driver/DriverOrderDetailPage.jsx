import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { driverService, DRIVER_STATUS } from '@/services'
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalFooter,
  Input,
  PageLoader,
} from '@/components/ui'
import { formatCurrency } from '@/utils/helpers'
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  Navigation,
  Map,
  MessageSquare,
  Trash2,
  Store,
  Phone,
  CheckCircle,
  Camera,
  Circle,
  Hash,
  Timer,
  DollarSign,
  FileText,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Status button configuration
const STATUS_CONFIG = {
  1: { label: 'Go to Pickup', nextStatus: 2, color: 'bg-emerald-500 hover:bg-emerald-600' },
  2: { label: 'Reached at Store', nextStatus: 4, color: 'bg-emerald-500 hover:bg-emerald-600' },
  4: { label: 'Confirm Pickup', nextStatus: 3, color: 'bg-amber-500 hover:bg-amber-600', showModal: true },
  3: { label: 'On The Way', nextStatus: 5, color: 'bg-emerald-500 hover:bg-emerald-600' },
  5: { label: 'Reached at Customer', nextStatus: 6, color: 'bg-blue-500 hover:bg-blue-600' },
  6: { label: 'Complete Delivery', nextStatus: 7, color: 'bg-emerald-500 hover:bg-emerald-600', showDeliveryModal: true },
}

// Status labels for display
const STATUS_LABELS = {
  1: 'Order Accepted',
  2: 'Going to Pickup',
  3: 'Picked Up',
  4: 'At Store',
  5: 'On The Way',
  6: 'At Customer',
  7: 'Delivered',
}

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
        driver_id: user.wh_account_id,
        order_id: parseInt(orderId),
      })

      console.log('Order detail response:', response)

      if (response.status === 1 && response.data?.length > 0) {
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
  }, [orderId, user.wh_account_id, navigate])

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
        driver_id: user.wh_account_id,
        status: nextStatus,
      })

      console.log('Status update response:', response)

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
        driver_id: user.wh_account_id,
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

  if (loading) return <PageLoader />
  if (!order) return null

  const statusCode = getStatusCode()
  const buttonConfig = STATUS_CONFIG[statusCode]
  const isDelivered = statusCode === 7
  const orderAmount = order.order_amount || order.total_amount || 0

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-dark-muted" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              Order #{order.id}
            </h1>
            <p className="text-xs text-gray-500">{STATUS_LABELS[statusCode] || 'Processing'}</p>
          </div>
        </div>
        <Badge variant={isDelivered ? 'success' : 'info'}>
          {STATUS_LABELS[statusCode] || 'Active'}
        </Badge>
      </div>

      {/* Timer Card */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-slate-300" />
          <span className="text-sm font-medium">Elapsed Time</span>
        </div>
        <span className="font-mono text-xl font-semibold">{formatTimer()}</span>
      </div>

      {/* Order Info Card */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
        {/* Store Info */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-border overflow-hidden flex-shrink-0">
              {order.store_img ? (
                <img
                  src={order.store_img}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div className={`w-full h-full items-center justify-center ${order.store_img ? 'hidden' : 'flex'}`}>
                <Store className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-dark-text">
                {order.store_name || order.shipper_name || 'Store'}
              </h3>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {order.total_product} items
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {order.distance || '0 Miles'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              {formatCurrency(orderAmount)}
            </p>
            <p className="text-xs text-gray-500">Trip fare</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="p-4 space-y-3">
          {/* Pickup */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Circle className="w-3 h-3 text-emerald-600 fill-current" />
              </div>
              <div className="w-0.5 h-8 bg-gray-200 dark:bg-dark-border my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">PICKUP</p>
              <p className="text-sm text-gray-800 dark:text-dark-text">
                {order.pickup?.store_address || order.pickup?.address || 'N/A'}, {order.pickup?.store_city || order.pickup?.city || ''}, {order.pickup?.store_state || order.pickup?.state || ''} {order.pickup?.store_zip_code || order.pickup?.zip_code || ''}
              </p>
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">DROP OFF</p>
              <p className="text-sm text-gray-800 dark:text-dark-text">
                {order.drop_off?.address || 'N/A'}, {order.drop_off?.city || ''}, {order.drop_off?.state || ''} {order.drop_off?.zip_code || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.customer_message && (
          <div className="px-4 pb-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Customer Notes</p>
              <p className="text-sm text-amber-800 dark:text-amber-200">{order.customer_message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!isDelivered && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              const address = statusCode < 3
                ? `${order.pickup?.store_address || order.pickup?.address}, ${order.pickup?.store_city || order.pickup?.city}`
                : `${order.drop_off?.address}, ${order.drop_off?.city}`
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
            }}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            <Map className="h-5 w-5" />
            <span className="text-xs font-medium">Navigate</span>
          </button>
          <button
            onClick={() => {
              const phone = statusCode < 3 ? order.shipper_phone : (order.customer_phone || order.phone)
              if (phone) window.open(`tel:${phone}`, '_blank')
              else toast.error('No phone number available')
            }}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span className="text-xs font-medium">Call</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors dark:bg-dark-border dark:text-dark-muted"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-xs font-medium">Cancel</span>
          </button>
        </div>
      )}

      {/* Main Action Button */}
      {buttonConfig && !isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-card border-t dark:border-dark-border lg:left-64">
          <button
            onClick={handleActionClick}
            disabled={processing}
            className={`w-full py-3.5 text-white font-semibold rounded-xl transition-all ${buttonConfig.color} disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {processing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              buttonConfig.label
            )}
          </button>
        </div>
      )}

      {/* Delivered State */}
      {isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-card border-t dark:border-dark-border lg:left-64">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl py-3.5 text-center font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
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
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-border flex items-center justify-center">
                <Store className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{order.store_name || order.shipper_name}</h4>
                <p className="text-xs text-gray-500">{order.total_product} items • {formatCurrency(orderAmount)}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-dark-muted text-center">
            Have you collected all items from the store?
          </p>

          <button
            onClick={() => handleStatusUpdate(3)}
            disabled={processing}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Yes, Confirm Pickup'}
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
            <p className="text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Package was</p>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                deliveryForm.package_received_by === 'Received by Person'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="received_by"
                  className="sr-only"
                  checked={deliveryForm.package_received_by === 'Received by Person'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Received by Person' }))}
                />
                <span className="text-sm font-medium">Received by Person</span>
              </label>
              <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                deliveryForm.package_received_by === 'Safe Dropped'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="received_by"
                  className="sr-only"
                  checked={deliveryForm.package_received_by === 'Safe Dropped'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Safe Dropped' }))}
                />
                <span className="text-sm font-medium">Safe Dropped</span>
              </label>
            </div>
          </div>

          {/* Proof of Delivery */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Proof of Delivery</p>
            <div className="border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl p-4">
              {deliveryForm.delivery_proof_preview ? (
                <div className="flex items-center gap-3">
                  <img src={deliveryForm.delivery_proof_preview} alt="Proof" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => setDeliveryForm(prev => ({ ...prev, delivery_proof: null, delivery_proof_preview: null }))}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-4 cursor-pointer">
                  <Camera className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Tap to upload photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryForm.visible_drunk}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, visible_drunk: e.target.checked }))}
              className="w-4 h-4 rounded text-emerald-500"
            />
            <span className="text-sm text-gray-700 dark:text-dark-text">Receiver appeared intoxicated</span>
          </label>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Notes (Optional)</p>
            <textarea
              placeholder="Add any delivery notes..."
              value={deliveryForm.driver_note}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_note: e.target.value }))}
              className="w-full p-3 border border-gray-200 dark:border-dark-border rounded-xl resize-none h-20 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-dark-card"
            />
          </div>

          {/* Complete Button */}
          <button
            onClick={handleCompleteDelivery}
            disabled={processing}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Complete Delivery'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default DriverOrderDetailPage
