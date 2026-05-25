import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  // Only admin and headteacher roles may call it
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'TEACHER', 'teacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { id: studentId } = await params
  const body = await request.json().catch(() => ({}))
  let { embedding } = body

  if (!embedding) {
    return NextResponse.json({ error: 'embedding is required' }, { status: 400 })
  }

  if (Array.isArray(embedding)) {
    embedding = JSON.stringify(embedding)
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
