export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveHodScope } from '@/lib/hod/resolveHodScope'
import { hodCabinetEntityId } from '@/lib/hod/hodFiles'

/** Return stable cabinet entity id for HOD document libraries. */
export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  return NextResponse.json({
    success: true,
    data: {
      departmentId: scope.departmentId,
      departmentName: scope.departmentName,
      cabinetEntityId: hodCabinetEntityId(scope.departmentId),
    },
  })
})
