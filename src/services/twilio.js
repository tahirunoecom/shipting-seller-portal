import api from './api'

/**
 * Twilio Service
 * Handles phone number provisioning and SMS management via Twilio
 *
 * Used when sellers don't have their own phone number for WhatsApp registration.
 * Twilio provides a US number that can receive OTP for verification.
 *
 * PRICING (for future billing reference):
 * - US Local Number: ~$1.15/month
 * - SMS Received: ~$0.0079/message
 * - Voice Received: ~$0.0085/minute
 */

export const twilioService = {
  // ============================================
  // PHONE NUMBER MANAGEMENT
  // ============================================

  /**
   * Search available US phone numbers
   * @param {string} wh_account_id - User's account ID
   * @param {object} options - Search options
   * @param {string} options.area_code - Optional area code (e.g., '415' for San Francisco)
   * @param {string} options.contains - Optional pattern to search (e.g., '*CAFE*')
   * @param {number} options.limit - Number of results (default: 10)
   */
  async searchAvailableNumbers(wh_account_id, options = {}) {
    const response = await api.post('/seller/twilio/search-numbers', {
      wh_account_id,
      country: 'US', // USA only for now
      area_code: options.area_code || null,
      contains: options.contains || null,
      limit: options.limit || 10,
    })
    return response.data
  },

  /**
   * Buy/provision a phone number for the user
   * @param {string} wh_account_id - User's account ID
   * @param {string} phone_number - The phone number to purchase (from search results)
   */
  async buyNumber(wh_account_id, phone_number) {
    const response = await api.post('/seller/twilio/buy-number', {
      wh_account_id,
      phone_number,
    })
    return response.data
  },

  /**
   * Get user's Twilio number details
   * @param {string} wh_account_id - User's account ID
   */
  async getMyNumber(wh_account_id) {
    const response = await api.post('/seller/twilio/my-number', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * Release/delete user's Twilio number
   * @param {string} wh_account_id - User's account ID
   */
  async releaseNumber(wh_account_id) {
    const response = await api.post('/seller/twilio/release-number', {
      wh_account_id,
    })
    return response.data
  },

  // ============================================
  // SMS INBOX
  // ============================================

  /**
   * Get SMS inbox for user's Twilio number
   * @param {string} wh_account_id - User's account ID
   * @param {number} limit - Number of messages to fetch (default: 20)
   */
  async getSmsInbox(wh_account_id, limit = 20) {
    const response = await api.post('/seller/twilio/sms-inbox', {
      wh_account_id,
      limit,
    })
    return response.data
  },

  /**
   * Get latest OTP from SMS inbox (auto-extracted)
   * @param {string} wh_account_id - User's account ID
   */
  async getLatestOtp(wh_account_id) {
    const response = await api.post('/seller/twilio/latest-otp', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * Mark SMS as read
   * @param {string} wh_account_id - User's account ID
   * @param {string} sms_id - SMS message ID
   */
  async markSmsRead(wh_account_id, sms_id) {
    const response = await api.post('/seller/twilio/mark-read', {
      wh_account_id,
      sms_id,
    })
    return response.data
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * [ADMIN] Search available numbers
   * @param {string} wh_account_id - Seller's account ID (for context)
   * @param {object} options - Search options
   */
  async adminSearchNumbers(wh_account_id, options = {}) {
    const response = await api.post('/admin/twilio/search-numbers', {
      wh_account_id,
      country: 'US',
      area_code: options.area_code || null,
      contains: options.contains || null,
      limit: options.limit || 10,
    })
    return response.data
  },

  /**
   * [ADMIN] Buy number for a specific seller
   * @param {string} wh_account_id - Seller's account ID
   * @param {string} phone_number - Phone number to purchase
   */
  async adminBuyNumberForSeller(wh_account_id, phone_number) {
    const response = await api.post('/admin/twilio/buy-number', {
      wh_account_id,
      phone_number,
    })
    return response.data
  },

  /**
   * [ADMIN] Get Twilio number for a seller
   * @param {string} wh_account_id - Seller's account ID
   */
  async adminGetSellerNumber(wh_account_id) {
    const response = await api.post('/admin/twilio/seller-number', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * [ADMIN] Release seller's Twilio number
   * @param {string} wh_account_id - Seller's account ID
   */
  async adminReleaseNumber(wh_account_id) {
    const response = await api.post('/admin/twilio/release-number', {
      wh_account_id,
    })
    return response.data
  },

  /**
   * [ADMIN] Get SMS inbox for a seller's number
   * @param {string} wh_account_id - Seller's account ID
   * @param {number} limit - Number of messages
   */
  async adminGetSmsInbox(wh_account_id, limit = 20) {
    const response = await api.post('/admin/twilio/sms-inbox', {
      wh_account_id,
      limit,
    })
    return response.data
  },

  /**
   * [ADMIN] Get all Twilio numbers provisioned
   */
  async adminGetAllNumbers() {
    const response = await api.post('/admin/twilio/all-numbers', {})
    return response.data
  },

  /**
   * [ADMIN] Get Twilio usage/billing summary
   */
  async adminGetUsageSummary() {
    const response = await api.post('/admin/twilio/usage-summary', {})
    return response.data
  },
}

export default twilioService
