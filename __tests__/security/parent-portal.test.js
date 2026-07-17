/**
 * Parent portal helpers — role and relationship policy.
 */
import { describe, it, expect } from 'vitest'
import {
  matchDashboardRoleGate,
  roleMatchesDashboardGroups,
} from '@/lib/security/dashboardRouteAuth'
import { PARENT_RELATIONSHIPS, isParentRole, normalizeParentEmail } from '@/lib/parent/links'

describe('parent portal auth gates', () => {
  it('gates /dashboard/parent to PARENT only', () => {
    const gate = matchDashboardRoleGate('/dashboard/parent/results')
    expect(gate?.prefix).toBe('/dashboard/parent')
    expect(gate?.groups).toEqual(['PARENT'])
    expect(roleMatchesDashboardGroups('parent', gate.groups)).toBe(true)
    expect(roleMatchesDashboardGroups('student', gate.groups)).toBe(false)
    expect(roleMatchesDashboardGroups('teacher', gate.groups)).toBe(false)
  })

  it('recognizes parent role aliases', () => {
    expect(isParentRole('parent')).toBe(true)
    expect(isParentRole('guardian')).toBe(true)
    expect(isParentRole('student')).toBe(false)
  })

  it('normalizes invite emails', () => {
    expect(normalizeParentEmail('  Parent@School.COM ')).toBe('parent@school.com')
  })

  it('allows expected relationships', () => {
    expect(PARENT_RELATIONSHIPS).toContain('father')
    expect(PARENT_RELATIONSHIPS).toContain('mother')
    expect(PARENT_RELATIONSHIPS).toContain('guardian')
  })
})
