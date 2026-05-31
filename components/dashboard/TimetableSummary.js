'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import SkeletonLoader from '@/components/SkeletonLoader'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import { resolveCardColor, pastelBgForSubject } from '@/lib/timetable/cardColors'
import {
  assignmentsForPrimaryCell,
  isContinuationSlot,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import { Calendar, Clock, MapPin, User, ChevronRight, AlertCircle } from 'lucide-react'

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
]

function dayKeyFromDate(d) {
  const key = String(
    d.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'Africa/Lusaka',
    })
  ).toLowerCase()
  if (key.startsWith('mon')) return 'monday'
  if (key.startsWith('tue')) return 'tuesday'
  if (key.startsWith('wed')) return 'wednesday'
  if (key.startsWith('thu')) return 'thursday'
  if (key.startsWith('fri')) return 'friday'
  return null
}

function hhmmToMinutes(v) {
  const [h, m] = String(v || '0:0')
    .split(':')
    .map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function seasonFromMode(mode) {
  if (mode === 'harvest') return 'farming'
  if (mode === 'planting') return 'planting'
  return 'normal'
}

function timeAgo(iso) {
  const ts = Date.parse(String(iso || ''))
  if (!Number.isFinite(ts)) return null
  const diffMs = Date.now() - ts
  if (diffMs < 30 * 1000) return 'Just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function TimetableSummary({ userRole, userId, className = '' }) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  const assignments = useTimetableStore((s) => s.assignments)
  const conflictCount = useTimetableStore((s) => s.getConflictCount())
  const isPublished = useTimetableStore((s) => s.isPublished)
  const lastPublishedAt = useTimetableStore((s) => s.lastPublishedAt)
  const pendingChanges = useTimetableStore((s) => s.pendingChanges)
  const seasonMode = useTimetableStore((s) => s.currentSeason)
  const publish = useTimetableStore((s) => s.publish)
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const loadBellSchedule = useTimetableStore((s) => s.loadBellSchedule)
  const storeTimeSlots = useTimetableStore((s) => s.timeSlots)
  const getTeacherColorHex = useTimetableStore((s) => s.getTeacherColorHex)
  const [bellLoading, setBellLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    loadFromApi()
    setBellLoading(true)
    loadBellSchedule().finally(() => setBellLoading(false))
  }, [loadFromApi, loadBellSchedule])

  const bellRows = useMemo(() => uniqueBellRows(storeTimeSlots || []), [storeTimeSlots])

  const resolvedRole = String(userRole || user?.role || '').toLowerCase()
  const activeSeason = seasonFromMode(seasonMode)

  const filteredAssignments = useMemo(() => {
    const base = Array.isArray(assignments) ? assignments : []
    const bySeason = base.filter(
      (a) => !a?.season || String(a.season) === activeSeason || activeSeason === 'normal'
    )

    if (resolvedRole === 'student') {
      const classId = String(user?.studentProfile?.classId || '').trim()
      if (!classId) return []
      return bySeason.filter((a) => String(a?.classId) === classId)
    }

    if (resolvedRole === 'teacher' || resolvedRole === 'hod') {
      const teacherUserId = String(user?.id || userId || '').trim()
      if (!teacherUserId) return []
      return bySeason.filter((a) => String(a?.teacherId) === teacherUserId)
    }

    return bySeason
  }, [
    assignments,
    activeSeason,
    resolvedRole,
    user?.id,
    user?.studentProfile?.classId,
    user?.teacherProfile?.id,
    userId,
  ])

  const todayKey = useMemo(() => {
    if (!mounted) return null
    return dayKeyFromDate(new Date())
  }, [mounted])

  const todaySchedule = useMemo(() => {
    if (!todayKey) return []
    return filteredAssignments
      .filter((a) => String(a?.dayOfWeek) === todayKey && !a?.isBreak)
      .slice()
      .sort((a, b) => hhmmToMinutes(a?.startTime) - hhmmToMinutes(b?.startTime))
      .map((a) => ({
        id: a.id,
        subject: String(a?.subjectName || a?.subjectId || 'Subject'),
        class: String(a?.className || a?.classId || 'Class'),
        teacher: String(a?.teacherName || a?.teacherId || 'Teacher'),
        time: `${a?.startTime || ''}-${a?.endTime || ''}`,
        startTime: a?.startTime,
        period: a?.period,
      }))
  }, [filteredAssignments, todayKey])

  const nextClass = useMemo(() => {
    if (!todayKey || !mounted) return null
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    for (const a of todaySchedule) {
      const start = hhmmToMinutes(a.startTime)
      if (start > currentMinutes) {
        return {
          ...a,
          minutesUntil: start - currentMinutes,
        }
      }
    }
    return null
  }, [todayKey, todaySchedule, mounted])

  const getTimetableLink = () => {
    switch (resolvedRole) {
      case 'student':
        return '/dashboard/timetable/student'
      case 'teacher':
        return '/dashboard/timetable/teacher'
      case 'hod':
        return '/dashboard/timetable/hod'
      case 'headteacher':
        return '/dashboard/headteacher/timetable'
      default:
        return '/dashboard'
    }
  }

  const href = getTimetableLink()

  if (!mounted) {
    return (
      <Card
        className={className}
        role="status"
        aria-busy="true"
        aria-label="Loading timetable summary"
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            <SkeletonLoader variant="text" width="40%" height="24px" />
            <div className="space-y-3">
              <SkeletonLoader variant="rectangular" height="80px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (resolvedRole === 'headteacher') {
    const status =
      assignments.length === 0
        ? { label: 'Not created', tone: 'text-royalPurple-text3' }
        : conflictCount > 0
          ? { label: `${conflictCount} conflicts`, tone: 'text-royalPurple-dangerTx' }
          : isPublished
            ? { label: 'Published', tone: 'text-royalPurple-successTx' }
            : { label: 'Draft', tone: 'text-royalPurple-text2' }

    const lastChangeAt =
      pendingChanges?.[0]?.at || (lastPublishedAt ? lastPublishedAt.toISOString() : null)
    const updated = timeAgo(lastChangeAt)
    const canPublish = conflictCount === 0 && assignments.length > 0 && !isPublished

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-royalPurple-accentTx" aria-hidden="true" />
              Master Timetable
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${status.tone}`}>{status.label}</span>
              <Link href={href} className="inline-flex">
                <Button variant="ghost" size="sm" aria-label="View full timetable">
                  View Full
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-6 text-center">
              <div className="text-royalPurple-text1 font-semibold">
                Master Timetable Not Created
              </div>
              <div className="mt-1 text-sm text-royalPurple-text3">Ready to generate</div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href={href} className="inline-flex">
                  <Button className="zsms-hover-raise">Generate Now</Button>
                </Link>
              </div>
            </div>
          ) : bellLoading ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-8 text-center text-sm text-royalPurple-text3">
              Loading school bell schedule…
            </div>
          ) : bellRows.length === 0 ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-8 text-center">
              <div className="text-royalPurple-text1 font-semibold">
                No bell schedule configured
              </div>
              <div className="mt-1 text-sm text-royalPurple-text3">
                Set school hours in Timetable Settings to display the grid.
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href={href} className="inline-flex">
                  <Button className="zsms-hover-raise">Open Timetable Settings</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="timetable-container overflow-x-auto rounded-lg border border-[#9ca3af] bg-white">
              <table className="min-w-[640px] w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e5e7eb]">
                    <th className="sticky left-0 z-10 bg-[#e5e7eb] px-2 py-1.5 text-left font-semibold text-[#374151] border-b border-[#9ca3af]">
                      Time
                    </th>
                    {DAYS.map((d, idx) => (
                      <th
                        key={d.key}
                        className={`px-2 py-1.5 text-center font-semibold text-[#374151] border-b border-[#9ca3af] ${
                          idx > 0 ? 'border-l border-[#9ca3af]' : ''
                        }`}
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bellRows.map((slot, rowIdx) => {
                    const slotKey = `${slot.isBreak ? 'b' : 'p'}-${slot.startTime}-${slot.endTime}`
                    const nextSlot = bellRows[rowIdx + 1]
                    const blockEnd =
                      slot.isBreak ||
                      (nextSlot && nextSlot.isBreak) ||
                      rowIdx === bellRows.length - 1

                    if (slot.isBreak) {
                      return (
                        <tr key={slotKey} className="bg-[#d1d5db]">
                          <td className="sticky left-0 z-10 bg-[#d1d5db] px-2 py-1 text-[#374151] whitespace-nowrap font-medium border-b border-[#9ca3af]">
                            {slot.startTime}–{slot.endTime}
                          </td>
                          <td
                            colSpan={DAYS.length}
                            className="px-2 py-1 text-center text-[#4b5563] font-semibold uppercase tracking-widest border-b border-[#9ca3af]"
                          >
                            {slot.label || 'Break'}
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={slotKey}>
                        <td
                          className={`sticky left-0 z-10 bg-[#f9fafb] px-2 py-1 text-[#4b5563] whitespace-nowrap border-b ${
                            blockEnd ? 'border-[#9ca3af]' : 'border-[#e5e7eb]'
                          }`}
                        >
                          {slot.startTime}–{slot.endTime}
                        </td>
                        {DAYS.map((d, dayIdx) => {
                          if (isContinuationSlot(d.key, slot, filteredAssignments, bellRows)) {
                            return null
                          }
                          const primary = assignmentsForPrimaryCell(
                            d.key,
                            slot,
                            filteredAssignments
                          )
                          const a = primary[0]
                          const span = a ? rowSpanForAssignment(a, bellRows) : 1
                          const colors = a
                            ? resolveCardColor(
                                a.subjectId,
                                a.teacherId,
                                getTeacherColorHex(a.teacherId)
                              )
                            : null

                          return (
                            <td
                              key={d.key}
                              rowSpan={span > 1 ? span : undefined}
                              className={`px-1 py-0.5 align-top border-b ${
                                blockEnd ? 'border-[#9ca3af]' : 'border-[#e5e7eb]'
                              } ${dayIdx > 0 ? 'border-l border-[#d1d5db]' : ''}`}
                            >
                              {a ? (
                                <div
                                  className="rounded px-1.5 py-1 min-h-[36px] border"
                                  style={{
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                  }}
                                >
                                  <div className="font-bold text-[#111827] truncate text-[11px] leading-tight">
                                    {a.subjectName || a.subjectId}
                                  </div>
                                  <div className="text-[10px] text-[#4b5563] truncate leading-tight">
                                    {a.className || a.classId} · {a.teacherName || a.teacherId}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#d1d5db] select-none">·</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-royalPurple-text3">
              {updated
                ? `Updated: ${updated}`
                : lastPublishedAt
                  ? `Published: ${lastPublishedAt.toLocaleString()}`
                  : ''}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-royalPurple-text2">Conflicts: {conflictCount}</span>
              <Button
                onClick={() => {
                  if (!canPublish) return
                  publish()
                  toast.success('Timetable published')
                }}
                disabled={!canPublish}
                className="zsms-hover-raise"
              >
                Publish
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-royalPurple-accentTx" aria-hidden="true" />
            Today's Schedule
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = href)}
            aria-label="View full timetable"
          >
            View Full
            <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Next Class Alert */}
        {nextClass && (
          <div
            className="mb-4 p-3 bg-royalPurple-success border border-royalPurple-border rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-royalPurple-successTx mr-2" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-medium text-royalPurple-successTx">
                  <span className="sr-only">Next class: </span>
                  {nextClass.subject} {resolvedRole === 'teacher' && `- ${nextClass.class}`}
                </div>
                <div className="text-xs text-royalPurple-successTx">
                  {nextClass.time} •{' '}
                  {nextClass.minutesUntil < 60
                    ? `${nextClass.minutesUntil}m`
                    : `${Math.floor(nextClass.minutesUntil / 60)}h ${nextClass.minutesUntil % 60}m`}{' '}
                  remaining
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Classes */}
        {todaySchedule.length > 0 ? (
          <ul className="space-y-3" role="list" aria-label="Today's classes">
            {todaySchedule.slice(0, 4).map((cls, index) => (
              <li key={index}>
                <article
                  className="flex items-center p-3 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 outline-none transition-shadow"
                  style={{
                    borderLeftColor: pastelBgForSubject(cls.subject),
                    borderLeftWidth: '4px',
                  }}
                  tabIndex="0"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-royalPurple-text1 text-sm">
                      {cls.subject} {resolvedRole === 'teacher' && `- ${cls.class}`}
                    </div>
                    <div className="text-xs text-royalPurple-text2 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span className="sr-only">Time: </span>
                      {cls.time} ({cls.period})
                    </div>
                    {resolvedRole !== 'student' ? (
                      <div className="text-xs text-royalPurple-text2 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Class: </span>
                        {cls.class}
                      </div>
                    ) : null}
                    {resolvedRole === 'student' && (
                      <div className="text-xs text-royalPurple-text2 flex items-center">
                        <User className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Teacher: </span>
                        {cls.teacher}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            ))}
            {todaySchedule.length > 4 && (
              <li className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = href)}
                  aria-label={`View ${todaySchedule.length - 4} more classes`}
                >
                  +{todaySchedule.length - 4} more classes
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <div className="text-center text-royalPurple-text3 py-8" role="status">
            <Calendar
              className="h-12 w-12 mx-auto mb-4 text-royalPurple-text3"
              aria-hidden="true"
            />
            <p className="text-sm">No classes scheduled for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
