import { describe, it, expect } from 'vitest'
import {
  isPlainScalar,
  safeCompositeKey,
  safeQueryString,
  safeRouteParam,
  safeStringId,
  safeStringIds,
} from '@/lib/security/safeQueryValue'

describe('safeQueryValue', () => {
  it('rejects object injection payloads', () => {
    expect(safeStringId({ $ne: 5 })).toBeNull()
    expect(safeStringId(['x'])).toBeNull()
    expect(isPlainScalar({ $ne: 1 })).toBe(false)
  })

  it('accepts plain string ids', () => {
    expect(safeStringId('abc-123')).toBe('abc-123')
    expect(safeStringId('  uuid  ')).toBe('uuid')
  })

  it('filters id arrays', () => {
    expect(safeStringIds(['a', { $ne: 1 }, 'b'])).toEqual(['a', 'b'])
  })

  it('sanitizes composite keys', () => {
    expect(
      safeCompositeKey({
        schoolId: 's1',
        studentId: 'st1',
        term: 'Term 1',
        year: '2026',
      })
    ).toEqual({
      schoolId: 's1',
      studentId: 'st1',
      term: 'Term 1',
      year: '2026',
    })
    expect(safeCompositeKey({ schoolId: 's1', studentId: { $ne: 'x' } })).toBeNull()
  })

  it('safeQueryString rejects operators and supports defaults', () => {
    expect(safeQueryString({ $gt: '' })).toBeNull()
    expect(safeQueryString(undefined, { defaultValue: 'Term 1' })).toBe('Term 1')
    expect(safeQueryString('Term 2', { defaultValue: 'Term 1' })).toBe('Term 2')
  })

  it('safeRouteParam coerces route ids and rejects objects', async () => {
    expect(await safeRouteParam({ id: 'alloc_1' })).toBe('alloc_1')
    expect(await safeRouteParam({ id: { $ne: null } })).toBeNull()
    expect(await safeRouteParam(Promise.resolve({ id: 'x' }), 'id')).toBe('x')
    expect(await safeRouteParam({ teacherId: 't1' }, 'teacherId')).toBe('t1')
  })
})
