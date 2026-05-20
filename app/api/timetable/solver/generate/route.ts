import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

type GenerateBody = {
  maxSolutions?: number
  timeoutMs?: number
  name?: string
}

type SolveResult = {
  assignments: Record<string, string>
  optimizationScore: number
  stats: any
  source: 'ai' | 'local'
}

let skipAiUntilMs = 0

function withTimeout(ms: number) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return { controller, cancel: () => clearTimeout(id) }
}

function safeNumber(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function safeString(value: unknown) {
  const s = String(value ?? '').trim()
  return s
}

function extractJSONObject(text: string) {
  const s = String(text || '').trim()
  if (!s) return null

  const fenced = s.match(/```json\s*([\s\S]*?)\s*```/i) || s.match(/```\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : s

  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null

  const jsonText = candidate.slice(first, last + 1)
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

function isInsufficientCreditsError(err: any) {
  const status = Number(err?.status)
  if (status !== 403) return false
  const msg = String(err?.error?.message || err?.message || '')
  return /out of credits|insufficent_credits|insufficient_credits/i.test(msg)
}

function buildAiPrompt(payload: any) {
  return `You are an expert school timetable generator.

You MUST return ONLY valid JSON (no markdown, no prose).

Given this JSON input, produce a feasible timetable assignment mapping each lesson.id to a slots.id.

Hard rules:
- Do not assign any lesson to a slot where slots[].isBreak is true.
- A teacher cannot teach two lessons in the same slot (unique by teacherId+slotId).
- A class cannot have two lessons in the same slot (unique by classId+slotId).
- Every lesson in lessons[] MUST be assigned exactly one slot id.
- Use only slot ids from slots[] and lesson ids from lessons[].
- Respect lockedAssignments: for any lockedAssignments item {teacherId, slotId}, that teacher cannot be assigned any lesson in that slot unless already implied by the chosen lesson mapping (but still must avoid teacher conflicts).

Return JSON with shape:
{
  "assignments": { "lessonId": "slotId" },
  "optimizationScore": number,
  "stats": { "notes": "string" }
}

INPUT_JSON:
${JSON.stringify(payload)}`
}

function buildOpenAiClient() {
  const apiKey = safeString(process.env.AIML_API_KEY)
  const baseRaw = safeString(process.env.AIML_API_BASE).replace(/\/+$/, '')
  const baseURL = baseRaw ? (baseRaw.endsWith('/v1') ? baseRaw : `${baseRaw}/v1`) : undefined
  return {
    client: new OpenAI({ apiKey, baseURL }),
    apiKey,
    baseURL,
  }
}

async function callAIProvider(payload: any, signal: AbortSignal): Promise<SolveResult> {
  const { client, apiKey, baseURL } = buildOpenAiClient()
  if (!apiKey) throw new Error('Missing AIML_API_KEY')
  if (!baseURL) throw new Error('Missing AIML_API_BASE')

  const model =
    safeString(process.env.AIML_TIMETABLE_MODEL || process.env.AIML_CHAT_MODEL) ||
    'claude-sonnet-4-6'
  const prompt = buildAiPrompt(payload)

  const resp = await client.chat.completions.create(
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 3500,
    },
    { signal }
  )

  const content = resp.choices[0]?.message?.content || ''
  const parsed = extractJSONObject(content)
  const assignments = parsed?.assignments
  if (!assignments || typeof assignments !== 'object') {
    throw new Error('AI returned invalid JSON (missing assignments)')
  }
  return {
    assignments,
    optimizationScore: safeNumber(parsed?.optimizationScore, 0),
    stats: parsed?.stats || {},
    source: 'ai',
  }
}

function formatHHMM(t: unknown): string {
  const s = String(t ?? '').trim()
  if (!s) return '08:00'
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return '08:00'
  const hh = String(Number(m[1])).padStart(2, '0')
  const mm = String(Number(m[2])).padStart(2, '0')
  return `${hh}:${mm}`
}

function normalizeDayOfWeek(d: unknown): string {
  return String(d ?? 'monday')
    .trim()
    .toLowerCase()
}

async function expandSolverAssignmentsToUi(
  schoolId: string,
  raw: Record<string, string>,
  lessons: Array<{ id: string; teacherId: string; classId: string; subjectId: string }>,
  slots: Array<{
    id: string
    dayOfWeek: string
    period: number
    startTime: string
    endTime: string
    isBreak: boolean
  }>,
  teachers: Array<{ id: string; user?: { name: string | null } | null }>,
  classes: Array<{ id: string; name: string }>,
  rooms: Array<{ id: string }>
) {
  const lessonById = new Map(lessons.map((l) => [l.id, l]))
  const slotById = new Map(slots.map((s) => [s.id, s]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))
  const classById = new Map(classes.map((c) => [c.id, c]))
  const defaultRoomId = rooms[0]?.id ?? 'room-unassigned'

  const subjectIds = Array.from(new Set(lessons.map((l) => l.subjectId).filter(Boolean)))
  const subjects =
    subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { schoolId, id: { in: subjectIds as string[] } },
          select: { id: true, name: true },
        })
      : []
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]))

  const out: Record<string, unknown>[] = []
  for (const [lessonId, slotId] of Object.entries(raw || {})) {
    const lesson = lessonById.get(lessonId)
    const slot = slotById.get(slotId)
    if (!lesson || !slot || slot.isBreak) continue

    const teacher = teacherById.get(lesson.teacherId)
    const cls = classById.get(lesson.classId)

    out.push({
      id: lessonId,
      season: 'normal',
      dayOfWeek: normalizeDayOfWeek(slot.dayOfWeek),
      timeSlotId: slot.id,
      startTime: formatHHMM(slot.startTime),
      endTime: formatHHMM(slot.endTime),
      period: Number(slot.period) || 1,
      isBreak: false,
      teacherId: lesson.teacherId,
      teacherName: teacher?.user?.name ?? undefined,
      classId: lesson.classId,
      className: cls?.name,
      subjectId: lesson.subjectId,
      subjectName: subjectById.get(lesson.subjectId),
      classroomId: defaultRoomId,
      source: 'generated',
    })
  }
  return out
}

async function callLocalPythonSolver(
  solveEndpoint: string,
  payload: any,
  signal: AbortSignal
): Promise<SolveResult> {
  const solverRes = await fetch(solveEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  const solverJson = await solverRes.json().catch(() => null)
  if (!solverRes.ok) {
    throw Object.assign(new Error('Solver service failed'), {
      status: solverRes.status,
      details: solverJson ?? { status: solverRes.status },
    })
  }

  const assignments: Record<string, string> = solverJson?.assignments || {}
  const optimizationScore = safeNumber(solverJson?.optimizationScore, 0)
  const stats = solverJson?.stats || {}

  return { assignments, optimizationScore, stats, source: 'local' }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HEADTEACHER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(req as any))
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school context' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody
  const maxSolutions = Math.max(1, Math.min(5000, safeNumber(body.maxSolutions, 500)))
  const timeoutMs = Math.max(1000, Math.min(120_000, safeNumber(body.timeoutMs, 15_000)))
  const versionName = safeString(body.name) || 'Draft (Solver)'

  const [teachers, rooms, classes, slots, lessons, constraints, lockedPeriodAssignments, recipes] =
    await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId },
        select: {
          id: true,
          assignedSubjects: true,
          user: { select: { name: true } },
        },
      }),
      prisma.classroom.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.timeSlot.findMany({
        where: { schoolId },
        select: {
          id: true,
          dayOfWeek: true,
          period: true,
          startTime: true,
          endTime: true,
          isBreak: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      }),
      prisma.teachingAssignment.findMany({
        where: { schoolId },
        select: { id: true, teacherId: true, classId: true, subjectId: true },
      }),
      prisma.constraint.findMany({
        where: { schoolId, active: true },
        select: { id: true, type: true, scope: true, targetId: true, priority: true, config: true },
      }),
      prisma.teacherPeriodAssignment.findMany({
        where: { schoolId, lockedForGeneration: true },
        select: { teacherId: true, timeSlotId: true },
      }),
      prisma.schedulingRecipe.findMany({
        where: { schoolId, isValid: true, status: { not: 'ARCHIVED' } },
        select: {
          id: true,
          teachingAssignmentId: true,
          teacherId: true,
          classId: true,
          subjectId: true,
          expectedPeriodsPerWeek: true,
          blocks: {
            select: {
              id: true,
              size: true,
              quantity: true,
              placementPriority: true,
              preferredDays: true,
              preferredPeriods: true,
              forbiddenDays: true,
              forbiddenPeriods: true,
              allowSplitAcrossBreaks: true,
              isLocked: true,
            },
          },
          constraints: {
            select: {
              id: true,
              type: true,
              priority: true,
              config: true,
            },
          },
        },
      }),
    ])

  if (!slots.length) {
    return NextResponse.json(
      { error: 'No time slots configured. Set up timetable time slots first.' },
      { status: 400 }
    )
  }

  if (!lessons.length && !recipes.length) {
    return NextResponse.json(
      { error: 'No teaching assignments found. Add teacher-class-subject assignments first.' },
      { status: 400 }
    )
  }

  const payload = {
    name: versionName,
    maxSolutions,
    teachers,
    rooms,
    classes,
    slots,
    lessons,
    constraints,
    lockedAssignments: lockedPeriodAssignments.map((x) => ({
      teacherId: x.teacherId,
      slotId: x.timeSlotId,
    })),
    recipes,
  }

  const solveEndpoint = safeString(process.env.TIMETABLE_SOLVER_URL)
  const { controller, cancel } = withTimeout(timeoutMs)
  try {
    let result: SolveResult | null = null
    const now = Date.now()
    const canTryAi =
      now >= skipAiUntilMs &&
      Boolean(safeString(process.env.AIML_API_KEY)) &&
      Boolean(safeString(process.env.AIML_API_BASE))

    if (canTryAi) {
      try {
        result = await callAIProvider(payload, controller.signal)
      } catch (err: any) {
        if (isInsufficientCreditsError(err)) skipAiUntilMs = Date.now() + 10 * 60 * 1000
      }
    }

    if (!result) {
      if (!solveEndpoint) {
        return NextResponse.json(
          { error: 'Missing TIMETABLE_SOLVER_URL and AI provider is unavailable.' },
          { status: 500 }
        )
      }
      result = await callLocalPythonSolver(solveEndpoint, payload, controller.signal)
    }

    const assignmentsForUi = await expandSolverAssignmentsToUi(
      schoolId,
      result.assignments || {},
      lessons,
      slots,
      teachers,
      classes,
      rooms
    )

    return NextResponse.json({
      assignments: result.assignments,
      assignmentsForUi,
      version: { id: null, name: versionName, optimizationScore: result.optimizationScore },
      stats: result.stats,
      source: result.source,
    })
  } catch (err: any) {
    const msg = String(err?.message || 'Solver generation failed')
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    cancel()
  }
}
