import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const features = await prisma.creativeFeature.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: features
    })
  } catch (error) {
    console.error('Failed to fetch creative features:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch features' },
      { status: 500 }
    )
  }
}
