import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { findAllSubjects } from '@/lib/db/queries'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { ApiResponse } from '@/lib/utils/apiResponse'

export const GET = withErrorHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20

  const { subjects, total } = await findAllSubjects(null, page, limit)

  return ApiResponse.success(subjects, {
    cache: 300, // Cache for 5 minutes
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const data = await request.json()
  
  if (!data.name) {
    throw new ApiError('Subject name is required', 400)
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
})
