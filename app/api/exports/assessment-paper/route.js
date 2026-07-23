export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { assessmentPaperFilename, assessmentPaperToPdfParams } from '@/lib/exports/assessmentPaper'
import { generateAssessmentWordDoc } from '@/lib/exports/assessmentPaperDocx'
import { buildPdfDocument, pdfToBuffer } from '@/lib/ai/pdf-generator'

const PaperSchema = z.object({
  format: z.enum(['pdf', 'word', 'docx']).default('pdf'),
  paper: z.object({
    kind: z.enum([
      'quiz',
      'topic_test',
      'ecz_scenarios',
      'ecz_practice',
      'mock_exam',
      'project',
      'flashcards',
    ]),
    title: z.string().min(1).max(300),
    subject: z.string().max(120).optional(),
    grade: z.string().max(40).optional(),
    topic: z.string().max(200).optional(),
    totalMarks: z.union([z.number(), z.string()]).optional(),
    includeAnswers: z.boolean().optional(),
    questions: z.array(z.record(z.any())).optional(),
    scenarios: z.array(z.record(z.any())).optional(),
    project: z.record(z.any()).optional(),
    cards: z.array(z.record(z.any())).optional(),
    sections: z.array(z.object({ heading: z.string(), body: z.string() })).optional(),
  }),
})

/**
 * POST /api/exports/assessment-paper
 * Body: { format: 'pdf'|'word', paper: AssessmentPaperPayload }
 * Returns a downloadable PDF or real DOCX (not HTML).
 */
export const POST = withErrorHandler(async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) throw new ApiError('Unauthorized', 401)

  const isStaff = roleCheck(user, [
    'TEACHER',
    'teacher',
    'HOD',
    'hod',
    'ADMIN',
    'headteacher',
    'STUDENT',
    'student',
  ])
  if (!isStaff) throw new ApiError('Forbidden', 403)

  const raw = await request.json().catch(() => null)
  const parsed = PaperSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError('Invalid export payload', 400)
  }

  const { format, paper } = parsed.data
  const wantWord = format === 'word' || format === 'docx'

  if (wantWord) {
    const buffer = await generateAssessmentWordDoc(paper)
    const filename = assessmentPaperFilename(paper, 'docx')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const doc = buildPdfDocument(assessmentPaperToPdfParams(paper))
  const buffer = pdfToBuffer(doc)
  const filename = assessmentPaperFilename(paper, 'pdf')
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
