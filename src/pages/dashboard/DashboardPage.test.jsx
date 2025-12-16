import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils'
import DashboardPage from './DashboardPage'
import { useAuthStore } from '@/store'
import { dashboardService, productService } from '@/services'

// Mock the stores and services
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/services', () => ({
  dashboardService: {
    getDashboardData: vi.fn(),
  },
  productService: {
    getShipperProductsTotalCount: vi.fn(),
  },
}))

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: () => <div data-testid="pie" />,
}))

const mockDashboardData = {
  status: 1,
  data: {
    latest_ai_orders_count: {
      Total: 12,
      Pending: 5,
      Accepted: 2,
      Packed: 1,
      Shipped: 1,
      Intransit: 2,
      Delivered: 2,
      Cancelled: 1,
    },
    statementdetails: [
      {
        section_title: 'Earnings',
        section_value: [
          { head_name: 'AI Orders', total_val: '1500.00' },
        ],
      },
    ],
    statement_balance: {
      opening_balance: 1000.0,
      closing_balance: 1500.0,
    },
    latest_ai_orders: [
      {
        id: 1140,
        invoice_no: 'inv-1765824535',
        name: 'John Doe',
        city: 'New York',
        state: 'NY',
        total_amount: '55.00',
        shipper_payout: '45.00',
        total_product_quantity: 3,
        order_date: '2025-12-15 10:00:00',
        accepted: 'N',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
      },
    ],
  },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      user: {
        wh_account_id: 957,
        firstname: 'Test',
      },
    })
    dashboardService.getDashboardData.mockResolvedValue(mockDashboardData)
    productService.getShipperProductsTotalCount.mockResolvedValue({
      status: 1,
      data: { total: 25 },
    })
  })

  it('renders welcome message with user name', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/welcome back, test!/i)).toBeInTheDocument()
    })
  })

  it('displays order status counts', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Orders')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument() // Total orders
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Pending orders
    })
  })

  it('displays period selector buttons', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Week')).toBeInTheDocument()
      expect(screen.getByText('Month')).toBeInTheDocument()
      expect(screen.getByText('3 Months')).toBeInTheDocument()
      expect(screen.getByText('Year')).toBeInTheDocument()
    })
  })

  it('displays account statement section', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument()
      expect(screen.getByText('Opening Balance')).toBeInTheDocument()
      expect(screen.getByText('Closing Balance')).toBeInTheDocument()
    })
  })

  it('displays recent orders section', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Recent Orders')).toBeInTheDocument()
      expect(screen.getByText('View all')).toBeInTheDocument()
    })
  })

  it('displays order pipeline section', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Order Pipeline')).toBeInTheDocument()
    })
  })

  it('displays quick stats section', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Quick Stats')).toBeInTheDocument()
      expect(screen.getByText('Total Products')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<DashboardPage />)

    // PageLoader should be visible initially
    expect(screen.getByTestId('page-loader')).toBeInTheDocument()
  })

  it('calls API with correct parameters', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(dashboardService.getDashboardData).toHaveBeenCalledWith({
        wh_account_id: 957,
        days: 30, // Default is 'month' = 30 days
        items: 5,
      })
    })
  })

  it('handles API error gracefully', async () => {
    dashboardService.getDashboardData.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      // Should not crash and should still render
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })
})
