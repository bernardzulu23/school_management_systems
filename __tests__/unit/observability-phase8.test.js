import { describe, it, expect, beforeEach } from 'vitest'
import {
  scrubPiiDeep,
  sanitizeLogContext,
  scrubExceptionMessage,
  isBlockedPiiKey,
} from '@/lib/observability/piiScrub'
import {
  ALERT_THRESHOLDS,
  recordFailedLoginAlert,
  recordSmsFailureAlert,
  recordPaymentWebhookFailureAlert,
  recordCrossTenantQueryAlert,
  resetObservabilityAlertsForTests,
} from '@/lib/observability/alerts'
import {
  resolveRequestId,
  runWithRequestContext,
  getRequestContext,
  bindRequestIdentity,
} from '@/lib/observability/requestContext'
import { sentryBeforeSend } from '@/lib/sentry/options'

describe('piiScrub', () => {
  it('blocks pupil PII keys', () => {
    expect(isBlockedPiiKey('studentName')).toBe(true)
    expect(isBlockedPiiKey('email')).toBe(true)
    expect(isBlockedPiiKey('contact_number')).toBe(true)
    expect(isBlockedPiiKey('schoolId')).toBe(false)
    expect(isBlockedPiiKey('requestId')).toBe(false)
  })

  it('redacts nested PII and phones/emails in strings', () => {
    const scrubbed = scrubPiiDeep({
      schoolId: 'school-1',
      studentName: 'Jane Doe',
      note: 'Call parent at +260977123456 or a@b.com',
    })
    expect(scrubbed.schoolId).toBe('school-1')
    expect(scrubbed.studentName).toBe('[redacted]')
    expect(String(scrubbed.note)).toContain('[phone]')
    expect(String(scrubbed.note)).toContain('[email]')
  })

  it('drops blocked keys from log context', () => {
    const safe = sanitizeLogContext({
      schoolId: 's1',
      userId: 'u1',
      email: 'x@y.com',
      score: 88,
    })
    expect(safe.schoolId).toBe('s1')
    expect(safe.userId).toBe('u1')
    expect(safe.email).toBeUndefined()
    expect(safe.score).toBeUndefined()
  })

  it('scrubs exception messages', () => {
    expect(scrubExceptionMessage('fail for Jane at a@b.co')).toContain('[email]')
  })
})

describe('requestContext', () => {
  it('accepts valid incoming request id', () => {
    const headers = new Headers({ 'x-request-id': 'abc12345-req' })
    expect(resolveRequestId({ headers })).toBe('abc12345-req')
  })

  it('binds identity into ALS', async () => {
    await runWithRequestContext(
      { requestId: 'rid-1', startedAt: Date.now(), schoolId: null, userId: null },
      async () => {
        bindRequestIdentity({ schoolId: 'school-a', userId: 'user-b' })
        expect(getRequestContext()?.schoolId).toBe('school-a')
        expect(getRequestContext()?.userId).toBe('user-b')
        expect(getRequestContext()?.requestId).toBe('rid-1')
      }
    )
  })
})

describe('sentryBeforeSend', () => {
  it('keeps opaque user id and strips email', () => {
    const event = sentryBeforeSend({
      message: 'boom',
      user: { id: 'u1', email: 'kid@school.zm', username: 'jane' },
      request: {
        url: 'https://app.example/api/students?token=secret',
        headers: { authorization: 'Bearer xyz', cookie: 'a=1' },
        data: { studentName: 'Jane', schoolId: 's1' },
      },
      extra: { grade: 90, route: '/api/x' },
    })
    expect(event.user).toEqual({ id: 'u1' })
    expect(event.request.url).not.toContain('token=')
    expect(event.request.headers.authorization).toBe('[redacted]')
    expect(event.request.data.studentName).toBe('[redacted]')
    expect(event.extra.grade).toBe('[redacted]')
  })
})

describe('alerts thresholds', () => {
  beforeEach(() => {
    resetObservabilityAlertsForTests()
  })

  it('exposes positive thresholds', () => {
    expect(ALERT_THRESHOLDS.loginFailCount()).toBeGreaterThan(0)
    expect(ALERT_THRESHOLDS.smsFailCount()).toBeGreaterThan(0)
  })

  it('records failed login / sms / payment / cross-tenant without throwing', () => {
    expect(() => {
      recordFailedLoginAlert({ schoolId: 'a', ipHash: 'abc' })
      recordSmsFailureAlert({ schoolId: 'a', reason: 'carrier' })
      recordPaymentWebhookFailureAlert({ kind: 'lipila', reason: 'unauthorized' })
      recordCrossTenantQueryAlert({
        model: 'Student',
        operation: 'findMany',
        expectedSchoolId: 'a',
        attemptedSchoolId: 'b',
      })
    }).not.toThrow()
  })
})
