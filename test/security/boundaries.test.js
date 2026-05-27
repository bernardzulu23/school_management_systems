import { describe, it, expect, beforeEach, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { handleSecurityProxy } from '../../proxy.js'
import { buildRequest, parseJson } from '../../__tests__/helpers/request.js'

describe('Security Layer Hardening Boundaries', () => {
  const mockJwtSecret = process.env.JWT_SECRET || 'test-secret-key'

  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ==========================================
  // 1. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // ==========================================
  describe('Uniform Server-Side Role Enforcement (/api/admin/*)', () => {
    it('should return 403 Forbidden when a non-admin role attempts access', async () => {
      const nonAdminToken = jwt.sign(
        { id: 'usr_123', role: 'TEACHER', schoolId: 'school_1', sessionId: 'sess_123' },
        mockJwtSecret
      )

      const request = buildRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/admin/system-logs',
        headers: {
          authorization: `Bearer ${nonAdminToken}`,
        },
      })
      request.nextUrl = new URL(request.url)

      const response = await handleSecurityProxy(request)

      expect(response.status).toBe(403)
      const data = await parseJson(response)
      expect(String(data.error || '')).toMatch(/forbidden|access denied|insufficient permissions/i)
    })

    it('should pass validation when role is HEADTEACHER or ADMIN', async () => {
      const adminToken = jwt.sign(
        { id: 'usr_789', role: 'HEADTEACHER', schoolId: 'school_1', sessionId: 'sess_789' },
        mockJwtSecret
      )

      const request = buildRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/admin/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })
      request.nextUrl = new URL(request.url)

      const response = await handleSecurityProxy(request)
      expect(response.status).not.toBe(403)
      expect(response.status).not.toBe(401)
    })
  })

  // ==========================================
  // 2. CSRF DEFENSE ENFORCEMENT TESTS
  // ==========================================
  describe('State-Changing CSRF Enforcement via proxy.js', () => {
    const validUserToken = jwt.sign(
      { id: 'usr_123', role: 'TEACHER', schoolId: 'school_1', sessionId: 'sess_123' },
      mockJwtSecret
    )

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

    mutatingMethods.forEach((method) => {
      it(`should reject ${method} requests to protected /api routes if X-CSRF-Token header is missing`, async () => {
        const request = buildRequest({
          method,
          url: 'http://localhost:3000/api/timetable/allocate',
          headers: {
            authorization: `Bearer ${validUserToken}`,
          },
          cookies: {
            csrf_token: 'mock-valid-cookie-token',
          },
        })
        request.nextUrl = new URL(request.url)

        const response = await handleSecurityProxy(request)

        expect(response.status).toBe(403)
        const data = await parseJson(response)
        expect(String(data.error || '')).toMatch(/csrf/i)
      })
    })

    it('should accept mutating requests when X-CSRF-Token matches the verified cookie token value', async () => {
      const matchableToken = 'secure_csrf_token_string'

      const request = buildRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/timetable/allocate',
        headers: {
          authorization: `Bearer ${validUserToken}`,
          'x-csrf-token': matchableToken,
        },
        cookies: {
          csrf_token: matchableToken,
        },
      })
      request.nextUrl = new URL(request.url)

      const response = await handleSecurityProxy(request)

      expect(response.status).not.toBe(403)
    })
  })
})
