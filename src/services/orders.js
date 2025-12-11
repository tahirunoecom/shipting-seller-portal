import api from './api'

export const orderService = {
  // Get shipper orders
  async getShipperOrders(wh_account_id, params = {}) {
    const response = await api.post('/getShipperOrders', {
      wh_account_id,
      ...params,
    })
    return response.data
  },

  // Accept order
  async acceptOrder(order_id, wh_account_id) {
    const response = await api.post('/OrderAccept', { order_id, wh_account_id })
    return response.data
  },

  // Mark order as packed
  async packOrder(order_id, wh_account_id) {
    const response = await api.post('/OrderPacked', { order_id, wh_account_id })
    return response.data
  },

  // Mark order as shipped
  async shipOrder(order_id, wh_account_id) {
    const response = await api.post('/OrderShipped', { order_id, wh_account_id })
    return response.data
  },

  // Mark order as delivered
  async deliverOrder(order_id, wh_account_id) {
    const response = await api.post('/OrderDelivered', { order_id, wh_account_id })
    return response.data
  },

  // Update order status
  async updateOrderStatus(data) {
    const response = await api.post('/OrderStatusUpdate', data)
    return response.data
  },

  // Cancel order
  async cancelOrder(order_id, wh_account_id, reason) {
    const response = await api.post('/OrderCancelled', { 
      order_id, 
      wh_account_id,
      reason 
    })
    return response.data
  },

  // Refund order
  async refundOrder(order_id) {
    const response = await api.post('/refundOrder', { order_id })
    return response.data
  },

  // Get order details
  async getOrderDetails(order_id, wh_account_id) {
    const response = await api.post('/get-shipper-order-details', { 
      order_id, 
      wh_account_id 
    })
    return response.data
  },
}

export default orderService
