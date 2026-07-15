import prisma from '@/lib/prisma'
import { createWorkbook, addJsonSheet, workbookToBuffer } from '@/lib/excel/workbook'

function normalizeGender(value) {
  const g = String(value || '')
    .trim()
    .toLowerCase()
  if (g === 'male' || g === 'm') return 'Male'
  if (g === 'female' || g === 'f') return 'Female'
  return 'Unknown'
}

export async function buildEmisWorkbook(schoolId, year = new Date().getFullYear()) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      province: true,
      district: true,
      eczCentreNumber: true,
      reportingStreamKey: true,
      email: true,
      phone: true,
      address: true,
      level: true,
      ownershipType: true,
    },
  })

  if (!school) throw new Error('School not found')

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: {
      name: true,
      class: true,
      exam_number: true,
      classRef: { select: { year_group: true, name: true } },
      user: { select: { gender: true } },
    },
    orderBy: [{ classRef: { year_group: 'asc' } }, { name: 'asc' }],
  })

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: {
      department: true,
      ts_number: true,
      qualifications: true,
      user: { select: { name: true, email: true, gender: true, contact_number: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const profileRows = [
    { Field: 'School Name', Value: school.name },
    { Field: 'Province', Value: school.province || '' },
    { Field: 'District', Value: school.district || '' },
    { Field: 'ECZ Centre Number', Value: school.eczCentreNumber || '' },
    { Field: 'Reporting Stream', Value: school.reportingStreamKey || '' },
    { Field: 'Level', Value: school.level || '' },
    { Field: 'Ownership', Value: school.ownershipType || '' },
    { Field: 'Email', Value: school.email || '' },
    { Field: 'Phone', Value: school.phone || '' },
    { Field: 'Address', Value: school.address || '' },
    { Field: 'Report Year', Value: year },
    { Field: 'Generated At', Value: new Date().toISOString() },
  ]

  const enrolmentMap = new Map()
  for (const s of students) {
    const yearGroup = s.classRef?.year_group || s.class || 'Unassigned'
    const gender = normalizeGender(s.user?.gender)
    const key = `${yearGroup}::${gender}`
    enrolmentMap.set(key, (enrolmentMap.get(key) || 0) + 1)
  }

  const enrolmentRows = []
  for (const [key, count] of enrolmentMap.entries()) {
    const [yearGroup, gender] = key.split('::')
    enrolmentRows.push({ YearGroup: yearGroup, Gender: gender, Count: count })
  }
  enrolmentRows.sort((a, b) =>
    `${a.YearGroup}${a.Gender}`.localeCompare(`${b.YearGroup}${b.Gender}`)
  )

  const staffRows = teachers.map((t) => ({
    Name: t.user?.name || '',
    Email: t.user?.email || '',
    Gender: normalizeGender(t.user?.gender),
    Department: t.department || '',
    TSCNumber: t.ts_number || '',
    Qualifications: t.qualifications || '',
    Contact: t.user?.contact_number || '',
  }))

  const wb = createWorkbook()
  addJsonSheet(wb, 'School Profile', profileRows)
  addJsonSheet(wb, 'Enrolment', enrolmentRows)
  addJsonSheet(wb, 'Staff', staffRows)

  const buffer = await workbookToBuffer(wb)
  return { buffer, schoolName: school.name }
}
