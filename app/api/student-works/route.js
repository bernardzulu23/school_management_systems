import { NextResponse } from 'next/server'
import { findStudentWorks } from '@/lib/db/queries'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const filters = {
    category: searchParams.get('category'),
    grade: searchParams.get('grade'),
    search: searchParams.get('search'),
    featured: searchParams.get('featured'),
    page: parseInt(searchParams.get('page')) || 1,
    limit: parseInt(searchParams.get('limit')) || 20
  }

  try {
    const { works, total } = await findStudentWorks(null, filters)

    // Transform data to match frontend expectations
    const formattedWorks = works.map(work => ({
      id: work.id,
      title: work.title,
      student: work.student.name,
      grade: work.grade || work.student.class,
      subject: work.subject,
      category: work.category,
      type: work.type,
      thumbnail: work.thumbnail || '/api/placeholder/300/200',
      description: work.description,
      uploadDate: work.createdAt.toISOString().split('T')[0],
      likes: work.likes,
      comments: 0,
      views: work.views,
      featured: work.featured,
      tags: work.tags,
      teacher: work.teacherName || 'Unknown',
      awards: []
    }))

    return ApiResponse.success(formattedWorks, {
      cache: 60, // Cache for 1 minute
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Error fetching student works:', error)
    return ApiResponse.error(error.message, 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.studentId || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newWork = await prisma.studentWork.create({
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        url: body.url,
        thumbnail: body.thumbnail,
        category: body.category || 'general',
        grade: body.grade,
        subject: body.subject,
        tags: body.tags || [],
        studentId: body.studentId,
        teacherName: body.teacherName,
        featured: body.featured || false
      }
    })

    return NextResponse.json({ success: true, data: newWork })
  } catch (error) {
    console.error('Error creating student work:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
