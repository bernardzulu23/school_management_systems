import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const explicitSubdomain = searchParams.get('subdomain')

    let schoolId = null
    try {
      schoolId = await getSchoolIdFromRequest(request, explicitSubdomain)
    } catch {
      return NextResponse.json({ school: null })
    }

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
    return NextResponse.json({ school: null })
  }
}
