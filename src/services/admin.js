import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://stageshipperapi.thedelivio.com/api'
const BASIC_AUTH_USERNAME = import.meta.env.VITE_BASIC_AUTH_USERNAME || '5'
const BASIC_AUTH_PASSWORD = import.meta.env.VITE_BASIC_AUTH_PASSWORD || 'EuU4W2vQ808D6fu8MHmziiiiQAxHUpF0QHiyxOeG'

// Create Basic Auth header
const basicAuthToken = btoa(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`)

// Create a separate axios instance for admin API calls
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${basicAuthToken}`,
  },
})

// Request interceptor for admin API - use admin token if available
adminApi.interceptors.request.use(
  (config) => {
    // Try admin token first, then fall back to regular user token
    const adminToken = localStorage.getItem('admin_token')
    const userToken = localStorage.getItem('access_token')
    const token = adminToken || userToken

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - don't redirect on 401, just reject
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      error.isAdminAuthError = true
    }
    return Promise.reject(error)
  }
)

export const adminService = {
  /**
   * Admin login - authenticate with passcode and get a token
   * This tries multiple endpoints/methods to get authentication
   * @param {string} passcode - Admin passcode
   * @returns {Promise} Response with token
   */
  async login(passcode) {
    // Option 1: Try dedicated admin login endpoint
    try {
      const response = await adminApi.post('/adminLogin', {
        passcode,
        admin: 1
      })
      if (response.data?.status === 1 && response.data?.data?.access_token) {
        return response.data
      }
    } catch (error) {
      console.log('adminLogin endpoint not available, trying alternatives...')
    }

    // Option 2: Try admin auth endpoint with passcode
    try {
      const response = await adminApi.post('/admin/auth', {
        passcode,
      })
      if (response.data?.status === 1 && response.data?.data?.access_token) {
        return response.data
      }
    } catch (error) {
      console.log('admin/auth endpoint not available...')
    }

    // Option 3: If all else fails, check if there's an existing user token that works
    const existingToken = localStorage.getItem('access_token')
    if (existingToken) {
      try {
        // Test if the existing token can access admin endpoints
        const testResponse = await adminApi.post('/getAllShippersForAdmin', { admin: 1 })
        if (testResponse.data?.status === 1) {
          // Existing token works for admin, use it
          return {
            status: 1,
            message: 'Using existing session',
            data: { access_token: existingToken, useExisting: true }
          }
        }
      } catch (error) {
        // Existing token doesn't work for admin
      }
    }

    // No admin authentication available
    return {
      status: 0,
      message: 'Admin authentication not available. Please login as a shipper first or contact support to set up admin access.',
      requiresShipperLogin: true
    }
  },

  /**
   * Validate admin session
   * @returns {Promise} Validation result
   */
  async validateSession() {
    try {
      const response = await adminApi.post('/isvalidauth')
      return response.data
    } catch (error) {
      return { status: 0, message: 'Session invalid' }
    }
  },

  /**
   * Get all shippers for admin
   * @returns {Promise} List of all shippers
   */
  async getAllShippers() {
    const response = await adminApi.post('/getAllShippersForAdmin', {
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
    const response = await adminApi.post('/getShipperDetails', { wh_account_id })
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
    const response = await adminApi.post('/dashboardData', {
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
   * @param {Object} params - Additional params (page, items, search_string)
   * @returns {Promise} Products list
   */
  async getShipperProducts(wh_account_id, params = {}) {
    const response = await adminApi.post('/getMasterProducts', {
      wh_account_id: String(wh_account_id),
      upc: params.upc || '',
      ai_category_id: params.ai_category_id || '',
      ai_product_id: params.ai_product_id || '',
      product_id: params.product_id || '',
      search_string: params.search_string || '',
      zipcode: params.zipcode || '',
      user_id: params.user_id || '',
      page: params.page || '1',
      items: params.items || '222',
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
    const response = await adminApi.post('/getShipperOrders', {
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
    const response = await adminApi.post('/seller/whatsapp/status', {
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
    const response = await adminApi.post('/seller/whatsapp/bot-settings/get', {
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
    const response = await adminApi.post('/getDriverOrders', {
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
    const response = await adminApi.post('/get-driver-active-orders', {
      driver_id: params.driver_id,
      status: params.status || 0,
      order_id: params.order_id || 0,
    })
    return response.data
  },

  /**
   * Update order status (admin action)
   * @param {Object} params
   * @returns {Promise} Update result
   */
  async updateOrderStatus(params) {
    const response = await adminApi.post('/statusUpdate', {
      wh_account_id: params.wh_account_id,
      order_id: params.order_id,
      type: params.status_type,
    })
    return response.data
  },

  /**
   * Cancel order (admin action)
   * @param {string|number} order_id - Order ID
   * @param {string|number} wh_account_id - Shipper ID
   * @returns {Promise} Cancel result
   */
  async cancelOrder(order_id, wh_account_id) {
    const response = await adminApi.post('/cancelOrder', {
      order_id,
      wh_account_id,
    })
    return response.data
  },

  /**
   * Toggle product status (admin action)
   * @param {Object} params
   * @returns {Promise} Update result
   */
  async toggleProductStatus(params) {
    const response = await adminApi.post('/updateProductStatus', {
      wh_account_id: params.wh_account_id,
      product_id: params.product_id,
      status: params.status,
    })
    return response.data
  },

  /**
   * Approve shipper
   * @param {string|number} wh_account_id - Shipper ID
   * @returns {Promise} Approval result
   */
  async approveShipper(wh_account_id) {
    const response = await adminApi.post('/approveShipper', {
      wh_account_id,
      admin: 1,
    })
    return response.data
  },

  /**
   * Reject shipper
   * @param {string|number} wh_account_id - Shipper ID
   * @param {string} reason - Rejection reason
   * @returns {Promise} Rejection result
   */
  async rejectShipper(wh_account_id, reason) {
    const response = await adminApi.post('/rejectShipper', {
      wh_account_id,
      reason,
      admin: 1,
    })
    return response.data
  },
}

export default adminService
