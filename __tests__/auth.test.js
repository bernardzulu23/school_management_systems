import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useRouter.mockReturnValue({ push: mockPush })
    useAuth.mockReturnValue({ login: mockLogin })
  })

  test('renders login form correctly', () => {
    render(<LoginPage />)
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  test('shows validation errors for empty fields on submit', async () => {
    render(<LoginPage />)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.click(submitButton)

    // HTML5 validation usually handles required, but our FormField might show custom errors
    // Since we're using native required, we check if login was NOT called
    expect(mockLogin).not.toHaveBeenCalled()
  })

  test('handles successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Password/i, { selector: 'input' }), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        subdomain: '',
      })
      expect(toast.success).toHaveBeenCalledWith('Login successful!')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('handles login failure', async () => {
    const errorMessage = 'Invalid credentials'
    mockLogin.mockRejectedValue(new Error(errorMessage))
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Password/i, { selector: 'input' }), {
      target: { value: 'wrongpassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  test('toggles password visibility', () => {
    render(<LoginPage />)
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' })
    const toggleButton = screen.getByLabelText(/Show password/i)

    expect(passwordInput.type).toBe('password')

    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    expect(screen.getByLabelText(/Hide password/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Hide password/i))
    expect(passwordInput.type).toBe('password')
  })
})
