import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendSchoolSms = vi.fn().mockResolvedValue({ ok: true })
const buildTermResultsCompleteSmsMessage = vi.fn((args) => {
  if (!Array.isArray(args?.results) || args.results.length === 0) return null
  return 'Term results ready'
})
const getSchoolPortalLoginUrls = vi.fn(() => ({ loginUrl: 'https://school.example/login' }))
const getSchoolSmsFrom = vi.fn(() => 'ZSMS')

vi.mock('@/lib/sms', () => ({
  sendSchoolSms: (...args) => sendSchoolSms(...args),
  buildTermResultsCompleteSmsMessage: (...args) => buildTermResultsCompleteSmsMessage(...args),
  getSchoolPortalLoginUrls: (...args) => getSchoolPortalLoginUrls(...args),
  getSchoolSmsFrom: (...args) => getSchoolSmsFrom(...args),
}))

vi.mock('@/lib/prisma', () => ({ default: {} }))

import {
  SMS_SENDING_LOCK_TTL_MS,
  checkAndNotifyParent,
  countFinalizedEnrolledSubjects,
  isSmsSendingLockStale,
  resolveEnrolledSubjectIds,
} from '@/lib/results/checkAndNotifyParent'

function createPrismaMock(overrides = {}) {
  const status = {
    smsSentAt: null,
    smsSending: false,
    smsLastAttemptAt: null,
    smsLastError: null,
    subjectsEnrolled: 0,
    subjectsFinalized: 0,
    isComplete: false,
    ...(overrides.status || {}),
  }

  const student = {
    id: 'stu1',
    name: 'Ada Banda',
    classId: 'cls1',
    selected_subjects: [],
    guardian_contact: '0971111111',
    parent_father_contact: null,
    parent_mother_contact: null,
    user: { email: 'ada@school.test', name: 'Ada Banda' },
    ...(overrides.student || {}),
  }

  const enrollments = overrides.enrollments ?? [{ subjectId: 'sub1' }, { subjectId: 'sub2' }]
  const subjects = overrides.subjects ?? [
    { id: 'sub1', name: 'Mathematics' },
    { id: 'sub2', name: 'English' },
  ]
  const classSubjects = overrides.classSubjects ?? [{ id: 'sub1' }, { id: 'sub2' }]
  const results = overrides.results ?? [
    { subjectId: 'sub1', workflowStatus: 'finalized' },
    { subjectId: 'sub2', workflowStatus: 'finalized' },
  ]

  const updates = []
  const updateManyCalls = []

  const tx = {
    resultsStatus: {
      upsert: vi.fn(async () => ({
        smsSentAt: status.smsSentAt,
        smsSending: status.smsSending,
        smsLastAttemptAt: status.smsLastAttemptAt,
      })),
      update: vi.fn(async ({ data }) => {
        Object.assign(status, data)
        updates.push(data)
        return status
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        updateManyCalls.push({ where, data })
        const allow =
          overrides.lockCount !== undefined
            ? overrides.lockCount
            : !status.smsSentAt && (!status.smsSending || isSmsSendingLockStale(status))
              ? 1
              : 0
        if (allow === 1) Object.assign(status, data)
        return { count: allow }
      }),
    },
    student: {
      findFirst: vi.fn(async () => (overrides.studentMissing ? null : student)),
    },
    pupilSubjectEnrollment: {
      findMany: vi.fn(async () => enrollments),
    },
    subject: {
      findMany: vi.fn(async () => subjects),
    },
    class: {
      findFirst: vi.fn(async () => ({ subjects: classSubjects })),
    },
    result: {
      findMany: vi.fn(async () => results),
    },
  }

  const prismaClient = {
    school: {
      findFirst: vi.fn(async () => ({
        name: 'Ndake Day Secondary',
        subdomain: 'ndake',
        domain: null,
      })),
    },
    $transaction: vi.fn(async (fn) => fn(tx)),
    resultsStatus: {
      update: vi.fn(async ({ data }) => {
        Object.assign(status, data)
        updates.push(data)
        return status
      }),
    },
    result: {
      findMany: vi.fn(async () =>
        overrides.gradeResults !== undefined
          ? overrides.gradeResults
          : [
              { score: 67, grade: 'C', subject: { name: 'Mathematics' } },
              { score: 50, grade: 'D', subject: { name: 'English' } },
            ]
      ),
    },
    _status: status,
    _tx: tx,
    _updates: updates,
    _updateManyCalls: updateManyCalls,
  }

  return prismaClient
}

