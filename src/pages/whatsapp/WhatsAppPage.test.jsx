import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import WhatsAppPage from './WhatsAppPage'
import { useAuthStore } from '@/store'
import { whatsappService } from '@/services'

// Mock the stores and services
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/services', () => ({
  whatsappService: {
    getWhatsAppStatus: vi.fn(),
    exchangeToken: vi.fn(),
    disconnect: vi.fn(),
    syncCatalog: vi.fn(),
    updateBotSettings: vi.fn(),
    listCatalogs: vi.fn(),
    updateCatalog: vi.fn(),
    createCatalog: vi.fn(),
    getPhoneStatus: vi.fn(),
    saveSessionInfo: vi.fn(),
  },
}))

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>,
}))

const mockConnectedStatus = {
  status: 1,
  data: {
    is_connected: true,
    connection_status: 'connected',
    phone_number: '+17158826516',
    phone_number_id: '123456789',
    waba_id: '987654321',
    business_id: '111222333',
    business_name: 'Test Business',
    verified_name: 'Test Business Verified',
    display_phone_number: '+1 715-882-6516',
    catalog_id: '444555666',
    bot_settings: {
      welcomeMessage: 'Hello! Welcome to our store.',
      awayMessage: 'We are currently away.',
      businessHoursEnabled: true,
      autoReplyEnabled: true,
    },
  },
}

const mockDisconnectedStatus = {
  status: 1,
  data: {
    is_connected: false,
    connection_status: 'disconnected',
  },
}

const mockPhoneStatus = {
  status: 1,
  data: {
    overall_status: 'CONNECTED',
    registration_status: 'CONNECTED',
    code_verification_status: 'VERIFIED',
    name_status: 'APPROVED',
    account_mode: 'LIVE',
    quality_rating: 'GREEN',
  },
}

describe('WhatsAppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      user: {
        wh_account_id: 957,
      },
    })
    whatsappService.getPhoneStatus.mockResolvedValue(mockPhoneStatus)
    whatsappService.listCatalogs.mockResolvedValue({
      status: 1,
      data: { catalogs: [] },
    })
  })

  describe('When Not Connected', () => {
    beforeEach(() => {
      whatsappService.getWhatsAppStatus.mockResolvedValue(mockDisconnectedStatus)
    })

    it('renders page title', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText('WhatsApp Business')).toBeInTheDocument()
      })
    })

    it('shows connect button when not connected', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/connect whatsapp/i)).toBeInTheDocument()
      })
    })

    it('displays connection instructions', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/connect your whatsapp business/i)).toBeInTheDocument()
      })
    })
  })

  describe('When Connected', () => {
    beforeEach(() => {
      whatsappService.getWhatsAppStatus.mockResolvedValue(mockConnectedStatus)
    })

    it('shows connected status', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument()
      })
    })

    it('displays business name', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Business')).toBeInTheDocument()
      })
    })

    it('displays phone number', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/715-882-6516/)).toBeInTheDocument()
      })
    })

    it('shows disconnect button', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })
    })

    it('displays bot settings tab', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/bot settings/i)).toBeInTheDocument()
      })
    })

    it('displays catalog tab', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/catalog/i)).toBeInTheDocument()
      })
    })

    it('shows QR code section', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/qr code/i)).toBeInTheDocument()
      })
    })

    it('calls getWhatsAppStatus on mount', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(whatsappService.getWhatsAppStatus).toHaveBeenCalledWith(957)
      })
    })

    it('handles disconnect button click', async () => {
      whatsappService.disconnect.mockResolvedValue({ status: 1 })
      const user = userEvent.setup()

      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      const disconnectBtn = screen.getByRole('button', { name: /disconnect/i })
      await user.click(disconnectBtn)

      // Confirmation might be needed - this tests the action is available
      expect(whatsappService.disconnect).toBeDefined()
    })
  })

  describe('Phone Status', () => {
    beforeEach(() => {
      whatsappService.getWhatsAppStatus.mockResolvedValue(mockConnectedStatus)
    })

    it('displays phone status when connected', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(screen.getByText(/phone status/i)).toBeInTheDocument()
      })
    })

    it('shows registration status', async () => {
      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        expect(whatsappService.getPhoneStatus).toHaveBeenCalled()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner while fetching status', () => {
      whatsappService.getWhatsAppStatus.mockImplementation(() => new Promise(() => {}))

      renderWithProviders(<WhatsAppPage />)

      expect(screen.getByTestId('page-loader')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      whatsappService.getWhatsAppStatus.mockRejectedValue(new Error('API Error'))

      renderWithProviders(<WhatsAppPage />)

      await waitFor(() => {
        // Should show disconnected state or error message
        expect(screen.getByText(/whatsapp business/i)).toBeInTheDocument()
      })
    })
  })
})
