export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'

export const GET = withSecureApi(async function GET(request) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  const students = await prisma.user.findMany({
    where: {
      schoolId: gate.schoolId,
      role: { equals: 'student', mode: 'insensitive' },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: students })
})
