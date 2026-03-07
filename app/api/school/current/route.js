import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

// Use a global prisma instance if available, otherwise create new (avoiding connection limits in dev)
const globalForPrisma = global
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const explicitSubdomain = searchParams.get('subdomain')

    const schoolId = await getSchoolIdFromRequest(request, explicitSubdomain)

    if (!schoolId) {
      // Return a default/fallback object or null
      return NextResponse.json({ school: null })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo_url: true,
        active: true,
        // Add other fields as needed for branding
      },
    })

    return NextResponse.json({ school })
  } catch (error) {
    console.error('Error fetching current school:', error)
    return NextResponse.json({ error: 'Failed to fetch school data' }, { status: 500 })
  }
}
