import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()

    const where = q
      ? {
          active: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { subdomain: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : { active: true }

    const schools = await prisma.school.findMany({
      where,
      select: {
        name: true,
        subdomain: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ schools })
  } catch (error) {
    return NextResponse.json({ schools: [] }, { status: 200 })
  }
}
