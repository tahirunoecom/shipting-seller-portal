import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth'
import toast from 'react-hot-toast'

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
            
            set({
              user,
              userDetails: user_details,
              accessToken: access_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
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

      // Logout
      logout: () => {
        localStorage.removeItem('access_token')
        set({
          user: null,
          userDetails: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
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
      }),
    }
  )
)

export default useAuthStore
