import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const grade = searchParams.get('grade')
  const search = searchParams.get('search')
  const featured = searchParams.get('featured')

  try {
    const where = {}

    if (category && category !== 'all') {
      where.category = category
    }

    if (grade && grade !== 'all') {
      where.grade = grade
    }

    if (featured === 'true') {
      where.featured = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { tags: { hasSome: [search] } } // Note: Partial matching for arrays is tricky in Prisma, but this checks exact match in array
      ]
    }

    const studentWorks = await prisma.studentWork.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            class: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data to match frontend expectations
    const formattedWorks = studentWorks.map(work => ({
      id: work.id,
      title: work.title,
      student: work.student.name,
      grade: work.grade || work.student.class, // Fallback to student class if grade not set
      subject: work.subject,
      category: work.category,
      type: work.type,
      thumbnail: work.thumbnail || '/api/placeholder/300/200',
      description: work.description,
      uploadDate: work.createdAt.toISOString().split('T')[0],
      likes: work.likes,
      comments: 0, // Comment system not yet implemented
      views: work.views,
      featured: work.featured,
      tags: work.tags,
      teacher: work.teacherName || 'Unknown',
      awards: [] // Awards relationship not yet implemented
    }))

    return NextResponse.json({ success: true, data: formattedWorks })
  } catch (error) {
    console.error('Error fetching student works:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
