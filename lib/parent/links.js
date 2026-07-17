import crypto from 'crypto'
import prisma from '@/lib/prisma'

export const PARENT_RELATIONSHIPS = ['father', 'mother', 'guardian', 'other']

export function normalizeParentEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function isParentRole(role) {
  const key = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return key === 'parent' || key === 'guardian'
}

export function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Active student IDs linked to this parent user in a school.
 */
export async function listActiveLinkedStudentIds(parentUserId, schoolId) {
  const links = await prisma.parentStudentLink.findMany({
    where: {
      parentUserId,
      schoolId,
      status: 'active',
    },
    select: { studentId: true },
  })
  return links.map((l) => l.studentId)
}

/**
 * Ensure the parent may access this student (BOLA).
 */
export async function assertParentCanAccessStudent(parentUserId, schoolId, studentId) {
  if (!parentUserId || !schoolId || !studentId) return null
  return prisma.parentStudentLink.findFirst({
    where: {
      parentUserId,
      schoolId,
      studentId,
      status: 'active',
    },
  })
}

export async function listParentChildren(parentUserId, schoolId) {
  const links = await prisma.parentStudentLink.findMany({
    where: {
      parentUserId,
      schoolId,
      status: 'active',
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          class: true,
          exam_number: true,
          classRef: { select: { year_group: true, section: true } },
        },
      },
    },
    orderBy: { verifiedAt: 'desc' },
  })

  return links.map((link) => ({
    linkId: link.id,
    relationship: link.relationship,
    student: {
      id: link.student.id,
      name: link.student.name,
      class: link.student.class,
      examNumber: link.student.exam_number,
      yearGroup: link.student.classRef?.year_group,
      section: link.student.classRef?.section,
    },
  }))
}

/**
 * Create a pending invite link for a student (admin).
 */
export async function createParentInvite({
  schoolId,
  studentId,
  relationship,
  inviteEmail,
  invitePhone,
  invitedByUserId,
}) {
  const rel = String(relationship || 'guardian')
    .trim()
    .toLowerCase()
  if (!PARENT_RELATIONSHIPS.includes(rel)) {
    throw new Error('Invalid relationship')
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  })
  if (!student) throw new Error('Student not found')

  const email = normalizeParentEmail(inviteEmail)
  if (!email) throw new Error('Invite email is required')

  const existingActive = await prisma.parentStudentLink.findFirst({
    where: {
      studentId,
      schoolId,
      status: 'active',
      inviteEmail: email,
    },
  })
  if (existingActive) throw new Error('This email is already linked to this student')

  const pendingSame = await prisma.parentStudentLink.findFirst({
    where: {
      studentId,
      schoolId,
      status: 'pending',
      inviteEmail: email,
    },
  })
  if (pendingSame) {
    const token = generateInviteToken()
    return prisma.parentStudentLink.update({
      where: { id: pendingSame.id },
      data: {
        relationship: rel,
        invitePhone: invitePhone || pendingSame.invitePhone,
        inviteToken: token,
        invitedByUserId: invitedByUserId || null,
        invitedAt: new Date(),
        revokedAt: null,
      },
    })
  }

  return prisma.parentStudentLink.create({
    data: {
      studentId,
      schoolId,
      relationship: rel,
      status: 'pending',
      inviteToken: generateInviteToken(),
      inviteEmail: email,
      invitePhone: invitePhone || null,
      invitedByUserId: invitedByUserId || null,
    },
  })
}

export async function revokeParentLink(schoolId, linkId) {
  return prisma.parentStudentLink.updateMany({
    where: { id: linkId, schoolId, status: { in: ['pending', 'active'] } },
    data: { status: 'revoked', revokedAt: new Date(), inviteToken: null },
  })
}

export async function findInviteByToken(token) {
  const inviteToken = String(token || '').trim()
  if (!inviteToken) return null
  return prisma.parentStudentLink.findFirst({
    where: { inviteToken, status: 'pending' },
    include: {
      student: { select: { id: true, name: true, class: true, schoolId: true } },
      school: { select: { id: true, name: true, subdomain: true } },
    },
  })
}
