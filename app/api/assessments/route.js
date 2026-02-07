import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { date: 'desc' }
    })
    return NextResponse.json({ success: true, data: assessments })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    
    if (!data.title || !data.date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    const newAssessment = await prisma.assessment.create({
      data: {
        title: data.title,
        type: data.type || 'Test',
        subject: data.subject,
        class: data.class,
        date: new Date(data.date),
        totalMarks: parseInt(data.totalMarks) || 100
      }
    })

    return NextResponse.json({ success: true, data: newAssessment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
