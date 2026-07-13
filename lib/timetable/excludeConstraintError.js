/**
 * Map Postgres EXCLUDE violations on TimetableAllocationEntry to UI errors.
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const CLASS_OVERLAP_CONSTRAINT = 'TimetableAllocationEntry_no_class_overlap'
export const TEACHER_OVERLAP_CONSTRAINT = 'TimetableAllocationEntry_no_teacher_overlap'

/**
 * @param {unknown} err
 * @returns {{ isExcludeViolation: boolean, code?: string, message?: string, constraint?: string }}
 */
export function interpretTimetableExcludeError(err) {
  if (!err) return { isExcludeViolation: false }

  const code = String(/** @type {any} */ (err).code || '')
  const msg = String(/** @type {any} */ (err).message || '')
  const metaConstraint = String(
    /** @type {any} */ (err).meta?.constraint || /** @type {any} */ (err).meta?.target || ''
  )

  const mentionsClass =
    msg.includes(CLASS_OVERLAP_CONSTRAINT) || metaConstraint.includes(CLASS_OVERLAP_CONSTRAINT)
  const mentionsTeacher =
    msg.includes(TEACHER_OVERLAP_CONSTRAINT) || metaConstraint.includes(TEACHER_OVERLAP_CONSTRAINT)
  const isExclusion =
    code === '23P01' ||
    mentionsClass ||
    mentionsTeacher ||
    msg.includes('conflicting key value violates exclusion constraint') ||
    (code === 'P2010' && msg.toLowerCase().includes('exclusion'))

  if (!isExclusion) {
    // Prisma sometimes surfaces driver errors without 23P01 on the top-level code.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      /exclusion constraint|23P01/i.test(msg)
    ) {
      // continue
    } else {
      return { isExcludeViolation: false }
    }
  }

  if (mentionsTeacher && !mentionsClass) {
    return {
      isExcludeViolation: true,
      code: 'TEACHER_DOUBLE_BOOKED',
      constraint: TEACHER_OVERLAP_CONSTRAINT,
      message:
        "Can't place this lesson here — that teacher is already teaching another class at this time.",
    }
  }

  return {
    isExcludeViolation: true,
    code: mentionsTeacher ? 'TEACHER_DOUBLE_BOOKED' : 'CLASS_DOUBLE_BOOKED',
    constraint: mentionsTeacher ? TEACHER_OVERLAP_CONSTRAINT : CLASS_OVERLAP_CONSTRAINT,
    message: mentionsTeacher
      ? "Can't place this lesson here — that teacher is already teaching another class at this time."
      : "Can't place this lesson here — this class already has another lesson overlapping that time.",
  }
}

/**
 * @param {ReturnType<typeof interpretTimetableExcludeError>} base
 * @param {{ teacherName?: string, className?: string, dayOfWeek?: string, startTime?: string, endTime?: string }} ctx
 */
export function formatTimetableExcludeMessage(base, ctx = {}) {
  if (!base?.isExcludeViolation) return null
  const when = [
    ctx.dayOfWeek,
    ctx.startTime && ctx.endTime ? `${ctx.startTime}–${ctx.endTime}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (base.code === 'TEACHER_DOUBLE_BOOKED' && ctx.teacherName) {
    return `Can't move this lesson here — ${ctx.teacherName} is already teaching at this time${when ? ` (${when})` : ''}.`
  }
  if (base.code === 'CLASS_DOUBLE_BOOKED' && ctx.className) {
    return `Can't move this lesson here — ${ctx.className} already has a lesson at this time${when ? ` (${when})` : ''}.`
  }
  return base.message
}

/**
 * @param {unknown} err
 * @param {{ teacherName?: string, className?: string, dayOfWeek?: string, startTime?: string, endTime?: string }} [ctx]
 * @returns {import('next/server').NextResponse | null}
 */
export function timetableExcludeConflictResponse(err, ctx = {}) {
  const base = interpretTimetableExcludeError(err)
  if (!base.isExcludeViolation) return null
  const message = formatTimetableExcludeMessage(base, ctx) || base.message
  return NextResponse.json(
    {
      error: message,
      message,
      code: base.code,
      constraint: base.constraint,
    },
    { status: 409 }
  )
}
