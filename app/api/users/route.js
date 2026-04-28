export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const isAllowedRole = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const q = String(searchParams.get('q') || '').trim()

  const where = {
    schoolId,
    ...(role ? { role: String(role) } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      contact_number: true,
      profile_picture_url: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: users })
}
