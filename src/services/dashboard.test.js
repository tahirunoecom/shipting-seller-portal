import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dashboardService } from './dashboard'
import api from './api'

// Mock the api module
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardData', () => {
    it('calls API with correct parameters', async () => {
      const mockResponse = {
        data: {
          status: 1,
          data: { latest_ai_orders_count: {} },
        },
      }
      api.post.mockResolvedValue(mockResponse)

      await dashboardService.getDashboardData({
        wh_account_id: 957,
        days: 30,
        items: 5,
      })

      expect(api.post).toHaveBeenCalledWith('/dashboardData', {
        wh_account_id: 957,
        user_id: 957,
        day: '30',
        page: '1',
        items: '5',
        type: 'Dashboard',
      })
    })

    it('returns API response data', async () => {
      const mockData = {
        status: 1,
        data: {
          latest_ai_orders_count: { Total: 10 },
          statement_balance: { opening_balance: 100 },
        },
      }
      api.post.mockResolvedValue({ data: mockData })

      const result = await dashboardService.getDashboardData({
        wh_account_id: 957,
        days: 7,
        items: 3,
      })

      expect(result).toEqual(mockData)
    })

    it('uses default values when not provided', async () => {
      api.post.mockResolvedValue({ data: { status: 1 } })

      await dashboardService.getDashboardData({
        wh_account_id: 957,
      })

      expect(api.post).toHaveBeenCalledWith('/dashboardData', {
        wh_account_id: 957,
        user_id: 957,
        day: '30', // Default
        page: '1',
        items: '5', // Default
        type: 'Dashboard',
      })
    })

    it('handles API error', async () => {
      const error = new Error('Network error')
      api.post.mockRejectedValue(error)

      await expect(
        dashboardService.getDashboardData({ wh_account_id: 957 })
      ).rejects.toThrow('Network error')
    })
  })
})