describe('countFinalizedEnrolledSubjects', () => {
  it('marks complete when every enrolled subject has a finalized result', () => {
    const result = countFinalizedEnrolledSubjects(
      ['sub1', 'sub2', 'sub3'],
      [
        { subjectId: 'sub1', workflowStatus: 'finalized' },
        { subjectId: 'sub2', workflowStatus: 'finalized' },
        { subjectId: 'sub3', workflowStatus: 'draft' },
      ]
    )
    expect(result.subjectsEnrolled).toBe(3)
    expect(result.subjectsFinalized).toBe(2)
    expect(result.isComplete).toBe(false)
  })

  it('is complete when all enrolled subjects are finalized', () => {
    const result = countFinalizedEnrolledSubjects(
      ['sub1', 'sub2'],
      [
        { subjectId: 'sub1', workflowStatus: 'finalized' },
        { subjectId: 'sub2', workflowStatus: 'FINALIZED' },
      ]
    )
    expect(result.isComplete).toBe(true)
  })
})

describe('isSmsSendingLockStale', () => {
  it('is false when not sending', () => {
    expect(isSmsSendingLockStale({ smsSending: false, smsSentAt: null })).toBe(false)
  })

  it('is true when sending with missing attempt time', () => {
    expect(
      isSmsSendingLockStale({ smsSending: true, smsSentAt: null, smsLastAttemptAt: null })
    ).toBe(true)
  })

  it('is true when attempt older than TTL', () => {
    const now = new Date('2026-08-01T12:00:00Z')
    const old = new Date(now.getTime() - SMS_SENDING_LOCK_TTL_MS - 1000)
    expect(
      isSmsSendingLockStale({ smsSending: true, smsSentAt: null, smsLastAttemptAt: old }, now)
    ).toBe(true)
  })

  it('is false when attempt is recent', () => {
    const now = new Date('2026-08-01T12:00:00Z')
    const recent = new Date(now.getTime() - 60_000)
    expect(
      isSmsSendingLockStale({ smsSending: true, smsSentAt: null, smsLastAttemptAt: recent }, now)
    ).toBe(false)
  })
})

describe('resolveEnrolledSubjectIds', () => {
  it('prefers pupilSubjectEnrollment when present', async () => {
    const tx = {
      pupilSubjectEnrollment: {
        findMany: vi.fn(async () => [{ subjectId: 'enr1' }, { subjectId: 'enr2' }]),
      },
      subject: { findMany: vi.fn() },
      class: { findFirst: vi.fn() },
    }
    const ids = await resolveEnrolledSubjectIds({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      student: { selected_subjects: ['Mathematics'] },
      tx,
    })
    expect(ids).toEqual(['enr1', 'enr2'])
    expect(tx.subject.findMany).not.toHaveBeenCalled()
    expect(tx.class.findFirst).not.toHaveBeenCalled()
  })

  it('falls back to selected_subjects name match when enrollments empty', async () => {
    const tx = {
      pupilSubjectEnrollment: { findMany: vi.fn(async () => []) },
      subject: {
        findMany: vi.fn(async () => [
          { id: 'sub-math', name: 'Mathematics' },
          { id: 'sub-eng', name: 'English' },
        ]),
      },
      class: { findFirst: vi.fn() },
    }
    const ids = await resolveEnrolledSubjectIds({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      student: { selected_subjects: ['mathematics', 'English'] },
      tx,
    })
    expect(ids).toEqual(['sub-math', 'sub-eng'])
    expect(tx.class.findFirst).not.toHaveBeenCalled()
  })

  it('falls back to class subjects when enrollments and selected_subjects empty', async () => {
    const tx = {
      pupilSubjectEnrollment: { findMany: vi.fn(async () => []) },
      subject: { findMany: vi.fn() },
      class: {
        findFirst: vi.fn(async () => ({ subjects: [{ id: 'c1' }, { id: 'c2' }] })),
      },
    }
    const ids = await resolveEnrolledSubjectIds({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      student: { selected_subjects: [] },
      tx,
    })
    expect(ids).toEqual(['c1', 'c2'])
  })
})

