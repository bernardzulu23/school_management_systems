import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit
    const schoolId = searchParams.get('schoolId')
    const className = searchParams.get('class')
    const subject = searchParams.get('subject')

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...(className ? { class: className } : {}),
      ...(subject ? { subject } : {})
    }

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.assessment.count({ where })
    ])

    return NextResponse.json({ 
      success: true, 
      data: assessments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
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
