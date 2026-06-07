export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'
import { createEnrollmentInvite } from '@/lib/solo/enrollmentInvites'

export const POST = withSecureApi(async function POST(request) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  const invite = await prisma.$transaction((tx) => createEnrollmentInvite(tx, gate.schoolId))

  return NextResponse.json({ success: true, enrollmentCode: invite.code })
})
