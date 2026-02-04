import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const assessment = await prisma.assessment.findUnique({
      where: { id }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: assessment })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const data = await request.json()

    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        subject: data.subject,
        class: data.class,
        date: data.date ? new Date(data.date) : undefined,
        totalMarks: parseInt(data.totalMarks)
      }
    })

    return NextResponse.json({ success: true, data: updatedAssessment })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    await prisma.assessment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Assessment deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
