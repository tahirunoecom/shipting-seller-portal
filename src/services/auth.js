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

  // Validate OTP (new endpoint)
  async validateOTP(email, otp) {
    const response = await api.post('/validate-otp', { email, otp })
    return response.data
  },

  // Update service type (Seller/Driver)
  async updateServiceType(data) {
    const response = await api.post('/updateServiceType', data)
    return response.data
  },

  // Submit verification documents
  async submitVerification(data) {
    const formData = new FormData()
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        if (data[key] instanceof File) {
          formData.append(key, data[key])
        } else if (Array.isArray(data[key])) {
          formData.append(key, JSON.stringify(data[key]))
        } else {
          formData.append(key, data[key])
        }
      }
    })
    const response = await api.post('/verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Email verification (OTP) - legacy
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
