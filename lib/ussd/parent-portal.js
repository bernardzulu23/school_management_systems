/**
 * Phase 3 P3.5 — Parent USSD menu (Africa's Talking format).
 * CON = continue, END = end session.
 *
 * Tenant isolation: never query Student/Result/Attendance without schoolId.
 * Candidate schools are derived from guardian phone match, then all reads are
 * scoped with schoolId IN (...) or a single schoolId.
 */
import prisma from '@/lib/prisma'
import { normalizePhoneNumbers } from '@/lib/sms'
import { withSchoolContext } from '@/lib/db/school-context'

/**
 * Optional: map AT serviceCode → schoolId (JSON env).
 * Example: USSD_SERVICE_CODE_SCHOOL_MAP={"*384*123#":"uuid-here"}
 * @param {string} [serviceCode]
 * @returns {string | null}
 */
export function resolveSchoolIdFromServiceCode(serviceCode) {
  const code = String(serviceCode || '').trim()
  if (!code) return null
  try {
    const raw = process.env.USSD_SERVICE_CODE_SCHOOL_MAP || '{}'
    const map = JSON.parse(raw)
    const sid = map[code]
    return sid ? String(sid) : null
  } catch {
    return null
  }
}

/**
 * @param {string} phoneNumber
 * @param {string} text - cumulative USSD input (e.g. "1*20241023")
 * @param {{ serviceCode?: string }} [opts]
 */
export async function handleParentUssd(phoneNumber, text, opts = {}) {
  const phone = normalizePhoneNumbers([phoneNumber])[0] || String(phoneNumber || '').trim()
  const parts = String(text || '')
    .split('*')
    .map((p) => p.trim())
    .filter(Boolean)

  const pinnedSchoolId = resolveSchoolIdFromServiceCode(opts.serviceCode)

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
    return await attendanceForStudent(phone, lookup, pinnedSchoolId)
  }

  if (choice === '2') {
    if (parts.length === 1) {
      return formatCon('Enter student exam number or ID:')
    }
    return await latestResultForStudent(phone, parts[1], pinnedSchoolId)
  }

  if (choice === '3') {
    const school = await findSchoolByParentPhone(phone, pinnedSchoolId)
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

/**
 * Distinct schoolIds where a guardian phone tail matches (bounded).
 * Uses SECURITY DEFINER helper when RLS is active (see migration 20260804120000).
 * @param {string} phoneTail
 * @param {string | null} pinnedSchoolId
 */
async function candidateSchoolIdsForPhone(phoneTail, pinnedSchoolId) {
  if (pinnedSchoolId) return [pinnedSchoolId]

  try {
    const rows = await prisma.$queryRaw`
      SELECT school_id AS "schoolId" FROM ussd_candidate_school_ids(${phoneTail})
    `
    const ids = (rows || []).map((r) => r.schoolId || r.school_id).filter(Boolean)
    if (ids.length) return [...new Set(ids)]
  } catch (err) {
    console.warn(
      '[ussd] ussd_candidate_school_ids unavailable — pin school via USSD_SERVICE_CODE_SCHOOL_MAP',
      err?.message || err
    )
  }

  // Never fall back to unscoped Student.findMany (cross-tenant phone probe).
  return []
}

async function findSchoolByParentPhone(phone, pinnedSchoolId) {
  const phoneTail = String(phone || '')
    .replace(/\D/g, '')
    .slice(-9)
  if (!phoneTail) return null

  const schoolIds = await candidateSchoolIdsForPhone(phoneTail, pinnedSchoolId)
  if (!schoolIds.length) return null
  if (schoolIds.length > 1 && !pinnedSchoolId) {
    // Ambiguous across tenants — do not pick arbitrarily
    return null
  }

  const schoolId = schoolIds[0]
  return withSchoolContext(schoolId, async (tx) => {
    const student = await tx.student.findFirst({
      where: {
        schoolId,
        OR: [
          { parent_father_contact: { contains: phoneTail } },
          { parent_mother_contact: { contains: phoneTail } },
          { guardian_contact: { contains: phoneTail } },
        ],
      },
      select: { school: { select: { name: true, phone: true, email: true } } },
    })
    return student?.school ?? null
  })
}

/**
 * @param {string} parentPhone
 * @param {string} lookup
 * @param {string | null} pinnedSchoolId
 */
async function attendanceForStudent(parentPhone, lookup, pinnedSchoolId) {
  const student = await findStudentForParent(parentPhone, lookup, pinnedSchoolId)
  if (!student) {
    return formatEnd('Student not found or phone not registered as guardian.')
  }

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const termStart = new Date()
  termStart.setUTCMonth(termStart.getUTCMonth() - 3)

  return withSchoolContext(student.schoolId, async (tx) => {
    const today = await tx.attendance.findFirst({
      where: { studentId: student.id, schoolId: student.schoolId, date: start },
      select: { status: true },
    })

    const termRows = await tx.attendance.findMany({
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
  })
}

async function latestResultForStudent(parentPhone, lookup, pinnedSchoolId) {
  const student = await findStudentForParent(parentPhone, lookup, pinnedSchoolId)
  if (!student) {
    return formatEnd('Student not found or phone not registered as guardian.')
  }

  return withSchoolContext(student.schoolId, async (tx) => {
    const result = await tx.result.findFirst({
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
  })
}

async function findStudentForParent(parentPhone, lookup, pinnedSchoolId) {
  const key = String(lookup || '').trim()
  if (!key) return null

  const phoneTail = parentPhone.replace(/\D/g, '').slice(-9)
  if (!phoneTail) return null

  const schoolIds = await candidateSchoolIdsForPhone(phoneTail, pinnedSchoolId)
  if (!schoolIds.length) return null

  // Always include schoolId; resolve inside RLS context when a single tenant, else IN list
  // before FORCE RLS migration — with FORCE, prefer pinned school via service-code map.
  if (schoolIds.length === 1) {
    return withSchoolContext(schoolIds[0], async (tx) =>
      tx.student.findFirst({
        where: {
          schoolId: schoolIds[0],
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
    )
  }

  // Multi-tenant phone match without service-code pin: try each school under its GUC.
  for (const schoolId of schoolIds) {
    const student = await withSchoolContext(schoolId, async (tx) =>
      tx.student.findFirst({
        where: {
          schoolId,
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
    )
    if (student) return student
  }
  return null
}
