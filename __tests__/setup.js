/**
 * Global Vitest setup — runs before every test file.
 */
import { vi } from 'vitest'
import { createMockPrisma } from './helpers/mock-prisma.js'

process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-chars'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/zsms_test'
process.env.RESEND_API_KEY = 're_test_key'
process.env.EMAIL_FROM = 'test@test.com'
process.env.EMAIL_FROM_NOREPLY = 'test@test.com'
process.env.GROQ_API_KEY = 'gsk_test_key'
process.env.NODE_ENV = 'test'
process.env.NEXT_PHASE = 'test'

export const mockPrisma = createMockPrisma()

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}))

vi.mock('@/lib/prisma/client', () => ({
  default: mockPrisma,
  basePrisma: mockPrisma,
}))

vi.mock('@/lib/prisma/tenantClient', () => ({
  getTenantClient: vi.fn(() => mockPrisma),
  PLATFORM_MODELS: new Set(['School', 'PlatformAdmin', 'SchoolRegistration']),
}))

vi.mock('@/lib/middleware/subscriptionGate', () => ({
  enforceSubscriptionIfNeeded: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/middleware/rateLimiter', () => ({
  rateLimiter: vi.fn(() => ({ isLimited: false })),
}))

vi.mock('@/lib/auditLog', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/config/email', () => ({
  sendSchoolPortalLinkEmail: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/sms', () => ({
  buildWelcomeSmsMessage: vi.fn(() => 'welcome'),
  normalizePhoneNumbers: vi.fn(() => []),
  pushSmsLog: vi.fn(),
  sendAfricasTalkingSms: vi.fn(),
}))

vi.mock('@/lib/security/cookies', () => ({
  clearAuthSessionCookies: vi.fn(),
  authCookieOptions: vi.fn(() => ({})),
  refreshTokenCookieOptions: vi.fn(() => ({ path: '/api/auth/refresh' })),
  ACCESS_TOKEN_MAX_AGE: 3600,
  REFRESH_TOKEN_MAX_AGE: 86400,
  REMEMBER_ACCESS_TOKEN_MAX_AGE: 3600,
  REMEMBER_REFRESH_TOKEN_MAX_AGE: 86400,
}))
