/**
 * Seed a term-complete results SMS test student and send to a parent phone.
 * Uses plain PrismaClient (no Neon adapter) for reliable CLI runs.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/seed-and-send-results-sms.ts
 *   npx tsx --tsconfig tsconfig.json scripts/seed-and-send-results-sms.ts --phone=0977934996
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { normalizeZmPhoneNumber } from '@/lib/sms/normalizePhone'
import { RESULT_TYPES } from '@/lib/results/resultTypes'
import { buildTermResultsCompleteSmsMessage } from '@/lib/sms'
import { safeCompositeKey } from '@/lib/security/safeQueryValue'

const prisma = new PrismaClient()

function argValue(name: string, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

async function resolveSchool() {
  const subdomainHint = String(argValue('subdomain', process.env.TEST_SCHOOL_SUBDOMAIN || ''))
    .trim()
    .toLowerCase()

  if (subdomainHint) {
    const bySub = await prisma.school.findFirst({
      where: { subdomain: { equals: subdomainHint, mode: 'insensitive' } },
      select: { id: true, name: true, subdomain: true },
    })
    if (bySub) return bySub
  }

  const candidates = await prisma.school.findMany({
    where: {
      OR: [
        { subdomain: { equals: 'ndakedaysecondaryschool', mode: 'insensitive' } },
        { name: { contains: 'Ndake Day Secondary', mode: 'insensitive' } },
        { name: { contains: 'Ndake', mode: 'insensitive' } },
        { subdomain: { contains: 'ndake', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, subdomain: true },
    take: 20,
  })
  const secondary =
    candidates.find((s) => /secondary/i.test(String(s.name || ''))) ||
    candidates.find((s) => /secondary/i.test(String(s.subdomain || ''))) ||
    candidates.find((s) => String(s.subdomain || '').toLowerCase() === 'ndakedaysecondaryschool')
  if (secondary) return secondary
  if (candidates.length >= 1) return candidates[0]

  return prisma.school.findFirst({
    select: { id: true, name: true, subdomain: true },
    orderBy: { createdAt: 'asc' },
  })
}

async function resolveClass(schoolId: string) {
  let cls = await prisma.class.findFirst({
    where: {
      schoolId,
      OR: [
        { name: { equals: 'Form 1A', mode: 'insensitive' } },
        { name: { contains: 'Form 1', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  })
  if (cls) return cls

  return prisma.class.create({
    data: {
      schoolId,
      name: 'Form 1A',
      year_group: 'Form 1',
      section: 'A',
    },
    select: { id: true, name: true },
  })
}

async function resolveSubjects(schoolId: string, classId: string) {
  const wanted = ['Mathematics', 'English', 'Geography']
  const found: { id: string; name: string }[] = []
  for (const name of wanted) {
    let subject = await prisma.subject.findFirst({
      where: { schoolId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    })
    if (!subject) {
      subject = await prisma.subject.create({
        data: { schoolId, name, classId },
        select: { id: true, name: true },
      })
    }
    found.push(subject)
  }
  return found
}

async function queueViaPlainPrisma(opts: { schoolId: string; phone: string; message: string }) {
  const settings = await prisma.schoolSmsSettings.findUnique({
    where: { schoolId: opts.schoolId },
    select: { customGatewayEnabled: true },
  })
  console.log('SMS settings:', settings)

  if (!settings?.customGatewayEnabled) {
    return {
      ok: false as const,
      reason:
        'customGatewayEnabled is false — enable the school SMS gateway, or turn on Africa’s Talking legacy fallback',
    }
  }

  const gateway = await prisma.sMSGateway.findFirst({
    where: { schoolId: opts.schoolId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      lastSeenAt: true,
      lastHealthCheck: true,
      isActive: true,
    },
  })
  console.log('Active gateway:', gateway)

  if (!gateway) {
    return {
      ok: false as const,
      reason: 'No active SMSGateway row for this school — pair/register the Android gateway app',
    }
  }

  const { randomUUID } = await import('crypto')
  const row = await prisma.smsLog.create({
    data: {
      schoolId: opts.schoolId,
      direction: 'out',
      recipient: opts.phone,
      body: opts.message,
      status: 'PENDING',
      provider: 'custom_gateway',
      channel: 'CUSTOM_GATEWAY',
      gatewayId: gateway.id,
      idempotencyKey: `gw:${gateway.id}:${randomUUID()}`,
    },
    select: { id: true, recipient: true, status: true, body: true },
  })

  return { ok: true as const, row, gateway }
}

async function triggerNotify(opts: {
  schoolId: string
  studentId: string
  classId: string
  term: string
  year: number
  schoolName: string
  studentName: string
  phone: string
}) {
  const results = await prisma.result.findMany({
    where: {
      schoolId: opts.schoolId,
      studentId: opts.studentId,
      term: opts.term,
      year: opts.year,
      resultType: RESULT_TYPES.END_OF_TERM,
      workflowStatus: 'finalized',
    },
    select: { score: true, grade: true, subject: { select: { name: true } } },
  })
  const message = buildTermResultsCompleteSmsMessage({
    studentName: opts.studentName,
    schoolName: opts.schoolName,
    results: results.map((r) => ({
      subjectName: r.subject?.name || 'Subject',
      score: r.score,
      grade: r.grade,
    })),
  })
  if (!message) throw new Error('No message built')
  console.log('SMS body:', message)

  const keyRaw = safeCompositeKey({
    schoolId: opts.schoolId,
    studentId: opts.studentId,
    term: opts.term,
    year: opts.year,
  })
  const key = keyRaw ? { ...keyRaw, year: Number(keyRaw.year) } : null
  if (!key || !Number.isFinite(key.year)) throw new Error('Invalid ResultsStatus key')

  await prisma.resultsStatus.upsert({
    where: { schoolId_studentId_term_year: key as any },
    create: {
      ...(key as any),
      isComplete: true,
      subjectsEnrolled: results.length,
      subjectsFinalized: results.length,
      smsSending: true,
    },
    update: {
      isComplete: true,
      subjectsEnrolled: results.length,
      subjectsFinalized: results.length,
      smsSending: true,
      smsSentAt: null,
      smsLastError: null,
    },
  })

  // CLI uses plain PrismaClient — avoids Neon WebSocket ErrorEvent from @/lib/prisma basePrisma.
  const queued = await queueViaPlainPrisma({
    schoolId: opts.schoolId,
    phone: opts.phone,
    message,
  })

  if (!queued.ok) {
    await prisma.resultsStatus.update({
      where: { schoolId_studentId_term_year: key as any },
      data: {
        smsSending: false,
        smsLastError: queued.reason.slice(0, 500),
        smsLastAttemptAt: new Date(),
      },
    })
    console.error('SMS not queued:', queued.reason)
    return
  }

  await prisma.resultsStatus.update({
    where: { schoolId_studentId_term_year: key as any },
    data: {
      smsSending: false,
      smsSentAt: new Date(),
      smsLastError: null,
      smsLastAttemptAt: new Date(),
    },
  })
  console.log('Queued for Android gateway:', queued.row)
  console.log(
    'Keep the school SMS gateway app online — it will pick up PENDING SmsLog and send to',
    opts.phone
  )
}

async function main() {
  const phoneRaw = argValue('phone', process.env.TEST_SMS_PHONE || '0977934996')
  const phone = normalizeZmPhoneNumber(phoneRaw)
  if (!phone) throw new Error(`Invalid phone: ${phoneRaw}`)

  const school = await resolveSchool()
  if (!school) throw new Error('No school found in database')
  console.log(`School: ${school.name} (${school.subdomain}) id=${school.id}`)

  const cls = await resolveClass(school.id)
  console.log(`Class: ${cls.name} id=${cls.id}`)

  const subjects = await resolveSubjects(school.id, cls.id)
  console.log('Subjects:', subjects.map((s) => `${s.name}=${s.id}`).join(', '))

  const studentId = 'test-student-sms-001'
  const term = 'Term 1'
  const year = 2026

  const student = await prisma.student.upsert({
    where: { id: studentId },
    create: {
      id: studentId,
      name: 'John Test',
      schoolId: school.id,
      classId: cls.id,
      class: cls.name,
      enrollmentStatus: 'ACTIVE',
      parent_father_contact: phone,
      selected_subjects: subjects.map((s) => s.name),
    },
    update: {
      name: 'John Test',
      schoolId: school.id,
      classId: cls.id,
      class: cls.name,
      parent_father_contact: phone,
      selected_subjects: subjects.map((s) => s.name),
    },
    select: { id: true, name: true, parent_father_contact: true },
  })
  console.log(`Student: ${student.name} id=${student.id} contact=${student.parent_father_contact}`)

  for (const subject of subjects) {
    await prisma.pupilSubjectEnrollment.upsert({
      where: {
        schoolId_pupilId_subjectId_classId: {
          schoolId: school.id,
          pupilId: student.id,
          subjectId: subject.id,
          classId: cls.id,
        },
      },
      create: {
        schoolId: school.id,
        pupilId: student.id,
        subjectId: subject.id,
        classId: cls.id,
      },
      update: {},
    })
  }

  const scores = [
    { subject: subjects[0], score: 67, grade: 'C' },
    { subject: subjects[1], score: 50, grade: 'D' },
    { subject: subjects[2], score: 87, grade: 'A' },
  ]

  for (const row of scores) {
    const existing = await prisma.result.findFirst({
      where: {
        schoolId: school.id,
        studentId: student.id,
        subjectId: row.subject.id,
        term,
        year,
        resultType: RESULT_TYPES.END_OF_TERM,
      },
      select: { id: true },
    })
    if (existing) {
      await prisma.result.update({
        where: { id: existing.id },
        data: { score: row.score, grade: row.grade, workflowStatus: 'finalized' },
      })
    } else {
      await prisma.result.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          subjectId: row.subject.id,
          score: row.score,
          grade: row.grade,
          term,
          year,
          resultType: RESULT_TYPES.END_OF_TERM,
          workflowStatus: 'finalized',
        },
      })
    }
  }

  await prisma.resultsStatus.deleteMany({
    where: { schoolId: school.id, studentId: student.id, term, year },
  })

  await triggerNotify({
    schoolId: school.id,
    studentId: student.id,
    classId: cls.id,
    term,
    year,
    schoolName: school.name,
    studentName: student.name,
    phone,
  })

  const status = await prisma.resultsStatus.findUnique({
    where: {
      schoolId_studentId_term_year: {
        schoolId: school.id,
        studentId: student.id,
        term,
        year,
      },
    },
  })
  console.log('ResultsStatus:', {
    isComplete: status?.isComplete,
    subjectsEnrolled: status?.subjectsEnrolled,
    subjectsFinalized: status?.subjectsFinalized,
    smsSentAt: status?.smsSentAt,
    smsLastError: status?.smsLastError,
    smsSending: status?.smsSending,
  })

  const logs = await prisma.smsLog.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      recipient: true,
      status: true,
      provider: true,
      body: true,
      createdAt: true,
    },
  })
  console.log('Recent SmsLog:')
  for (const log of logs) {
    console.log(
      `- ${log.createdAt.toISOString()} ${log.status} ${log.recipient} :: ${String(log.body || '').slice(0, 140)}`
    )
  }

  console.log(`\nDone. Expected phone: ${phone}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
