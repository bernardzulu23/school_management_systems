export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

const CAN_ACCESS = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export async function GET(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roleCheck(auth.user, CAN_ACCESS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const routeParams = await params
  const filename = path.basename(String(routeParams?.filename || ''))
  if (!filename) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

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
}
