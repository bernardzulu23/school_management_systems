import { describe, it, expect, vi, beforeEach } from 'vitest'

const findFirst = vi.fn()

vi.mock('@/lib/prisma/client', () => ({
  basePrisma: {
    sMSGateway: { findFirst: (...args) => findFirst(...args) },
  },
}))

describe('resolveActiveGatewayForSchool', () => {
  beforeEach(() => {
    findFirst.mockReset()
    vi.resetModules()
  })

  it('prefers active shared gateway for any school', async () => {
    findFirst.mockResolvedValueOnce({
      id: 'shared-1',
      isShared: true,
      isActive: true,
      schoolId: null,
    })

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const gw = await resolveActiveGatewayForSchool('school-a')

    expect(gw.id).toBe('shared-1')
    expect(findFirst).toHaveBeenCalledWith({
      where: { isShared: true, isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('falls back to per-school gateway when no shared row', async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'legacy-1',
      isShared: false,
      schoolId: 'school-b',
      isActive: true,
    })

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const gw = await resolveActiveGatewayForSchool('school-b')

    expect(gw.id).toBe('legacy-1')
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: { schoolId: 'school-b', isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('same shared gateway resolves for two schools', async () => {
    const shared = { id: 'shared-1', isShared: true, isActive: true, schoolId: null }
    findFirst.mockResolvedValue(shared)

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const a = await resolveActiveGatewayForSchool('school-1')
    const b = await resolveActiveGatewayForSchool('school-2')

    expect(a.id).toBe('shared-1')
    expect(b.id).toBe('shared-1')
    expect(a).toEqual(b)
  })
})
