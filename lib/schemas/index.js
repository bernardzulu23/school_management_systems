/**
 * ZSMS API request schemas (central registry).
 *
 * Import from here in route handlers:
 *   import { SendSMSSchema } from '@/lib/schemas'
 *   const data = await parseBodyOrThrow(request, SendSMSSchema)
 *
 * SECURITY RULES baked into these schemas:
 * - NEVER accept `role` or `schoolId` from the body — they come from the JWT.
 * - Every string has a `.max()` to prevent denial-of-service payloads.
 * - Enums are explicit lists to reject unexpected values.
 * - IDs are bounded strings accepting both UUID and CUID (ZSMS uses both).
 *
 * ADDING A SCHEMA: define it here with a comment naming the endpoint that uses
 * it, then wire it in the route with validateBody()/parseBodyOrThrow().
 */
import { z } from 'zod'
import { ECZ_PRACTICE_EXAM_LEVELS } from '@/lib/ecz/ecz-practice-levels'

// ─── COMMON FIELDS ──────────────────────────────────────────────────────────

/** Accepts UUID (default(uuid())) and CUID (default(cuid())) ids used in ZSMS. */
export const idString = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(64, 'Invalid ID')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid ID format')

/** Zambian mobile number in +260XXXXXXXXX form. */
export const zambiaMobile = z
  .string()
  .trim()
  .regex(/^\+?260[79]\d{8}$/, 'Must be a valid Zambian number (+260XXXXXXXXX)')

/** Lenient phone (accepts local 0-prefixed and international). */
export const phoneLoose = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{9,15}$/, 'Invalid phone number')

export const shortText = (max = 200) => z.string().trim().min(1).max(max)
export const optionalText = (max = 1000) => z.string().trim().max(max).optional()

// ─── SMS ────────────────────────────────────────────────────────────────────

/**
 * POST /api/sms/send
 * `to` may be a single number, a comma-separated list, or an array.
 */
export const SendSMSSchema = z.object({
  to: z.union([
    z.string().trim().min(1).max(5000),
    z.array(z.string().trim().min(1).max(20)).min(1).max(500),
  ]),
  message: z.string().trim().min(1).max(1000),
  from: z.string().trim().max(20).nullish(),
})

/**
 * POST /api/sms/broadcast — bulk enqueue via QStash (max 5000 numbers per request).
 */
export const BroadcastSMSSchema = z.object({
  phoneNumbers: z.array(z.string().trim().min(1).max(24)).min(1).max(5000),
  message: z.string().trim().min(1).max(1000),
})

/**
 * PATCH /api/sms/balance — low-balance alert settings (headteacher).
 */
export const SmsBalanceSettingsSchema = z.object({
  lowBalanceThreshold: z.number().int().min(0).max(100000).optional(),
  lowBalanceAlertEmail: z.string().email().max(200).optional().nullable(),
})

// ─── SUBJECTS ─────────────────────────────────────────────────────────────

/**
 * POST /api/subjects — create/update a subject (admin/headteacher/HOD).
 * schoolId comes from the JWT, never the body.
 */
export const CreateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  classId: idString.optional().nullable(),
  teacherId: idString.optional().nullable(),
})

// ─── CAREER GUIDANCE ───────────────────────────────────────────────────────

const careerText = (max = 8000) => z.string().trim().max(max).optional().or(z.literal(''))

/** POST /api/career-clusters */
export const CreateCareerClusterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(5000),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
})

/** PATCH /api/career-clusters/[id] */
export const UpdateCareerClusterSchema = CreateCareerClusterSchema.partial()

