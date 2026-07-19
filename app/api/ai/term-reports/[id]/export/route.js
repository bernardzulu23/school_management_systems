import prisma from '@/lib/prisma'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeQueryString } from '@/lib/security/safeQueryValue'
import {
  generateTermReportWordDoc,
  generateTermReportFilename,
  extractTermReportSections,
} from '@/lib/ai/term-report-word-generator'
import { buildPdfDocument, pdfToBuffer, sectionsToPdfBlocks } from '@/lib/ai/pdf-generator'
import { authorizeAiRoute } from '@/lib/ai/routeAuth'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const access = await authorizeAiRoute(request, {
    featureId: 'ai-term-reports',
    rateLimitPrefix: 'ai_term_reports_export_',
  })
  if (!access.ok) return access.response

  const { schoolId, user } = access

  const userId = String(user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const format = safeQueryString(new URL(request.url).searchParams.get('format'), {
    defaultValue: 'word',
  })

  const report = await prisma.termReport.findFirst({
    where: { id, schoolId },
    include: {
      student: { select: { id: true, name: true, class: true, userId: true } },
      school: { select: { id: true, name: true } },
    },
  })

  if (!report) throw new ApiError('Not found', 404)

  const isStaff = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'teacher', 'TEACHER'])
  const isOwnPublished =
    report.student?.userId &&
    String(report.student.userId) === userId &&
    report.status === 'PUBLISHED'
  if (!isStaff && !isOwnPublished) throw new ApiError('Forbidden', 403)

  const content = report.content && typeof report.content === 'object' ? report.content : {}
  const metrics = content.metrics && typeof content.metrics === 'object' ? content.metrics : {}
  const sections = extractTermReportSections(content)

  const studentName = report.student?.name || 'Student'
  const docParams = {
    schoolName: report.school?.name || '',
    studentName,
    className: report.student?.class || null,
    term: report.term,
    academicYear: report.academicYear,
    status: report.status,
    attendancePercent: report.attendancePct,
    sbaAverage: report.sbaAverage,
    overallGrade: metrics.overallGrade || null,
    sections,
    narrative: report.narrative,
    generatedOn: report.updatedAt?.toLocaleDateString('en-GB'),
  }

  if (format === 'word') {
    try {
      const buffer = await generateTermReportWordDoc(docParams)
      const filename = generateTermReportFilename(
        studentName,
        report.term,
        report.academicYear,
        'docx'
      )
      const body = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer

      return new Response(body, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(body.byteLength || body.length || 0),
        },
      })
    } catch (exportError) {
      console.error('Term report Word export failed:', exportError)
      throw new ApiError(exportError?.message || 'Failed to generate Word document', 500)
    }
  }

  if (format === 'pdf') {
    try {
      const infoRows = [
        { label: 'Student:', value: studentName },
        { label: 'Class:', value: docParams.className || 'N/A' },
        { label: 'Term:', value: String(report.term) },
        { label: 'Academic Year:', value: String(report.academicYear) },
      ]
      if (report.attendancePct != null) {
        infoRows.push({
          label: 'Attendance:',
          value: `${Math.round(report.attendancePct)}%`,
        })
      }
      if (report.sbaAverage != null) {
        infoRows.push({ label: 'SBA Average:', value: `${Math.round(report.sbaAverage)}%` })
      }
      if (docParams.overallGrade) {
        infoRows.push({ label: 'Overall Grade:', value: docParams.overallGrade })
      }
      if (report.status) {
        infoRows.push({ label: 'Status:', value: report.status })
      }

      const blocks =
        sections.length > 0
          ? sectionsToPdfBlocks(sections)
          : report.narrative
            ? sectionsToPdfBlocks([{ heading: 'Report', body: report.narrative }])
            : [{ type: 'paragraph', text: 'No report narrative available.' }]

      const doc = buildPdfDocument({
        title: `END OF TERM REPORT — TERM ${report.term}, ${report.academicYear}`,
        subtitle: (docParams.schoolName || 'School').toUpperCase(),
        infoRows,
        blocks,
        footer: `Generated on ${docParams.generatedOn || new Date().toLocaleDateString('en-GB')}`,
      })

      const filename = generateTermReportFilename(
        studentName,
        report.term,
        report.academicYear,
        'pdf'
      )
      const body = new Uint8Array(pdfToBuffer(doc))

      return new Response(body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(body.byteLength || 0),
        },
      })
    } catch (exportError) {
      console.error('Term report PDF export failed:', exportError)
      throw new ApiError(exportError?.message || 'Failed to generate PDF document', 500)
    }
  }

  throw new ApiError('Invalid format. Use ?format=word or ?format=pdf', 400)
})
