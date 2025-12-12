import api from './api'

// Driver order status codes
export const DRIVER_STATUS = {
  ACCEPT: 1,           // Driver accepts order
  GO_TO_PICKUP: 2,     // Driver heading to store
  CONFIRM_PICKUP: 3,   // Driver confirms pickup
  REACHED_STORE: 4,    // Driver reached store
  ON_THE_WAY: 5,       // Driver on the way to customer
  REACHED_CUSTOMER: 6, // Driver reached customer location
  DELIVERED: 7,        // Order delivered
  SHIPPER_CONFIRM: 8,  // Confirm pickup by shipper (seller)
}

// Driver status labels for UI
export const DRIVER_STATUS_LABELS = {
  0: 'Available',
  1: 'Accepted',
  2: 'Going to Pickup',
  3: 'Pickup Confirmed',
  4: 'Reached Store',
  5: 'On the Way',
  6: 'Reached Customer',
  7: 'Delivered',
}

// Button labels based on current status
export const DRIVER_ACTION_BUTTONS = {
  0: { label: 'Accept', nextStatus: 1 },
  1: { label: 'GO TO PICK UP', nextStatus: 2 },
  2: { label: 'REACHED AT STORE', nextStatus: 4 },
  4: { label: 'CONFIRM PICKUP', nextStatus: 3 },
  3: { label: 'ON THE WAY', nextStatus: 5 },
  5: { label: 'REACHED AT CUSTOMER', nextStatus: 6 },
  6: { label: 'DELIVERED', nextStatus: 7 },
}

export const driverService = {
  /**
   * Get all nearby orders available for drivers to accept
   * @param {Object} params - { driver_id, lat, long, zipcode, order_id }
   */
  async getDriverOrders(params) {
    const response = await api.post('/getDriverOrders', {
      driver_id: params.driver_id,
      lat: params.lat || '',
      long: params.long || '',
      zipcode: params.zipcode || '',
      order_id: params.order_id || '',
    })
    return response.data
  },

  /**
   * Get driver's active/completed orders
   * @param {Object} params - { driver_id, status, order_id }
   * status: 0 = all, or specific status code
   */
  async getDriverActiveOrders(params) {
    const response = await api.post('/get-driver-active-orders', {
      driver_id: params.driver_id,
      status: params.status || 0,
      order_id: params.order_id || 0,
    })
    return response.data
  },

  /**
   * Change driver order status
   * @param {Object} params - { order_id, driver_id, status, shipper_id }
   * Status codes:
   * 1 = Accept by driver
   * 2 = Go to pickup
   * 3 = Confirm pickup (by driver)
   * 4 = Reached at store
   * 5 = On the way to customer
   * 6 = Reached at customer
   * 7 = Delivered
   * 8 = Confirm pickup by shipper
   */
  async changeDriverOrderStatus(params) {
    // Use FormData instead of JSON - backend expects form-data format
    const formData = new FormData()
    formData.append('order_id', params.order_id)
    formData.append('driver_id', params.driver_id)
    formData.append('status', params.status)
    if (params.shipper_id) {
      formData.append('shipper_id', params.shipper_id)
    }

    const response = await api.post('/change-driver-order-status', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Complete delivery with proof
   * @param {Object} data - delivery completion data
   */
  async completeDelivery(data) {
    const formData = new FormData()
    formData.append('order_id', data.order_id)
    formData.append('driver_id', data.driver_id)
    formData.append('user_id', data.user_id || data.driver_id)
    formData.append('status', DRIVER_STATUS.DELIVERED)
    formData.append('package_received_by', data.package_received_by || '')
    formData.append('driver_note', data.driver_note || '')
    formData.append('visible_drunk', data.visible_drunk ? '1' : '0')

    if (data.delivery_proof) {
      formData.append('delivery_proof', data.delivery_proof)
    }
    if (data.customer_signature) {
      formData.append('customer_signature', data.customer_signature)
    }

    const response = await api.post('/change-driver-order-status', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get driver info for a specific order
   * @param {number} order_id
   */
  async getOrderDriverInfo(order_id) {
    const response = await api.post('/get-order-driver-info', {
      order_id,
    })
    return response.data
  },

  /**
   * Get current driver status for an order
   * Returns the driver_order_status value (0-7)
   */
  getOrderStatusCode(order) {
    if (!order.driver_order_status) return 0

    // Handle different response formats
    if (typeof order.driver_order_status === 'object') {
      return order.driver_order_status.driver_order_status || 0
    }

    return order.driver_order_status
  },

  /**
   * Get status label for display
   */
  getStatusLabel(statusCode) {
    return DRIVER_STATUS_LABELS[statusCode] || 'Unknown'
  },

  /**
   * Get next action button info
   */
  getNextAction(statusCode) {
    return DRIVER_ACTION_BUTTONS[statusCode] || null
  },

  /**
   * Format pickup address from order
   */
  formatPickupAddress(order) {
    const pickup = order.pickup
    if (!pickup) return 'N/A'

    const parts = [
      pickup.address || pickup.store_address,
      pickup.city || pickup.store_city,
      pickup.state || pickup.store_state,
      pickup.country || pickup.store_country,
      pickup.zip_code || pickup.store_zip_code,
    ].filter(Boolean)

    return parts.join(', ')
  },

  /**
   * Format dropoff address from order
   */
  formatDropoffAddress(order) {
    const dropoff = order.drop_off
    if (!dropoff) return 'N/A'

    const parts = [
      dropoff.address,
      dropoff.city,
      dropoff.state,
      dropoff.country,
      dropoff.zip_code,
    ].filter(Boolean)

    return parts.join(', ')
  },
}

export default driverService
