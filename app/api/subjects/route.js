import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ success: true, data: subjects })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    
    if (!data.name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
    }

    const newSubject = await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        department: data.department
      }
    })

    return NextResponse.json({ success: true, data: newSubject }, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Subject name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
