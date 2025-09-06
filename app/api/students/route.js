import { NextResponse } from 'next/server'
import { db, supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const students = await db.getStudents(classId)

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
    const requiredFields = ['name', 'email', 'class_id']
    for (const field of requiredFields) {
      if (!studentData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Create student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        name: studentData.name,
        email: studentData.email,
        role: 'student',
        contact_number: studentData.contact_number || null,
        address: studentData.address || null
      })
      .select()
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to create student profile' },
        { status: 500 }
      )
    }

    // Create student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: profile.id,
        class_id: studentData.class_id,
        student_id: studentData.student_id || null,
        date_of_birth: studentData.date_of_birth || null,
        guardian_name: studentData.guardian_name || null,
        guardian_contact: studentData.guardian_contact || null
      })
      .select()
      .single()

    if (studentError) {
      return NextResponse.json(
        { error: 'Failed to create student record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...student, profile }
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
