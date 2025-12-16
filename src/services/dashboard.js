import api from './api'

export const dashboardService = {
  /**
   * Get dashboard data
   * @param {Object} params
   * @param {string} params.wh_account_id - Seller account ID
   * @param {number} params.days - Number of days of data to fetch (1, 7, 30, 365)
   * @param {number} params.items - Number of recent orders to fetch (3, 5, 7, 10)
   * @returns {Promise} Dashboard data
   */
  async getDashboardData(params) {
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
}

export default dashboardService
