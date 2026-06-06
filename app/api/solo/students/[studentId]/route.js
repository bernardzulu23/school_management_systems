export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { requireSoloTeacher } from '@/lib/solo/requireSoloTeacher'

export const DELETE = withSecureApi(async function DELETE(request, { params }) {
  const gate = await requireSoloTeacher(request)
  if (!gate.ok) return gate.response

  const studentId = params?.studentId
  if (!studentId) return NextResponse.json({ error: 'Student id required' }, { status: 400 })

  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      schoolId: gate.schoolId,
      role: { equals: 'student', mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  await prisma.user.delete({ where: { id: studentId } })

  return NextResponse.json({ success: true })
})
