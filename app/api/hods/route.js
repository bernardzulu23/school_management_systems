import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const hods = await prisma.user.findMany({
      where: { role: 'hod' },
    })
    
    // Map to expected format
    const formattedHods = hods.map(h => ({
      id: h.id, 
      name: h.name,
      email: h.email,
      role: h.role,
      // Mock other fields used by UI
      department_name: 'General', 
      performance_rating: 4.5,
      years_experience: 5
    }))

    return NextResponse.json(formattedHods)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
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
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, password, ...updateData } = data

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
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Delete user (cascading deletes might be needed if they have relations, 
    // but User model currently only has optional relations that might need manual cleanup if not cascading in DB)
    await prisma.user.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
