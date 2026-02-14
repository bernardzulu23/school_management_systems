import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { findHods } from '@/lib/db/queries'
import bcrypt from 'bcryptjs'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET() {
  const hods = await findHods(null) // schoolId null for now
  
  // Map to expected format
  const formattedHods = hods.map(h => ({
    id: h.id, 
    name: h.name,
    email: h.email,
    role: h.role,
    // Mock other fields used by UI
    department_name: h.hodProfile?.department || 'General', 
    performance_rating: 4.5,
    years_experience: 5
  }))

  return NextResponse.json(formattedHods)
})

export const POST = withErrorHandler(async function POST(request) {
  const data = await request.json()
  
  if (!data.name || !data.email || !data.password) {
    throw new ApiError('Name, email and password are required', 400)
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)
  
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'hod',
    }
  })
  
  return NextResponse.json({ success: true, data: user })
})

export const PUT = withErrorHandler(async function PUT(request) {
  const data = await request.json()
  const { id, password, ...updateData } = data

  if (!id) {
    throw new ApiError('ID is required', 400)
  }

  const updatePayload = {
    name: updateData.name,
    email: updateData.email,
  }

  if (password) {
    updatePayload.password = await bcrypt.hash(password, 10)
  }

  const user = await prisma.user.update({
    where: { id },
    data: updatePayload
  })
  
  return NextResponse.json({ success: true, data: user })
})

export const DELETE = withErrorHandler(async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    throw new ApiError('ID is required', 400)
  }

  // Delete user (cascading deletes might be needed if they have relations, 
  // but User model currently only has optional relations that might need manual cleanup if not cascading in DB)
  await prisma.user.delete({
    where: { id }
  })
  
  return NextResponse.json({ success: true })
})
