/**
 * PATCH/DELETE /api/sms/gateway/[id] — platform admin gateway CRUD
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma } from '../setup.js'
import { buildRequest, parseJson } from '../helpers/request.js'

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn(),
  isPlatformSession: vi.fn((user) => Boolean(user?.isPlatform) && user?.role === 'superadmin'),
}))

const platformAdmin = {
  id: 'admin-1',
  role: 'superadmin',
  email: 'ops@zsms.com',
  isPlatform: true,
  schoolId: null,
}

const teacher = {
  id: 'teacher-1',
  role: 'teacher',
  email: 't@school.com',
  isPlatform: false,
  schoolId: 'school-1',
}

const gatewayRow = {
  id: 'gw-1',
  schoolId: 'school-1',
  deviceName: 'Front office',
  isActive: true,
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  school: { id: 'school-1', name: 'Demo School' },
}

describe('/api/sms/gateway/[id]', () => {
  /** @type {{ PATCH: Function, DELETE: Function }} */
  let route

  beforeAll(async () => {
    route = await import('@/app/api/sms/gateway/[id]/route')
  }, 60000)

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.sMSGateway.findUnique.mockResolvedValue(gatewayRow)
    mockPrisma.sMSGateway.update.mockResolvedValue({
      ...gatewayRow,
      deviceName: 'Office phone',
      isActive: false,
    })
    mockPrisma.sMSGateway.delete.mockResolvedValue(gatewayRow)
    mockPrisma.schoolSmsSettings.upsert.mockResolvedValue({
      schoolId: 'school-1',
      customGatewayEnabled: true,
    })
  })

  it('PATCH rejects non-platform users', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: teacher })

    const res = await route.PATCH(
      buildRequest({
        method: 'PATCH',
        url: 'http://localhost/api/sms/gateway/gw-1',
        body: { deviceName: 'X', schoolId: 'school-1' },
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.sMSGateway.update).not.toHaveBeenCalled()
  })

  it('PATCH updates deviceName, isActive, and school enable flag', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: platformAdmin })

    const res = await route.PATCH(
      buildRequest({
        method: 'PATCH',
        url: 'http://localhost/api/sms/gateway/gw-1',
        body: {
          schoolId: 'school-1',
          deviceName: 'Office phone',
          isActive: false,
          enableForSchool: true,
        },
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.success).toBe(true)
    expect(json.gateway.deviceName).toBe('Office phone')
    expect(json.gateway.isActive).toBe(false)
    expect(json.customGatewayEnabled).toBe(true)
    expect(mockPrisma.sMSGateway.update).toHaveBeenCalledWith({
      where: { id: 'gw-1' },
      data: { deviceName: 'Office phone', isActive: false },
    })
    expect(mockPrisma.schoolSmsSettings.upsert).toHaveBeenCalledWith({
      where: { schoolId: 'school-1' },
      create: { schoolId: 'school-1', customGatewayEnabled: true },
      update: { customGatewayEnabled: true },
    })
  })

  it('PATCH rejects cross-school schoolId', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: platformAdmin })

    const res = await route.PATCH(
      buildRequest({
        method: 'PATCH',
        url: 'http://localhost/api/sms/gateway/gw-1',
        body: { schoolId: 'other-school', deviceName: 'X' },
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.sMSGateway.update).not.toHaveBeenCalled()
  })

  it('DELETE rejects non-platform users', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: teacher })

    const res = await route.DELETE(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost/api/sms/gateway/gw-1?schoolId=school-1',
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.sMSGateway.delete).not.toHaveBeenCalled()
  })

  it('DELETE revokes gateway for matching school', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: platformAdmin })

    const res = await route.DELETE(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost/api/sms/gateway/gw-1?schoolId=school-1',
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json).toMatchObject({ success: true, deleted: true, id: 'gw-1', schoolId: 'school-1' })
    expect(mockPrisma.sMSGateway.delete).toHaveBeenCalledWith({ where: { id: 'gw-1' } })
  })

  it('DELETE rejects cross-school schoolId', async () => {
    const { authMiddleware } = await import('@/lib/middleware/auth')
    authMiddleware.mockResolvedValue({ isAuthenticated: true, user: platformAdmin })

    const res = await route.DELETE(
      buildRequest({
        method: 'DELETE',
        url: 'http://localhost/api/sms/gateway/gw-1?schoolId=other-school',
      }),
      { params: { id: 'gw-1' } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.sMSGateway.delete).not.toHaveBeenCalled()
  })
})
