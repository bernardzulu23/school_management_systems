/**
 * Phase 3 P3.5 — Parent USSD menu (Africa's Talking format).
 * CON = continue, END = end session.
 */
import prisma from '@/lib/prisma'
import { normalizePhoneNumbers } from '@/lib/sms'

/**
 * @param {string} phoneNumber
 * @param {string} text - cumulative USSD input (e.g. "1*20241023")
 */
export async function handleParentUssd(phoneNumber, text) {
  const phone = normalizePhoneNumbers([phoneNumber])[0] || String(phoneNumber || '').trim()
  const parts = String(text || '')
    .split('*')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!parts.length) {
    return formatCon(
      'Welcome to ZSMS\n1. Check child attendance\n2. Latest result\n3. School contact'
    )
  }

  const choice = parts[0]

  if (choice === '1') {
    if (parts.length === 1) {
      return formatCon('Enter student exam number or ID:')
    }
    const lookup = parts[1]
    return await attendanceForStudent(phone, lookup)
  }

  if (choice === '2') {
    if (parts.length === 1) {
      return formatCon('Enter student exam number or ID:')
    }
    return await latestResultForStudent(phone, parts[1])
  }

  if (choice === '3') {
    const school = await findSchoolByParentPhone(phone)
    const contact = school?.phone || school?.email || 'your school office'
    return formatEnd(`Contact: ${contact}`)
  }

  return formatEnd('Invalid option. Dial again.')
}

function formatCon(message) {
  return `CON ${message}`
}

function formatEnd(message) {
  return `END ${message}`
}

async function findSchoolByParentPhone(phone) {
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { parent_father_contact: { contains: phone.slice(-9) } },
        { parent_mother_contact: { contains: phone.slice(-9) } },
        { guardian_contact: { contains: phone.slice(-9) } },
      ],
    },
    select: { school: { select: { name: true, phone: true, email: true } } },
  })
  return student?.school
}

/**
 * @param {string} parentPhone
 * @param {string} lookup
 */
async function attendanceForStudent(parentPhone, lookup) {
  const student = await findStudentForParent(parentPhone, lookup)
  if (!student) {
    return formatEnd('Student not found or phone not registered as guardian.')
  }

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const today = await prisma.attendance.findFirst({
    where: { studentId: student.id, schoolId: student.schoolId, date: start },
    select: { status: true },
  })

  const termStart = new Date()
  termStart.setUTCMonth(termStart.getUTCMonth() - 3)

  const termRows = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      schoolId: student.schoolId,
      date: { gte: termStart },
    },
    select: { status: true },
  })

  let present = 0
  let absent = 0
  for (const r of termRows) {
    const s = String(r.status || '').toLowerCase()
    if (s === 'present' || s === 'late') present++
    else if (s === 'absent') absent++
  }

  const todayStatus = today ? String(today.status).toUpperCase() : 'NOT MARKED'
  return formatEnd(
    `${student.name} | ${student.class}\nToday: ${todayStatus}\nTerm: ${present} present, ${absent} absent`
  )
}

async function latestResultForStudent(parentPhone, lookup) {
  const student = await findStudentForParent(parentPhone, lookup)
  if (!student) {
    return formatEnd('Student not found or phone not registered as guardian.')
  }

  const result = await prisma.result.findFirst({
    where: { studentId: student.id, schoolId: student.schoolId },
    orderBy: { createdAt: 'desc' },
    select: { subject: true, grade: true, percentage: true, term: true, year: true },
  })

  if (!result) {
    return formatEnd(`${student.name}: no results posted yet.`)
  }

  return formatEnd(
    `${student.name}\n${result.subject}: ${result.grade || '—'} (${result.percentage ?? '—'}%) T${result.term}`
  )
}

async function findStudentForParent(parentPhone, lookup) {
  const key = String(lookup || '').trim()
  if (!key) return null

  const phoneTail = parentPhone.replace(/\D/g, '').slice(-9)

  const student = await prisma.student.findFirst({
    where: {
      OR: [{ exam_number: key }, { id: key }, { name: { contains: key, mode: 'insensitive' } }],
      AND: {
        OR: [
          { parent_father_contact: { contains: phoneTail } },
          { parent_mother_contact: { contains: phoneTail } },
          { guardian_contact: { contains: phoneTail } },
        ],
      },
    },
    select: { id: true, schoolId: true, name: true, class: true },
  })

  return student
}
