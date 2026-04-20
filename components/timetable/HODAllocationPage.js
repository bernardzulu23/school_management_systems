'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { Plus, Trash2, Send, CheckCircle, BookOpen, Users, Clock } from 'lucide-react'

const BLOCK_TYPES = [
  { id: 'SINGLE', label: 'Singles only', desc: '40 min each', color: '#3b82f6' },
  { id: 'DOUBLE', label: 'Doubles only', desc: '80 min each (uninterrupted)', color: '#8b5cf6' },
  { id: 'TRIPLE', label: 'Triples only', desc: '120 min each', color: '#f59e0b' },
  { id: 'MIXED', label: 'Mixed blocks', desc: 'Specify breakdown below', color: '#10b981' },
]

const TERMS = ['Term 1', 'Term 2', 'Term 3']

function periodDescription(allocation) {
  if (!allocation.blockType) return ''
  if (allocation.blockType === 'SINGLE') return `${allocation.periodsPerWeek} × 40 min`
  if (allocation.blockType === 'DOUBLE') return `${allocation.periodsPerWeek / 2} doubles × 80 min`
  if (allocation.blockType === 'TRIPLE') return `${allocation.periodsPerWeek / 3} triples × 120 min`
  if (allocation.blockType === 'MIXED') {
    const parts = []
    if (allocation.triplePeriods) parts.push(`${allocation.triplePeriods}×triple(120)`)
    if (allocation.doublePeriods) parts.push(`${allocation.doublePeriods}×double(80)`)
    if (allocation.singlePeriods) parts.push(`${allocation.singlePeriods}×single(40)`)
    return parts.join(' + ')
  }
  return ''
}

function validateMixed(a) {
  const total = (a.singlePeriods || 0) * 1 + (a.doublePeriods || 0) * 2 + (a.triplePeriods || 0) * 3
  return total === a.periodsPerWeek
}

