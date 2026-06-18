import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import proxy from '@/proxy.js'
import {
  checkAntiScraping,
  checkApiScrapeRateLimit,
  clampListLimit,
  isAntiScrapingEnabled,
} from '@/lib/security/antiScraping'
import { buildRequest, parseJson } from '../helpers/request.js'

function signedAccessToken(role = 'teacher') {
  return jwt.sign(
    { id: `user-${role}`, email: `${role}@test.local`, role, schoolId: 'school-1' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  )
}

describe('antiScraping module', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('clampListLimit caps bulk extraction requests', () => {
    const params = new URLSearchParams({ limit: '5000' })
    expect(clampListLimit(params, { defaultLimit: 20, maxLimit: 100 })).toBe(100)
    expect(clampListLimit(new URLSearchParams(), { defaultLimit: 20, maxLimit: 100 })).toBe(20)
  })

  it('blocks scripted user agents when enabled', () => {
    process.env.ANTI_SCRAPING_ENABLED = 'true'
    expect(isAntiScrapingEnabled()).toBe(true)

    const req = buildRequest({
      url: 'http://localhost:3000/api/assessments',
      headers: { 'user-agent': 'python-requests/2.31.0' },
    })

    const result = checkAntiScraping(req, '/api/assessments', { isPublic: false })
    expect(result.blocked).toBe(true)
    expect(result.code).toBe('blocked_client')
  })

  it('requires XHR headers for cookie-authenticated API calls when enabled', () => {
    process.env.ANTI_SCRAPING_ENABLED = 'true'

    const req = buildRequest({
      url: 'http://localhost:3000/api/assessments',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        cookie: `access_token=${signedAccessToken('teacher')}`,
      },
    })
    req.cookies = {
      get: (name) =>
        name === 'access_token' ? { value: signedAccessToken('teacher') } : undefined,
    }

    const result = checkAntiScraping(req, '/api/assessments', { isPublic: false })
    expect(result.blocked).toBe(true)
    expect(result.code).toBe('invalid_client')
  })

  it('rate limits repeated API calls per IP', () => {
    process.env.ANTI_SCRAPING_ENABLED = 'true'
    process.env.SCRAPE_RATE_PUBLIC_GET = '2'

    const req = buildRequest({
      url: 'http://localhost:3000/api/public/features',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ZSMS-Test/1.0)' },
    })

    expect(checkApiScrapeRateLimit(req, '/api/public/features', { isPublic: true }).limited).toBe(
      false
    )
    expect(checkApiScrapeRateLimit(req, '/api/public/features', { isPublic: true }).limited).toBe(
      false
    )
    const third = checkApiScrapeRateLimit(req, '/api/public/features', { isPublic: true })
    expect(third.limited).toBe(true)
    expect(third.retryAfter).toBeGreaterThan(0)
  })
})

describe('antiScraping proxy integration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.ANTI_SCRAPING_ENABLED = 'true'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns 403 for curl-style authenticated API access', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/assessments',
      headers: {
        'user-agent': 'curl/8.0.0',
        cookie: `access_token=${signedAccessToken('teacher')}`,
      },
      cookies: { access_token: signedAccessToken('teacher') },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.status).toBe(403)
    const body = await parseJson(res)
    expect(body.error).toMatch(/forbidden/i)
  })

  it('allows authenticated API access with browser client headers', async () => {
    const req = buildRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/assessments',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'x-requested-with': 'XMLHttpRequest',
        accept: 'application/json',
      },
      cookies: { access_token: signedAccessToken('teacher') },
    })
    req.nextUrl = new URL(req.url)

    const res = await proxy(req)
    expect(res.status).not.toBe(403)
  })
})
