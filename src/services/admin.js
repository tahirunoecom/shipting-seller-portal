import api from './api'

export const adminService = {
  /**
   * Get all shippers for admin
   * @returns {Promise} List of all shippers
   */
  async getAllShippers() {
    const response = await api.post('/getAllShippersForAdmin', {
      admin: 1,
    })
    return response.data
  },

  /**
   * Get shipper details
   * @param {string|number} wh_account_id - Shipper ID
   * @returns {Promise} Shipper details
   */
  async getShipperDetails(wh_account_id) {
    const response = await api.post('/getShipperDetails', { wh_account_id })
    return response.data
  },

  /**
   * Get shipper dashboard data
   * @param {Object} params
   * @param {string} params.wh_account_id - Shipper ID
   * @param {number} params.days - Number of days (1, 7, 30, 365)
   * @returns {Promise} Dashboard data
   */
  async getShipperDashboard(params) {
    const response = await api.post('/dashboardData', {
      wh_account_id: params.wh_account_id,
      user_id: params.wh_account_id,
      day: String(params.days || 30),
      page: '1',
      items: String(params.items || 5),
      type: 'Dashboard',
    })
    return response.data
  },

  /**
   * Get shipper products
   * @param {string|number} wh_account_id - Shipper ID
   * @param {Object} params - Additional params
   * @returns {Promise} Products list
   */
  async getShipperProducts(wh_account_id, params = {}) {
    const response = await api.post('/getSellerProducts', {
      wh_account_id,
      ...params,
    })
    return response.data
  },

  /**
   * Get shipper orders
   * @param {Object} params
   * @param {string} params.wh_account_id - Shipper ID
   * @param {string} params.type - Order type filter
   * @returns {Promise} Orders list
   */
  async getShipperOrders(params) {
    const response = await api.post('/getShipperOrders', {
      wh_account_id: params.wh_account_id,
      order_id: params.order_id || '',
      page: params.page || 1,
      items: params.items || 1000,
      type: params.type || 'All',
    })
    return response.data
  },

  /**
   * Get WhatsApp status for a shipper
   * @param {string|number} wh_account_id - Shipper ID
   * @returns {Promise} WhatsApp connection status
   */
  async getWhatsAppStatus(wh_account_id) {
    const response = await api.post('/seller/whatsapp/status', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * Get WhatsApp bot settings for a shipper
   * @param {string|number} wh_account_id - Shipper ID
   * @returns {Promise} Bot settings
   */
  async getWhatsAppBotSettings(wh_account_id) {
    const response = await api.post('/seller/whatsapp/bot-settings/get', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * Get driver orders for a shipper who is also a driver
   * @param {Object} params
   * @param {string} params.driver_id - Driver ID
   * @returns {Promise} Driver orders
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
   * Get driver active orders
   * @param {Object} params
   * @param {string} params.driver_id - Driver ID
   * @returns {Promise} Active driver orders
   */
  async getDriverActiveOrders(params) {
    const response = await api.post('/get-driver-active-orders', {
      driver_id: params.driver_id,
      status: params.status || 0,
      order_id: params.order_id || 0,
    })
    return response.data
  },
}

export default adminService
