import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import LoginPage from './LoginPage'
import { useAuthStore } from '@/store'

// Mock the auth store
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

describe('LoginPage', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
    })
  })

  it('renders login form correctly', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your seller account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates email format on submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    await user.type(emailInput, 'invalid-email')

    const passwordInput = screen.getByPlaceholderText('Enter your password')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Invalid email should not trigger login
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submits form with valid credentials', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      data: {
        user: { scanSell: '1', localDelivery: '0' },
      },
    })

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    await user.type(emailInput, 'test@example.com')

    const passwordInput = screen.getByPlaceholderText('Enter your password')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByPlaceholderText('Enter your password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find and click the toggle button
    const toggleButton = screen.getByRole('button', { name: '' })
    await user.click(toggleButton)

    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('shows loading state when submitting', () => {
    useAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: true,
    })

    renderWithProviders(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    expect(submitButton).toBeDisabled()
  })

  it('has link to register page', () => {
    renderWithProviders(<LoginPage />)

    const registerLink = screen.getByRole('link', { name: /sign up/i })
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('has link to forgot password page', () => {
    renderWithProviders(<LoginPage />)

    const forgotLink = screen.getByRole('link', { name: /forgot password/i })
    expect(forgotLink).toHaveAttribute('href', '/forgot-password')
  })

  it('clears error when user types', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    // Type in email field
    const emailInput = screen.getByPlaceholderText('Enter your email')
    await user.type(emailInput, 't')

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })
  })
})
