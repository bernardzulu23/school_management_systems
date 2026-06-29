import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { toPrismaJsonValue } from '@/lib/timetable/recipes'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

function normalizeDay(v: unknown) {
  return String(v || '')
    .trim()
    .toLowerCase()
}

export const POST = withErrorHandler(async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const id = await safeRouteParam(context.params, 'id')

  const recipe = await prisma.schedulingRecipe.findFirst({
    where: { id, schoolId },
    include: { blocks: true, constraints: true },
  })
  if (!recipe)
    return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 })

  const timeSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    take: 500,
    select: { dayOfWeek: true, period: true, isBreak: true },
  })

  const errors: Array<Record<string, unknown>> = []
  const warnings: Array<Record<string, unknown>> = []

  const expected = recipe.expectedPeriodsPerWeek
  const blocks = recipe.blocks
  let totalPeriods = 0

  for (const b of blocks) {
    if (b.size <= 0) {
      errors.push({ code: 'BLOCK_SIZE_INVALID', message: 'Block size must be >= 1', blockId: b.id })
      continue
    }
    if (b.quantity <= 0) {
      errors.push({
        code: 'BLOCK_QUANTITY_INVALID',
        message: 'Block quantity must be >= 1',
        blockId: b.id,
      })
      continue
    }
    totalPeriods += b.size * b.quantity
  }

  if (expected != null && totalPeriods !== expected) {
    errors.push({
      code: 'TOTAL_PERIODS_MISMATCH',
      message: `Sum of blocks = ${totalPeriods} (expected ${expected})`,
      expected,
      actual: totalPeriods,
      suggestion: 'Adjust block quantities/sizes so totals match.',
    })
  }

  const slots = timeSlots
    .filter((s) => !s.isBreak)
    .map((s) => ({ day: normalizeDay(s.dayOfWeek), period: Number(s.period) }))
    .filter((s) => s.day && Number.isFinite(s.period))

  const byDay = new Map<string, Set<number>>()
  for (const s of slots) {
    if (!byDay.has(s.day)) byDay.set(s.day, new Set())
    byDay.get(s.day)!.add(s.period)
  }

  const countSequences = (size: number, b: any) => {
    if (size <= 1) return slots.length
    const preferredDays = new Set((b.preferredDays || []).map(normalizeDay).filter(Boolean))
    const forbiddenDays = new Set((b.forbiddenDays || []).map(normalizeDay).filter(Boolean))
    const preferredPeriods = new Set(
      (b.preferredPeriods || []).map((p: any) => Number(p)).filter(Number.isFinite)
    )
    const forbiddenPeriods = new Set(
      (b.forbiddenPeriods || []).map((p: any) => Number(p)).filter(Number.isFinite)
    )

    let sequences = 0
    for (const [day, periods] of byDay.entries()) {
      if (preferredDays.size && !preferredDays.has(day)) continue
      if (forbiddenDays.size && forbiddenDays.has(day)) continue

      const pList = Array.from(periods.values()).sort((a, b) => a - b)
      for (const start of pList) {
        let ok = true
        for (let i = 0; i < size; i++) {
          const p = start + i
          if (!periods.has(p)) {
            ok = false
            break
          }
          if (preferredPeriods.size && i === 0 && !preferredPeriods.has(p)) {
            ok = false
            break
          }
          if (forbiddenPeriods.size && forbiddenPeriods.has(p)) {
            ok = false
            break
          }
        }
        if (ok) sequences += 1
      }
    }
    return sequences
  }

  for (const b of blocks as any[]) {
    if (b.size <= 1) continue
    const sequences = countSequences(Number(b.size), b)
    if (sequences < Number(b.quantity)) {
      errors.push({
        code: 'INSUFFICIENT_CONSECUTIVE_SLOTS',
        message: `Need ${b.quantity} consecutive sequences of length ${b.size}, only ${sequences} exist in configured time slots.`,
        suggestion: 'Reduce block quantity/size or adjust the time slot configuration.',
        blockId: b.id,
      })
    }
  }

  if (!slots.length) {
    errors.push({
      code: 'NO_SLOTS',
      message: 'No teaching time slots configured.',
      suggestion: 'Seed/configure TimeSlot records first.',
    })
  }

  const result = { errors, warnings, totalPeriods }
  const isValid = errors.length === 0

  await prisma.schedulingRecipe.update({
    where: { id: recipe.id },
    data: {
      isValid,
      validationErrors: toPrismaJsonValue(result),
      validatedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, isValid, result })
})
