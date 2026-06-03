export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateHodCorrespondenceSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'

function mapItem(row) {
  const base = {
    id: row.id,
    subject: row.subject,
    date: row.itemDate,
    priority: row.priority,
    status: row.status,
    type: row.itemType,
    attachments: row.attachments,
  }
  if (row.direction === 'incoming') {
    return { ...base, sender: row.party, recipient: '' }
  }
  return { ...base, sender: '', recipient: row.party }
}

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { db, departmentId } = scope
  const rows = await db.hodCorrespondence.findMany({
    where: hodDepartmentWhere(departmentId),
    orderBy: { itemDate: 'desc' },
    take: 200,
  })

  const incoming = []
  const outgoing = []
  for (const row of rows) {
    const item = mapItem(row)
    if (row.direction === 'incoming') incoming.push(item)
    else outgoing.push(item)
  }

  return NextResponse.json({
    success: true,
    data: { incoming, outgoing },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(
    request,
    CreateHodCorrespondenceSchema
  )
  if (validationError) return validationError

  const { db, departmentId } = scope
  const created = await db.hodCorrespondence.create({
    data: {
      departmentId,
      direction: body.direction,
      subject: body.subject,
      party: body.party,
      itemDate: body.itemDate ? new Date(body.itemDate) : new Date(),
      priority: body.priority || 'medium',
      status: body.status || (body.direction === 'outgoing' ? 'draft' : 'pending'),
      itemType: body.itemType || 'letter',
      attachments: body.attachments ?? 0,
    },
  })

  return NextResponse.json({ success: true, data: mapItem(created) }, { status: 201 })
})
