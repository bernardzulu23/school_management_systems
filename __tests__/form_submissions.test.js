import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CreateAssessmentPage from '@/app/dashboard/assessments/create/page'
import toast from 'react-hot-toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: '1', name: 'Teacher' } })),
}))

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}))

// Mock DashboardLayout to avoid complexity
jest.mock('@/components/dashboard/SimpleDashboardLayout', () => ({
  DashboardLayout: ({ children }) => <div>{children}</div>,
}))

describe('CreateAssessmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders assessment creation form', () => {
    render(<CreateAssessmentPage />)
    expect(screen.getByText(/Create New Assessment/i)).toBeInTheDocument()
    expect(screen.getByText(/Assessment Title/i)).toBeInTheDocument()
  })

  test('handles basic information input', () => {
    render(<CreateAssessmentPage />)
    const titleInput = screen.getByPlaceholderText(/Enter assessment title/i)

    fireEvent.change(titleInput, { target: { value: 'Grade 10 Math Test' } })
    expect(titleInput.value).toBe('Grade 10 Math Test')
  })

  test('navigates through steps', () => {
    render(<CreateAssessmentPage />)

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText(/Next: Add Questions/i))
    expect(screen.getByText(/Question Builder/i)).toBeInTheDocument()

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText(/Next: Review/i))
    expect(screen.getByText(/Assessment Review/i)).toBeInTheDocument()
  })

  test('handles assessment publishing', async () => {
    render(<CreateAssessmentPage />)

    // Go to step 3
    fireEvent.click(screen.getByText(/Next: Add Questions/i))
    fireEvent.click(screen.getByText(/Next: Review/i))

    const publishButton = screen.getByRole('button', { name: /Publish Assessment/i })
    fireEvent.click(publishButton)

    expect(toast.success).toHaveBeenCalledWith('Assessment published successfully!')
  })
})
