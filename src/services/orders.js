import api from './api'

export const orderService = {
  // Get shipper orders
  async getShipperOrders(params) {
    const response = await api.post('/getShipperOrders', {
      wh_account_id: params.wh_account_id,
      order_id: params.order_id || '',
      page: params.page || 1,
      items: params.items || 1000,
      type: params.type || 'All',  // 'All' triggers shipper_id filter in backend
    })
    return response.data
  },

  // Change delivery type (self/driver)
  async changeDeliveryType(order_id, delivery_type) {
    const response = await api.post('/change-delivery-type', {
      order_id,
      delivery_type, // 'self' or 'driver'
    })
    return response.data
  },

  // Update order status
  // status_type: 'OrderAccept', 'OrderPacked', 'OrderShipped', 'OrderDelivered'
  async updateOrderStatus(data) {
    const formData = new FormData()
    formData.append('wh_account_id', data.wh_account_id)
    formData.append('order_id', data.order_id)
    formData.append('status', data.status || 'Y')
    formData.append('status_type', data.status_type)

    // Additional fields for OrderDelivered
    if (data.status_type === 'OrderDelivered') {
      if (data.delivery_proof) {
        formData.append('delivery_proof', data.delivery_proof)
      }
      formData.append('visible_drunk', data.visible_drunk || 'N')
      formData.append('package_received_by', data.package_received_by || '')
      formData.append('driver_note', data.driver_note || '')
      if (data.customer_signature) {
        formData.append('customer_signature', data.customer_signature)
      }
    }

    const response = await api.post('/OrderStatusUpdate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Cancel order
  async cancelOrder(order_id) {
    const response = await api.post('/OrderCancelled', {
      order_id,
      status: 'Y',
    })
    return response.data
  },

  // Get order details (if needed separately)
  async getOrderDetails(order_id, wh_account_id) {
    const response = await api.post('/getShipperOrders', {
      wh_account_id,
      order_id,
      page: 1,
      items: 1,
      type: 'AI',
    })
    return response.data
  },
}

export default orderService
