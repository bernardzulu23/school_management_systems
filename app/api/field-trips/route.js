import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/utils/apiResponse'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const [fieldTrips, total] = await Promise.all([
      prisma.fieldTrip.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.fieldTrip.count()
    ])

    return ApiResponse.success(fieldTrips, {
      cache: 600, // Cache for 10 minutes
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching field trips:', error)
    return ApiResponse.error(error.message, 500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.location || !body.subject) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newFieldTrip = await prisma.fieldTrip.create({
      data: {
        title: body.title,
        location: body.location,
        subject: body.subject,
        grade: body.grade || 'All',
        duration: body.duration || 'Flexible',
        description: body.description || '',
        thumbnail: body.thumbnail,
        difficulty: body.difficulty || 'Beginner',
        rating: body.rating || 0,
        participants: body.participants || 0,
        stops: body.stops || [],
        learningObjectives: body.learningObjectives || [],
        resources: body.resources || []
      }
    })

    return NextResponse.json({ success: true, data: newFieldTrip })
  } catch (error) {
    console.error('Error creating field trip:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
