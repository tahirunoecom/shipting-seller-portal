import api from './api'

export const authService = {
  // Login
  async login(email, password) {
    const response = await api.post('/login', { email, password })
    return response.data
  },

  // Register / Signup
  async register(data) {
    const response = await api.post('/signup', data)
    return response.data
  },

  // Email verification (OTP)
  async verifyEmail(email, otp) {
    const response = await api.post('/emailverification', { email, otp })
    return response.data
  },

  // Resend OTP
  async resendOTP(email) {
    const response = await api.post('/resendotp', { email })
    return response.data
  },

  // Forgot password - request OTP
  async forgotPassword(email) {
    const response = await api.post('/forgot-password', { email })
    return response.data
  },

  // Update password
  async updatePassword(data) {
    const response = await api.post('/update-password', data)
    return response.data
  },

  // Check if auth is valid
  async isValidAuth() {
    const response = await api.post('/isvalidauth')
    return response.data
  },

  // Delete account
  async deleteAccount(wh_account_id) {
    const response = await api.post('/delete-shipper-account', { wh_account_id })
    return response.data
  },

  // Get shipper details
  async getShipperDetails(wh_account_id) {
    const response = await api.post('/getShipperDetails', { wh_account_id })
    return response.data
  },
}

export default authService
