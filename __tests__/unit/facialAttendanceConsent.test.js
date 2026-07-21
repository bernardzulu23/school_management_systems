import { describe, expect, it } from 'vitest'
import {
  sanitizeFaceEmbeddingPayload,
  isFacialAttendanceEnabled,
} from '@/lib/consent/facialAttendance'
import { buildStudentGuardianOptions } from '@/lib/consent/studentGuardians'

describe('facialAttendance consent helpers', () => {
  it('rejects raw image payloads', () => {
    expect(() => sanitizeFaceEmbeddingPayload('data:image/jpeg;base64,aaaa')).toThrow(/Raw images/)
  })

  it('accepts numeric embedding arrays', () => {
    const raw = sanitizeFaceEmbeddingPayload([0.1, 0.2, 0.3])
    expect(JSON.parse(raw)).toEqual([0.1, 0.2, 0.3])
  })

  it('school gate defaults off', () => {
    expect(isFacialAttendanceEnabled({})).toBe(false)
    expect(isFacialAttendanceEnabled({ facialAttendanceEnabled: true })).toBe(true)
  })
})

describe('buildStudentGuardianOptions', () => {
  it('returns empty when student has no parents linked or on profile', () => {
    expect(buildStudentGuardianOptions({ id: 's1' }, [])).toEqual([])
  })

  it('includes ParentStudentLink guardians with user contact', () => {
    const options = buildStudentGuardianOptions({ id: 's1' }, [
      {
        id: 'link-1',
        status: 'active',
        relationship: 'mother',
        parentUserId: 'u1',
        parentUser: {
          id: 'u1',
          name: 'Jane Sakala',
          email: 'jane@example.com',
          contact_number: '0977123456',
          parentProfile: { phone: '0977123456' },
        },
      },
    ])
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      id: 'link:link-1',
      source: 'link',
      parentUserId: 'u1',
      parentLinkId: 'link-1',
      name: 'Jane Sakala',
      relationship: 'Mother',
      contact: 'jane@example.com',
    })
  })

  it('includes student profile father/mother/guardian fields from DB', () => {
    const options = buildStudentGuardianOptions(
      {
        id: 's1',
        parent_father_name: 'John Sakala',
        parent_father_contact: '0966000001',
        parent_mother_name: 'Mary Sakala',
        parent_mother_email: 'mary@example.com',
        guardian_name: 'Uncle Bob',
        guardian_relationship: 'uncle',
        guardian_contact: '0955000002',
      },
      []
    )
    expect(options.map((o) => o.id)).toEqual([
      'profile:father',
      'profile:mother',
      'profile:guardian',
    ])
    expect(options[0]).toMatchObject({
      name: 'John Sakala',
      relationship: 'Father',
      contact: '0966000001',
      source: 'profile',
    })
    expect(options[1]).toMatchObject({
      name: 'Mary Sakala',
      relationship: 'Mother',
      contact: 'mary@example.com',
    })
    expect(options[2]).toMatchObject({
      name: 'Uncle Bob',
      relationship: 'Uncle',
      contact: '0955000002',
    })
  })

  it('skips revoked links and nameless profile slots', () => {
    const options = buildStudentGuardianOptions(
      {
        id: 's1',
        parent_father_name: '  ',
        parent_mother_contact: '0966',
      },
      [{ id: 'x', status: 'revoked', relationship: 'father', parentUser: { name: 'X' } }]
    )
    expect(options).toEqual([])
  })

  it('falls back to invite email for pending links without parent user', () => {
    const options = buildStudentGuardianOptions({ id: 's1' }, [
      {
        id: 'pending-1',
        status: 'pending',
        relationship: 'guardian',
        inviteEmail: 'invite@example.com',
        invitePhone: '0977',
        parentUser: null,
      },
    ])
    expect(options[0]).toMatchObject({
      id: 'link:pending-1',
      name: 'invite@example.com',
      contact: 'invite@example.com',
      relationship: 'Guardian',
    })
  })
})
