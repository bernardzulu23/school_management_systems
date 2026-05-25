import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export async function POST(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const departmentId = body?.departmentId ? String(body.departmentId).trim() : null
    const classIds = Array.isArray(body?.classIds)
      ? body.classIds.map((id) => String(id).trim()).filter(Boolean)
      : []

    if (!classIds.length) {
      return NextResponse.json({ error: 'classIds array is required' }, { status: 400 })
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, schoolId },
        select: { id: true },
      })
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 400 })
      }
    }

    const result = await prisma.class.updateMany({
      where: { schoolId, id: { in: classIds } },
      data: { departmentId },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      departmentId,
      classIds,
    })
  } catch (error) {
    console.error('[classes/bulk-assign-department]', error)
    return NextResponse.json({ error: 'Failed to assign departments' }, { status: 500 })
  }
}
