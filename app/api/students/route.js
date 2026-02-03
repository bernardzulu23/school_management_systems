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
