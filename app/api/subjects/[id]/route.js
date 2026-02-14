import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const subject = await prisma.subject.findUnique({
      where: { id }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: subject })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        department: data.department
      }
    })

    return NextResponse.json({ success: true, data: updatedSubject })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.subject.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
