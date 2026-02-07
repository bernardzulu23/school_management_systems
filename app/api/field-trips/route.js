import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    let fieldTrips = await prisma.fieldTrip.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Return empty array if no trips found (dynamic behavior)
    if (fieldTrips.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    return NextResponse.json({ success: true, data: fieldTrips })
  } catch (error) {
    console.error('Error fetching field trips:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
