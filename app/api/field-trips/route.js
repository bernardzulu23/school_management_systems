export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const [fieldTrips, total] = await Promise.all([
      prisma.fieldTrip.findMany({
        where: { schoolId },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.fieldTrip.count({ where: { schoolId } }),
    ])

    return ApiResponse.success(fieldTrips, {
      cache: 600, // Cache for 10 minutes
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching field trips:', error)
    return ApiResponse.error(error.message, 500)
  }
}

export async function POST(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.location || !body.subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const title = String(body.title).trim()
    const location = String(body.location).trim()
    const subject = String(body.subject).trim()
    if (!title || !location || !subject) {
      return NextResponse.json({ error: 'Invalid required fields' }, { status: 400 })
    }

    const newFieldTrip = await prisma.fieldTrip.create({
      data: {
        schoolId,
        title,
        location,
        subject,
        grade: body.grade || 'All',
        duration: body.duration || 'Flexible',
        description: String(body.description || ''),
        thumbnail: body.thumbnail,
        date: body.date ? new Date(body.date) : new Date(),
        type: body.type === 'physical' ? 'physical' : 'virtual',
        difficulty: body.difficulty || 'Beginner',
        rating: typeof body.rating === 'number' ? body.rating : 0,
        participants: typeof body.participants === 'number' ? body.participants : 0,
        stops: body.stops || [],
        learningObjectives: body.learningObjectives || [],
        resources: body.resources || [],
        status: String(body.status || 'upcoming'),
      },
    })

    return NextResponse.json({ success: true, data: newFieldTrip })
  } catch (error) {
    console.error('Error creating field trip:', error)
    return NextResponse.json({ error: 'Failed to create field trip' }, { status: 500 })
  }
}
