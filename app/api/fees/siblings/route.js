export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeFeeRoute } from '@/lib/fees/routeAuth'
import { createSiblingGroup, listSiblingGroups } from '@/lib/fees/siblings'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const groups = await listSiblingGroups(access.schoolId)
  return NextResponse.json({ success: true, groups })
})

export const POST = withErrorHandler(async function POST(request) {
  const access = await authorizeFeeRoute(request)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  try {
    const group = await createSiblingGroup(access.schoolId, body)
    return NextResponse.json({ success: true, group }, { status: 201 })
  } catch (e) {
    throw new ApiError(e?.message || 'Failed to create group', 400)
  }
})
