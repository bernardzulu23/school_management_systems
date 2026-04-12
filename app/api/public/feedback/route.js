import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const BLOCKED_SUBDOMAINS = [
  'demo',
  'test',
  'staging',
  'zsms',
  'demoschool',
  'demointernationalschool',
  'demohighschool',
]

export async function GET() {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        isPublic: true,
        school: {
          active: true,
          isPubliclyListed: true,
          subdomain: { notIn: BLOCKED_SUBDOMAINS },
          NOT: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'demo', mode: 'insensitive' } },
            { name: { contains: 'zambian school management system', mode: 'insensitive' } },
          ],
        },
      },
      select: {
        id: true,
        message: true,
        category: true,
        rating: true,
        createdAt: true,
        user: { select: { role: true } },
        school: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    return NextResponse.json({
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        message: f.message,
        category: f.category,
        rating: f.rating,
        createdAt: f.createdAt,
        role: f.user?.role || null,
        schoolName: f.school?.name || null,
      })),
    })
  } catch {
    return NextResponse.json({ feedbacks: [] }, { status: 200 })
  }
}
