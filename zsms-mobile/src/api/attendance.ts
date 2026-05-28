import { api } from './client'
import type { AttendanceBatch, AttendanceRecord, AttendanceStatus, RosterStudent } from '@/types'

export async function loadRoster(classId: string, subjectId?: string): Promise<RosterStudent[]> {
  const params = new URLSearchParams({ classId })
  if (subjectId) params.set('subjectId', subjectId)
  return api<RosterStudent[]>(`/api/mobile/class-roster?${params}`)
}

export async function loadExistingAttendance(
  classId: string,
  date: string,
  subjectId?: string
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams({ classId, date })
  if (subjectId) params.set('subjectId', subjectId)
  const data = await api<{
    success?: boolean
    data?: Array<{ studentId: string; status: string; remarks?: string | null }>
    records?: AttendanceRecord[]
    attendance?: AttendanceRecord[]
  }>(`/api/attendance?${params}`)

  const rows = data.data || data.records || data.attendance || []
  return rows.map((r) => ({
    studentId: r.studentId,
    status: String(r.status).toLowerCase() as AttendanceStatus,
    remarks: r.remarks ?? null,
  }))
}

export async function saveAttendance(batch: AttendanceBatch): Promise<unknown> {
  return api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(batch),
  })
}

export function filterStudents(students: RosterStudent[], query: string): RosterStudent[] {
  const q = query.trim().toLowerCase()
  if (!q) return students
  return students.filter((s) => s.name.toLowerCase().includes(q))
}

export function getAttendanceStats(records: AttendanceRecord[]): Record<AttendanceStatus, number> {
  const stats: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }
  for (const r of records) {
    if (stats[r.status] != null) stats[r.status] += 1
  }
  return stats
}

/** Manual daily register: unmarked pupils default to absent until teacher sets status. */
export function buildDefaultRecords(
  students: RosterStudent[],
  existing: AttendanceRecord[]
): AttendanceRecord[] {
  const byId = new Map(existing.map((r) => [r.studentId, r]))
  return students.map((s) => {
    const ex = byId.get(s.id)
    return ex || { studentId: s.id, status: 'absent' as AttendanceStatus }
  })
}

export function markAllPresent(records: AttendanceRecord[]): AttendanceRecord[] {
  return records.map((r) => ({ ...r, status: 'present' as AttendanceStatus }))
}

export function setStudentStatus(
  records: AttendanceRecord[],
  studentId: string,
  status: AttendanceStatus
): AttendanceRecord[] {
  return records.map((r) => (r.studentId === studentId ? { ...r, status } : r))
}
