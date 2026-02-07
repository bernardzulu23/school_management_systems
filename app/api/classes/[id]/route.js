import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const classItem = await prisma.class.findUnique({
      where: { id }
    })

    if (!classItem) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: classItem })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        capacity: parseInt(data.capacity),
        level: data.level,
        stream: data.stream,
        classTeacherId: data.classTeacherId
      }
    })

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.class.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Class deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
