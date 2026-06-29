export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { resolveTeacherDepartmentId } from '@/lib/hod/resolveTeacherDepartment'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

const CAN_ACCESS = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_ACCESS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const row = await prisma.hodFile.findFirst({ where: { id, schoolId } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isStaff = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  if (!isStaff) {
    const { departmentId } = await resolveTeacherDepartmentId(schoolId, auth.user.id)
    if (!departmentId || row.departmentId !== departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const absPath = path.join(process.cwd(), row.filePath)
  try {
    const buf = await readFile(absPath)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': row.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${row.fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }
})
