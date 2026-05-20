import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  // Only admin and headteacher roles may call it
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden: Admin or Headteacher only' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { id: studentId } = params
  const body = await request.json().catch(() => ({}))
  const { embedding } = body

  if (!embedding) {
    return NextResponse.json({ error: 'embedding is required' }, { status: 400 })
  }

  try {
    // Verify the student belongs to the same schoolId as the requester
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found or unauthorized' }, { status: 404 })
    }

    // Save to Student.faceEmbedding
    await prisma.student.update({
      where: { id: studentId },
      data: { faceEmbedding: embedding },
    })

    return NextResponse.json({ success: true, studentId })
  } catch (error) {
    console.error('Face enrollment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
