import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

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

type Body = {
  expectedPeriodsPerWeek?: number | null
  blocks?: BlockIn[]
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

export async function POST(req: NextRequest) {
  const auth = authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as Body
  const blocks = Array.isArray(body.blocks) ? body.blocks : []
  const expected = body.expectedPeriodsPerWeek ?? null

  if (!blocks.length) {
    return NextResponse.json({ success: false, error: 'blocks are required' }, { status: 400 })
  }

  const timeSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    select: { dayOfWeek: true, period: true, isBreak: true },
  })

  const errors: Array<Record<string, unknown>> = []
  const warnings: Array<Record<string, unknown>> = []

  let totalPeriods = 0
  for (const b of blocks) {
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

  if (expected != null) {
    const exp = toInt(expected, -1)
    if (exp < 0) {
      errors.push({ code: 'EXPECTED_INVALID', message: 'Expected periods must be >= 0' })
    } else if (totalPeriods !== exp) {
      errors.push({
        code: 'TOTAL_PERIODS_MISMATCH',
        message: `Sum of blocks = ${totalPeriods} (expected ${exp})`,
        expected: exp,
        actual: totalPeriods,
        suggestion: 'Adjust block quantities/sizes so totals match.',
      })
    }
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

  let availableSlots = 0
  for (const b of blocks) {
    const size = toInt(b.size, 0)
    const qty = toInt(b.quantity, 0)
    if (size <= 0 || qty <= 0) continue
    const sequences = countSequences(size, b)
    if (size > 1 && sequences < qty) {
      errors.push({
        code: 'INSUFFICIENT_CONSECUTIVE_SLOTS',
        message: `Need ${qty} consecutive sequences of length ${size}, only ${sequences} exist in configured time slots.`,
        suggestion: 'Reduce block quantity/size or adjust the time slot configuration.',
        block: b,
      })
    }
    availableSlots += sequences
  }

  if (!slots.length) {
    errors.push({
      code: 'NO_SLOTS',
      message: 'No teaching time slots configured.',
      suggestion: 'Seed/configure TimeSlot records first.',
    })
  }

  const feasible = errors.length === 0
  const result = { errors, warnings, totalPeriods }

  return NextResponse.json({ success: true, feasible, availableSlots, result })
}