export default function HODAllocationPage() {
  const { user } = useAuth()
  const [term, setTerm] = useState('Term 1')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    teacherId: '',
    subjectId: '',
    classId: '',
    periodsPerWeek: 5,
    blockType: 'DOUBLE',
    singlePeriods: 0,
    doublePeriods: 0,
    triplePeriods: 0,
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [term, academicYear])

  async function loadData() {
    setLoading(true)
    try {
      const [teachersRes, subjectsRes, classesRes, allocRes] = await Promise.all([
        fetch('/api/users?role=teacher'),
        fetch('/api/subjects'),
        fetch('/api/classes'),
        fetch(`/api/timetable/allocations?term=${term}&academicYear=${academicYear}`),
      ])
      const [teachersData, subjectsData, classesData, allocData] = await Promise.all([
        teachersRes.json(),
        subjectsRes.json(),
        classesRes.json(),
        allocRes.json(),
      ])
      setTeachers(teachersData.data || teachersData.users || teachersData || [])
      setSubjects(subjectsData.subjects || subjectsData.data || subjectsData || [])
      setClasses(classesData.classes || classesData.data || classesData || [])
      setAllocations(allocData.allocations || [])
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function computeBlockBreakdown(blockType, periodsPerWeek) {
    if (blockType === 'SINGLE')
      return { singlePeriods: periodsPerWeek, doublePeriods: 0, triplePeriods: 0 }
    if (blockType === 'DOUBLE')
      return { singlePeriods: 0, doublePeriods: periodsPerWeek / 2, triplePeriods: 0 }
    if (blockType === 'TRIPLE')
      return { singlePeriods: 0, doublePeriods: 0, triplePeriods: periodsPerWeek / 3 }
    return {
      singlePeriods: form.singlePeriods,
      doublePeriods: form.doublePeriods,
      triplePeriods: form.triplePeriods,
    }
  }

  async function saveAllocation() {
    if (!form.teacherId || !form.subjectId || !form.classId) {
      toast.error('Select teacher, subject and class')
      return
    }
    if (form.periodsPerWeek < 1 || form.periodsPerWeek > 20) {
      toast.error('Periods per week must be between 1 and 20')
      return
    }
    if (form.blockType === 'DOUBLE' && form.periodsPerWeek % 2 !== 0) {
      toast.error('Doubles need an even number of periods (e.g. 4, 6, 8)')
      return
    }
    if (form.blockType === 'TRIPLE' && form.periodsPerWeek % 3 !== 0) {
      toast.error('Triples need periods divisible by 3 (e.g. 3, 6, 9)')
      return
    }
    if (form.blockType === 'MIXED' && !validateMixed(form)) {
      const total = form.singlePeriods * 1 + form.doublePeriods * 2 + form.triplePeriods * 3
      toast.error(
        `Period breakdown total (${total}) doesn't match periods per week (${form.periodsPerWeek})`
      )
      return
    }

    const payload = {
      ...form,
      term,
      academicYear,
      ...computeBlockBreakdown(form.blockType, form.periodsPerWeek),
    }

    try {
      const res = await fetch('/api/timetable/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Allocation saved')
      setShowForm(false)
      setForm({
        teacherId: '',
        subjectId: '',
        classId: '',
        periodsPerWeek: 5,
        blockType: 'DOUBLE',
        singlePeriods: 0,
        doublePeriods: 0,
        triplePeriods: 0,
        notes: '',
      })
      loadData()
    } catch {
      toast.error('Failed to save')
    }
  }

  async function deleteAllocation(id) {
    try {
      const res = await fetch(`/api/timetable/allocations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Deleted')
        loadData()
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function pushToHeadteacher() {
    const draftCount = allocations.filter((a) => a.status === 'draft').length
    if (draftCount === 0) {
      toast.error('No draft allocations to push')
      return
    }

    setPushing(true)
    try {
      const res = await fetch('/api/timetable/allocations/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, academicYear }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success(`✓ ${data.message}`)
      loadData()
    } catch {
      toast.error('Failed to push')
    } finally {
      setPushing(false)
    }
  }

  const draftAllocations = allocations.filter((a) => a.status === 'draft')
  const pushedAllocations = allocations.filter((a) => a.status === 'pushed')
  const totalPeriods = allocations.reduce((s, a) => s + a.periodsPerWeek, 0)

  return (
    <div style={{ padding: '1.5rem', background: '#170d28', minHeight: '100vh', color: '#ede9fe' }}>
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Class Allocation</h1>
          <p style={{ color: '#a78bfa', fontSize: 13, margin: '4px 0 0' }}>
            Assign teachers to subjects and classes with period configurations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
            {TERMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ ...selectStyle, width: 90 }}
            placeholder="Year"
          />
          <button onClick={() => setShowForm(true)} style={btnStyle('#7c3aed')}>
            <Plus size={14} /> Add Allocation
          </button>
          {draftAllocations.length > 0 && (
            <button onClick={pushToHeadteacher} disabled={pushing} style={btnStyle('#16a34a')}>
              <Send size={14} />{' '}
              {pushing ? 'Sending...' : `Push ${draftAllocations.length} to Headteacher`}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginBottom: '1.5rem',
        }}
      >
        {[
          {
            icon: <Users size={16} />,
            label: 'Teachers assigned',
            value: [...new Set(allocations.map((a) => a.teacherId))].length,
          },
          { icon: <BookOpen size={16} />, label: 'Allocations total', value: allocations.length },
          { icon: <Clock size={16} />, label: 'Periods per week', value: totalPeriods },
          {
            icon: <CheckCircle size={16} />,
            label: 'Pushed to HT',
            value: pushedAllocations.length,
            green: true,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: '#2d1f4e',
              borderRadius: 10,
              padding: '12px 16px',
              border: '1px solid #3b2a66',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#a78bfa',
                marginBottom: 4,
              }}
            >
              {s.icon}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.green ? '#86efac' : '#ede9fe' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#6d28d9' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add allocation modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#2d1f4e',
              borderRadius: 16,
              padding: '1.5rem',
              width: '100%',
              maxWidth: 560,
              border: '1px solid #3b2a66',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: '1rem' }}>
              New Class Allocation
            </h2>

            <FormRow label="Teacher *">
              <select
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{' '}
                    {t.teacherProfile?.department ? `(${t.teacherProfile.department})` : ''}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Subject *">
              <select
                value={form.subjectId}
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Class *">
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Periods per week *">
              <input
                type="number"
                min={1}
                max={20}
                value={form.periodsPerWeek}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodsPerWeek: parseInt(e.target.value) || 1 }))
                }
                style={{ ...inputStyle, width: 80 }}
              />
              <span style={{ fontSize: 12, color: '#6d28d9', marginLeft: 8 }}>
                = {form.periodsPerWeek * 40} minutes/week total
              </span>
            </FormRow>

            <FormRow label="Block type *">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => setForm((f) => ({ ...f, blockType: bt.id }))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${form.blockType === bt.id ? bt.color : '#3b2a66'}`,
                      background: form.blockType === bt.id ? `${bt.color}20` : 'transparent',
                      color: form.blockType === bt.id ? bt.color : '#a78bfa',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{bt.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>{bt.desc}</div>
                  </button>
                ))}
              </div>
            </FormRow>

            {/* MIXED breakdown */}
            {form.blockType === 'MIXED' && (
              <div
                style={{
                  background: '#261843',
                  borderRadius: 8,
                  padding: '12px',
                  marginBottom: 12,
                  border: '1px solid #3b2a66',
                }}
              >
                <p style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>
                  Breakdown (must total {form.periodsPerWeek} periods):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    ['Triple periods (×3)', 'triplePeriods', '#f59e0b'],
                    ['Double periods (×2)', 'doublePeriods', '#8b5cf6'],
                    ['Single periods (×1)', 'singlePeriods', '#3b82f6'],
                  ].map(([label, key, color]) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, color, display: 'block', marginBottom: 4 }}>
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 }))
                        }
                        style={{ ...inputStyle, color }}
                      />
                    </div>
                  ))}
                </div>
                {(() => {
                  const total =
                    form.singlePeriods * 1 + form.doublePeriods * 2 + form.triplePeriods * 3
                  const ok = total === form.periodsPerWeek
                  return (
                    <p style={{ fontSize: 11, color: ok ? '#86efac' : '#fca5a5', marginTop: 6 }}>
                      {ok
                        ? `✓ ${total} periods = ${form.periodsPerWeek}`
                        : `✗ ${total} ≠ ${form.periodsPerWeek} (adjust breakdown)`}
                    </p>
                  )
                })()}
              </div>
            )}

            <FormRow label="Notes">
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes for the headteacher"
                style={inputStyle}
              />
            </FormRow>

            {/* Preview */}
            {form.teacherId && form.subjectId && form.classId && (
              <div
                style={{
                  background: '#170d28',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 12,
                  border: '1px solid #7c3aed',
                }}
              >
                <p style={{ fontSize: 12, color: '#7c3aed', margin: 0 }}>Preview:</p>
                <p style={{ fontSize: 13, color: '#ede9fe', margin: '4px 0 0', fontWeight: 600 }}>
                  {teachers.find((t) => t.id === form.teacherId)?.name} →{' '}
                  {subjects.find((s) => s.id === form.subjectId)?.name} →{' '}
                  {classes.find((c) => c.id === form.classId)?.name}
                </p>
                <p style={{ fontSize: 12, color: '#a78bfa', margin: '2px 0 0' }}>
                  {periodDescription(form)} ({form.periodsPerWeek} periods/week)
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowForm(false)} style={btnStyle('#261843')}>
                Cancel
              </button>
              <button onClick={saveAllocation} style={btnStyle('#7c3aed')}>
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocations table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6d28d9' }}>
          Loading allocations...
        </div>
      ) : allocations.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#2d1f4e',
            borderRadius: 14,
            border: '1px solid #3b2a66',
          }}
        >
          <p style={{ color: '#6d28d9', marginBottom: 12 }}>
            No allocations yet for {term} {academicYear}
          </p>
          <button onClick={() => setShowForm(true)} style={btnStyle('#7c3aed')}>
            <Plus size={14} /> Add First Allocation
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#2d1f4e',
            borderRadius: 14,
            border: '1px solid #3b2a66',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#170d28' }}>
                {[
                  'Teacher',
                  'Subject',
                  'Class',
                  'Periods / Block',
                  'Total min/week',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 11,
                      color: '#6d28d9',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      borderBottom: '1px solid #3b2a66',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #261843' }}>
                  <td style={tdStyle}>{a.teacher?.name || '—'}</td>
                  <td style={tdStyle}>{a.subject?.name || '—'}</td>
                  <td style={tdStyle}>{a.class?.name || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ede9fe' }}>
                      {a.periodsPerWeek} periods
                    </div>
                    <div style={{ fontSize: 11, color: '#a78bfa' }}>{periodDescription(a)}</div>
                  </td>
                  <td style={tdStyle}>{a.periodsPerWeek * 40} min</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 99,
                        fontWeight: 600,
                        background: a.status === 'pushed' ? '#0f2318' : '#261843',
                        color: a.status === 'pushed' ? '#86efac' : '#f59e0b',
                        border: `1px solid ${a.status === 'pushed' ? '#166534' : '#92400e'}`,
                      }}
                    >
                      {a.status === 'pushed' ? '✓ Pushed' : 'Draft'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {a.status === 'draft' && (
                      <button
                        onClick={() => deleteAllocation(a.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fca5a5',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: '#a78bfa',
          fontWeight: 600,
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  background: '#170d28',
  border: '1px solid #3b2a66',
  borderRadius: 8,
  color: '#ede9fe',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
const selectStyle = {
  padding: '8px 12px',
  background: '#261843',
  border: '1px solid #3b2a66',
  borderRadius: 8,
  color: '#a78bfa',
  fontSize: 13,
  cursor: 'pointer',
}
const tdStyle = { padding: '10px 14px', fontSize: 13, color: '#ede9fe' }
const btnStyle = (bg) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  background: bg,
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
})
