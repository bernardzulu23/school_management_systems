export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import path from 'path'
import { unlink } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'

const CAN_MANAGE = ['HOD', 'hod', 'ADMIN', 'headteacher', 'admin']
const CAN_DELETE = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const DELETE = withSecureApi(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const canDelete = roleCheck(auth.user, CAN_DELETE) && (roleCheck(auth.user, CAN_MANAGE) || true)
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const routeParams = await params
  const id = String(routeParams?.id || '')

  const row = await prisma.eczEvidenceFile.findFirst({
    where: { id, score: { schoolId } },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isManager = roleCheck(auth.user, CAN_MANAGE)
  if (!isManager && row.uploadedBy !== auth.user.id) {
    return NextResponse.json(
      { error: 'Only the uploader or HOD can delete this file' },
      { status: 403 }
    )
  }

  try {
    const absPath = path.join(process.cwd(), row.filePath)
    await unlink(absPath).catch(() => {})
    await prisma.eczEvidenceFile.delete({ where: { id } })
    return NextResponse.json({
      success: true,
      message:
        'Evidence removed. ECZ requires retention for 2 years — delete only after expiry or with HOD approval.',
    })
  } catch (error) {
    console.error('ECZ evidence DELETE:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
})
