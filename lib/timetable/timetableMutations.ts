import toast from 'react-hot-toast'
import type { Assignment } from './types'
import { useTimetableStore } from './timetableStore'

export interface TimetableMutationContext {
  term: string
  academicYear: string
  loadFromApi: (opts: { term: string; academicYear: string; status?: string }) => Promise<unknown>
}

function patchBody(a: Assignment, ctx: TimetableMutationContext) {
  return {
    id: a.id,
    term: ctx.term,
    academicYear: ctx.academicYear,
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    periodNumber: a.period,
    ...(a.teacherId ? { teacherId: a.teacherId } : {}),
  }
}

export async function persistAssignmentMove(a: Assignment, ctx: TimetableMutationContext) {
  const { moveAssignment } = useTimetableStore.getState()
  const before = useTimetableStore.getState().assignments.find((x) => x.id === a.id)
  moveAssignment(a.id, {
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    period: a.period,
    isBreak: a.isBreak,
    ...(a.teacherId ? { teacherId: a.teacherId } : {}),
  })

  try {
    const res = await fetch('/api/timetable/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patchBody(a, ctx)),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Failed to save timetable change')
  } catch (e: unknown) {
    if (before) {
      useTimetableStore.getState().moveAssignment(a.id, {
        dayOfWeek: before.dayOfWeek,
        startTime: before.startTime,
        endTime: before.endTime,
        period: before.period,
        isBreak: before.isBreak,
        ...(before.teacherId ? { teacherId: before.teacherId } : {}),
      })
    } else {
      await ctx.loadFromApi({ term: ctx.term, academicYear: ctx.academicYear, status: 'draft' })
    }
    toast.error(e instanceof Error ? e.message : 'Failed to save timetable change')
    throw e
  }
}

export async function persistAssignmentSwap(
  nextA: Assignment,
  nextB: Assignment,
  ctx: TimetableMutationContext
) {
  const store = useTimetableStore.getState()
  const beforeA = store.assignments.find((x) => x.id === nextA.id)
  const beforeB = store.assignments.find((x) => x.id === nextB.id)
  if (!beforeA || !beforeB) return

  store.swapAssignments(
    nextA.id,
    {
      dayOfWeek: nextA.dayOfWeek,
      startTime: nextA.startTime,
      endTime: nextA.endTime,
      period: nextA.period,
      isBreak: nextA.isBreak,
      ...(nextA.teacherId ? { teacherId: nextA.teacherId } : {}),
    },
    nextB.id,
    {
      dayOfWeek: nextB.dayOfWeek,
      startTime: nextB.startTime,
      endTime: nextB.endTime,
      period: nextB.period,
      isBreak: nextB.isBreak,
      ...(nextB.teacherId ? { teacherId: nextB.teacherId } : {}),
    }
  )

  try {
    for (const a of [nextB, nextA]) {
      const res = await fetch('/api/timetable/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchBody(a, ctx)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save swap')
    }
  } catch (e: unknown) {
    store.swapAssignments(
      nextA.id,
      {
        dayOfWeek: beforeA.dayOfWeek,
        startTime: beforeA.startTime,
        endTime: beforeA.endTime,
        period: beforeA.period,
        isBreak: beforeA.isBreak,
        ...(beforeA.teacherId ? { teacherId: beforeA.teacherId } : {}),
      },
      nextB.id,
      {
        dayOfWeek: beforeB.dayOfWeek,
        startTime: beforeB.startTime,
        endTime: beforeB.endTime,
        period: beforeB.period,
        isBreak: beforeB.isBreak,
        ...(beforeB.teacherId ? { teacherId: beforeB.teacherId } : {}),
      }
    )
    toast.error(e instanceof Error ? e.message : 'Failed to save swap')
    throw e
  }
}

export async function persistAssignmentDelete(
  assignmentId: Assignment['id'],
  ctx: TimetableMutationContext
) {
  const store = useTimetableStore.getState()
  const before = store.assignments.find((a) => a.id === assignmentId)
  if (!before) return

  store.removeAssignment(assignmentId)

  try {
    const res = await fetch('/api/timetable/entries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: assignmentId, term: ctx.term, academicYear: ctx.academicYear }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Failed to delete timetable entry')
    toast.success('Deleted')
  } catch (e: unknown) {
    store.addAssignment(before)
    toast.error(e instanceof Error ? e.message : 'Failed to delete timetable entry')
    throw e
  }
}

export async function persistClearTimetable(ctx: TimetableMutationContext) {
  const store = useTimetableStore.getState()
  const previous = [...store.assignments]
  store.resetAssignments()

  try {
    const res = await fetch('/api/timetable/entries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        clearAll: true,
        term: ctx.term,
        academicYear: ctx.academicYear,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Failed to clear timetable')
    toast.success('Timetable cleared')
  } catch (e: unknown) {
    store.replaceAssignments(previous, { source: 'update' })
    toast.error(e instanceof Error ? e.message : 'Failed to clear timetable')
    throw e
  }
}
