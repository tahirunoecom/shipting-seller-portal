import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://stageshipperapi.thedelivio.com/api'
const BASIC_AUTH_USERNAME = import.meta.env.VITE_BASIC_AUTH_USERNAME || '5'
const BASIC_AUTH_PASSWORD = import.meta.env.VITE_BASIC_AUTH_PASSWORD || 'EuU4W2vQ808D6fu8MHmziiiiQAxHUpF0QHiyxOeG'

// Create Basic Auth header
const basicAuthToken = btoa(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`)

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${basicAuthToken}`,
  },
})

// Request interceptor - add Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized - but NOT during onboarding flow
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      const onboardingPaths = ['/register', '/verify-email', '/select-service-type', '/onboarding']
      const isOnboarding = onboardingPaths.some(path => currentPath.startsWith(path))

      // Only redirect to login if not in onboarding flow
      if (!isOnboarding) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
export { API_BASE_URL, basicAuthToken }
