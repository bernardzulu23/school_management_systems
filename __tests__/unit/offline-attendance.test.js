/**
 * Offline attendance store — business logic and sync grouping.
 * Dexie/IndexedDB is mocked (not available in Node).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { groupMarksForSync } from '@/lib/offline/attendance-store'

const queueRows = []
let nextId = 1

vi.mock('dexie', () => {
  class MockTable {
    constructor(name) {
      this.name = name
    }
    async add(row) {
      const id = nextId++
      const record = { ...row, id }
      if (this.name === 'attendanceQueue') queueRows.push(record)
      return id
    }
    async put(row) {
      if (this.name === 'classRosters') {
        const idx = queueRows.findIndex((r) => r.classId === row.classId)
        if (idx >= 0) queueRows[idx] = row
        else queueRows.push(row)
      }
      return row.classId
    }
    async get(classId) {
      return queueRows.find((r) => r.classId === classId) || null
    }
    filter(fn) {
      const table = this
      return {
        async toArray() {
          return queueRows.filter((r) => {
            if (table.name === 'attendanceQueue') return fn(r)
            return fn(r)
          })
        },
        async count() {
          return queueRows.filter(fn).length
        },
      }
    }
    async delete(id) {
      const i = queueRows.findIndex((r) => r.id === id)
      if (i >= 0) queueRows.splice(i, 1)
    }
    async update(id, patch) {
      const row = queueRows.find((r) => r.id === id)
      if (row) Object.assign(row, patch)
    }
  }

  return {
    default: class MockDexie {
      constructor() {
        this.attendanceQueue = new MockTable('attendanceQueue')
        this.classRosters = new MockTable('classRosters')
        this.syncLog = new MockTable('syncLog')
      }
      version() {
        return this
      }
      stores() {
        return this
      }
    },
  }
})

describe('groupMarksForSync', () => {
  it('groups marks by classId and date', () => {
    const groups = groupMarksForSync([
      { studentId: 's1', classId: 'c1', date: '2026-05-27', status: 'present' },
      { studentId: 's2', classId: 'c1', date: '2026-05-27', status: 'absent' },
      { studentId: 's3', classId: 'c2', date: '2026-05-27', status: 'present' },
    ])
    expect(groups.size).toBe(2)
    const c1 = [...groups.values()].find((g) => g.classId === 'c1')
    expect(c1.marks).toHaveLength(2)
  })

  it('skips marks without classId or date', () => {
    const groups = groupMarksForSync([
      { studentId: 's1', classId: '', date: '2026-05-27' },
      { studentId: 's2', classId: 'c1', date: '' },
    ])
    expect(groups.size).toBe(0)
  })
})

describe('attendanceStore (browser mock)', () => {
  beforeEach(() => {
    queueRows.length = 0
    nextId = 1
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queueMark replaces duplicate pending row for same student', async () => {
    const { attendanceStore } = await import('@/lib/offline/attendance-store')

    await attendanceStore.queueMark({
      studentId: 'stu-1',
      classId: 'class-a',
      date: '2026-05-27',
      status: 'present',
    })
    await attendanceStore.queueMark({
      studentId: 'stu-1',
      classId: 'class-a',
      date: '2026-05-27',
      status: 'absent',
    })

    const pending = await attendanceStore.getPendingMarks()
    expect(pending).toHaveLength(1)
    expect(pending[0].status).toBe('absent')
  })

  it('getPendingCount returns unsynced rows', async () => {
    const { attendanceStore } = await import('@/lib/offline/attendance-store')

    await attendanceStore.queueMark({
      studentId: 's1',
      classId: 'c1',
      date: '2026-05-27',
      status: 'late',
    })
    const count = await attendanceStore.getPendingCount()
    expect(count).toBe(1)
  })

  it('cacheRoster and getCachedRoster round-trip', async () => {
    const { attendanceStore } = await import('@/lib/offline/attendance-store')

    const students = [{ id: '1', name: 'Chanda' }]
    await attendanceStore.cacheRoster('class-x', 'school-1', students)
    const cached = await attendanceStore.getCachedRoster('class-x')
    expect(cached.students).toEqual(students)
  })

  it('syncPending returns zero when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { attendanceStore } = await import('@/lib/offline/attendance-store')

    await attendanceStore.queueMark({
      studentId: 's1',
      classId: 'c1',
      date: '2026-05-27',
      status: 'present',
    })

    const result = await attendanceStore.syncPending()
    expect(result).toEqual({ synced: 0, failed: 0 })
  })

  it('syncPending posts grouped records and marks synced on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    const { attendanceStore } = await import('@/lib/offline/attendance-store')

    await attendanceStore.queueMark({
      studentId: 's1',
      classId: 'c1',
      date: '2026-05-27',
      status: 'present',
    })
    await attendanceStore.queueMark({
      studentId: 's2',
      classId: 'c1',
      date: '2026-05-27',
      status: 'absent',
    })

    const result = await attendanceStore.syncPending()
    expect(result.synced).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.date).toBe('2026-05-27')
    expect(body.records).toHaveLength(2)
    expect(body.source).toBe('offline-sync')

    const pending = await attendanceStore.getPendingCount()
    expect(pending).toBe(0)
  })
})
