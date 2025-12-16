import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import OrdersPage from './OrdersPage'
import { useAuthStore } from '@/store'
import { orderService } from '@/services'

// Mock the stores and services
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/services', () => ({
  orderService: {
    getShipperOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
    cancelOrder: vi.fn(),
    changeDeliveryType: vi.fn(),
  },
}))

const mockOrders = {
  status: 1,
  data: {
    orders: [
      {
        order_id: 1140,
        invoice_no: 'inv-1765824535',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        total_amount: '55.00',
        order_amount: '50.00',
        total_product_quantity: 3,
        accepted: 'N',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        delivery_type: '',
        order_date: '2025-12-15 10:00:00',
        OrderProducts: [
          {
            title: 'Product 1',
            quantity: 2,
            price: '20.00',
            total_price: '40.00',
            ai_category_name: 'Electronics',
          },
        ],
      },
      {
        order_id: 1139,
        invoice_no: 'inv-1765824372',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90001',
        total_amount: '30.00',
        order_amount: '25.00',
        total_product_quantity: 1,
        accepted: 'Y',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        delivery_type: 'self',
        order_date: '2025-12-14 15:30:00',
        OrderProducts: [],
      },
    ],
    total: 2,
    pending: 1,
  },
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      user: {
        wh_account_id: 957,
      },
    })
    orderService.getShipperOrders.mockResolvedValue(mockOrders)
  })

  it('renders orders page header', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Manage and fulfill customer orders')).toBeInTheDocument()
    })
  })

  it('displays order tabs', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      // Check that tabs section exists
      expect(screen.getByText('All')).toBeInTheDocument()
    })
  })

  it('displays search input', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by order id or customer name/i)).toBeInTheDocument()
    })
  })

  it('displays orders list', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('Order #1140')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Order #1139')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<OrdersPage />)

    expect(screen.getByTestId('page-loader')).toBeInTheDocument()
  })

  it('filters orders by search query', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search by order id or customer name/i)
    await user.type(searchInput, 'Jane')

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('expands order on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('Order #1140')).toBeInTheDocument()
    })

    // Click on the first order to expand
    const orderHeader = screen.getByText('Order #1140').closest('[class*="cursor-pointer"]')
    await user.click(orderHeader)

    await waitFor(() => {
      expect(screen.getByText('Customer')).toBeInTheDocument()
      expect(screen.getByText('Delivery Address')).toBeInTheDocument()
      expect(screen.getByText('Order Items')).toBeInTheDocument()
    })
  })

  it('shows pending status badge for new orders', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      const pendingBadges = screen.getAllByText('Pending')
      expect(pendingBadges.length).toBeGreaterThan(0)
    })
  })

  it('shows accepted status badge for accepted orders', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      const acceptedBadges = screen.getAllByText('Accepted')
      expect(acceptedBadges.length).toBeGreaterThan(0)
    })
  })

  it('displays empty state when no orders', async () => {
    orderService.getShipperOrders.mockResolvedValue({
      status: 1,
      data: { orders: [] },
    })

    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('No orders found')).toBeInTheDocument()
    })
  })

  it('calls API to fetch orders', async () => {
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(orderService.getShipperOrders).toHaveBeenCalledWith({
        wh_account_id: 957,
      })
    })
  })

  it('handles tab filter click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument()
    })

    // Click on Pending tab
    const pendingTab = screen.getByRole('button', { name: /pending/i })
    await user.click(pendingTab)

    // Should filter to only show pending orders
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})
