import { describe, it, expect } from 'vitest'
import {
  buildRecipePlacementRules,
  buildTeacherDbConstraintRules,
  getLessonPlacementRule,
  isSlotForbidden,
  placementPreferenceScore,
} from '@/lib/timetable/constraintRules'

describe('constraintRules', () => {
  it('merges recipe forbidden days and periods', () => {
    const map = buildRecipePlacementRules([
      {
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        blocks: [{ forbiddenDays: ['Friday'], forbiddenPeriods: [1] }],
      },
    ])
    const rule = map.get('t1|c1|s1')
    expect(isSlotForbidden(rule, 'friday', 2)).toBe(true)
    expect(isSlotForbidden(rule, 'monday', 1)).toBe(true)
    expect(isSlotForbidden(rule, 'monday', 2)).toBe(false)
  })

  it('applies teacher HARD constraints from DB rows', () => {
    const map = buildTeacherDbConstraintRules([
      {
        type: 'HARD',
        scope: 'TEACHER',
        targetId: 't9',
        active: true,
        config: { forbiddenDays: ['wednesday'] },
      },
    ])
    expect(isSlotForbidden(map.get('t9'), 'wednesday', 3)).toBe(true)
  })

  it('combines recipe and teacher rules for a lesson', () => {
    const recipeRules = buildRecipePlacementRules([
      {
        teacherId: 't1',
        classId: 'c1',
        subjectId: 's1',
        blocks: [{ preferredDays: ['monday'] }],
      },
    ])
    const teacherRules = buildTeacherDbConstraintRules([
      {
        type: 'HARD',
        scope: 'TEACHER',
        targetId: 't1',
        active: true,
        config: { forbiddenPeriods: [8] },
      },
    ])
    const rule = getLessonPlacementRule(recipeRules, teacherRules, {
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
    })
    expect(placementPreferenceScore(rule, 'monday', 1)).toBeLessThan(
      placementPreferenceScore(rule, 'tuesday', 1)
    )
    expect(isSlotForbidden(rule, 'monday', 8)).toBe(true)
  })
})
