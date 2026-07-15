export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { buildStudentUploadWorkbook } from '@/lib/uploads/parseStudentExcel'
import { workbookToBuffer } from '@/lib/excel/workbook'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request) => {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const wb = buildStudentUploadWorkbook()
  const buffer = await workbookToBuffer(wb)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ZSMS_Student_Bulk_Upload_Template.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  })
})
