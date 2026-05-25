import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { toPrismaJsonValue } from '@/lib/timetable/recipes'

export const dynamic = 'force-dynamic'

type BlockIn = {
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD'
  size: number
  quantity: number
  placementPriority?: number
  preferredDays?: string[]
  preferredPeriods?: number[]
  forbiddenDays?: string[]
  forbiddenPeriods?: number[]
  allowSplitAcrossBreaks?: boolean
  isLocked?: boolean
}

type ConstraintIn = {
  type: 'HARD' | 'SOFT'
  priority?: number
  config: Record<string, unknown>
}

type Body = {
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  season?: string | null
  expectedPeriodsPerWeek?: number | null
  placementPriority?: number
  blocks?: BlockIn[]
  constraints?: ConstraintIn[]
}

function normalizeDay(v: unknown) {
  return String(v || '')
    .trim()
    .toLowerCase()
}

function toInt(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function validateRecipeAgainstSlots(params: {
  blocks: BlockIn[]
  expectedPeriodsPerWeek?: number | null
  timeSlots: Array<{ dayOfWeek: string; period: number; isBreak: boolean }>
}) {
  const errors: Array<Record<string, unknown>> = []
  const warnings: Array<Record<string, unknown>> = []

  let totalPeriods = 0
  for (const b of params.blocks) {
    const size = toInt(b.size, 0)
    const qty = toInt(b.quantity, 0)
    if (size <= 0) {
      errors.push({ code: 'BLOCK_SIZE_INVALID', message: 'Block size must be >= 1', block: b })
      continue
    }
    if (qty <= 0) {
      errors.push({
        code: 'BLOCK_QUANTITY_INVALID',
        message: 'Block quantity must be >= 1',
        block: b,
      })
      continue
    }
    totalPeriods += size * qty
  }

  if (params.expectedPeriodsPerWeek != null) {
    const expected = toInt(params.expectedPeriodsPerWeek, -1)
    if (expected < 0) {
      errors.push({ code: 'EXPECTED_INVALID', message: 'Expected periods must be >= 0' })
    } else if (totalPeriods !== expected) {
      errors.push({
        code: 'TOTAL_PERIODS_MISMATCH',
        message: `Sum of blocks = ${totalPeriods} (expected ${expected})`,
        expected,
        actual: totalPeriods,
        suggestion: 'Adjust block quantities/sizes so totals match.',
      })
    }
  }

  const slots = params.timeSlots
    .filter((s) => !s.isBreak)
    .map((s) => ({ day: normalizeDay(s.dayOfWeek), period: Number(s.period) }))
    .filter((s) => s.day && Number.isFinite(s.period))

  const byDay = new Map<string, Set<number>>()
  for (const s of slots) {
    if (!byDay.has(s.day)) byDay.set(s.day, new Set())
    byDay.get(s.day)!.add(s.period)
  }

  const countSequences = (size: number, opts: BlockIn) => {
    if (size <= 1) return slots.length
    const preferredDays = new Set((opts.preferredDays || []).map(normalizeDay).filter(Boolean))
    const forbiddenDays = new Set((opts.forbiddenDays || []).map(normalizeDay).filter(Boolean))
    const preferredPeriods = new Set(
      (opts.preferredPeriods || []).map((p) => Number(p)).filter(Number.isFinite)
    )
    const forbiddenPeriods = new Set(
      (opts.forbiddenPeriods || []).map((p) => Number(p)).filter(Number.isFinite)
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

  for (const b of params.blocks) {
    const size = toInt(b.size, 0)
    const qty = toInt(b.quantity, 0)
    if (size <= 1 || qty <= 0) continue
    const sequences = countSequences(size, b)
    if (sequences < qty) {
      errors.push({
        code: 'INSUFFICIENT_CONSECUTIVE_SLOTS',
        message: `Need ${qty} consecutive sequences of length ${size}, only ${sequences} exist in configured time slots.`,
        suggestion: 'Reduce block quantity/size or adjust the time slot configuration.',
        block: b,
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

  return { isValid: errors.length === 0, result: { errors, warnings, totalPeriods } }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN']))
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const { id: rawId } = await context.params
  const id = String(rawId || '').trim()
  if (!id) return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 })

  const existing = await prisma.schedulingRecipe.findFirst({
    where: { id, schoolId },
    select: { id: true, teachingAssignmentId: true },
  })
  if (!existing)
    return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Body
  const nextBlocks = Array.isArray(body.blocks) ? body.blocks : null
  const nextConstraints = Array.isArray(body.constraints) ? body.constraints : null

  const timeSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    select: { dayOfWeek: true, period: true, isBreak: true },
  })

  const validateSourceBlocks =
    nextBlocks ?? (await prisma.recipeBlock.findMany({ where: { recipeId: id } }))
  const mappedBlocks: BlockIn[] = (validateSourceBlocks as any[]).map((b: any) => ({
    type: b.type,
    size: b.size,
    quantity: b.quantity,
    placementPriority: b.placementPriority,
    preferredDays: b.preferredDays,
    preferredPeriods: b.preferredPeriods,
    forbiddenDays: b.forbiddenDays,
    forbiddenPeriods: b.forbiddenPeriods,
    allowSplitAcrossBreaks: b.allowSplitAcrossBreaks,
    isLocked: b.isLocked,
  }))

  const validation = validateRecipeAgainstSlots({
    blocks: mappedBlocks,
    expectedPeriodsPerWeek: body.expectedPeriodsPerWeek ?? null,
    timeSlots,
  })

  const updated = await prisma.$transaction(async (tx) => {
    const recipe = await tx.schedulingRecipe.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
        season: body.season ?? undefined,
        expectedPeriodsPerWeek: body.expectedPeriodsPerWeek ?? undefined,
        placementPriority:
          body.placementPriority != null ? toInt(body.placementPriority, 5) : undefined,
        isValid: validation.isValid,
        validationErrors: toPrismaJsonValue(validation.result),
        validatedAt: new Date(),
      },
    })

    if (nextBlocks) {
      await tx.recipeBlock.deleteMany({ where: { recipeId: id } })
      await tx.recipeBlock.createMany({
        data: nextBlocks.map((b) => ({
          recipeId: id,
          type: b.type,
          size: toInt(b.size, 1),
          quantity: toInt(b.quantity, 1),
          placementPriority: toInt(b.placementPriority, 5),
          preferredDays: (b.preferredDays || []).map(normalizeDay).filter(Boolean),
          preferredPeriods: (b.preferredPeriods || []).map((p) => toInt(p, 0)).filter((p) => p > 0),
          forbiddenDays: (b.forbiddenDays || []).map(normalizeDay).filter(Boolean),
          forbiddenPeriods: (b.forbiddenPeriods || []).map((p) => toInt(p, 0)).filter((p) => p > 0),
          allowSplitAcrossBreaks: Boolean(b.allowSplitAcrossBreaks),
          isLocked: Boolean(b.isLocked),
        })),
      })
    }

    if (nextConstraints) {
      await tx.recipeConstraint.deleteMany({ where: { recipeId: id } })
      if (nextConstraints.length) {
        await tx.recipeConstraint.createMany({
          data: nextConstraints.map((c) => ({
            recipeId: id,
            type: c.type,
            priority: toInt(c.priority, 5),
            config: toPrismaJsonValue(c.config || {}),
          })),
        })
      }
    }

    return tx.schedulingRecipe.findFirstOrThrow({
      where: { id, schoolId },
      include: { blocks: true, constraints: true },
    })
  })

  return NextResponse.json({ success: true, data: updated })
}
