import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkLoginBruteForce,
  handleLoginFailure,
  clearLoginFailures,
  resetLoginBruteForceForTests,
  LOGIN_BRUTE_FORCE,
  loginBruteForceKey,
} from '@/lib/security/loginBruteForce'

const mockRequest = {
  headers: new Headers(),
  ip: '127.0.0.1',
}

describe('loginBruteForce', () => {
  beforeEach(() => {
    resetLoginBruteForceForTests()
  })

  it('builds stable keys per school, email, and IP', () => {
    expect(loginBruteForceKey({ email: 'User@School.com', schoolId: 'abc', ip: '1.1.1.1' })).toBe(
      'abc:user@school.com:1.1.1.1'
    )
  })

  it('does not block before threshold', () => {
    const result = checkLoginBruteForce({
      request: mockRequest,
      email: 'user@school.com',
      schoolId: 'school-1',
      ip: '1.2.3.4',
    })
    expect(result.blocked).toBe(false)
  })

  it('locks after max failed attempts', async () => {
    const params = {
      request: mockRequest,
      email: 'user@school.com',
      schoolId: 'school-1',
      ip: '1.2.3.4',
    }
    for (let i = 0; i < LOGIN_BRUTE_FORCE.maxAttempts - 1; i++) {
      const lock = handleLoginFailure(params)
      expect(lock.blocked).toBe(false)
    }
    const lock = handleLoginFailure(params)
    expect(lock.blocked).toBe(true)
    expect(lock.response.status).toBe(429)
    const body = await lock.response.json()
    expect(body.code).toBe('LOGIN_LOCKED')
  })

  it('clears failures after successful login', () => {
    const params = {
      request: mockRequest,
      email: 'user@school.com',
      schoolId: 'school-1',
      ip: '1.2.3.4',
    }
    handleLoginFailure(params)
    clearLoginFailures({ email: params.email, schoolId: params.schoolId, ip: params.ip })
    const lock = checkLoginBruteForce(params)
    expect(lock.blocked).toBe(false)
  })
})
