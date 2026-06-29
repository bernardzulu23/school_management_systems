export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { buildStudentUploadWorkbook } from '@/lib/uploads/parseStudentExcel'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request) => {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const wb = buildStudentUploadWorkbook()
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ZSMS_Student_Bulk_Upload_Template.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  })
})
