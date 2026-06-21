import { describe, expect, it } from 'vitest'
import { generateTeacherColors, mergeTeacherColorMaps } from '../colorScheme'
import { assignmentGridKey, buildClassAssignmentGrid, dayToShortLabel } from '../classViewGrid'
import type { Assignment } from '../types'

describe('colorScheme', () => {
  it('assigns stable colours per teacher id', () => {
    const map = generateTeacherColors(['t2', 't1', 't2'])
    expect(map.get('t1')).toBeTruthy()
    expect(map.get('t2')).toBeTruthy()
    expect(map.size).toBe(2)
  })

  it('prefers stored hex over generated', () => {
    const map = mergeTeacherColorMaps(['t1'], { t1: { colorHex: '#112233' } })
    expect(map.get('t1')).toBe('#112233')
  })
})

describe('classViewGrid', () => {
  const sample: Assignment = {
    id: 'a1',
    season: 'normal',
    dayOfWeek: 'Thursday',
    startTime: '08:00',
    endTime: '08:40',
    period: 1,
    teacherId: 't1',
    classId: 'c1',
    subjectId: 's1',
    subjectName: 'Physical Education',
    teacherName: 'Mr PE',
  } as Assignment

  it('maps day names to short labels', () => {
    expect(dayToShortLabel('monday')).toBe('MON')
    expect(dayToShortLabel('THU')).toBe('THU')
  })

  it('builds period|day grid keys', () => {
    expect(assignmentGridKey(sample)).toBe('1|THU')
  })

  it('filters assignments for one class', () => {
    const other = { ...sample, id: 'a2', classId: 'c2' }
    const grid = buildClassAssignmentGrid('c1', [sample, other])
    expect(grid.get('1|THU')?.id).toBe('a1')
    expect(grid.size).toBe(1)
  })
})
