'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, FileText, AlertTriangle } from 'lucide-react'
import { formatCountdownLive } from '@/lib/hod/activitySchedule'

function urgencyClasses(urgency) {
  if (urgency === 'urgent') return 'border-orange-400 bg-orange-50 text-orange-950'
  if (urgency === 'soon') return 'border-amber-300 bg-amber-50 text-amber-950'
  if (urgency === 'past')
    return 'border-royalPurple-border bg-royalPurple-card2 text-royalPurple-text2'
  return 'border-green-300 bg-green-50 text-green-950'
}

function ActivityCard({ activity, liveLabel }) {
  const c = activity.countdown
  const urgency = c?.urgency || 'normal'

  return (
    <div
      className={`rounded-lg border p-4 ${urgencyClasses(urgency)}`}
      role="article"
      aria-label={`${activity.title} reminder`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
            {activity.kind === 'meeting' ? (
              <Calendar className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {activity.kind === 'meeting' ? 'Department meeting' : 'Department activity'}
            {activity.scope === 'staff' && ' · Staff'}
          </div>
          <h4 className="font-semibold mt-1 truncate">{activity.title}</h4>
          {activity.subtitle && <p className="text-sm opacity-90 mt-0.5">{activity.subtitle}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {activity.time
                ? `${new Date(activity.date).toLocaleDateString()} at ${activity.time}`
                : new Date(activity.date).toLocaleDateString()}
            </span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {activity.location}
              </span>
            )}
          </div>
          {activity.files?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {activity.files.map((f) => (
                <a
                  key={f.id}
                  href={f.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline"
                >
                  <FileText className="h-3 w-3" />
                  {f.label}: {f.fileName}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums">{liveLabel}</div>
          <div className="text-xs mt-1">until start</div>
        </div>
      </div>
    </div>
  )
}

export function DepartmentActivityReminders() {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/teacher/department-activities', { credentials: 'include' })
        const json = await res.json()
        if (!cancelled && res.ok) setPayload(json.data)
      } catch {
        if (!cancelled) setPayload(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const poll = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) return null
  if (!payload?.activities?.length) return null

  const activities = payload.activities.map((a) => {
    if (!a.startsAt) return { ...a, liveLabel: '—' }
    const startsAt = new Date(a.startsAt)
    const msUntil = startsAt.getTime() - Date.now()
    const meta = {
      isPast: msUntil <= 0,
      days: Math.floor(Math.abs(msUntil) / 86400000),
      hours: Math.floor((Math.abs(msUntil) % 86400000) / 3600000),
      minutes: Math.floor((Math.abs(msUntil) % 3600000) / 60000),
      seconds: Math.floor((Math.abs(msUntil) % 60000) / 1000),
    }
    return { ...a, liveLabel: formatCountdownLive(meta) }
  })

  void tick

  return (
    <section className="space-y-3" aria-label="Department reminders">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-royalPurple-text1 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-royalPurple-accentTx" />
          Department reminders
          {payload.departmentName && (
            <span className="text-sm font-normal text-royalPurple-text2">
              — {payload.departmentName}
            </span>
          )}
        </h2>
        <span className="text-sm text-royalPurple-text3">{payload.upcomingCount} upcoming</span>
      </div>
      {payload.nextActivity && (
        <p className="text-sm text-royalPurple-text2">
          Next: <strong>{payload.nextActivity.title}</strong>
        </p>
      )}
      <div className="space-y-3">
        {activities.slice(0, 5).map((a) => (
          <ActivityCard key={`${a.kind}-${a.id}`} activity={a} liveLabel={a.liveLabel} />
        ))}
      </div>
      <p className="text-xs text-royalPurple-text3">
        Schedules and minutes from your HOD appear here automatically. Ask your HOD if you need the
        full meeting file.
      </p>
    </section>
  )
}
