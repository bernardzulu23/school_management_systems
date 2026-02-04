import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const students = await prisma.student.findMany({
      where: classId ? { class: classId } : {}, // Assuming classId is class name or ID
      include: {
        user: true
      }
    })

    return NextResponse.json({
      success: true,
      data: students
    })

  } catch (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const studentData = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'email', 'class_id'] // class_id maps to 'class' string
    for (const field of requiredFields) {
      if (!studentData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Transaction to create User and Student
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          name: studentData.name,
          email: studentData.email,
          role: 'student',
          password: hashedPassword,
        }
      })

      // Create Student
      const student = await tx.student.create({
        data: {
          userId: user.id,
          name: studentData.name,
          class: studentData.class_id, // Mapping class_id to class string
          id: studentData.student_id || undefined, // Allow custom ID
        }
      })
      
      return { ...student, user }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Student creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Separate User and Student data
    const {
      name,
      email,
      class_id, // Maps to 'class'
      selected_subjects,
      ...studentData
    } = updateData

    // Transaction to update both
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Student to find User ID
      const student = await tx.student.findUnique({
        where: { id },
        select: { userId: true }
      })

      if (!student) throw new Error('Student not found')

      // 2. Update User (if userId exists)
      if (student.userId && (name || email)) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            name,
            email
          }
        })
      }

      // 3. Update Student Profile
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          ...studentData,
          name: name, // Student also has name
          class: class_id, // Map class_id to class
          selected_subjects: selected_subjects
        },
        include: {
          user: true
        }
      })

      return updatedStudent
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update student' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Transaction to delete Student and User
    await prisma.$transaction(async (tx) => {
      // 1. Get User ID
      const student = await tx.student.findUnique({
        where: { id },
        select: { userId: true }
      })

      if (!student) throw new Error('Student not found')

      // 2. Delete Student Profile first
      await tx.student.delete({
        where: { id }
      })

      // 3. Delete User (if linked)
      if (student.userId) {
        await tx.user.delete({
          where: { id: student.userId }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    })

  } catch (error) {
    console.error('Student delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete student' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
