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

  it('prefers dedicated school gateway over shared', async () => {
    findFirst.mockResolvedValueOnce({
      id: 'dedicated-1',
      isShared: false,
      isActive: true,
      schoolId: 'school-a',
    })

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const gw = await resolveActiveGatewayForSchool('school-a')

    expect(gw.id).toBe('dedicated-1')
    expect(findFirst).toHaveBeenCalledWith({
      where: { schoolId: 'school-a', isActive: true, isShared: false },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('falls back to shared gateway when no dedicated row', async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'shared-1',
      isShared: true,
      schoolId: null,
      isActive: true,
    })

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const gw = await resolveActiveGatewayForSchool('school-b')

    expect(gw.id).toBe('shared-1')
    expect(findFirst).toHaveBeenNthCalledWith(1, {
      where: { schoolId: 'school-b', isActive: true, isShared: false },
      orderBy: { updatedAt: 'desc' },
    })
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: { isShared: true, isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('same shared gateway resolves for two schools without dedicated', async () => {
    const shared = { id: 'shared-1', isShared: true, isActive: true, schoolId: null }
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(shared)
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(shared)

    const { resolveActiveGatewayForSchool } = await import('@/lib/sms/resolveGateway')
    const a = await resolveActiveGatewayForSchool('school-1')
    const b = await resolveActiveGatewayForSchool('school-2')

    expect(a.id).toBe('shared-1')
    expect(b.id).toBe('shared-1')
    expect(a).toEqual(b)
  })
})
