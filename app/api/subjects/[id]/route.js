import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export async function GET(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = await safeRouteParam(params, 'id')
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: subject })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = await safeRouteParam(params, 'id')
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const data = await request.json()

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const exists = await prisma.subject.findFirst({ where: { id, schoolId }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const name = data?.name !== undefined ? String(data.name).trim() : undefined
    const code = data?.code !== undefined ? String(data.code).trim() : undefined
    if (name !== undefined && !name)
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    if (code !== undefined && !code)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.department !== undefined ? { department: data.department } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updatedSubject })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = await safeRouteParam(params, 'id')
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const deleted = await prisma.subject.deleteMany({
      where: { id, schoolId },
    })
    if (deleted.count === 0)
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 })
  }
}
