export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'
import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'

export const POST = withSecureApi(async function POST(request) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  let enrollmentCode
  for (let attempt = 0; attempt < 5; attempt++) {
    enrollmentCode = generateEnrollmentCode()
    try {
      await prisma.school.update({
        where: { id: gate.schoolId },
        data: { enrollmentCode },
      })
      break
    } catch (e) {
      if (String(e?.code) !== 'P2002' || attempt === 4) throw e
    }
  }

  return NextResponse.json({ success: true, enrollmentCode })
})
