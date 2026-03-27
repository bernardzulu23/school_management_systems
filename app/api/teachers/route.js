import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { findTeachersByDepartment } from '@/lib/db/queries'
import bcrypt from 'bcryptjs'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const GET = withErrorHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const department = searchParams.get('department')
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20

  const schoolId = await getSchoolIdFromRequest(request)
  const { teachers, total } = await findTeachersByDepartment(schoolId, department, page, limit)

  return NextResponse.json({
    success: true,
    data: teachers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const PUT = withErrorHandler(async function PUT(request) {
  const data = await request.json()
  const { id, ...updateData } = data

  if (!id) {
    throw new ApiError('Teacher ID is required', 400)
  }

  // Separate User and Teacher data
  const { name, email, contact_number, assigned_subjects, assigned_classes, ...teacherData } =
    updateData

  // Transaction to update both
  const result = await prisma.$transaction(async (tx) => {
    // 1. Get Teacher to find User ID
    const teacher = await tx.teacher.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!teacher) throw new ApiError('Teacher not found', 404)

    // 2. Update User
    if (name || email || contact_number) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          name,
          email,
          contact_number,
        },
      })
    }

    // 3. Update Teacher Profile
    const updatedTeacher = await tx.teacher.update({
      where: { id },
      data: {
        ...teacherData,
        subjects: assigned_subjects, // Map back if needed, assuming array
        assigned_classes: assigned_classes,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return updatedTeacher
  })

  return NextResponse.json({
    success: true,
    data: result,
  })
})

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 })
    }

    // Transaction to delete Teacher and User
    await prisma.$transaction(async (tx) => {
      // 1. Get User ID
      const teacher = await tx.teacher.findUnique({
        where: { id },
        select: { userId: true },
      })

      if (!teacher) throw new Error('Teacher not found')

      // 2. Delete Teacher Profile first (due to foreign key)
      await tx.teacher.delete({
        where: { id },
      })

      // 3. Delete User
      await tx.user.delete({
        where: { id: teacher.userId },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Teacher deleted successfully',
    })
  } catch (error) {
    console.error('Teacher delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
