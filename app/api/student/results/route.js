import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    // Mock auth: Get the first student for now, consistent with dashboard/student/route.js
    const student = await prisma.student.findFirst()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      prisma.result.findMany({
        where: { studentId: student.id },
        include: { 
          subject: {
            select: {
              name: true,
              code: true
            }
          } 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.result.count({ where: { studentId: student.id } })
    ])

    // Transform results to be more frontend-friendly
    const formattedResults = results.map(result => ({
      id: result.id,
      subject: result.subject.name,
      subjectCode: result.subject.code,
      score: result.score,
      grade: result.grade,
      term: result.term,
      year: result.year,
      comments: result.comments,
      date: result.createdAt.toISOString()
    }))

    return NextResponse.json({ 
      success: true, 
      data: formattedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching student results:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
