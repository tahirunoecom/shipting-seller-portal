import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth'
import toast from 'react-hot-toast'
import { useNotificationStore } from './notificationStore'
import { resetNotificationTracking, stopAllReminders } from '@/utils/notifications'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      userDetails: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // User type flags (from login API)
      userTypes: {
        scanSell: false,      // Store Owner / Seller
        fulfillment: false,   // Warehouse Manager (future)
        localDelivery: false, // Driver
      },

      // Current active mode (for users with multiple roles)
      activeMode: null, // 'seller' | 'driver' | null

      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login(email, password)
          
          if (response.status === 1) {
            const { user, access_token, user_details } = response.data

            // Save token to localStorage for API interceptor
            localStorage.setItem('access_token', access_token)

            // Parse user type flags from response
            const userTypes = {
              scanSell: user.scanSell === '1' || user.scanSell === 1,
              fulfillment: user.fulfillment === '1' || user.fulfillment === 1,
              localDelivery: user.localDelivery === '1' || user.localDelivery === 1,
            }

            // Determine initial active mode
            // If user has multiple roles, they'll choose after login
            // If only one role, set it automatically
            let activeMode = null
            const roles = []
            if (userTypes.scanSell) roles.push('seller')
            if (userTypes.localDelivery) roles.push('driver')
            // fulfillment ignored for now

            if (roles.length === 1) {
              activeMode = roles[0]
            }
            // If multiple roles, activeMode stays null and user chooses

            // Clear any notifications from previous sessions
            useNotificationStore.getState().clearAll()
            resetNotificationTracking()
            stopAllReminders()

            set({
              user,
              userDetails: user_details,
              accessToken: access_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userTypes,
              activeMode,
            })

            toast.success('Login successful!')
            return { success: true, data: response.data }
          } else {
            set({ isLoading: false, error: response.message })
            toast.error(response.message || 'Login failed')
            return { success: false, message: response.message }
          }
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed. Please try again.'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, message }
        }
      },

      // Register
      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.register(data)
          
          if (response.status === 1) {
            set({ isLoading: false })
            toast.success('Registration successful! Please verify your email.')
            return { success: true, data: response.data }
          } else {
            set({ isLoading: false, error: response.message })
            toast.error(response.message || 'Registration failed')
            return { success: false, message: response.message }
          }
        } catch (error) {
          const message = error.response?.data?.message || 'Registration failed. Please try again.'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, message }
        }
      },

      // Verify Email OTP
      verifyEmail: async (email, otp) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.verifyEmail(email, otp)
          
          if (response.status === 1) {
            set({ isLoading: false })
            toast.success('Email verified successfully!')
            return { success: true, data: response.data }
          } else {
            set({ isLoading: false, error: response.message })
            toast.error(response.message || 'Verification failed')
            return { success: false, message: response.message }
          }
        } catch (error) {
          const message = error.response?.data?.message || 'Verification failed. Please try again.'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, message }
        }
      },

      // Resend OTP
      resendOTP: async (email) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.resendOTP(email)
          
          if (response.status === 1) {
            set({ isLoading: false })
            toast.success('OTP sent successfully!')
            return { success: true }
          } else {
            set({ isLoading: false, error: response.message })
            toast.error(response.message || 'Failed to send OTP')
            return { success: false, message: response.message }
          }
        } catch (error) {
          const message = error.response?.data?.message || 'Failed to send OTP. Please try again.'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, message }
        }
      },

      // Set active mode (for users with multiple roles)
      setActiveMode: (mode) => {
        set({ activeMode: mode })
      },

      // Logout
      logout: () => {
        // Clear auth data
        localStorage.removeItem('access_token')

        // Clear notifications
        useNotificationStore.getState().clearAll()
        localStorage.removeItem('notification-storage')

        // Reset notification tracking
        resetNotificationTracking()
        stopAllReminders()

        set({
          user: null,
          userDetails: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
          userTypes: {
            scanSell: false,
            fulfillment: false,
            localDelivery: false,
          },
          activeMode: null,
        })
        toast.success('Logged out successfully')
      },

      // Update user data
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },

      // Update user details
      updateUserDetails: (details) => {
        set((state) => ({
          userDetails: { ...state.userDetails, ...details },
        }))
      },

      // Check authentication status
      checkAuth: () => {
        const token = localStorage.getItem('access_token')
        const { user } = get()
        
        if (token && user) {
          set({ isAuthenticated: true, accessToken: token })
          return true
        }
        
        set({ isAuthenticated: false })
        return false
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        userDetails: state.userDetails,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        userTypes: state.userTypes,
        activeMode: state.activeMode,
      }),
    }
  )
)

export default useAuthStore
