export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import { isEczStaff } from '@/lib/ecz/routeAuth'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const filenameParam = await safeRouteParam(params, 'filename')
  const filename = filenameParam ? path.basename(filenameParam) : ''
  if (!filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const row = await prisma.eczEvidenceFile.findFirst({
    where: {
      filePath: { endsWith: filename },
      score: { schoolId },
    },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
