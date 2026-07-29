import { describe, expect, it } from 'vitest'
import { buildSchoolAccessClaims, resolveAccessTokenRole } from '@/lib/auth/accessTokenClaims'
import { roleCheck } from '@/lib/middleware/auth'

describe('teacher with HOD duties', () => {
  const user = {
    id: 'teacher-1',
    email: 'teacher@example.com',
    role: 'teacher',
    schoolId: 'school-1',
    hodProfile: { id: 'hod-1' },
  }

  it('preserves the teacher role and adds the HOD claim', () => {
    expect(resolveAccessTokenRole(user)).toBe('teacher')
    expect(buildSchoolAccessClaims(user)).toMatchObject({
      role: 'teacher',
      isHod: true,
    })
  })

  it('authorizes both teacher and HOD capabilities', () => {
    const claims = buildSchoolAccessClaims(user)

    expect(roleCheck(claims, ['TEACHER'])).toBe(true)
    expect(roleCheck(claims, ['HOD'])).toBe(true)
  })
})
