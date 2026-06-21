'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Send, Bell, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatPeriodConfigLabel } from '@/lib/timetable/formatPeriodConfig'
import { DepartmentFilteredClassDropdown } from '@/components/timetable/DepartmentFilteredClassDropdown'
import { sessionFetch } from '@/lib/auth/sessionFetch'

const TERMS = ['Term 1', 'Term 2', 'Term 3']

const PERIOD_PRESETS = [
  {
    id: 'p6',
    label: '6 periods (3 doubles)',
    cfg: { periods: 6, doubles: 3, triples: 0, singles: 0 },
  },
  {
    id: 'p5',
    label: '5 periods (1 double + 1 triple)',
    cfg: { periods: 5, doubles: 1, triples: 1, singles: 0 },
  },
  {
    id: 'p4',
    label: '4 periods (2 doubles + 1 single)',
    cfg: { periods: 4, doubles: 2, triples: 0, singles: 1 },
  },
]

function normalizeString(v) {
  return String(v || '').trim()
}

function normalizeClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const raw = String(v || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function stringifyPeriodConfig(periodConfig) {
  return formatPeriodConfigLabel(periodConfig)
}

function statusBadge(status) {
  const s = String(status || '').toUpperCase()
  const map = {
    DRAFT: { bg: '#F5F2EB', fg: '#f59e0b', bd: '#92400e', label: 'DRAFT' },
    SUBMITTED: { bg: '#111111', fg: '#93c5fd', bd: '#1d4ed8', label: 'SUBMITTED' },
    APPROVED: { bg: '#0f2318', fg: '#86efac', bd: '#166534', label: 'APPROVED' },
    REJECTED: { bg: '#2a0f18', fg: '#fca5a5', bd: '#b91c1c', label: 'REJECTED' },
  }
  return map[s] || { bg: '#F5F2EB', fg: '#666666', bd: '#111111', label: s || 'UNKNOWN' }
}

export default function HODAllocationPage() {
  const [term, setTerm] = useState('Term 1')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [teachers, setTeachers] = useState([])
  const [departments, setDepartments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingAllocation, setSavingAllocation] = useState(false)
  const [departmentSubjects, setDepartmentSubjects] = useState([])
  const [departmentClasses, setDepartmentClasses] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [showRejections, setShowRejections] = useState(false)
  const [form, setForm] = useState({
    departmentId: '',
    teacherId: '',
    classes: '',
    subject: '',
    periodPreset: 'p6',
    customSingles: 0,
    customDoubles: 0,
    customTriples: 0,
  })

  useEffect(() => {
    loadData()
  }, [term, academicYear])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teachersRes, subjectsRes, departmentsRes, allocRes] = await Promise.all([
        sessionFetch('/api/users?role=teacher&scope=department', {
          cache: 'no-store',
          credentials: 'include',
        }),
        sessionFetch('/api/subjects', { credentials: 'include', cache: 'no-store' }),
        sessionFetch('/api/departments', { credentials: 'include', cache: 'no-store' }),
        sessionFetch('/api/allocations/my-department', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ])
      const safeJson = async (res) => {
        try {
          return await res.json()
        } catch {
          return null
        }
      }
      const [teachersData, subjectsData, departmentsData, allocData] = await Promise.all([
        safeJson(teachersRes),
        safeJson(subjectsRes),
        safeJson(departmentsRes),
        safeJson(allocRes),
      ])

      const ensureArray = (v) => (Array.isArray(v) ? v : [])
      const errors = []

      if (teachersRes.ok) {
        setTeachers(ensureArray(teachersData?.data || teachersData?.users || teachersData))
      } else {
        errors.push(
          String(teachersData?.message || teachersData?.error || '').trim() ||
            `Teachers failed (${teachersRes.status})`
        )
      }

      if (subjectsRes.ok) {
        setSubjects(ensureArray(subjectsData?.subjects || subjectsData?.data || subjectsData))
      } else {
        errors.push(
          String(subjectsData?.message || subjectsData?.error || '').trim() ||
            `Subjects failed (${subjectsRes.status})`
        )
      }

      let deptList = []
      if (departmentsRes.ok) {
        deptList = ensureArray(
          departmentsData?.data || departmentsData?.departments || departmentsData
        )
        setDepartments(deptList)
      } else {
        errors.push(
          String(departmentsData?.message || departmentsData?.error || '').trim() ||
            `Departments failed (${departmentsRes.status})`
        )
      }

      if (allocRes.ok) {
        setAllocations(ensureArray(allocData?.allocations || allocData?.data || allocData))
      } else {
        errors.push(
          String(allocData?.message || allocData?.error || '').trim() ||
            `Allocations failed (${allocRes.status})`
        )
      }

      if (errors.length > 0) {
        throw new Error(errors[0])
      }

      if (deptList.length) {
        setForm((f) => {
          const current = String(f.departmentId || '')
          const stillValid = deptList.some((d) => String(d.id) === current)
          if (stillValid) return f
          return { ...f, departmentId: String(deptList[0]?.id || '') }
        })
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [term, academicYear])

  const loadSubjectsForTeacher = useCallback(async (departmentId, teacherUserId) => {
    if (!departmentId || !teacherUserId) {
      setDepartmentSubjects([])
      return
    }
    try {
      const res = await sessionFetch(
        `/api/allocations/department-subjects?departmentId=${encodeURIComponent(departmentId)}&teacherUserId=${encodeURIComponent(teacherUserId)}`,
        { credentials: 'include', cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDepartmentSubjects([])
        return
      }
      const list = Array.isArray(data.subjects) ? data.subjects : []
      setDepartmentSubjects(list)
      if (data.autoSubject) {
        setForm((f) => ({ ...f, subject: data.autoSubject }))
      } else if (list.length === 1) {
        setForm((f) => ({ ...f, subject: list[0] }))
      } else {
        setForm((f) => ({
          ...f,
          subject: list.includes(f.subject) ? f.subject : '',
        }))
      }
    } catch {
      setDepartmentSubjects([])
    }
  }, [])

  const loadClassesForDepartment = useCallback(async (departmentId) => {
    if (!departmentId) {
      setDepartmentClasses([])
      return
    }
    try {
      const res = await sessionFetch(
        `/api/allocations/department-classes?departmentId=${encodeURIComponent(departmentId)}`,
        { credentials: 'include', cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDepartmentClasses([])
        return
      }
      setDepartmentClasses(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setDepartmentClasses([])
    }
  }, [])

  useEffect(() => {
    if (form.departmentId) loadClassesForDepartment(form.departmentId)
    else setDepartmentClasses([])
  }, [form.departmentId, loadClassesForDepartment])

  const rejectedAllocations = useMemo(
    () => allocations.filter((a) => String(a?.status || '').toUpperCase() === 'REJECTED'),
    [allocations]
  )

  const statusCounts = useMemo(() => {
    const counts = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 }
    for (const a of allocations) {
      const s = String(a?.status || '').toUpperCase()
      if (s in counts) counts[s] += 1
    }
    return counts
  }, [allocations])

  function buildPeriodConfig() {
    if (form.periodPreset === 'custom') {
      const singles = Number(form.customSingles || 0)
      const doubles = Number(form.customDoubles || 0)
      const triples = Number(form.customTriples || 0)
      const periods = singles + doubles * 2 + triples * 3
      const parts = []
      if (doubles) parts.push(`${doubles} double${doubles === 1 ? '' : 's'}`)
      if (triples) parts.push(`${triples} triple${triples === 1 ? '' : 's'}`)
      if (singles) parts.push(`${singles} single${singles === 1 ? '' : 's'}`)
      const label =
        parts.length > 0
          ? `${periods} periods per week (${parts.join(', ')})`
          : `${periods} periods per week`
      return { preset: 'custom', singles, doubles, triples, periods, label }
    }
    const preset = PERIOD_PRESETS.find((p) => p.id === form.periodPreset) || PERIOD_PRESETS[0]
    return { preset: preset.id, label: preset.label, ...preset.cfg }
  }

  async function saveAllocation() {
    if (savingAllocation) return

    const departmentId = normalizeString(form.departmentId)
    const teacherId = normalizeString(form.teacherId)
    const subject = normalizeString(form.subject)
    const classes = selectedClasses.length ? selectedClasses : normalizeClasses(form.classes)
    const periodConfig = buildPeriodConfig()

    if (!departmentId) return toast.error('Select department')
    if (!teacherId) return toast.error('Select teacher')
    if (!subject) return toast.error('Select or enter subject')
    if (classes.length === 0) return toast.error('Select at least one class')

    if (periodConfig.preset === 'custom') {
      const total = Number(periodConfig?.periods || 0)
      if (total <= 0) return toast.error('Custom period config must total at least 1 period')
    }

    setSavingAllocation(true)
    try {
      if (editingId) {
        const res = await sessionFetch(`/api/allocations/${editingId}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            teacherId,
            classes,
            subject,
            periodConfig,
            term,
            academicYear,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to update allocation')
        const edited = allocations.find((row) => String(row.id) === String(editingId))
        const editedStatus = String(edited?.status || '').toUpperCase()
        toast.success(
          editedStatus === 'SUBMITTED'
            ? 'Submitted allocation updated — Headteacher will see your changes'
            : 'Allocation updated'
        )
      } else {
        const res = await sessionFetch('/api/allocations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            departmentId,
            teacherId,
            classes,
            subject,
            periodConfig,
            term,
            academicYear,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data?.message || data?.error || `Failed to create allocation (${res.status})`
          throw new Error(msg)
        }
        toast.success('Allocation created')
      }

      setShowForm(false)
      setEditingId('')
      setForm((f) => ({
        ...f,
        teacherId: '',
        classes: '',
        subject: '',
        periodPreset: 'p6',
        customSingles: 0,
        customDoubles: 0,
        customTriples: 0,
      }))
      setDepartmentSubjects([])
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setSavingAllocation(false)
    }
  }

  async function submitAllocation(id) {
    if (!id) return
    setSubmitting(true)
    try {
      const res = await sessionFetch(`/api/allocations/${id}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to submit')
      toast.success('Submitted to admin')
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteAllocation(id) {
    try {
      const res = await sessionFetch(`/api/allocations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to delete')
      toast.success('Deleted')
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to delete')
    }
  }

  function startEdit(a) {
    const status = String(a?.status || '').toUpperCase()
    if (status !== 'DRAFT' && status !== 'REJECTED' && status !== 'SUBMITTED') return
    const data = a?.allocationData && typeof a.allocationData === 'object' ? a.allocationData : {}
    const storedTeacherId = normalizeString(data?.teacherId)
    const teacherRow = teachers.find(
      (t) => String(t.teacherId || '') === storedTeacherId || String(t.id || '') === storedTeacherId
    )
    const teacherId = teacherRow?.id || storedTeacherId
    const classNames = Array.isArray(data?.classes) ? data.classes : normalizeClasses(data?.classes)
    const subject = normalizeString(data?.subject)
    const periodConfig = data?.periodConfig ?? null
    const periodPreset =
      typeof periodConfig === 'object' && periodConfig?.preset ? String(periodConfig.preset) : 'p6'
    const departmentId = String(a.departmentId || '')

    setEditingId(String(a.id))
    setShowForm(true)
    setSelectedClasses(classNames)
    setForm((f) => ({
      ...f,
      departmentId: departmentId || f.departmentId || '',
      teacherId,
      classes: classNames.join(', '),
      subject,
      periodPreset: periodPreset === 'custom' ? 'custom' : periodPreset || 'p6',
      customSingles: Number(periodConfig?.singles || 0),
      customDoubles: Number(periodConfig?.doubles || 0),
      customTriples: Number(periodConfig?.triples || 0),
    }))
    if (departmentId) loadClassesForDepartment(departmentId)
    if (departmentId && teacherId) {
      loadSubjectsForTeacher(departmentId, teacherId)
    }
  }

  return (
    <div className="text-ink">
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
          <p style={{ color: '#666666', fontSize: 13, margin: '4px 0 0' }}>
            Assign teachers to classes, submit for the Headteacher to approve. Approved rows sync to
            the timetable builder as pushed allocations — generate the school timetable from the
            Master Timetable screen using the same term and year.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowRejections((v) => !v)}
              style={{
                background: 'none',
                border: '1px solid #111111',
                color: '#666666',
                cursor: 'pointer',
                position: 'relative',
                padding: '8px 10px',
                borderRadius: 8,
              }}
            >
              <Bell size={16} />
              {rejectedAllocations.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    border: '2px solid #EFECE5',
                  }}
                >
                  {rejectedAllocations.length}
                </span>
              )}
            </button>

            {showRejections && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 360,
                  maxWidth: '85vw',
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #111111',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #111111',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 12 }}>Rejection Feedback</span>
                  <button
                    type="button"
                    onClick={() => setShowRejections(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666666',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Close
                  </button>
                </div>

                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {rejectedAllocations.length === 0 ? (
                    <div style={{ padding: 18, color: '#666666', fontSize: 12 }}>
                      No rejected allocations
                    </div>
                  ) : (
                    rejectedAllocations.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => startEdit(a)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 12px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F5F2EB',
                          color: '#111111',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 12 }}>
                            {a.department?.name || 'Department'}
                          </div>
                          <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 800 }}>
                            REJECTED
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#666666', marginTop: 4 }}>
                          {String(a.rejectionReason || 'No reason provided')}
                        </div>
                        <div
                          style={{ fontSize: 11, color: '#FF3B00', marginTop: 8, fontWeight: 800 }}
                        >
                          Click to edit and resubmit
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
          <button
            onClick={() => {
              setEditingId('')
              setSelectedClasses([])
              setShowForm(true)
            }}
            style={btnStyle('#FF3B00')}
          >
            <Plus size={14} /> Add Allocation
          </button>
        </div>
      </div>

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
            icon: <CheckCircle size={16} />,
            label: 'Approved',
            value: statusCounts.APPROVED,
            green: true,
          },
          { icon: <Send size={16} />, label: 'Submitted', value: statusCounts.SUBMITTED },
          { icon: <AlertTriangle size={16} />, label: 'Rejected', value: statusCounts.REJECTED },
          { icon: <Plus size={16} />, label: 'Draft', value: statusCounts.DRAFT },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              padding: '12px 16px',
              border: '1px solid #111111',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#666666',
                marginBottom: 4,
              }}
            >
              {s.icon}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.green ? '#86efac' : '#111111' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#666666' }}>{s.label}</div>
          </div>
        ))}
      </div>

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
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '1.5rem',
              width: '100%',
              maxWidth: 560,
              border: '1px solid #111111',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: '1rem' }}>
              {editingId ? 'Edit Allocation' : 'New Allocation'}
            </h2>

            <FormRow label="Department *">
              <select
                value={form.departmentId}
                onChange={(e) => {
                  const departmentId = e.target.value
                  setForm((f) => ({
                    ...f,
                    departmentId,
                    teacherId: '',
                    subject: '',
                    classes: '',
                  }))
                  setDepartmentSubjects([])
                  setSelectedClasses([])
                  loadClassesForDepartment(departmentId)
                }}
                style={inputStyle}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Teacher *">
              <select
                value={form.teacherId}
                onChange={(e) => {
                  const teacherUserId = e.target.value
                  setForm((f) => ({ ...f, teacherId: teacherUserId, subject: '' }))
                  loadSubjectsForTeacher(form.departmentId, teacherUserId)
                }}
                style={inputStyle}
              >
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Classes *">
              <DepartmentFilteredClassDropdown
                departmentId={form.departmentId}
                selectedClassNames={selectedClasses}
                onChange={({ names }) => {
                  setSelectedClasses(names)
                  setForm((f) => ({ ...f, classes: names.join(', ') }))
                }}
              />
            </FormRow>

            <FormRow label="Subject *">
              {departmentSubjects.length > 1 ? (
                <select
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Select subject</option>
                  {departmentSubjects.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder={
                    departmentSubjects.length === 1
                      ? departmentSubjects[0]
                      : 'Select a teacher first'
                  }
                  readOnly={departmentSubjects.length === 1}
                  list="subject-list"
                  style={{
                    ...inputStyle,
                    ...(departmentSubjects.length === 1 ? { opacity: 0.85 } : {}),
                  }}
                />
              )}
              <datalist id="subject-list">
                {(departmentSubjects.length > 0 ? departmentSubjects : subjects.map((s) => s.name))
                  .filter(Boolean)
                  .map((name) => (
                    <option key={name} value={String(name)} />
                  ))}
              </datalist>
            </FormRow>

            <FormRow label="Period configuration *">
              <div style={{ width: '100%' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {PERIOD_PRESETS.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: form.periodPreset === p.id ? '#EFECE5' : '#F5F2EB',
                        borderRadius: 10,
                        border: `1px solid ${form.periodPreset === p.id ? '#FF3B00' : '#111111'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="periodPreset"
                        checked={form.periodPreset === p.id}
                        onChange={() => setForm((f) => ({ ...f, periodPreset: p.id }))}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                    </label>
                  ))}
                  <label
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: form.periodPreset === 'custom' ? '#EFECE5' : '#F5F2EB',
                      borderRadius: 10,
                      border: `1px solid ${form.periodPreset === 'custom' ? '#FF3B00' : '#111111'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="periodPreset"
                      checked={form.periodPreset === 'custom'}
                      onChange={() => setForm((f) => ({ ...f, periodPreset: 'custom' }))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Custom</span>
                  </label>
                </div>

                {form.periodPreset === 'custom' && (
                  <div
                    style={{
                      marginTop: 10,
                      background: '#F5F2EB',
                      border: '1px solid #111111',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#666666' }}>
                          Singles
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={form.customSingles}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, customSingles: Number(e.target.value) || 0 }))
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#666666' }}>
                          Doubles
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={form.customDoubles}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, customDoubles: Number(e.target.value) || 0 }))
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#666666' }}>
                          Triples
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={form.customTriples}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, customTriples: Number(e.target.value) || 0 }))
                          }
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: '#666666', fontWeight: 700 }}>
                      Total periods:{' '}
                      {Number(form.customSingles || 0) +
                        Number(form.customDoubles || 0) * 2 +
                        Number(form.customTriples || 0) * 3}
                    </div>
                  </div>
                )}
              </div>
            </FormRow>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId('')
                }}
                style={btnStyle('#F5F2EB')}
              >
                Cancel
              </button>
              <button
                onClick={saveAllocation}
                disabled={savingAllocation}
                style={{ ...btnStyle('#FF3B00'), opacity: savingAllocation ? 0.7 : 1 }}
              >
                {savingAllocation ? 'Saving…' : editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666666' }}>
          Loading allocations...
        </div>
      ) : allocations.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #111111',
          }}
        >
          <p style={{ color: '#666666', marginBottom: 12 }}>No allocations yet</p>
          <button
            onClick={() => {
              setEditingId('')
              setSelectedClasses([])
              setShowForm(true)
            }}
            style={btnStyle('#FF3B00')}
          >
            <Plus size={14} /> Add First Allocation
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #111111',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#EFECE5' }}>
                {['Department', 'Teacher', 'Classes', 'Subject', 'Period config', 'Status', ''].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 11,
                        color: '#666666',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid #111111',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #F5F2EB' }}>
                  <td style={tdStyle}>{a.department?.name || '—'}</td>
                  <td style={tdStyle}>
                    {teachers.find(
                      (t) =>
                        String(t.teacherId || '') === String(a?.allocationData?.teacherId || '') ||
                        String(t.id) === String(a?.allocationData?.teacherId || '')
                    )?.name || '—'}
                  </td>
                  <td style={tdStyle}>
                    {Array.isArray(a?.allocationData?.classes)
                      ? a.allocationData.classes.join(', ')
                      : normalizeString(a?.allocationData?.classes) || '—'}
                  </td>
                  <td style={tdStyle}>{normalizeString(a?.allocationData?.subject) || '—'}</td>
                  <td style={tdStyle}>
                    {stringifyPeriodConfig(a?.allocationData?.periodConfig) || '—'}
                  </td>
                  <td style={tdStyle}>
                    {(() => {
                      const b = statusBadge(a.status)
                      return (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontWeight: 800,
                            background: b.bg,
                            color: b.fg,
                            border: `1px solid ${b.bd}`,
                          }}
                        >
                          {b.label}
                        </span>
                      )
                    })()}
                    {String(a?.status || '').toUpperCase() === 'REJECTED' && a?.rejectionReason ? (
                      <div
                        style={{ marginTop: 6, fontSize: 11, color: '#fca5a5', fontWeight: 700 }}
                      >
                        {String(a.rejectionReason)}
                      </div>
                    ) : null}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {(String(a?.status || '').toUpperCase() === 'DRAFT' ||
                        String(a?.status || '').toUpperCase() === 'REJECTED' ||
                        String(a?.status || '').toUpperCase() === 'SUBMITTED') && (
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          style={{
                            background: 'none',
                            border: '1px solid #111111',
                            color: '#666666',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Edit
                        </button>
                      )}

                      {(String(a?.status || '').toUpperCase() === 'DRAFT' ||
                        String(a?.status || '').toUpperCase() === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={() => submitAllocation(a.id)}
                          disabled={submitting}
                          style={{
                            background: '#16a34a',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            opacity: submitting ? 0.7 : 1,
                          }}
                        >
                          <Send size={14} /> Submit
                        </button>
                      )}

                      {(String(a?.status || '').toUpperCase() === 'DRAFT' ||
                        String(a?.status || '').toUpperCase() === 'SUBMITTED') && (
                        <button
                          type="button"
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
                    </div>
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
          color: '#666666',
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
  background: '#EFECE5',
  border: '1px solid #111111',
  borderRadius: 8,
  color: '#111111',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
const selectStyle = {
  padding: '8px 12px',
  background: '#F5F2EB',
  border: '1px solid #111111',
  borderRadius: 8,
  color: '#666666',
  fontSize: 13,
  cursor: 'pointer',
}
const tdStyle = { padding: '10px 14px', fontSize: 13, color: '#111111' }
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
