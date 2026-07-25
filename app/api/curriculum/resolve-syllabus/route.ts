import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveSyllabus } from '@/lib/curriculum/resolveSyllabus'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  canonicalLevel: z.enum(['SS1', 'SS2', 'SS3']),
  academicYear: z.coerce.number().int().min(2020).max(2040),
})

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    canonicalLevel: url.searchParams.get('canonicalLevel'),
    academicYear: url.searchParams.get('academicYear'),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const resolution = await resolveSyllabus(parsed.data.canonicalLevel, parsed.data.academicYear)
  return NextResponse.json({
    success: true,
    ...parsed.data,
    ...resolution,
  })
})
