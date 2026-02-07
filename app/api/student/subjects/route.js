import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(request) {
  try {
    // In production, get user from auth context/token
    // For now, get the first student as we did in dashboard route
    const firstStudent = await prisma.student.findFirst()

    if (!firstStudent) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    const subjects = await prisma.subject.findMany({
      where: {
        name: { in: firstStudent.selected_subjects }
      }
    })

    return NextResponse.json({ success: true, data: subjects })
  } catch (error) {
    console.error('Fetch student subjects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}
