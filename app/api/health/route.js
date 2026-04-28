import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const strict = false
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    const sanitize = (value) =>
      String(value || '')
        .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
        .replace(/password=[^&\s]+/gi, 'password=***')
        .slice(0, 2000)

    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: sanitize(error?.message || error) },
      { status: strict ? 503 : 200 }
    )
  }
}
