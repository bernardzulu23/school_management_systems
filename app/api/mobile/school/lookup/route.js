export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/** Public: validate school subdomain before mobile login */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subdomain = String(searchParams.get('subdomain') || '')
    .trim()
    .toLowerCase()

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json({ valid: false, error: 'Subdomain too short' }, { status: 400 })
  }

  const school = await prisma.school.findFirst({
    where: { subdomain: { equals: subdomain, mode: 'insensitive' }, active: true },
    select: { id: true, name: true, subdomain: true, logo_url: true },
  })

  if (!school) {
    return NextResponse.json({ valid: false, error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({
    valid: true,
    school: {
      id: school.id,
      name: school.name,
      subdomain: school.subdomain,
      logoUrl: school.logo_url,
    },
  })
}