/** POST /api/careers */
export const CreateCareerSchema = z.object({
  clusterId: idString,
  title: z.string().trim().min(2).max(160),
  summary: careerText(500),
  overview: careerText(),
  subjectsToFocus: careerText(),
  recommendedCourses: careerText(),
  collegesInstitutions: careerText(),
  salaryExpectations: careerText(2000),
  qualifications: careerText(),
  careerProgression: careerText(),
  additionalNotes: careerText(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
})

/** PATCH /api/careers/[id] */
export const UpdateCareerSchema = CreateCareerSchema.partial().extend({
  clusterId: idString.optional(),
})

// ─── HOD DEPARTMENT FILES ─────────────────────────────────────────────────

const hodPriority = z.enum(['low', 'medium', 'high']).optional()

/** POST /api/hod/budget — category or transaction */
export const CreateHodBudgetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('category'),
    name: z.string().trim().min(1).max(120),
    allocated: z.coerce.number().min(0).optional(),
    color: z.string().trim().max(32).optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  }),
  z.object({
    kind: z.literal('transaction'),
    description: z.string().trim().min(1).max(500),
    amount: z.coerce.number(),
    categoryId: idString.optional(),
    status: z.enum(['pending', 'approved', 'completed', 'rejected']).optional(),
    requestedBy: z.string().trim().max(120).optional(),
    transactionDate: z.string().trim().optional(),
  }),
])

/** POST /api/hod/correspondence */
export const CreateHodCorrespondenceSchema = z.object({
  direction: z.enum(['incoming', 'outgoing']),
  subject: z.string().trim().min(1).max(300),
  party: z.string().trim().min(1).max(200),
  itemDate: z.string().trim().optional(),
  priority: hodPriority,
  status: z.enum(['pending', 'responded', 'sent', 'draft']).optional(),
  itemType: z.string().trim().max(60).optional(),
  attachments: z.coerce.number().int().min(0).max(99).optional(),
})

export const UpdateHodCorrespondenceSchema = CreateHodCorrespondenceSchema.partial()

/** POST /api/hod/meetings */
export const CreateHodMeetingSchema = z.object({
  title: z.string().trim().min(1).max(300),
  meetingType: z.string().trim().max(80).optional(),
  meetingScope: z.enum(['department', 'staff']).optional(),
  meetingDate: z.string().trim(),
  meetingTime: z.string().trim().max(40).optional(),
  duration: z.string().trim().max(40).optional(),
  location: z.string().trim().max(200).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  attendees: z.array(z.string().trim().max(120)).max(50).optional(),
  agenda: z.array(z.string().trim().max(500)).max(30).optional(),
  minutes: z.string().trim().max(50000).optional(),
  actionItems: z.coerce.number().int().min(0).max(999).optional(),
  minutesStatus: z.string().trim().max(80).optional(),
})

export const UpdateHodMeetingSchema = CreateHodMeetingSchema.partial()

/** POST /api/hod/stock */
export const CreateHodStockItemSchema = z.object({
  itemName: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional(),
  currentStock: z.coerce.number().int().min(0).optional(),
  minimumStock: z.coerce.number().int().min(0).optional(),
  maximumStock: z.coerce.number().int().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  supplier: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
})

export const CreateHodStockMovementSchema = z.object({
  itemId: idString,
  movementType: z.enum(['in', 'out']),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
})

/** POST /api/hod/daily-routine — task or weekly plan */
export const CreateHodDailyRoutineSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('task'),
    taskDate: z.string().trim(),
    taskTime: z.string().trim().max(20).optional(),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(5000).optional(),
    priority: hodPriority,
    status: z.enum(['pending', 'in-progress', 'completed', 'overdue']).optional(),
    duration: z.string().trim().max(40).optional(),
    assignedTo: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
  }),
  z.object({
    kind: z.literal('weekly'),
    dayName: z.string().trim().min(1).max(20),
    focus: z.string().trim().max(300).optional(),
    tasks: z.array(z.string().trim().max(300)).max(20).optional(),
    sortOrder: z.coerce.number().int().min(0).max(99).optional(),
  }),
])

export const UpdateHodDailyRoutineTaskSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']).optional(),
  priority: hodPriority,
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  taskTime: z.string().trim().max(20).optional(),
  duration: z.string().trim().max(40).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
})

