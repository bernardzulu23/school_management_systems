import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ success: true, data: classes })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
    }

    const newClass = await prisma.class.create({
      data: {
        name: data.name,
        capacity: parseInt(data.capacity) || 30,
        level: data.level,
        stream: data.stream,
        classTeacherId: data.classTeacherId
      }
    })

    return NextResponse.json({ success: true, data: newClass }, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Class name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
