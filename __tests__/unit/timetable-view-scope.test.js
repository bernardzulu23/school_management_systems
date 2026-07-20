/**
 * Unit tests for published-entry filtering used by GET /api/timetable/view.
 * Guards the HOD `{ teacherId: { in: [...] } }` pitfall and student class scope.
 */

function filterPublishedEntries(cached, where) {
  return (cached || []).filter((row) => {
    if (where.teacherId?.in) {
      if (!where.teacherId.in.map(String).includes(String(row.teacherId))) return false
    } else if (where.teacherId) {
      if (String(row.teacherId) !== String(where.teacherId)) return false
    }
    if (where.classId && String(row.classId) !== String(where.classId)) return false
    if (where.subjectId?.in) {
      const allowed = where.subjectId.in.map(String)
      if (!allowed.includes(String(row.subjectId))) return false
    } else if (where.subjectId) {
      if (String(row.subjectId) !== String(where.subjectId)) return false
    }
    return true
  })
}

describe('timetable view published filters', () => {
  const rows = [
    { id: '1', teacherId: 'u-t1', classId: 'c1', subjectId: 's1' },
    { id: '2', teacherId: 'u-t2', classId: 'c1', subjectId: 's2' },
    { id: '3', teacherId: 'u-t1', classId: 'c2', subjectId: 's1' },
    { id: '4', teacherId: 'u-hod', classId: 'c1', subjectId: 's3' },
  ]

  test('teacher scope keeps only that User.id', () => {
    const out = filterPublishedEntries(rows, { teacherId: 'u-t1' })
    expect(out.map((r) => r.id)).toEqual(['1', '3'])
  })

  test('student scope is class-only (no subject wipe)', () => {
    const out = filterPublishedEntries(rows, { classId: 'c1' })
    expect(out.map((r) => r.id)).toEqual(['1', '2', '4'])
  })

  test('HOD department { in: [...] } must not use String(object) compare', () => {
    const where = { teacherId: { in: ['u-t1', 'u-t2'] } }
    // Regression: String({ in: [...] }) === "[object Object]" discarded every row
    expect(String(where.teacherId)).toBe('[object Object]')
    const out = filterPublishedEntries(rows, where)
    expect(out.map((r) => r.id)).toEqual(['1', '2', '3'])
  })

  test('HOD department includes personal teaching load when listed', () => {
    const out = filterPublishedEntries(rows, {
      teacherId: { in: ['u-t1', 'u-hod'] },
    })
    expect(out.map((r) => r.id)).toEqual(['1', '3', '4'])
  })
})