// ─── STUDENT GOALS ────────────────────────────────────────────────────────

/**
 * POST /api/student/goals — a student sets a personal/academic goal.
 */
export const CreateStudentGoalSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(['academic', 'personal']).optional(),
  description: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
  targetDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be ISO (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
})

// ─── GAME COMPLETION (gamification) ─────────────────────────────────────────

/**
 * POST /api/dashboard/student/games/complete
 */
export const CompleteGameSchema = z.object({
  gameId: idString,
  percentage: z.coerce.number().finite().min(0).max(100),
})

// ─── FLASHCARDS ─────────────────────────────────────────────────────────────

/**
 * POST /api/student/flashcards — generate an AI deck (1 per subject/day).
 * Accepts `subjectName` or its `subject` alias.
 */
export const GenerateFlashcardsSchema = z
  .object({
    subjectName: z.string().trim().min(1).max(120).optional(),
    subject: z.string().trim().min(1).max(120).optional(),
    topic: z.string().trim().max(200).optional().or(z.literal('')),
    count: z.coerce.number().int().min(1).max(10).optional(),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
  })
  .refine((d) => d.subjectName || d.subject, {
    message: 'subjectName is required',
    path: ['subjectName'],
  })

// ─── MARKETPLACE (shared teaching materials) ────────────────────────────────

export const MARKETPLACE_TYPES = ['lesson_plan', 'sba_task', 'rubric', 'exam_question']
export const RESOURCE_LEVELS = ['low', 'moderate', 'well-resourced']

/**
 * POST /api/marketplace/submit — a teacher shares one of their lesson plans.
 * The content is copied server-side from the teacher's own record; the body
 * only references it. schoolId/teacherId come from the JWT, never the body.
 */
export const SubmitMaterialSchema = z.object({
  lessonPlanId: idString,
  showAuthorName: z.coerce.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
})

/**
 * POST /api/marketplace/[id]/review — HOD/admin approves or rejects.
 */
export const ReviewMaterialSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((d) => d.action !== 'reject' || (d.rejectionReason && d.rejectionReason.length > 0), {
    message: 'rejectionReason is required when rejecting',
    path: ['rejectionReason'],
  })

/**
 * POST /api/marketplace/[id]/rate — a teacher rates a downloaded material.
 */
export const RateMaterialSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
})

/**
 * GET /api/marketplace — public browse/search (validated query params).
 */
export const MarketplaceQuerySchema = z.object({
  subject: z.string().trim().max(120).optional(),
  form: z.string().trim().max(40).optional(),
  type: z.enum(MARKETPLACE_TYPES).optional(),
  resourceLevel: z.enum(RESOURCE_LEVELS).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

// ─── MOCK EXAMINATION (National Assessment Platform) ────────────────────────

export const MOCK_EXAM_LEVELS = ECZ_PRACTICE_EXAM_LEVELS.map((l) => l.value)

/**
 * POST /api/student/mock-exam/start — begin a timed ECZ mock exam.
 */
export const StartMockExamSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(200),
  examLevel: z.enum(MOCK_EXAM_LEVELS).optional(),
  questionCount: z.coerce.number().int().min(3).max(15).optional(),
  durationMinutes: z.coerce.number().int().min(30).max(180).optional(),
})

/**
 * POST /api/student/mock-exam/[id]/submit — submit answers for auto-scoring.
 */
export const SubmitMockExamSchema = z.object({
  answers: z.record(z.string().trim().max(5000)).refine((o) => Object.keys(o).length <= 30, {
    message: 'Too many answers',
  }),
})

/**
 * GET /api/analytics/national-percentile — query params.
 */
export const NationalPercentileQuerySchema = z.object({
  subject: z.string().trim().min(1).max(120),
  examLevel: z.enum(MOCK_EXAM_LEVELS),
  attemptId: idString.optional(),
})
