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
   * Request manual payout (DEPRECATED - Use requestPayoutApproval for seller-initiated requests)
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number|null} amount - Amount to payout (null for all available)
   * @returns {Promise} Response with payout details
   */
  requestPayout: (wh_account_id, amount = null) =>
    axios.post(`${API_BASE}/seller/stripe/request-payout`, {
      wh_account_id,
      amount
    }),

  // ============================================
  // PAYOUT APPROVAL REQUESTS (New System)
  // ============================================

  /**
   * Request payout approval from admin (Seller-side)
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number|null} amount - Amount to request (null for full balance)
   * @param {string} notes - Optional notes for admin
   * @returns {Promise} Response with approval request details
   */
  requestPayoutApproval: (wh_account_id, amount = null, notes = '') =>
    axios.post(`${API_BASE}/seller/stripe/request-payout-approval`, {
      wh_account_id,
      amount,
      notes
    }),

  /**
   * Get payout approval requests for seller
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number} limit - Number of requests to fetch
   * @returns {Promise} Response with approval requests
   */
  getPayoutApprovalRequests: (wh_account_id, limit = 20) =>
    axios.post(`${API_BASE}/seller/stripe/payout-approval-requests`, {
      wh_account_id,
      limit
    }),

  /**
   * [ADMIN] Get all pending payout approval requests
   * @param {number|null} wh_account_id - Optional: Filter by specific seller
   * @param {string} status - Filter by status (pending, approved, rejected, all)
   * @returns {Promise} Response with approval requests
   */
  getAllPayoutApprovalRequests: (wh_account_id = null, status = 'all') =>
    axios.post(`${API_BASE}/admin/stripe/payout-approval-requests`, {
      wh_account_id,
      status
    }),

  /**
   * [ADMIN] Approve payout request and create payout
   * @param {number} request_id - Approval request ID
   * @param {string} admin_notes - Optional admin notes
   * @returns {Promise} Response with payout details
   */
  approvePayoutRequest: (request_id, admin_notes = '') =>
    axios.post(`${API_BASE}/admin/stripe/approve-payout-request`, {
      request_id,
      admin_notes
    }),

  /**
   * [ADMIN] Reject payout request
   * @param {number} request_id - Approval request ID
   * @param {string} rejection_reason - Reason for rejection
   * @returns {Promise} Response with updated request
   */
  rejectPayoutRequest: (request_id, rejection_reason = '') =>
    axios.post(`${API_BASE}/admin/stripe/reject-payout-request`, {
      request_id,
      rejection_reason
    }),

  // ============================================
  // ADMIN / TESTING ENDPOINTS
  // ============================================

  /**
   * [ADMIN/TEST] Add test balance to connected account
   * @param {number} wh_account_id - Seller's warehouse account ID
   * @param {number} amount - Amount to add (default 500)
   * @returns {Promise} Response with new balance
   */
  addTestBalance: (wh_account_id, amount = 500) =>
    axios.post(`${API_BASE}/admin/stripe/add-test-balance`, {
      wh_account_id,
      amount
    }),
}

export default stripeConnectService
