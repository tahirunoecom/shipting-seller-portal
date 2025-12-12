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
  FileText,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Status button configuration
const STATUS_BUTTONS = {
  1: { label: 'GO TO PICK UP', nextStatus: 2, color: 'bg-[#c8e651]' },
  2: { label: 'REACHED AT STORE', nextStatus: 4, color: 'bg-[#c8e651]' },
  4: { label: 'CONFIRM PICKUP', nextStatus: 3, color: 'bg-[#c8e651]', showModal: true },
  3: { label: 'ON THE WAY', nextStatus: 5, color: 'bg-[#c8e651]' },
  5: { label: 'REACHED AT CUSTOMER', nextStatus: 6, color: 'bg-[#7de6c4]' },
  6: { label: 'DELIVERED', nextStatus: 7, color: 'bg-[#c8e651]', showDeliveryModal: true },
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

  // Pickup timer
  const [pickupTime, setPickupTime] = useState({ hours: 0, minutes: 0, seconds: 0 })

  // Delivery form
  const [deliveryForm, setDeliveryForm] = useState({
    package_received_by: 'Received by Person', // 'Received by Person' or 'Safe Dropped'
    delivery_proof: null,
    delivery_proof_preview: null,
    customer_signature: null,
    visible_drunk: false,
    driver_note: '',
  })

  // Load order details
  const loadOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response = await driverService.getDriverActiveOrders({
        driver_id: user.wh_account_id,
        order_id: parseInt(orderId),
      })

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

  // Pickup timer countdown
  useEffect(() => {
    if (!order) return

    const interval = setInterval(() => {
      // Calculate time since order was accepted (or use order date)
      const orderDate = new Date(order.order_date)
      const now = new Date()
      const diff = Math.floor((now - orderDate) / 1000)

      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      setPickupTime({ hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(interval)
  }, [order])

  // Get current status code
  const getStatusCode = () => {
    if (!order) return 0
    const status = order.driver_order_status
    if (typeof status === 'object') {
      return status.driver_order_status || 0
    }
    return status || 0
  }

  // Handle status update
  const handleStatusUpdate = async (nextStatus) => {
    try {
      setProcessing(true)
      const response = await driverService.changeDriverOrderStatus({
        order_id: order.id,
        driver_id: user.wh_account_id,
        status: nextStatus,
      })

      if (response.status === 1 || response.code === 200) {
        const messages = {
          2: 'Heading to pickup location',
          4: 'Arrived at store',
          3: 'Pickup confirmed',
          5: 'On the way to customer',
          6: 'Arrived at customer location',
        }
        toast.success(messages[nextStatus] || 'Status updated')
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

  // Handle delivery completion
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

      if (response.status === 1 || response.code === 200) {
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

  // Handle photo upload
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

  // Handle action button click
  const handleActionClick = () => {
    const statusCode = getStatusCode()
    const config = STATUS_BUTTONS[statusCode]

    if (!config) return

    if (config.showModal) {
      setShowPickupModal(true)
    } else if (config.showDeliveryModal) {
      setShowDeliveryModal(true)
    } else {
      handleStatusUpdate(config.nextStatus)
    }
  }

  // Format timer display
  const formatTimer = () => {
    const { hours, minutes, seconds } = pickupTime
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <PageLoader />
  }

  if (!order) {
    return null
  }

  const statusCode = getStatusCode()
  const buttonConfig = STATUS_BUTTONS[statusCode]
  const isDelivered = statusCode === 7

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
          #{order.id}
        </h1>
      </div>

      {/* Pickup Time Bar */}
      <div className="bg-[#4a5c2e] text-white rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="font-medium">Pick up time</span>
        <span className="font-mono text-lg">{formatTimer()}</span>
      </div>

      {/* Order Info Card */}
      <Card>
        <CardContent className="p-4">
          {/* Store Info */}
          <div className="flex items-start justify-between pb-4 border-b dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-dark-border overflow-hidden shrink-0">
                {order.store_img ? (
                  <img
                    src={order.store_img}
                    alt={order.store_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Store className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                  {order.store_name || order.shipper_name}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {order.total_product} item{order.total_product > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {order.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {order.time || 0} min
                  </span>
                </div>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
              {formatCurrency(order.order_amount)}
            </p>
          </div>

          {/* Addresses */}
          <div className="py-4 space-y-4">
            {/* Pickup */}
            <div className="pb-4 border-b dark:border-dark-border border-dashed">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                PICK UP
              </p>
              <p className="text-sm text-gray-900 dark:text-dark-text">
                {order.pickup?.store_address || order.pickup?.address}, {order.pickup?.store_city || order.pickup?.city}, {order.pickup?.store_state || order.pickup?.state}, {order.pickup?.store_country || order.pickup?.country}-{order.pickup?.store_zip_code || order.pickup?.zip_code}
              </p>
            </div>

            {/* Dropoff */}
            <div className="pb-4 border-b dark:border-dark-border border-dashed">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                DROP OFF
              </p>
              <p className="text-sm text-gray-900 dark:text-dark-text">
                {order.drop_off?.address}, {order.drop_off?.city}, {order.drop_off?.state}, {order.drop_off?.country}-{order.drop_off?.zip_code}
              </p>
            </div>

            {/* Notes */}
            <div className="pb-4 border-b dark:border-dark-border border-dashed">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                NOTES
              </p>
              <p className="text-sm text-gray-900 dark:text-dark-text italic">
                {order.customer_message || 'No special instructions'}
              </p>
            </div>

            {/* Trip Fare */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                TRIP FARE
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900 dark:text-dark-text">Paid amount</span>
                <span className="font-bold text-gray-900 dark:text-dark-text">
                  {formatCurrency(order.order_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isDelivered && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 flex-col py-4"
            onClick={() => {
              // Open maps with pickup/dropoff location
              const address = statusCode < 3
                ? `${order.pickup?.store_address || order.pickup?.address}, ${order.pickup?.store_city || order.pickup?.city}`
                : `${order.drop_off?.address}, ${order.drop_off?.city}`
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
            }}
          >
            <Map className="h-5 w-5 mb-1" />
            <span className="text-xs">Map</span>
          </Button>
          <Button
            className="flex-1 bg-blue-500 hover:bg-blue-600 flex-col py-4"
            onClick={() => {
              // Open messaging (could be phone or WhatsApp)
              const phone = statusCode < 3 ? order.shipper_phone : order.customer_phone
              if (phone) {
                window.open(`tel:${phone}`, '_blank')
              }
            }}
          >
            <MessageSquare className="h-5 w-5 mb-1" />
            <span className="text-xs">Message</span>
          </Button>
          <Button
            className="flex-1 bg-gray-400 hover:bg-gray-500 flex-col py-4"
            variant="secondary"
          >
            <Trash2 className="h-5 w-5 mb-1" />
            <span className="text-xs">Cancel</span>
          </Button>
        </div>
      )}

      {/* Main Action Button (Fixed at bottom) */}
      {buttonConfig && !isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-card border-t dark:border-dark-border lg:left-64">
          <Button
            className={`w-full py-4 text-lg font-bold ${buttonConfig.color} hover:opacity-90 text-gray-900`}
            onClick={handleActionClick}
            disabled={processing}
            isLoading={processing}
          >
            {buttonConfig.label}
          </Button>
        </div>
      )}

      {/* Delivered State */}
      {isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-card border-t dark:border-dark-border lg:left-64">
          <div className="bg-green-100 text-green-800 rounded-lg py-4 text-center font-bold text-lg dark:bg-green-900/30 dark:text-green-400">
            DELIVERED
          </div>
        </div>
      )}

      {/* Pickup Confirmation Modal */}
      <Modal
        isOpen={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        title="Pick up now"
        size="md"
      >
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="flex items-start gap-3 pb-4 border-b dark:border-dark-border">
            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-dark-border overflow-hidden shrink-0">
              {order.store_img ? (
                <img src={order.store_img} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-gray-400 m-3" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h4 className="font-semibold">{order.store_name || order.shipper_name}</h4>
                <span className="font-bold">{formatCurrency(order.order_amount)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{order.total_product} item{order.total_product > 1 ? 's' : ''}</span>
                <span>{order.distance}</span>
                <span>{order.time || 0} min</span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase">PICK UP</p>
              <p className="text-sm truncate">
                {order.pickup?.store_address || order.pickup?.address}, {order.pickup?.store_city || order.pickup?.city}...
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">DROP OFF</p>
              <p className="text-sm truncate">
                {order.drop_off?.address}, {order.drop_off?.city}...
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            You will be able to contact customer once you confirm pick up
          </p>

          <Button
            className="w-full bg-[#c8e651] hover:bg-[#b8d641] text-gray-900 py-3"
            onClick={() => handleStatusUpdate(3)}
            disabled={processing}
            isLoading={processing}
          >
            Confirm pick up
          </Button>
        </div>
      </Modal>

      {/* Delivery Completion Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        title="Delivery Detail"
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Package Received By */}
          <div>
            <p className="text-sm font-medium mb-3">This Package was</p>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border">
                <span>Received by Person</span>
                <input
                  type="radio"
                  name="received_by"
                  checked={deliveryForm.package_received_by === 'Received by Person'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Received by Person' }))}
                  className="h-5 w-5 text-primary-600"
                />
              </label>
              <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border">
                <span>Safe Dropped</span>
                <input
                  type="radio"
                  name="received_by"
                  checked={deliveryForm.package_received_by === 'Safe Dropped'}
                  onChange={() => setDeliveryForm(prev => ({ ...prev, package_received_by: 'Safe Dropped' }))}
                  className="h-5 w-5 text-primary-600"
                />
              </label>
            </div>
          </div>

          {/* Proof of Delivery */}
          <div>
            <div className="bg-red-400 text-white px-3 py-2 rounded-t-lg text-sm font-medium">
              Proof Of Delivery
            </div>
            <div className="border border-t-0 rounded-b-lg p-4 dark:border-dark-border">
              <div className="flex gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-border">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">Take photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
              {deliveryForm.delivery_proof_preview && (
                <div className="mt-3">
                  <img
                    src={deliveryForm.delivery_proof_preview}
                    alt="Delivery proof"
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customer Signature */}
          <div>
            <div className="bg-yellow-400 text-gray-900 px-3 py-2 rounded-t-lg text-sm font-medium">
              Customer Signature
            </div>
            <div className="border border-t-0 rounded-b-lg p-4 dark:border-dark-border">
              <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center text-gray-400 mb-3 dark:border-dark-border">
                <span className="text-sm">Signature pad (coming soon)</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="sm">
                  Clear
                </Button>
                <Button className="flex-1" size="sm">
                  Save Signature
                </Button>
              </div>
            </div>
          </div>

          {/* Visible Drunk Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryForm.visible_drunk}
              onChange={(e) => setDeliveryForm(prev => ({ ...prev, visible_drunk: e.target.checked }))}
              className="h-5 w-5 rounded text-primary-600"
            />
            <span className="text-sm">Does the receiver look visibly drunk?</span>
          </label>

          {/* Driver Note */}
          <div>
            <div className="bg-green-500 text-white px-3 py-2 rounded-t-lg text-sm font-medium">
              Driver's Note
            </div>
            <div className="border border-t-0 rounded-b-lg dark:border-dark-border">
              <textarea
                placeholder="Type Here"
                value={deliveryForm.driver_note}
                onChange={(e) => setDeliveryForm(prev => ({ ...prev, driver_note: e.target.value }))}
                className="w-full p-3 rounded-b-lg resize-none h-24 focus:outline-none dark:bg-dark-card"
              />
            </div>
          </div>

          {/* Complete Button */}
          <Button
            className="w-full bg-[#7de6c4] hover:bg-[#6dd6b4] text-gray-900 py-4 text-lg font-bold"
            onClick={handleCompleteDelivery}
            disabled={processing}
            isLoading={processing}
          >
            Complete Delivery
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default DriverOrderDetailPage
