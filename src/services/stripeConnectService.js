import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://stageshipperapi.thedelivio.com/api'

/**
 * Stripe Connect API Service
 * Handles all Stripe Connect related API calls
 */
export const stripeConnectService = {
  // ============================================
  // SELLER ENDPOINTS
  // ============================================

  /**
   * Create Stripe Connect account and get onboarding URL
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with onboarding_url
   */
  createConnectAccount: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/onboard`, { wh_account_id }),

  /**
   * Refresh onboarding link if expired
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with new onboarding_url
   */
  refreshOnboardingLink: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/onboard-refresh`, { wh_account_id }),

  /**
   * Get Stripe Connect status for seller
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with connection status
   */
  getConnectStatus: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/status`, { wh_account_id }),

  /**
   * Get Stripe Express Dashboard link
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with dashboard_url
   */
  getDashboardLink: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/dashboard`, { wh_account_id }),

  /**
   * Disconnect Stripe account
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with success status
   */
  disconnect: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/disconnect`, { wh_account_id }),

  // ============================================
  // EARNINGS & TRANSACTIONS
  // ============================================

  /**
   * Get seller earnings summary
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @returns {Promise} Response with earnings data
   */
  getEarnings: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/earnings`, { wh_account_id }),

  /**
   * Get transaction history
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number} limit - Number of transactions to fetch
   * @param {number} offset - Offset for pagination
   * @param {string|null} type - Filter by type (charge, transfer, refund, payout)
   * @returns {Promise} Response with transactions
   */
  getTransactions: (wh_account_id, limit = 50, offset = 0, type = null) =>
    axios.post(`${API_BASE}/seller/stripe/transactions`, {
      wh_account_id,
      limit,
      offset,
      type
    }),

  /**
   * Get payout history
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number} limit - Number of payouts to fetch
   * @returns {Promise} Response with payouts
   */
  getPayouts: (wh_account_id, limit = 20) =>
    axios.post(`${API_BASE}/seller/stripe/payouts`, { wh_account_id, limit }),

  // ============================================
  // PAYOUT REQUESTS
  // ============================================

  /**
   * Request manual payout
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number|null} amount - Amount to payout (null for all available)
   * @returns {Promise} Response with payout details
   */
  requestPayout: (wh_account_id, amount = null) =>
    axios.post(`${API_BASE}/seller/stripe/request-payout`, {
      wh_account_id,
      amount
    }),
}

export default stripeConnectService
