import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import RegisterPage from './RegisterPage'
import { useAuthStore } from '@/store'

// Mock the auth store
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

describe('RegisterPage', () => {
  const mockRegister = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      register: mockRegister,
      isLoading: false,
    })
  })

  it('renders registration form correctly', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByText('Start selling with Shipting')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('+1 (555) 000-0000')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Phone number is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    // Fill required fields with valid data except email
    await user.type(screen.getByPlaceholderText('John'), 'John')
    await user.type(screen.getByPlaceholderText('Doe'), 'Doe')
    await user.type(screen.getByPlaceholderText('john@example.com'), 'invalid-email')
    await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '1234567890')
    await user.type(screen.getByPlaceholderText('Create a password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email is invalid')).toBeInTheDocument()
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows validation error for short password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('John'), 'John')
    await user.type(screen.getByPlaceholderText('Doe'), 'Doe')
    await user.type(screen.getByPlaceholderText('john@example.com'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '1234567890')
    await user.type(screen.getByPlaceholderText('Create a password'), '12345')
    await user.type(screen.getByPlaceholderText('Confirm your password'), '12345')

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows validation error for password mismatch', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('John'), 'John')
    await user.type(screen.getByPlaceholderText('Doe'), 'Doe')
    await user.type(screen.getByPlaceholderText('john@example.com'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '1234567890')
    await user.type(screen.getByPlaceholderText('Create a password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'differentpassword')

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    mockRegister.mockResolvedValue({ success: true })

    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('John'), 'John')
    await user.type(screen.getByPlaceholderText('Doe'), 'Doe')
    await user.type(screen.getByPlaceholderText('john@example.com'), 'john@example.com')
    await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '1234567890')
    await user.type(screen.getByPlaceholderText('Create a password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        telephone: '1234567890',
        password: 'password123',
      })
    })
  })

  it('shows loading state when submitting', () => {
    useAuthStore.mockReturnValue({
      register: mockRegister,
      isLoading: true,
    })

    renderWithProviders(<RegisterPage />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    expect(submitButton).toBeDisabled()
  })

  it('has link to login page', () => {
    renderWithProviders(<RegisterPage />)

    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    const passwordInput = screen.getByPlaceholderText('Create a password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password')

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')

    // Find and click the toggle button
    const toggleButtons = screen.getAllByRole('button', { name: '' })
    await user.click(toggleButtons[0]) // First toggle button is for password

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
  })
})
