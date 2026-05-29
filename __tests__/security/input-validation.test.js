/**
 * Security tests: input validation layer (Task 24).
 *
 * What we test:
 * 1. validateBody returns a 400 Response on schema failure.
 * 2. validateBody returns parsed data on success.
 * 3. Role escalation: an extra `role`/`schoolId` field is stripped (not honoured).
 * 4. parseBodyOrThrow throws ApiError(400) on failure, returns data on success.
 * 5. Oversized strings are rejected.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateBody, parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { ApiError } from '@/lib/middleware/errorHandler'
import { CreateSubjectSchema, SendSMSSchema } from '@/lib/schemas'
import { buildRequest } from '../helpers/request.js'

describe('validateBody', () => {
  it('returns a 400 Response when the body is invalid', async () => {
    const req = buildRequest({ method: 'POST', body: { name: '' } })
    const { data, error } = await validateBody(req, CreateSubjectSchema)
    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error.status).toBe(400)
    const json = await error.json()
    expect(json.error).toMatch(/validation/i)
    expect(Array.isArray(json.details)).toBe(true)
  })

  it('returns parsed data when the body is valid', async () => {
    const req = buildRequest({ method: 'POST', body: { name: 'Mathematics' } })
    const { data, error } = await validateBody(req, CreateSubjectSchema)
    expect(error).toBeNull()
    expect(data.name).toBe('Mathematics')
  })

  it('strips role/schoolId escalation fields from the parsed result', async () => {
    const req = buildRequest({
      method: 'POST',
      body: { name: 'Mathematics', role: 'headteacher', schoolId: 'other-school' },
    })
    const { data } = await validateBody(req, CreateSubjectSchema)
    expect(data).toBeTruthy()
    expect(data).not.toHaveProperty('role')
    expect(data).not.toHaveProperty('schoolId')
  })

  it('rejects invalid JSON', async () => {
    const req = new Request('http://localhost/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    const { data, error } = await validateBody(req, CreateSubjectSchema)
    expect(data).toBeNull()
    expect(error.status).toBe(400)
  })
})

describe('parseBodyOrThrow', () => {
  it('throws ApiError(400) on invalid body', async () => {
    const req = buildRequest({ method: 'POST', body: { message: '' } })
    await expect(parseBodyOrThrow(req, SendSMSSchema)).rejects.toBeInstanceOf(ApiError)
    try {
      await parseBodyOrThrow(buildRequest({ method: 'POST', body: { message: '' } }), SendSMSSchema)
    } catch (e) {
      expect(e.status).toBe(400)
    }
  })

  it('returns parsed data on valid body', async () => {
    const req = buildRequest({
      method: 'POST',
      body: { to: '+260971234567', message: 'Hello parents' },
    })
    const data = await parseBodyOrThrow(req, SendSMSSchema)
    expect(data.message).toBe('Hello parents')
  })

  it('rejects oversized strings', async () => {
    const huge = 'x'.repeat(2000)
    const req = buildRequest({
      method: 'POST',
      body: { to: '+260971234567', message: huge },
    })
    await expect(parseBodyOrThrow(req, SendSMSSchema)).rejects.toBeInstanceOf(ApiError)
  })

  it('coerces query-style enums and bounds', () => {
    const schema = z.object({ n: z.coerce.number().int().min(1).max(10) })
    expect(schema.safeParse({ n: '5' }).success).toBe(true)
    expect(schema.safeParse({ n: '50' }).success).toBe(false)
  })
})
