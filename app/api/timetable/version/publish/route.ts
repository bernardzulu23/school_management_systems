import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'

export const dynamic = 'force-dynamic'

type PublishBody = {
  versionId?: string
}

/** Legacy TimetableVersion publish (separate from TimetableAllocationEntry publish). */
export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await resolveSchoolId(req as any, auth.user)
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school context' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as PublishBody
  const versionId = String(body?.versionId || '').trim()

  const version = versionId
    ? await prisma.timetableVersion.findFirst({
        where: { id: versionId, schoolId },
        select: { id: true, status: true },
      })
    : await prisma.timetableVersion.findFirst({
        where: { schoolId, status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      })

  if (!version) {
    return NextResponse.json({ error: 'No draft timetable version found' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.timetableVersion.updateMany({
      where: { schoolId, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    }),
    prisma.timetableVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      select: { id: true, status: true, publishedAt: true },
    }),
  ])

  return NextResponse.json({ success: true, versionId: version.id })
}
