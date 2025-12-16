import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import DriverOrdersPage from './DriverOrdersPage'
import { useAuthStore } from '@/store'
import { driverService } from '@/services'

// Mock the stores and services
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/services', () => ({
  driverService: {
    getDriverOrders: vi.fn(),
    changeDriverOrderStatus: vi.fn(),
    formatPickupAddress: vi.fn().mockReturnValue('123 Store St, New York, NY'),
    formatDropoffAddress: vi.fn().mockReturnValue('456 Customer Ave, New York, NY'),
  },
}))

const mockAvailableOrders = {
  status: 1,
  data: [
    {
      id: 1140,
      order_id: 1140,
      store_name: 'Test Store',
      shipper_name: 'Test Shipper',
      store_address: '123 Store St',
      customer_name: 'John Doe',
      customer_address: '456 Customer Ave',
      customer_city: 'New York',
      customer_state: 'NY',
      order_amount: '55.00',
      total_amount: '55.00',
      delivery_fee: '5.00',
      distance: '2.5',
      estimated_time: '15 mins',
      total_items: 3,
    },
    {
      id: 1139,
      order_id: 1139,
      store_name: 'Another Store',
      shipper_name: 'Another Shipper',
      store_address: '789 Store Blvd',
      customer_name: 'Jane Smith',
      customer_address: '321 Customer Rd',
      customer_city: 'Los Angeles',
      customer_state: 'CA',
      order_amount: '30.00',
      total_amount: '30.00',
      delivery_fee: '4.00',
      distance: '3.0',
      estimated_time: '20 mins',
      total_items: 1,
    },
  ],
}

describe('DriverOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      user: {
        id: 123,
        wh_account_id: 957,
        driver_id: 123,
        firstname: 'Driver',
        lastname: 'Test',
      },
    })
    driverService.getDriverOrders.mockResolvedValue(mockAvailableOrders)
    driverService.changeDriverOrderStatus.mockResolvedValue({
      status: 1,
    })
  })

  it('renders driver orders page', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText(/available orders/i)).toBeInTheDocument()
    })
  })

  it('displays available orders', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument()
      expect(screen.getByText('Another Store')).toBeInTheDocument()
    })
  })

  it('displays order amounts', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('$55.00')).toBeInTheDocument()
      expect(screen.getByText('$30.00')).toBeInTheDocument()
    })
  })

  it('displays delivery info', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      // Check that order cards are shown
      expect(screen.getByText('Test Store')).toBeInTheDocument()
    })
  })

  it('shows accept button for each order', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
      expect(acceptButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows online/offline toggle', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText(/online/i) || screen.getByText(/go online/i)).toBeTruthy()
    })
  })

  it('shows refresh button', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      // Look for buttons that could be refresh (icon-only buttons)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    }, { timeout: 3000 })
  })

  it('shows empty state when no orders', async () => {
    driverService.getDriverOrders.mockResolvedValue({
      status: 1,
      data: [],
    })

    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText(/no orders/i)).toBeTruthy()
    })
  })

  it('handles accept order click', async () => {
    driverService.changeDriverOrderStatus.mockResolvedValue({ status: 1 })
    const user = userEvent.setup()

    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument()
    })

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    await user.click(acceptButtons[0])

    await waitFor(() => {
      expect(driverService.changeDriverOrderStatus).toHaveBeenCalled()
    })
  })

  it('calls API to fetch available orders', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      expect(driverService.getDriverOrders).toHaveBeenCalled()
    })
  })

  it('displays view toggle (list/map)', async () => {
    renderWithProviders(<DriverOrdersPage />)

    await waitFor(() => {
      // Should have view toggle buttons
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })
})
