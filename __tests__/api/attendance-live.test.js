/**
 * GET /api/dashboard/attendance-live
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/dashboard/attendance-live/route.js'
import { buildRequest, parseJson } from '../helpers/request.js'

const summary = {
  todayDate: '2026-05-27',
  totalClasses: 10,
  classesWithAttendance: 8,
  classesNotStarted: 2,
  totalStudents: 200,
  presentToday: 180,
  absentToday: 20,
  attendanceRate: 90,
  chronicallyAbsent: [],
  sessions: [],
  classes: [],
}

vi.mock('@/lib/middleware/auth', () => ({
  authMiddleware: vi.fn(),
  roleCheck: vi.fn((user, roles) =>
    roles.map((r) => r.toLowerCase()).includes(String(user?.role || '').toLowerCase())
  ),
}))

vi.mock('@/lib/tenant/resolveSchoolId', () => ({
  resolveAuthenticatedSchoolId: vi.fn(),
}))

vi.mock('@/lib/attendance/live-summary', () => ({
  getAttendanceLiveSummary: vi.fn(),
}))

import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getAttendanceLiveSummary } from '@/lib/attendance/live-summary'

describe('GET /api/dashboard/attendance-live', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAttendanceLiveSummary.mockResolvedValue(summary)
  })

  it('returns 403 for teacher role', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 't1', role: 'teacher', schoolId: 's1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 's1' })

    const res = await GET(
      buildRequest({ url: 'http://localhost:3000/api/dashboard/attendance-live' })
    )
    expect(res.status).toBe(403)
  })

  it('returns summary for headteacher', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'h1', role: 'headteacher', schoolId: 's1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 's1' })

    const res = await GET(
      buildRequest({ url: 'http://localhost:3000/api/dashboard/attendance-live' })
    )
    expect(res.status).toBe(200)
    const json = await parseJson(res)
    expect(json.attendanceRate).toBe(90)
    expect(json.totalClasses).toBe(10)
    expect(getAttendanceLiveSummary).toHaveBeenCalledWith('s1', { refresh: false })
  })

  it('passes refresh=1 to bypass cache', async () => {
    authMiddleware.mockResolvedValue({
      isAuthenticated: true,
      user: { id: 'h1', role: 'headteacher', schoolId: 's1' },
    })
    resolveAuthenticatedSchoolId.mockResolvedValue({ ok: true, schoolId: 's1' })

    await GET(
      buildRequest({
        url: 'http://localhost:3000/api/dashboard/attendance-live?refresh=1',
      })
    )
    expect(getAttendanceLiveSummary).toHaveBeenCalledWith('s1', { refresh: true })
  })
})
