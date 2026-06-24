import { describe, it, expect, afterEach } from 'vitest'
import { computeMaxExecutionMs } from '@/lib/timetable/solverTimeout'

describe('computeMaxExecutionMs', () => {
  const prev = process.env.VERCEL_FUNCTION_TIMEOUT

  afterEach(() => {
    if (prev === undefined) delete process.env.VERCEL_FUNCTION_TIMEOUT
    else process.env.VERCEL_FUNCTION_TIMEOUT = prev
  })

  it('uses tiered defaults by lesson count', () => {
    delete process.env.VERCEL_FUNCTION_TIMEOUT
    expect(computeMaxExecutionMs(30)).toBe(8000)
    expect(computeMaxExecutionMs(80)).toBe(10000)
    expect(computeMaxExecutionMs(150)).toBe(15000)
    expect(computeMaxExecutionMs(250)).toBe(25000)
  })

  it('caps to Vercel function timeout when set', () => {
    process.env.VERCEL_FUNCTION_TIMEOUT = '10'
    expect(computeMaxExecutionMs(250)).toBe(9500)
  })

  it('honours explicit override within cap', () => {
    delete process.env.VERCEL_FUNCTION_TIMEOUT
    expect(computeMaxExecutionMs(10, 12000)).toBe(12000)
  })
})
