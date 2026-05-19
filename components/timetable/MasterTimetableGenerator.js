'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  Bell,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
  Plus,
  Save,
} from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function TimetableNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [notifications, setNotifications] = useState([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable/notifications', { cache: 'no-store' })
      const data = await res.json()
      const list = data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n.read).length)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  async function markRead(id) {
    try {
      await fetch('/api/timetable/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchNotifications()
    } catch {}
  }

  async function openNotification(n) {
    await markRead(n.id)
    setShowPanel(false)
    const meta = n?.meta && typeof n.meta === 'object' ? n.meta : {}
    const msg = String(n?.message || '')
    const term =
      String(n?.term || meta?.term || '').trim() ||
      String((msg.match(/\bTerm\s*\d+\b/i) || [])[0] || '').trim()
    const academicYear =
      String(meta?.academicYear || meta?.year || '').trim() ||
      String((msg.match(/\b(20\d{2})\b/) || [])[1] || '').trim()
    const deptRaw = meta?.departments || meta?.department || meta?.dept || null
    const departments = Array.isArray(deptRaw)
      ? deptRaw.map((d) => String(d).trim()).filter(Boolean)
      : typeof deptRaw === 'string'
        ? deptRaw
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : []

    const qs = new URLSearchParams()
    if (term) qs.set('term', term)
    if (academicYear) qs.set('academicYear', academicYear)
    if (departments.length) qs.set('departments', departments.join(','))
    qs.set('autoGenerate', '1')
    const suffix = qs.toString()
    window.location.href = `/dashboard/headteacher/timetable${suffix ? `?${suffix}` : ''}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          background: 'none',
          border: 'none',
          color: '#666666',
          cursor: 'pointer',
          position: 'relative',
          padding: 8,
          zIndex: 10000,
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: '#ef4444',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: 10,
              border: '2px solid #EFECE5',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: 320,
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #111111',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 10000,
            marginTop: 8,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #111111',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>Timetable Alerts</span>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666666',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#666666', fontSize: 12 }}>
                No new alerts
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F5F2EB',
                    cursor: 'pointer',
                    background: n.read ? 'transparent' : '#FF3B0010',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    color: '#111111',
                    display: 'block',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: n.read ? '#666666' : '#111111',
                      }}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <div
                        style={{ width: 6, height: 6, background: '#FF3B00', borderRadius: 10 }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0, lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNotification(n)
                      }}
                      style={{
                        fontSize: 10,
                        color: '#FF3B00',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Open Timetable <ChevronRight size={10} />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MasterTimetableGenerator() {
  const searchParams = useSearchParams()
  const desiredTerm = String(searchParams.get('term') || '').trim()
  const desiredAcademicYear = String(
    searchParams.get('academicYear') || searchParams.get('year') || ''
  ).trim()
  const desiredDepartments = String(
    searchParams.get('departments') || searchParams.get('department') || ''
  ).trim()
  const autoGenerate = String(searchParams.get('autoGenerate') || '').trim() === '1'

  const [config, setConfig] = useState({
    startTime: '07:00',
    endTime: '17:00',
    singleDuration: 40,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakSlots: [],
  })
  const [term, setTerm] = useState(desiredTerm || 'Term 1')
  const [academicYear, setAcademicYear] = useState(
    desiredAcademicYear || new Date().getFullYear().toString()
  )
  const [departments, setDepartments] = useState(() =>
    desiredDepartments
      ? desiredDepartments
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : []
  )
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [entries, setEntries] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [showConfig, setShowConfig] = useState(false)
  const [stats, setStats] = useState(null)
  const [allocationSummary, setAllocationSummary] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, entriesRes, allocRes] = await Promise.all([
        fetch('/api/timetable/generate'),
        fetch(`/api/timetable/entries?term=${term}&academicYear=${academicYear}&status=draft`),
        fetch(
          `/api/timetable/allocations?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}&status=pushed`
        ),
      ])
      const configData = await configRes.json()
      const entriesData = await entriesRes.json()
      const allocData = allocRes.ok ? await allocRes.json() : { summary: null }
      setAllocationSummary(allocData.summary || null)

      if (configData.config) {
        setConfig({
          ...configData.config,
          breakSlots: Array.isArray(configData.config.breakSlots)
            ? configData.config.breakSlots
            : JSON.parse(configData.config.breakSlots || '[]'),
        })
      }
      setEntries(entriesData.entries || [])
    } catch (err) {
      toast.error('Failed to load system data')
    } finally {
      setLoading(false)
    }
  }, [term, academicYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (desiredTerm && desiredTerm !== term) setTerm(desiredTerm)
    if (desiredAcademicYear && desiredAcademicYear !== academicYear)
      setAcademicYear(desiredAcademicYear)
    const nextDepartments = desiredDepartments
      ? desiredDepartments
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : []
    const current = departments.join(',')
    const next = nextDepartments.join(',')
    if (next && next !== current) setDepartments(nextDepartments)
  }, [desiredTerm, desiredAcademicYear, desiredDepartments])

  async function saveConfig() {
    try {
      const res = await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast.success('Configuration saved')
        setShowConfig(false)
      }
    } catch {
      toast.error('Failed to save config')
    }
  }

  async function generate() {
    setGenerating(true)
    setConflicts([])
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          academicYear,
          departments: departments.length ? departments : undefined,
          replaceExisting: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.conflicts) setConflicts(data.conflicts)
        const hint =
          allocationSummary?.pushed === 0
            ? ' Approve HOD department allocations first (Allocations tab).'
            : ''
        toast.error((data.error || 'Generation failed') + hint)
        return
      }
      setEntries(data.entries)
      setStats(data.summary)
      setConflicts(data.conflicts || [])
      toast.success(`Successfully generated ${data.generated} periods`)
    } catch {
      toast.error('Server error during generation')
    } finally {
      setGenerating(false)
    }
  }

  const autoTriggered = useRef(false)
  const canAutoGenerate = useMemo(() => {
    const matchesTerm = !desiredTerm || desiredTerm === term
    const matchesYear = !desiredAcademicYear || desiredAcademicYear === academicYear
    return autoGenerate && matchesTerm && matchesYear
  }, [autoGenerate, desiredTerm, desiredAcademicYear, term, academicYear])

  useEffect(() => {
    if (!canAutoGenerate) return
    if (autoTriggered.current) return
    if (loading || generating) return
    autoTriggered.current = true
    generate()
  }, [canAutoGenerate, loading, generating])

  async function publish() {
    if (entries.length === 0) return
    try {
      const res = await fetch('/api/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, academicYear }),
      })
      if (res.ok) {
        toast.success('Timetable published to all teachers')
        setEntries([])
      }
    } catch {
      toast.error('Failed to publish')
    }
  }

  function addBreak() {
    setConfig((c) => ({
      ...c,
      breakSlots: [
        ...c.breakSlots,
        { label: 'New Break', start: '10:00', end: '10:30', isLunch: false },
      ],
    }))
  }

  function removeBreak(index) {
    setConfig((c) => ({
      ...c,
      breakSlots: c.breakSlots.filter((_, i) => i !== index),
    }))
  }

  function updateBreak(index, field, value) {
    const newBreaks = [...config.breakSlots]
    newBreaks[index][field] = value
    setConfig((c) => ({ ...c, breakSlots: newBreaks }))
  }

  // Group entries for the grid
  const grid = {}
  entries.forEach((e) => {
    const key = `${e.dayOfWeek}-${e.startTime}`
    if (!grid[key]) grid[key] = []
    grid[key].push(e)
  })

  // Get unique time slots for rows
  const timeSlots = [...new Set(entries.map((e) => e.startTime))].sort()

  return (
    <div style={{ padding: '1.5rem', background: '#EFECE5', minHeight: '100vh', color: '#111111' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Master Timetable</h1>
          <p style={{ color: '#666666', fontSize: 13, margin: '4px 0 0' }}>
            Generate and manage school schedule from HOD allocations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowConfig(true)} style={outlineBtn}>
            <Settings size={14} /> Configure Breaks & Times
          </button>
          <button onClick={generate} disabled={generating} style={btnStyle('#FF3B00')}>
            <Play size={14} /> {generating ? 'Generating...' : 'Generate Master Timetable'}
          </button>
          {entries.length > 0 && (
            <button onClick={publish} style={btnStyle('#16a34a')}>
              <CheckCircle size={14} /> Publish Timetable
            </button>
          )}
        </div>
      </div>

      {allocationSummary != null && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '10px 14px',
            borderRadius: 10,
            background: allocationSummary.pushed > 0 ? '#1e3a2f' : '#3b2a1a',
            border: `1px solid ${allocationSummary.pushed > 0 ? '#166534' : '#92400e'}`,
            fontSize: 12,
            color: allocationSummary.pushed > 0 ? '#86efac' : '#fcd34d',
          }}
        >
          {allocationSummary.pushed > 0
            ? `${allocationSummary.pushed} pushed allocation(s) ready for ${term} ${academicYear} (${allocationSummary.teachers} teachers).`
            : `No pushed allocations for ${term} ${academicYear}. Headteacher must approve HOD submissions under Allocations first.`}
        </div>
      )}

      {/* Conflicts box */}
      {conflicts.length > 0 && (
        <div
          style={{
            background: '#450a0a',
            border: '1px solid #991b1b',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#fca5a5',
              marginBottom: 8,
            }}
          >
            <AlertTriangle size={16} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {conflicts.length} Scheduling Conflicts Detected
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 8,
            }}
          >
            {conflicts.map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: '#fecaca',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '6px 10px',
                  borderRadius: 6,
                }}
              >
                • {c.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid view */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#666666' }}>
          Loading timetable engine...
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #111111',
          }}
        >
          <Calendar size={48} style={{ color: '#111111', marginBottom: 16 }} />
          <h3 style={{ margin: 0, fontSize: 18 }}>No Draft Timetable</h3>
          <p style={{ color: '#666666', fontSize: 13, maxWidth: 400, margin: '8px auto 20px' }}>
            Set your school hours and click Generate. The system will pull all "pushed" allocations
            from HODs and build the best possible schedule.
          </p>
          <button onClick={generate} style={btnStyle('#FF3B00')}>
            Start Generation
          </button>
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #111111',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              minWidth: 1000,
            }}
          >
            <thead>
              <tr style={{ background: '#EFECE5' }}>
                <th style={thStyle}>Time</th>
                {config.workingDays.map((d) => (
                  <th key={d} style={thStyle}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time} style={{ borderBottom: '1px solid #F5F2EB' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#666666', width: 80 }}>
                    {time}
                  </td>
                  {config.workingDays.map((day) => {
                    const items = grid[`${day}-${time}`] || []
                    return (
                      <td key={day} style={{ ...tdStyle, padding: 4 }}>
                        {items.map((e) => (
                          <div
                            key={e.id}
                            style={{
                              background:
                                e.periodType === 'TRIPLE'
                                  ? '#92400e20'
                                  : e.periodType === 'DOUBLE'
                                    ? '#5b21b620'
                                    : '#1e40af20',
                              border: `1px solid ${e.periodType === 'TRIPLE' ? '#92400e' : e.periodType === 'DOUBLE' ? '#5b21b6' : '#1e40af'}`,
                              borderRadius: 8,
                              padding: '6px 8px',
                              marginBottom: 4,
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 11 }}>
                              {e.allocation?.subject?.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#666666' }}>
                              {e.allocation?.class?.name} • {e.allocation?.teacher?.name}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                marginTop: 4,
                                opacity: 0.7,
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>{e.periodType}</span>
                              <span>{e.durationMin}m</span>
                            </div>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #111111',
              width: '100%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem', fontSize: 20 }}>Timetable Configuration</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <label style={labelStyle}>School Start Time</label>
                <input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig((c) => ({ ...c, startTime: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>School End Time</label>
                <input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => setConfig((c) => ({ ...c, endTime: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Single Period Duration (minutes)</label>
              <select
                value={config.singleDuration}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, singleDuration: parseInt(e.target.value) }))
                }
                style={inputStyle}
              >
                <option value={30}>30 minutes</option>
                <option value={35}>35 minutes</option>
                <option value={40}>40 minutes (Standard)</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>Breaks & Lunch Slots</label>
                <button
                  onClick={addBreak}
                  style={{
                    background: '#FF3B0010',
                    border: '1px solid #FF3B00',
                    color: '#FF3B00',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={12} /> Add Break
                </button>
              </div>

              {config.breakSlots.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: '#EFECE5',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <input
                    value={b.label}
                    onChange={(e) => updateBreak(i, 'label', e.target.value)}
                    placeholder="Label"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="time"
                    value={b.start}
                    onChange={(e) => updateBreak(i, 'start', e.target.value)}
                    style={{ ...inputStyle, width: 100 }}
                  />
                  <span style={{ opacity: 0.5 }}>to</span>
                  <input
                    type="time"
                    value={b.end}
                    onChange={(e) => updateBreak(i, 'end', e.target.value)}
                    style={{ ...inputStyle, width: 100 }}
                  />
                  <button
                    onClick={() => removeBreak(i)}
                    style={{
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '2rem' }}
            >
              <button onClick={() => setShowConfig(false)} style={outlineBtn}>
                Cancel
              </button>
              <button onClick={saveConfig} style={btnStyle('#FF3B00')}>
                <Save size={14} /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  color: '#666666',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #111111',
}
const tdStyle = { padding: '12px 16px', fontSize: 12, verticalAlign: 'top' }
const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: '#666666',
  fontWeight: 600,
  marginBottom: 6,
}
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#EFECE5',
  border: '1px solid #111111',
  borderRadius: 10,
  color: '#111111',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
const btnStyle = (bg) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: bg,
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'opacity 0.2s',
})
const outlineBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid #111111',
  borderRadius: 8,
  color: '#666666',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}
