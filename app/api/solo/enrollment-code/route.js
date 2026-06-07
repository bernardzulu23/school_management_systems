export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'
import { countUnusedInvites, getLatestUnusedInvite } from '@/lib/solo/enrollmentInvites'

export const GET = withSecureApi(async function GET(request) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  const school = await prisma.school.findUnique({
    where: { id: gate.schoolId },
    select: {
      enrollmentCode: true,
      subdomain: true,
      plan: true,
      name: true,
    },
  })

  const [latestInvite, unusedCount] = await Promise.all([
    getLatestUnusedInvite(prisma, gate.schoolId),
    countUnusedInvites(prisma, gate.schoolId),
  ])

  const baseDomain = String(
    process.env.BASE_DOMAIN || process.env.COOKIE_DOMAIN || 'bluepeacktechnologies.com'
  )
    .trim()
    .replace(/^\./, '')

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const isLocal = baseDomain.includes('localhost') || String(host).includes('localhost')
  const origin = request.headers.get('origin') || ''
  const loginUrl = isLocal
    ? `${origin || ''}/login`.replace(/\/$/, '')
    : `https://${school?.subdomain}.${baseDomain}/login`

  const enrollmentCode = latestInvite?.code || school?.enrollmentCode || null

  return NextResponse.json({
    success: true,
    data: {
      enrollmentCode,
      unusedInviteCount: unusedCount,
      loginUrl,
      subdomain: school?.subdomain,
      plan: school?.plan,
      workspaceName: school?.name,
    },
  })
})
