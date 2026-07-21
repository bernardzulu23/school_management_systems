/**
 * Resolve parent/guardian contacts for facial-consent recording from DB only:
 * ParentStudentLink (+ parent User) and Student profile father/mother/guardian fields.
 */
import prisma from '@/lib/prisma'

const PROFILE_KEYS = ['father', 'mother', 'guardian']

function capitalizeRelationship(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function pickContact(...parts) {
  for (const p of parts) {
    const v = String(p || '').trim()
    if (v) return v
  }
  return ''
}

/**
 * Build selectable guardian options from a student row + ParentStudentLink rows.
 * Pure — safe for unit tests.
 *
 * @returns {Array<{ id: string, source: 'link'|'profile', parentUserId: string|null, parentLinkId: string|null, name: string, relationship: string, contact: string }>}
 */
export function buildStudentGuardianOptions(student, links = []) {
  const options = []
  const seen = new Set()

  for (const link of links || []) {
    if (!link || (link.status && !['active', 'pending'].includes(link.status))) continue
    const parentUser = link.parentUser || null
    const profile = parentUser?.parentProfile || null
    const name = pickContact(
      parentUser?.name,
      link.inviteEmail,
      link.invitePhone,
      'Linked parent/guardian'
    )
    const relationship = capitalizeRelationship(link.relationship || 'guardian')
    const contact = pickContact(
      parentUser?.email,
      profile?.phone,
      parentUser?.contact_number,
      link.inviteEmail,
      link.invitePhone
    )
    const id = `link:${link.id}`
    if (seen.has(id)) continue
    seen.add(id)
    options.push({
      id,
      source: 'link',
      parentUserId: parentUser?.id || link.parentUserId || null,
      parentLinkId: link.id,
      name,
      relationship,
      contact,
      status: link.status || null,
    })
  }

  if (!student) return options

  const profileCandidates = [
    {
      key: 'father',
      name: student.parent_father_name,
      relationship: 'Father',
      contact: pickContact(student.parent_father_contact, student.parent_father_email),
    },
    {
      key: 'mother',
      name: student.parent_mother_name,
      relationship: 'Mother',
      contact: pickContact(student.parent_mother_contact, student.parent_mother_email),
    },
    {
      key: 'guardian',
      name: student.guardian_name,
      relationship: capitalizeRelationship(student.guardian_relationship) || 'Guardian',
      contact: pickContact(student.guardian_contact, student.guardian_email),
    },
  ]

  for (const c of profileCandidates) {
    const name = String(c.name || '').trim()
    if (!name) continue
    const id = `profile:${c.key}`
    if (seen.has(id)) continue
    seen.add(id)
    options.push({
      id,
      source: 'profile',
      parentUserId: null,
      parentLinkId: null,
      name,
      relationship: c.relationship,
      contact: c.contact,
      status: null,
    })
  }

  return options
}

const STUDENT_GUARDIAN_SELECT = {
  id: true,
  parent_father_name: true,
  parent_father_contact: true,
  parent_father_email: true,
  parent_mother_name: true,
  parent_mother_contact: true,
  parent_mother_email: true,
  guardian_name: true,
  guardian_contact: true,
  guardian_email: true,
  guardian_relationship: true,
}

/**
 * Load guardians for many students (batch) keyed by studentId.
 */
export async function loadGuardiansByStudentIds(schoolId, studentIds, db = prisma) {
  const ids = [...new Set((studentIds || []).filter(Boolean))]
  const map = new Map(ids.map((id) => [id, []]))
  if (!schoolId || ids.length === 0) return map

  const [students, links] = await Promise.all([
    db.student.findMany({
      where: { schoolId, id: { in: ids } },
      select: STUDENT_GUARDIAN_SELECT,
    }),
    db.parentStudentLink.findMany({
      where: {
        schoolId,
        studentId: { in: ids },
        status: { in: ['active', 'pending'] },
      },
      include: {
        parentUser: {
          select: {
            id: true,
            name: true,
            email: true,
            contact_number: true,
            parentProfile: { select: { phone: true } },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    }),
  ])

  const studentById = new Map(students.map((s) => [s.id, s]))
  const linksByStudent = new Map()
  for (const link of links) {
    if (!linksByStudent.has(link.studentId)) linksByStudent.set(link.studentId, [])
    linksByStudent.get(link.studentId).push(link)
  }

  for (const id of ids) {
    map.set(id, buildStudentGuardianOptions(studentById.get(id), linksByStudent.get(id) || []))
  }
  return map
}

/**
 * Resolve one guardian option by id for a pupil (server-side authority for consent grant/deny).
 */
export async function resolveStudentGuardian(schoolId, pupilId, guardianId, db = prisma) {
  const id = String(guardianId || '').trim()
  if (!id) {
    const err = new Error('Select a parent/guardian linked to this student')
    err.status = 400
    throw err
  }

  const student = await db.student.findFirst({
    where: { id: pupilId, schoolId },
    select: STUDENT_GUARDIAN_SELECT,
  })
  if (!student) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  const links = await db.parentStudentLink.findMany({
    where: {
      schoolId,
      studentId: pupilId,
      status: { in: ['active', 'pending'] },
    },
    include: {
      parentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          contact_number: true,
          parentProfile: { select: { phone: true } },
        },
      },
    },
  })

  const options = buildStudentGuardianOptions(student, links)
  const match = options.find((o) => o.id === id)
  if (!match) {
    const err = new Error(
      'Selected parent/guardian is not linked to this student. Link one in student records first.'
    )
    err.status = 400
    throw err
  }
  if (!match.name) {
    const err = new Error('Linked parent/guardian is missing a name in the database')
    err.status = 400
    throw err
  }
  return match
}

export { PROFILE_KEYS, capitalizeRelationship }
