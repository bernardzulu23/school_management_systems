export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import path from 'path'
import { unlink } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { isEczStaff, isEczManager } from '@/lib/ecz/routeAuth'

export const DELETE = withSecureHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const row = await prisma.eczEvidenceFile.findFirst({
    where: { id, score: { schoolId } },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!isEczManager(auth.user) && row.uploadedBy !== auth.user.id) {
    return NextResponse.json(
      { error: 'Only the uploader or HOD can delete this file' },
      { status: 403 }
    )
  }

  const absPath = path.join(process.cwd(), row.filePath)
  await unlink(absPath).catch(() => {})
  await prisma.eczEvidenceFile.delete({ where: { id } })
  return NextResponse.json({
    success: true,
    message:
      'Evidence removed. ECZ requires retention for 2 years — delete only after expiry or with HOD approval.',
  })
})
