import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { normalizeZmPhoneNumber } from '@/lib/sms/normalizePhone'

const prisma = new PrismaClient()

async function main() {
  const school = await prisma.school.findFirst({
    where: { subdomain: { equals: 'ndakedaysecondaryschool', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!school) throw new Error('Ndake Day Secondary not found')

  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    select: {
      id: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
      emergency_contact_phone: true,
    },
  })

  let updated = 0
  for (const s of students) {
    const data: Record<string, string> = {}
    for (const k of [
      'parent_father_contact',
      'parent_mother_contact',
      'guardian_contact',
      'emergency_contact_phone',
    ] as const) {
      const cur = s[k]
      if (!cur) continue
      const norm = normalizeZmPhoneNumber(cur)
      if (norm && norm !== cur) data[k] = norm
    }
    if (Object.keys(data).length) {
      await prisma.student.update({ where: { id: s.id }, data })
      updated += 1
    }
  }

  const test = await prisma.student.findUnique({
    where: { id: 'test-student-sms-001' },
    select: { id: true, name: true, parent_father_contact: true, schoolId: true },
  })
  const resultCount = await prisma.result.count({
    where: { studentId: 'test-student-sms-001', schoolId: school.id },
  })

  console.log(
    JSON.stringify(
      {
        school,
        updatedContacts: updated,
        scanned: students.length,
        testStudent: test,
        resultCount,
      },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
