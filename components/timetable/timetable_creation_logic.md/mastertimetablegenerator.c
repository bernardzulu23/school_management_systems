'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Bell, X, Settings, Play, CheckCircle, AlertTriangle, Clock, Users, BookOpen, RefreshCw } from 'lucide-react'

// ── Notification Bell Component ──────────────────────────────────
// Drop this inside your DashboardLayout header
export function TimetableNotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable/notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch { /* silent */ }
  }, [])

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = async (ids) => {
    await fetch('/api/timetable/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids })
    })
    fetchNotifications()
  }

  const markAllRead = async () => {
    await fetch('/api/timetable/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true })
    })
    fetchNotifications()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        style={{ position: 'relative', background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, background: '#ef4444',
            color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99,
            minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px'
          }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 50,
            background: '#2d1f4e', border: '1px solid #3b2a66', borderRadius: 14,
            width: 380, maxHeight: 480, overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            marginTop: 8
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #3b2a66', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#ede9fe', fontSize: 14 }}>Timetable Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6d28d9', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => markRead([n.id])}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #261843', cursor: 'pointer',
                  background: n.read ? 'transparent' : '#261843',
                  transition: 'background 0.15s'
                }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : '#7c3aed', flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#ede9fe', fontSize: 13, fontWeight: n.read ? 400 : 600, margin: 0, lineHeight: 1.4 }}>{n.title}</p>
                    <p style={{ color: '#a78bfa', fontSize: 12, margin: '3px 0 0', lineHeight: 1.5 }}>{n.message}</p>
                    <p style={{ color: '#6d28d9', fontSize: 11, margin: '4px 0 0' }}>
                      from {n.fromUser?.name} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                    {n.type === 'HOD_ALLOCATION_PUSHED' && (
                      <button
                        onClick={e => { e.stopPropagation(); window.location.href = '/dashboard/headteacher/timetable' }}
                        style={{ marginTop: 6, padding: '4px 10px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        Open Timetable →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Master Timetable Generator (Headteacher page) ────────────────
export default function MasterTimetableGenerator() {
  const [config, setConfig] = useState(null)
  const [term, setTerm] = useState('Term 1')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [allocations, setAllocations] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDepts, setSelectedDepts] = useState([])
  const [timetable, setTimetable] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('setup') // setup | grid | conflicts
  const [showBreakConfig, setShowBreakConfig] = useState(false)
  const [breakSlots, setBreakSlots] = useState([
    { label: 'Short Break', start: '10:20', end: '10:40', isLunch: false },
    { label: 'Lunch Break', start: '12:40', end: '13:20', isLunch: true }
  ])
  const [dayStart, setDayStart] = useState('07:00')
  const [dayEnd, setDayEnd] = useState('17:00')

  useEffect(() => { loadData() }, [term, academicYear])

  async function loadData() {
    setLoading(true)
    try {
      const [configRes, allocRes] = await Promise.all([
        fetch('/api/timetable/generate'),
        fetch(`/api/timetable/allocations?term=${term}&academicYear=${academicYear}&status=pushed`)
      ])
      const [configData, allocData] = await Promise.all([configRes.json(), allocRes.json()])

      if (configData.config) {
        setConfig(configData.config)
        setBreakSlots(configData.config.breakSlots || breakSlots)
        setDayStart(configData.config.startTime || '07:00')
        setDayEnd(configData.config.endTime || '17:00')
      }

      const allocs = allocData.allocations || []
      setAllocations(allocs)
      const depts = [...new Set(allocs.map(a => a.hod?.hodProfile?.department).filter(Boolean))]
      setDepartments(depts)
      setSelectedDepts(depts) // select all by default
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  async function saveConfig() {
    const res = await fetch('/api/timetable/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: dayStart, endTime: dayEnd, breakSlots, term, academicYear })
    })
    const data = await res.json()
    if (res.ok) toast.success('Configuration saved')
    else toast.error(data.error)
  }

  async function generateTimetable() {
    if (selectedDepts.length === 0) { toast.error('Select at least one department'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, academicYear, departments: selectedDepts, replaceExisting: true })
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setTimetable(data.entries || [])
      setConflicts(data.conflicts || [])
      setActiveView(data.conflicts.length > 0 ? 'conflicts' : 'grid')
      toast.success(`Generated ${data.generated} timetable slots${data.conflicts.length ? ` with ${data.conflicts.length} conflicts to resolve` : ' — conflict free!'}`)
    } catch { toast.error('Generation failed') }
    finally { setGenerating(false) }
  }

  async function publishTimetable() {
    if (conflicts.length > 0) { toast.error('Resolve conflicts before publishing'); return }
    setPublishing(true)
    try {
      const res = await fetch('/api/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, academicYear })
      })
      const data = await res.json()
      if (res.ok) toast.success('Timetable published to all dashboards!')
      else toast.error(data.error)
    } catch { toast.error('Publish failed') }
    finally { setPublishing(false) }
  }

  // Build grid data
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const byDay = {}
  days.forEach(d => { byDay[d] = timetable.filter(e => e.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime)) })

  const summary = {
    teachers: [...new Set(timetable.map(e => e.teacherId))].length,
    classes: [...new Set(timetable.map(e => e.classId))].length,
    slots: timetable.length,
    doubles: timetable.filter(e => e.periodType === 'DOUBLE').length,
    triples: timetable.filter(e => e.periodType === 'TRIPLE').length,
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#6d28d9' }}>Loading timetable system...</div>

  return (
    <div style={{ background: '#170d28', minHeight: '100vh', color: '#ede9fe', padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Master Timetable Generator</h1>
          <p style={{ color: '#a78bfa', fontSize: 13, margin: '4px 0 0' }}>
            Generates from HOD class allocations in real-time — {allocations.length} allocations ready
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={term} onChange={e => setTerm(e.target.value)} style={selectStyle}>
            {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} style={{ ...selectStyle, width: 90 }} />
          <button onClick={() => setShowBreakConfig(true)} style={outlineBtn}>
            <Settings size={14} /> Configure Breaks & Times
          </button>
          {timetable.length > 0 && conflicts.length === 0 && (
            <button onClick={publishTimetable} disabled={publishing} style={btnStyle('#16a34a')}>
              <CheckCircle size={14} /> {publishing ? 'Publishing...' : 'Publish Timetable'}
            </button>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '1.5rem', background: '#2d1f4e', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['setup', 'Setup & Generate'], ['grid', 'Timetable Grid'], ['conflicts', `Conflicts${conflicts.length ? ` (${conflicts.length})` : ''}`]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveView(id)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500,
              background: activeView === id ? '#7c3aed' : 'transparent',
              color: activeView === id ? '#fff' : '#a78bfa'
            }}>{label}</button>
        ))}
      </div>

      {/* SETUP VIEW */}
      {activeView === 'setup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Allocations summary */}
          <div style={{ background: '#2d1f4e', borderRadius: 14, padding: '1.25rem', border: '1px solid #3b2a66' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#ede9fe' }}>
              <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              HOD Allocations Ready ({term})
            </h3>
            {allocations.length === 0 ? (
              <p style={{ color: '#6d28d9', fontSize: 13 }}>No pushed allocations yet. Ask HODs to push their department allocations.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['Total allocations', allocations.length],
                    ['Departments', departments.length],
                    ['Teachers', [...new Set(allocations.map(a => a.teacherId))].length],
                    ['Periods/week', allocations.reduce((s, a) => s + a.periodsPerWeek, 0)]
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: '#170d28', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
                      <div style={{ fontSize: 11, color: '#6d28d9' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead><tr>{['Teacher', 'Subject', 'Class', 'Periods', 'Type'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 6px', color: '#6d28d9', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {allocations.slice(0, 8).map(a => (
                      <tr key={a.id} style={{ borderTop: '1px solid #261843' }}>
                        <td style={{ padding: '5px 6px', color: '#ede9fe' }}>{a.teacher?.name?.split(' ').slice(-1)[0]}</td>
                        <td style={{ padding: '5px 6px', color: '#a78bfa' }}>{a.subject?.name}</td>
                        <td style={{ padding: '5px 6px' }}>{a.class?.name}</td>
                        <td style={{ padding: '5px 6px', fontWeight: 700 }}>{a.periodsPerWeek}</td>
                        <td style={{ padding: '5px 6px', color: '#f59e0b', fontSize: 10 }}>{a.blockType}</td>
                      </tr>
                    ))}
                    {allocations.length > 8 && <tr><td colSpan={5} style={{ padding: '5px 6px', color: '#6d28d9', textAlign: 'center' }}>+{allocations.length - 8} more</td></tr>}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Generate panel */}
          <div style={{ background: '#2d1f4e', borderRadius: 14, padding: '1.25rem', border: '1px solid #3b2a66' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
              <Play size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Generate Timetable
            </h3>

            {/* Department selector */}
            <p style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>Include departments:</p>
            {departments.length === 0 ? (
              <p style={{ color: '#6d28d9', fontSize: 13 }}>No departments with pushed allocations yet.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {departments.map(dept => (
                  <button key={dept}
                    onClick={() => setSelectedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: `1px solid ${selectedDepts.includes(dept) ? '#7c3aed' : '#3b2a66'}`,
                      background: selectedDepts.includes(dept) ? '#7c3aed20' : 'transparent',
                      color: selectedDepts.includes(dept) ? '#a78bfa' : '#6d28d9',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600
                    }}>
                    {selectedDepts.includes(dept) ? '✓ ' : ''}{dept}
                  </button>
                ))}
              </div>
            )}

            {/* Schedule rules info */}
            <div style={{ background: '#170d28', borderRadius: 8, padding: '10px 12px', marginBottom: 16, border: '1px solid #261843', fontSize: 12 }}>
              <p style={{ color: '#a78bfa', margin: '0 0 6px', fontWeight: 700 }}>Scheduling rules:</p>
              {[
                '1 single = 40 minutes (1 period)',
                '1 double = 80 minutes (2 consecutive periods, never split)',
                '1 triple = 120 minutes (3 consecutive periods)',
                'School day: ' + dayStart + ' – ' + dayEnd,
                `${breakSlots.length} break(s) configured`,
                'No teacher double-booked',
                'No class in two places at once',
              ].map((r, i) => <p key={i} style={{ color: '#ede9fe', margin: '2px 0', fontSize: 11 }}>• {r}</p>)}
            </div>

            <button onClick={generateTimetable} disabled={generating || allocations.length === 0 || selectedDepts.length === 0}
              style={{ ...btnStyle('#7c3aed'), width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
              {generating ? <><div style={{ width: 16, height: 16, border: '2px solid #fff3', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating...</> : <><Play size={16} /> Generate Master Timetable</>}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {activeView === 'grid' && timetable.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {[['📅', 'Slots', summary.slots], ['👩‍🏫', 'Teachers', summary.teachers], ['🏫', 'Classes', summary.classes], ['🔵', 'Doubles', summary.doubles], ['🟣', 'Triples', summary.triples]].map(([icon, label, val]) => (
              <div key={label} style={{ background: '#2d1f4e', borderRadius: 10, padding: '10px 14px', border: '1px solid #3b2a66', textAlign: 'center' }}>
                <div style={{ fontSize: 18 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
                <div style={{ fontSize: 11, color: '#6d28d9' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', background: '#170d28', border: '1px solid #3b2a66', color: '#6d28d9', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', minWidth: 100 }}>Time</th>
                  {days.map(d => <th key={d} style={{ padding: '10px 12px', background: '#170d28', border: '1px solid #3b2a66', color: '#ede9fe', fontSize: 12, fontWeight: 700 }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {/* Build unique time rows */}
                {[...new Set(timetable.map(e => e.startTime))].sort().map(time => {
                  const entry0 = timetable.find(e => e.startTime === time)
                  return (
                    <tr key={time}>
                      <td style={{ padding: '8px 12px', background: '#2d1f4e', border: '1px solid #3b2a66', fontSize: 12, textAlign: 'center', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{time}</div>
                        <div style={{ fontSize: 10, color: '#6d28d9' }}>{entry0?.endTime}</div>
                        <div style={{ fontSize: 9, color: entry0?.periodType === 'DOUBLE' ? '#8b5cf6' : entry0?.periodType === 'TRIPLE' ? '#f59e0b' : '#4b3575', fontWeight: 600, marginTop: 2 }}>
                          {entry0?.periodType} {entry0?.durationMin}min
                        </div>
                      </td>
                      {days.map(day => {
                        const entries = timetable.filter(e => e.dayOfWeek === day && e.startTime === time)
                        return (
                          <td key={day} style={{ padding: 4, border: '1px solid #261843', verticalAlign: 'top', minWidth: 160 }}>
                            {entries.length === 0 ? (
                              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#261843', fontSize: 11 }}>—</div>
                            ) : entries.map(e => (
                              <div key={e.id} style={{
                                padding: '6px 8px', borderRadius: 8, marginBottom: 2,
                                background: e.periodType === 'DOUBLE' ? '#2d1f4e' : e.periodType === 'TRIPLE' ? '#1c1028' : '#1a1035',
                                border: `1px solid ${e.periodType === 'DOUBLE' ? '#8b5cf6' : e.periodType === 'TRIPLE' ? '#f59e0b' : '#3b2a66'}`
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#ede9fe' }}>{e.allocation?.subject?.code || e.allocation?.subject?.name}</div>
                                <div style={{ fontSize: 10, color: '#a78bfa' }}>{e.allocation?.class?.name}</div>
                                <div style={{ fontSize: 10, color: '#6d28d9' }}>{e.allocation?.teacher?.name?.split(' ').slice(-1)[0]}</div>
                              </div>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFLICTS VIEW */}
      {activeView === 'conflicts' && (
        <div style={{ background: '#2d1f4e', borderRadius: 14, padding: '1.25rem', border: '1px solid #3b2a66' }}>
          {conflicts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#86efac' }}>
              <CheckCircle size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 700 }}>No conflicts! Timetable is ready to publish.</p>
            </div>
          ) : (
            <>
              <h3 style={{ color: '#fca5a5', margin: '0 0 12px', fontSize: 15 }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {conflicts.length} Scheduling Conflicts
              </h3>
              <p style={{ color: '#a78bfa', fontSize: 13, marginBottom: 12 }}>
                These could not be placed. Reduce periods per week or add more working hours in the configuration.
              </p>
              {conflicts.map((c, i) => (
                <div key={i} style={{ background: '#3b0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0, fontWeight: 600 }}>{c.message}</p>
                  <p style={{ color: '#f87171', fontSize: 11, margin: '4px 0 0' }}>Type: {c.type}</p>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#170d28', borderRadius: 8, border: '1px solid #261843' }}>
                <p style={{ color: '#a78bfa', fontSize: 12, margin: 0, fontWeight: 600 }}>How to fix:</p>
                {['Extend school hours (currently {dayStart}–{dayEnd})', 'Remove some break time', 'Ask the HOD to reduce periods per week for conflicting subjects', 'Check that teachers are not over-allocated across multiple subjects'].map((fix, i) => (
                  <p key={i} style={{ color: '#ede9fe', fontSize: 12, margin: '3px 0 0' }}>• {fix}</p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Break/Time Configuration Modal */}
      {showBreakConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#2d1f4e', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500, border: '1px solid #3b2a66', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>School Hours & Breaks</h2>
              <button onClick={() => setShowBreakConfig(false)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', display: 'block', marginBottom: 4 }}>School starts</label>
                <input type="time" value={dayStart} onChange={e => setDayStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', display: 'block', marginBottom: 4 }}>School ends</label>
                <input type="time" value={dayEnd} onChange={e => setDayEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#6d28d9', marginBottom: 8 }}>
              Single period = 40 min. School can run from 07:00 to 18:00.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Break slots</p>
              <button onClick={() => setBreakSlots([...breakSlots, { label: 'New Break', start: '10:00', end: '10:20', isLunch: false }])}
                style={{ ...btnStyle('#261843'), fontSize: 12, padding: '5px 10px' }}><Plus size={12} /> Add break</button>
            </div>

            {breakSlots.map((b, i) => (
              <div key={i} style={{ background: '#170d28', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #3b2a66' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, alignItems: 'center' }}>
                  <input value={b.label} onChange={e => setBreakSlots(bs => bs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    style={{ ...inputStyle, fontSize: 12 }} placeholder="Break name" />
                  <input type="time" value={b.start} onChange={e => setBreakSlots(bs => bs.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
                    style={{ ...inputStyle, width: 100, fontSize: 12 }} />
                  <input type="time" value={b.end} onChange={e => setBreakSlots(bs => bs.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
                    style={{ ...inputStyle, width: 100, fontSize: 12 }} />
                  <button onClick={() => setBreakSlots(bs => bs.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#a78bfa', cursor: 'pointer' }}>
                  <input type="checkbox" checked={b.isLunch} onChange={e => setBreakSlots(bs => bs.map((x, j) => j === i ? { ...x, isLunch: e.target.checked } : x))} />
                  Lunch break (longer)
                </label>
              </div>
            ))}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowBreakConfig(false)} style={outlineBtn}>Cancel</button>
              <button onClick={async () => { await saveConfig(); setShowBreakConfig(false) }} style={btnStyle('#7c3aed')}>
                <CheckCircle size={14} /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shared styles
const inputStyle = { width: '100%', padding: '9px 11px', background: '#170d28', border: '1px solid #3b2a66', borderRadius: 8, color: '#ede9fe', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const selectStyle = { padding: '8px 12px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontSize: 13, cursor: 'pointer' }
const btnStyle = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: bg, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' })
const outlineBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontWeight: 600, fontSize: 13, cursor: 'pointer' }