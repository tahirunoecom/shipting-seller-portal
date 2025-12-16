import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useAuthStore from './authStore'
import { authService } from '@/services/auth'

// Mock auth service
vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendOTP: vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.logout()
    })
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())

      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('login', () => {
    it('sets loading state during login', async () => {
      authService.login.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('test@example.com', 'password123')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('sets user and authenticated state on successful login', async () => {
      const mockUser = {
        wh_account_id: 957,
        firstname: 'Test',
        email: 'test@example.com',
        scanSell: '1',
        localDelivery: '0',
      }

      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: mockUser,
          access_token: 'mock-token',
          user_details: {},
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('sets error on failed login', async () => {
      authService.login.mockResolvedValue({
        status: 0,
        message: 'Invalid credentials',
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'wrongpassword')
      })

      expect(result.current.error).toBe('Invalid credentials')
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('handles network error', async () => {
      authService.login.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })

    it('identifies seller role correctly', async () => {
      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: { scanSell: '1', localDelivery: '0' },
          access_token: 'mock-token',
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.userTypes.scanSell).toBe(true)
      expect(result.current.userTypes.localDelivery).toBe(false)
      expect(result.current.activeMode).toBe('seller')
    })

    it('identifies driver role correctly', async () => {
      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: { scanSell: '0', localDelivery: '1' },
          access_token: 'mock-token',
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.userTypes.localDelivery).toBe(true)
      expect(result.current.activeMode).toBe('driver')
    })

    it('handles dual role (seller + driver)', async () => {
      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: { scanSell: '1', localDelivery: '1' },
          access_token: 'mock-token',
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.userTypes.scanSell).toBe(true)
      expect(result.current.userTypes.localDelivery).toBe(true)
      // Should be null so user can choose
      expect(result.current.activeMode).toBe(null)
    })
  })

  describe('register', () => {
    it('returns success on successful registration', async () => {
      authService.register.mockResolvedValue({
        status: 1,
        message: 'Registration successful',
      })

      const { result } = renderHook(() => useAuthStore())

      let response
      await act(async () => {
        response = await result.current.register({
          firstname: 'Test',
          lastname: 'User',
          email: 'test@example.com',
          telephone: '1234567890',
          password: 'password123',
        })
      })

      expect(response.success).toBe(true)
    })

    it('returns error on failed registration', async () => {
      authService.register.mockResolvedValue({
        status: 0,
        message: 'Email already exists',
      })

      const { result } = renderHook(() => useAuthStore())

      let response
      await act(async () => {
        response = await result.current.register({
          email: 'existing@example.com',
        })
      })

      expect(response.success).toBe(false)
      expect(response.message).toBe('Email already exists')
    })
  })

  describe('logout', () => {
    it('clears user state on logout', async () => {
      // First login
      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: { wh_account_id: 957 },
          access_token: 'mock-token',
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.isAuthenticated).toBe(true)

      // Then logout
      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.accessToken).toBe(null)
    })
  })

  describe('setActiveMode', () => {
    it('sets active mode correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setActiveMode('driver')
      })

      expect(result.current.activeMode).toBe('driver')

      act(() => {
        result.current.setActiveMode('seller')
      })

      expect(result.current.activeMode).toBe('seller')
    })
  })

  describe('updateUser', () => {
    it('updates user data', async () => {
      authService.login.mockResolvedValue({
        status: 1,
        data: {
          user: { wh_account_id: 957, firstname: 'Test' },
          access_token: 'mock-token',
        },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      act(() => {
        result.current.updateUser({ firstname: 'Updated' })
      })

      expect(result.current.user.firstname).toBe('Updated')
    })
  })
})
