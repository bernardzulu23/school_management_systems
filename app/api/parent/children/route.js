export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeParentRoute } from '@/lib/parent/routeAuth'
import { listParentChildren } from '@/lib/parent/links'

/** List children linked to the authenticated parent. */
export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeParentRoute(request)
  if (!access.ok) return access.response

  const children = await listParentChildren(access.parentUserId, access.schoolId)
  return NextResponse.json({ success: true, children })
})
