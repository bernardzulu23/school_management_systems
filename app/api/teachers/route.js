import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')

    const teachers = await prisma.teacher.findMany({
      where: department ? { department } : {},
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            contact_number: true,
            profile_picture_url: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: teachers
    })

  } catch (error) {
    console.error('Teachers fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 })
    }

    // Separate User and Teacher data
    const {
      name,
      email,
      contact_number,
      assigned_subjects,
      assigned_classes,
      ...teacherData
    } = updateData

    // Transaction to update both
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Teacher to find User ID
      const teacher = await tx.teacher.findUnique({
        where: { id },
        select: { userId: true }
      })

      if (!teacher) throw new Error('Teacher not found')

      // 2. Update User
      if (name || email || contact_number) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            name,
            email,
            contact_number
          }
        })
      }

      // 3. Update Teacher Profile
      const updatedTeacher = await tx.teacher.update({
        where: { id },
        data: {
          ...teacherData,
          subjects: assigned_subjects, // Map back if needed, assuming array
          assigned_classes: assigned_classes
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return updatedTeacher
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Teacher update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update teacher' },
      { status: 500 }
    )
  }
}

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
        select: { userId: true }
      })

      if (!teacher) throw new Error('Teacher not found')

      // 2. Delete Teacher Profile first (due to foreign key)
      await tx.teacher.delete({
        where: { id }
      })

      // 3. Delete User
      await tx.user.delete({
        where: { id: teacher.userId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Teacher deleted successfully'
    })

  } catch (error) {
    console.error('Teacher delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