describe('checkAndNotifyParent', () => {
  beforeEach(() => {
    sendSchoolSms.mockClear()
    sendSchoolSms.mockResolvedValue({ ok: true })
    buildTermResultsCompleteSmsMessage.mockClear()
  })

  it('does not send when results are incomplete', async () => {
    const prismaClient = createPrismaMock({
      results: [
        { subjectId: 'sub1', workflowStatus: 'finalized' },
        { subjectId: 'sub2', workflowStatus: 'draft' },
      ],
    })
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(sendSchoolSms).not.toHaveBeenCalled()
    expect(prismaClient._status.isComplete).toBe(false)
  })

  it('sends once when complete with parent contacts and sets smsSentAt', async () => {
    const prismaClient = createPrismaMock()
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(sendSchoolSms).toHaveBeenCalledTimes(1)
    expect(sendSchoolSms.mock.calls[0][0].to).toContain('0971111111')
    expect(prismaClient._status.smsSentAt).toBeTruthy()
    expect(prismaClient._status.smsSending).toBe(false)
    expect(prismaClient._status.smsLastError).toBeNull()
  })

  it('sets smsLastError when complete but no contacts', async () => {
    const prismaClient = createPrismaMock({
      student: {
        guardian_contact: null,
        parent_father_contact: null,
        parent_mother_contact: null,
      },
    })
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(sendSchoolSms).not.toHaveBeenCalled()
    expect(prismaClient._status.smsLastError).toBe('No parent/guardian contacts')
    expect(prismaClient._status.smsSending).toBe(false)
  })

  it('retries when smsSending lock is stale', async () => {
    const staleAttempt = new Date(Date.now() - SMS_SENDING_LOCK_TTL_MS - 60_000)
    const prismaClient = createPrismaMock({
      status: {
        smsSending: true,
        smsSentAt: null,
        smsLastAttemptAt: staleAttempt,
      },
    })
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(sendSchoolSms).toHaveBeenCalledTimes(1)
    expect(prismaClient._status.smsSentAt).toBeTruthy()
  })

  it('uses class subject fallback when enrollments are empty', async () => {
    const prismaClient = createPrismaMock({
      enrollments: [],
      student: { selected_subjects: [] },
      classSubjects: [{ id: 'sub1' }, { id: 'sub2' }],
    })
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(prismaClient._tx.class.findFirst).toHaveBeenCalled()
    expect(sendSchoolSms).toHaveBeenCalledTimes(1)
  })

  it('does not send when grade rows are empty after lock', async () => {
    const prismaClient = createPrismaMock({ gradeResults: [] })
    await checkAndNotifyParent({
      schoolId: 'sch1',
      studentId: 'stu1',
      classId: 'cls1',
      term: 'Term 1',
      year: 2026,
      request: null,
      prismaClient,
    })
    expect(sendSchoolSms).not.toHaveBeenCalled()
    expect(prismaClient._status.smsLastError).toBe('No finalized results for SMS')
    expect(prismaClient._status.smsSending).toBe(false)
    expect(prismaClient._status.smsSentAt).toBeFalsy()
  })
})
