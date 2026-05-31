/**
 * LLM-assisted placement for blocks the backtracking scheduler could not place.
 * Uses the project's Groq client (no Gemini dependency in this repo).
 */

import { generateAIText } from '@/lib/ai/client'
import {
  canPlace,
  getCandidateSlots,
  type DayPeriodSlot,
  type PlacedBlock,
  type SchedulerBlock,
} from '@/lib/timetable/scheduler'

export type LlmPlacement = {
  allocation_id: string
  block_id?: string
  day: string
  start_period: number
  span: number
}

const PROMPT_TEMPLATE = `You are a Zambian school timetable scheduler. You must place unscheduled lesson blocks into the remaining free slots without breaking any hard constraints.

HARD CONSTRAINTS (never break these):
1. A teacher cannot teach two grades at the same time (same day, same period)
2. A grade cannot have two subjects at the same time (same day, same period)

SCHOOL STRUCTURE:
- Monday to Friday, periods 1–8 per day
- Break after period 2, lunch after period 5 (these slots are blocked)
- Double period = 2 consecutive periods, triple = 3 consecutive periods
- A double/triple cannot span across a break or lunch

CURRENT PLACED SCHEDULE:
{{CURRENT}}

FREE SLOTS REMAINING (examples per block — use valid day+start_period only):
{{FREE}}

UNPLACED BLOCKS TO INSERT:
{{UNPLACED}}

Return ONLY a valid JSON array with no explanation, no markdown, no code fences. Each object must match exactly:
[
  {
    "allocation_id": "uuid",
    "block_id": "optional-block-id",
    "day": "monday|tuesday|wednesday|thursday|friday",
    "start_period": 1-8,
    "span": 1|2|3
  }
]

Validate your answer before returning: confirm no teacher appears twice on the same day in overlapping periods, and no grade has two subjects in overlapping periods.`

function buildPrompt(
  placed: PlacedBlock[],
  unplaced: SchedulerBlock[],
  daySlots: Record<string, DayPeriodSlot[]>,
  singleMin: number
): string {
  const current = placed.map((p) => ({
    allocation_id: p.allocationId,
    block_id: p.blockId,
    teacher_id: p.teacherId,
    class_id: p.classId,
    subject_id: p.subjectId,
    day: p.day,
    start_period: p.startPeriod,
    span: p.span,
  }))

  const freeExamples = unplaced.slice(0, 5).map((b) => ({
    block_id: b.blockId,
    candidates: getCandidateSlots(b, daySlots, singleMin)
      .slice(0, 8)
      .map((c) => ({ day: c.day, start_period: c.startPeriod, span: c.span })),
  }))

  const unplacedJson = unplaced.map((b) => ({
    allocation_id: b.allocationId,
    block_id: b.blockId,
    teacher_id: b.teacherId,
    class_id: b.classId,
    subject_id: b.subjectId,
    span: b.span,
    unit_type: b.unitType,
  }))

  return PROMPT_TEMPLATE.replace('{{CURRENT}}', JSON.stringify(current))
    .replace('{{FREE}}', JSON.stringify(freeExamples))
    .replace('{{UNPLACED}}', JSON.stringify(unplacedJson))
}

function parseJsonArray(raw: string): unknown[] {
  const trimmed = String(raw || '').trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1].trim() : trimmed
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start < 0 || end < 0) throw new Error('LLM did not return a JSON array')
  return JSON.parse(body.slice(start, end + 1)) as unknown[]
}

function slotFromCandidate(
  block: SchedulerBlock,
  day: string,
  startPeriod: number,
  daySlots: Record<string, DayPeriodSlot[]>,
  singleMin: number
): PlacedBlock | null {
  const candidates = getCandidateSlots(block, daySlots, singleMin)
  const match = candidates.find(
    (c) => c.day === day.toLowerCase() && c.startPeriod === startPeriod && c.span === block.span
  )
  if (!match) return null
  const run = match.run
  const first = run[0]
  const last = run[run.length - 1]
  return {
    ...block,
    day: match.day,
    startPeriod: match.startPeriod,
    startMin: first.start,
    endMin: last.end,
    startTime: first.startTime,
    endTime: last.endTime,
  }
}

export type ResolveConflictsOptions = {
  daySlots: Record<string, DayPeriodSlot[]>
  singleMin?: number
  placed: PlacedBlock[]
  unplacedBlocks: SchedulerBlock[]
}

/**
 * Attempt to place remaining blocks via Groq. Each suggestion is validated with canPlace().
 */
export async function resolveConflictsWithLLM(
  options: ResolveConflictsOptions
): Promise<{ placed: PlacedBlock[]; errors: string[] }> {
  const { daySlots, placed, unplacedBlocks } = options
  const singleMin = Math.max(1, Number(options.singleMin) || 40)
  const errors: string[] = []
  const extra: PlacedBlock[] = []
  const working = [...placed]

  if (!unplacedBlocks.length) {
    return { placed: [], errors: [] }
  }

  let rawSuggestions: unknown[] = []
  try {
    const prompt = buildPrompt(working, unplacedBlocks, daySlots, singleMin)
    const { text } = await generateAIText(prompt, {
      systemPrompt: 'You output only valid JSON arrays for timetable placement. No markdown.',
      maxTokens: 2000,
      temperature: 0.2,
    })
    rawSuggestions = parseJsonArray(text)
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'LLM request failed')
    return { placed: [], errors }
  }

  const blockById = new Map(unplacedBlocks.map((b) => [b.blockId, b]))
  const blockByAlloc = new Map<string, SchedulerBlock[]>()
  for (const b of unplacedBlocks) {
    const list = blockByAlloc.get(b.allocationId) || []
    list.push(b)
    blockByAlloc.set(b.allocationId, list)
  }

  for (const item of rawSuggestions) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const allocationId = String(row.allocation_id || '')
    const blockId = row.block_id ? String(row.block_id) : ''
    const day = String(row.day || '').toLowerCase()
    const startPeriod = Number(row.start_period)
    const span = Number(row.span) || 1

    let block: SchedulerBlock | undefined
    if (blockId && blockById.has(blockId)) {
      block = blockById.get(blockId)
    } else {
      const candidates = blockByAlloc.get(allocationId) || []
      block = candidates.find(
        (b) =>
          !working.some((p) => p.blockId === b.blockId) &&
          !extra.some((p) => p.blockId === b.blockId)
      )
    }
    if (!block || block.span !== span) {
      errors.push(`Invalid or unknown block for allocation ${allocationId}`)
      continue
    }

    const slot = slotFromCandidate(block, day, startPeriod, daySlots, singleMin)
    if (!slot) {
      errors.push(`Invalid slot day=${day} period=${startPeriod} for ${block.blockId}`)
      continue
    }

    const check = canPlace(block, { day, startPeriod, span }, [...working, ...extra])
    if (!check.ok) {
      errors.push(`LLM placement rejected (${check.reason}) for ${block.blockId}`)
      continue
    }

    extra.push(slot)
    working.push(slot)
  }

  return { placed: extra, errors }
}
