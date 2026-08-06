export const dynamic = 'force-dynamic'

import { z } from 'zod'
import prisma from '@/lib/prisma'
import { withApiHandler, apiOk } from '@/lib/middleware/withApiHandler'
import { assertSecondaryGradingForContext } from '@/lib/school/gradingAccess'
import { ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import {
  buildResultCardFilename,
  canCreateStudentResultCards,
  loadStudentResultCard,
} from '@/lib/results/resultCardData'
import { resultCardPdfBuffer } from '@/lib/results/resultCardPdf'
import { buildResultCardDocx } from '@/lib/results/resultCardDocx'

const QuerySchema = z.object({
  format: z.enum(['json', 'pdf', 'docx', 'word', 'print']).optional().default('json'),
  term: z.string().optional().default(''),
  year: z.string().optional().default(''),
  resultType: z.string().optional().default(''),
})

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPrintHtml(card) {
  const groups = card.groups || []
  const groupHtml = groups
    .map((g) => {
      const rows = (g.rows || [])
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.subject)}</td><td>${escapeHtml(r.score ?? '—')}</td><td>${escapeHtml(r.grade || '—')}</td></tr>`
        )
        .join('')
      return `
        <section>
          <h2>${escapeHtml(`${g.term || ''} ${g.year || ''} — ${g.resultTypeLabel || g.resultType}`.trim())}</h2>
          <p class="muted">${g.average != null ? `Group average: ${escapeHtml(g.average)}% · ${escapeHtml(g.subjectCount)} subject(s)` : ''}</p>
          <table>
            <thead><tr><th>Subject</th><th>Score (%)</th><th>Grade</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Result Card — ${escapeHtml(card.student?.name)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111827; margin: 32px; }
    h1 { color: #1F4788; text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; color: #1F4788; font-weight: bold; margin-bottom: 24px; }
    .meta { margin-bottom: 20px; }
    .meta div { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #e8f0fe; }
    h2 { color: #1F4788; font-size: 1.1rem; margin-bottom: 4px; }
    .muted { color: #6b7280; font-size: 0.9rem; }
    .footer { margin-top: 28px; font-size: 0.8rem; color: #6b7280; font-style: italic; }
    @media print { body { margin: 12mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 12px;">Print</button>
  <h1>${escapeHtml((card.school?.name || 'School').toUpperCase())}</h1>
  <div class="sub">STUDENT RESULT CARD</div>
  <div class="meta">
    <div><strong>Student:</strong> ${escapeHtml(card.student?.name)}</div>
    <div><strong>Class:</strong> ${escapeHtml(card.student?.class || 'N/A')}</div>
    ${card.student?.examNumber ? `<div><strong>Exam No.:</strong> ${escapeHtml(card.student.examNumber)}</div>` : ''}
    <div><strong>Overall average:</strong> ${card.summary?.overallAverage != null ? `${escapeHtml(card.summary.overallAverage)}%` : 'N/A'}</div>
    <div><strong>Coverage:</strong> ${card.filters?.resultType ? escapeHtml(String(card.filters.resultType).replace(/_/g, ' ')) : 'All entered results'}</div>
  </div>
  ${groupHtml || '<p class="muted">No results found.</p>'}
  <p class="footer">Generated ${escapeHtml(new Date(card.generatedAt || Date.now()).toLocaleString('en-GB'))}. Assessment results only — teacher names are not included.</p>
  <script>window.addEventListener('load', function () { /* ready for print */ })</script>
</body>
</html>`
}

/**
 * GET /api/dashboard/results/cards/[studentId]
 * ?format=json|pdf|docx|print&term=&year=&resultType=
 */
export const GET = withApiHandler(
  async ({ user, schoolId, query, params }) => {
    if (!canCreateStudentResultCards(user)) {
      throw new ApiError('Only school admins can create student result cards', 403)
    }
    await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })

    const studentId = await safeRouteParam(params, 'studentId')
    if (!studentId) throw new ApiError('Student id is required', 400)

    const yearRaw = String(query.year || '').trim()
    const year = yearRaw ? Number(yearRaw) : null

    const card = await loadStudentResultCard({
      prisma,
      schoolId,
      studentId,
      term: query.term,
      year: year != null && !Number.isNaN(year) ? year : null,
      resultType: query.resultType,
    })
    if (!card) throw new ApiError('Student not found', 404)

    const format = String(query.format || 'json').toLowerCase()

    if (format === 'json') {
      return apiOk({ card })
    }

    if (format === 'print') {
      const html = buildPrintHtml(card)
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    }

    if (format === 'pdf') {
      const body = new Uint8Array(resultCardPdfBuffer(card))
      const filename = buildResultCardFilename(card, 'pdf')
      return new Response(body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(body.byteLength),
          'Cache-Control': 'no-store',
        },
      })
    }

    if (format === 'docx' || format === 'word') {
      const buffer = await buildResultCardDocx(card)
      const body = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer
      const filename = buildResultCardFilename(card, 'docx')
      return new Response(body, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(body.byteLength || body.length || 0),
          'Cache-Control': 'no-store',
        },
      })
    }

    throw new ApiError('Invalid format. Use json, pdf, docx, or print', 400)
  },
  {
    roles: canCreateStudentResultCards,
    feature: 'basic-results',
    query: QuerySchema,
  }
)
