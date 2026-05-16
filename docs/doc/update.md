Current Issues
javascript// Problem: Using "game" model for question banks
// This is not ideal for ECZ compliance

const created = await prisma.game.create({
data: {
title, subject, type: 'question_bank',
// Missing: Component type, Form level, Construct mapping, Rubric
}
})

STEP 1: UPDATE PRISMA SCHEMA
Create/update prisma/schema.prisma:
prisma// ECZ Compliance Models

// Subjects (all 18 from guidelines)
model Subject {
id String @id @default(cuid())
name String // e.g., "Mathematics I", "English Language"
code String @unique // e.g., "MATH1", "ENG"
description String?
construct String // Main competency statement
elementsOfConstruct Element[]
assessments Assessment[]
school School @relation(fields: [schoolId], references: [id])
schoolId String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([schoolId, code])
@@index([schoolId])
}

// Elements of Construct (sub-competencies)
model Element {
id String @id @default(cuid())
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
subjectId String
elementNumber Int // 1, 2, 3, 4, 5
statement String // Full description
assessmentItems AssessmentItem[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([subjectId, elementNumber])
@@index([subjectId])
}

// Main Assessment Model (replaces "game" for assessments)
model Assessment {
id String @id @default(cuid())
subject Subject @relation(fields: [subjectId], references: [id])
subjectId String
school School @relation(fields: [schoolId], references: [id])
schoolId String

// ECZ Compliance Fields
component AssessmentComponent // "SBA_TASK" or "FINAL_EXAMINATION"
formLevel Int // 1, 2, 3, or 4
formLevelValidation Boolean @default(true) // Validates Form 4 SBA prevention

// Basic Info
title String
description String?
type String // "Project", "Practical", "Assignment", etc.

// SBA-Specific
context String? // Must include Zambian context
sbaTaskTemplate String? // Type of SBA task
materialsProvided String[]

// Construct Mapping
elementOfConstruct String? // References Element

// Rubric & Scoring
rubric Rubric?
maxMarks Int @default(100)

// Dates
dueDate DateTime?
submissionDeadline DateTime? // 31st January for SBA

// Metadata
createdBy String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
status AssessmentStatus @default(DRAFT)

// Relations
scores AssessmentScore[]
items AssessmentItem[]

@@index([schoolId])
@@index([subjectId])
@@index([formLevel])
@@index([component])
}

enum AssessmentComponent {
SBA_TASK // 30% weighting
FINAL_EXAMINATION // 70% weighting
PRACTICE_FORMATIVE // 0% - not counted
}

enum AssessmentStatus {
DRAFT
PUBLISHED
IN_PROGRESS
COMPLETED
SUBMITTED_TO_ECZ
ARCHIVED
}

// Assessment Items (Questions/Tasks within Assessment)
model AssessmentItem {
id String @id @default(cuid())
assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
assessmentId String
elementOfConstruct Element @relation(fields: [elementId], references: [id])
elementId String

questionNumber Int
content String // Question text
markAllocation Int // 1-2, 3-4, 5-6, 7+ marks
commandTerm String // "Calculate", "Compare", "Analyse", etc.
expectedAnswer String? // Model answer
markingGuidance String? // How to mark
bloomsLevel String // "Remember", "Understand", "Apply", etc.
zambiContext Boolean @default(true) // Must be true

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([assessmentId])
@@index([elementId])
}

// Rubric (4-level assessment: Excellent, Good, Fair, Needs Improvement)
model Rubric {
id String @id @default(cuid())
assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
assessmentId String @unique

criteria RubricCriterion[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([assessmentId])
}

model RubricCriterion {
id String @id @default(cuid())
rubric Rubric @relation(fields: [rubricId], references: [id], onDelete: Cascade)
rubricId String

name String // "Number of organisms identified", etc.
excellent String // Excellent (4) description
good String // Good (3) description
fair String // Fair (2) description
needsImpr String // Needs Improvement (1) description

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([rubricId])
}

// SBA Scores (tracks individual learner SBA scores)
model AssessmentScore {
id String @id @default(cuid())
assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
assessmentId String
learner User @relation(fields: [learnerId], references: [id])
learnerId String
school School @relation(fields: [schoolId], references: [id])
schoolId String

// SBA Score Breakdown (30% = 100 marks total)
task1Score Int? @default(0) // Out of 20
task2Score Int? @default(0) // Out of 20
task3Score Int? @default(0) // Out of 20
termTestScore Int? @default(0) // Out of 40
totalSBAScore Int? @default(0) // Out of 100 (computed)

// Form Level & Year
formLevel Int // 1, 2, 3 (NOT 4)
academicYear Int // 2024, 2025, etc.

// ECZ Submission
submissionStatus SubmissionStatus @default(DRAFT)
submittedAt DateTime?
submittedBy String? // User ID who submitted
eczeReference String? // ECZ confirmation reference

// Moderation
moderatedAt DateTime?
moderatedBy String?
moderationStatus ModerationStatus @default(PENDING)
moderationNotes String?

// Evidence (2-year retention)
evidenceFiles EvidenceFile[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([assessmentId, learnerId, academicYear])
@@index([schoolId])
@@index([learnerId])
@@index([submissionStatus])
@@index([submittedAt])
}

enum SubmissionStatus {
DRAFT // Not yet submitted
IN_PROGRESS // Being recorded
COMPLETED // All scores recorded
SUBMITTED_TO_ECZ // Sent to ECZ
ACKNOWLEDGED_BY_ECZ // ECZ received
REJECTED_BY_ECZ // ECZ rejected (resubmit)
}

enum ModerationStatus {
PENDING
APPROVED
REJECTED
NEEDS_REVISION
}

// Evidence Files (stored for 2-year compliance)
model EvidenceFile {
id String @id @default(cuid())
score AssessmentScore @relation(fields: [scoreId], references: [id], onDelete: Cascade)
scoreId String

fileName String
filePath String // Cloud storage URL
fileType String // "pdf", "image", "video", "audio"
fileSize Int // In bytes
uploadedAt DateTime @default(now())
uploadedBy String // User ID
expiryDate DateTime // 2 years from uploadDate

@@index([scoreId])
@@index([expiryDate])
}

// ECZ Submission Batch (tracks monthly submissions)
model ECZSubmission {
id String @id @default(cuid())
school School @relation(fields: [schoolId], references: [id])
schoolId String

subject Subject @relation(fields: [subjectId], references: [id])
subjectId String
formLevel Int // 1, 2, 3
academicYear Int // 2024, 2025, etc.

submissionFile String? // Path to generated CSV/file
status SubmissionStatus @default(DRAFT)
totalLearners Int // Count of learners submitted
validationErrors String[]

submittedAt DateTime?
submittedBy String // User ID
eczeReference String? // ECZ confirmation

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([schoolId, subjectId, formLevel, academicYear])
@@index([schoolId])
@@index([submittedAt])
}

// Special Accommodations (for learners with special needs)
model SpecialAccommodation {
id String @id @default(cuid())
learner User @relation(fields: [learnerId], references: [id])
learnerId String
school School @relation(fields: [schoolId], references: [id])
schoolId String

accommodationType String // "Visual_Impairment", "Hearing_Impairment", etc.
details String // Detailed description
accommodations String[] // ["Braille", "Extra time", "Reader"]

approvedAt DateTime?
approvedBy String? // User ID (HOD/ADMIN)
documentation String[] // File paths for medical docs

appliedForYear Int
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId])
@@index([learnerId])
}

// Update School model to include new relations
model School {
// ... existing fields ...

subjects Subject[]
assessments Assessment[]
scores AssessmentScore[]
submissions ECZSubmission[]
accommodations SpecialAccommodation[]
}

// Update User model to include learner relations
model User {
// ... existing fields ...

scores AssessmentScore[]
accommodations SpecialAccommodation[]
}

STEP 2: DATABASE MIGRATION
bash# Create migration
npx prisma migrate dev --name add_ecz_compliance_models

# Or if you need to reset (dev only!)

npx prisma migrate reset

STEP 3: NEW API ENDPOINTS
A. Create SBA Task app/api/assessments/sba-tasks/route.ts
typescriptimport { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

// VALIDATION: Ensure Zambian context
function validateZambianContext(context: string): boolean {
const zambiaKeywords = [
'Zambia', 'Lusaka', 'Kitwe', 'Livingstone', 'Ndola',
'maize', 'copper', 'market', 'farmer', 'minibus',
'school', 'hospital', 'village', 'township', 'community',
'Soweto', 'Kwacha', 'Victoria Falls', 'Luangwa',
'Mkushi', 'Kafue', 'traditional', 'ceremony'
]

return zambiaKeywords.some(keyword =>
context.toLowerCase().includes(keyword.toLowerCase())
)
}

export async function POST(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['TEACHER', 'HOD', 'ADMIN'])) {
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const body = await request.json().catch(() => ({}))

// Validation
if (body.formLevel === 4) {
return NextResponse.json(
{ error: 'SBA cannot be created for Form 4 learners' },
{ status: 400 }
)
}

if (!validateZambianContext(body.context)) {
return NextResponse.json(
{ error: 'Assessment context must include real-life Zambian scenario' },
{ status: 400 }
)
}

try {
// Create Assessment
const assessment = await prisma.assessment.create({
data: {
subject: { connect: { id: body.subjectId } },
school: { connect: { id: schoolId } },
component: 'SBA_TASK',
formLevel: body.formLevel,
title: body.title,
description: body.description,
type: body.type || 'Project', // Project, Practical, Assignment, etc.
context: body.context,
sbaTaskTemplate: body.sbaTaskTemplate,
materialsProvided: body.materialsProvided || [],
elementOfConstruct: body.elementOfConstruct,
maxMarks: body.maxMarks || 20,
dueDate: body.dueDate ? new Date(body.dueDate) : null,
createdBy: auth.user.id,
status: 'DRAFT',
},
include: {
subject: true,
rubric: true,
}
})

    // Create default 4-level rubric
    if (body.createDefaultRubric !== false) {
      await prisma.rubric.create({
        data: {
          assessment: { connect: { id: assessment.id } },
          criteria: {
            create: [
              {
                name: 'Quality of Work',
                excellent: 'Excellent - Exceeds expectations, outstanding quality',
                good: 'Good - Meets expectations fully',
                fair: 'Fair - Partially meets expectations',
                needsImpr: 'Needs Improvement - Below expectations'
              },
              {
                name: 'Understanding',
                excellent: 'Excellent - Deep understanding demonstrated',
                good: 'Good - Solid understanding shown',
                fair: 'Fair - Basic understanding evident',
                needsImpr: 'Needs Improvement - Limited understanding'
              },
              {
                name: 'Application',
                excellent: 'Excellent - Creative real-world application',
                good: 'Good - Appropriate application',
                fair: 'Fair - Some application with support',
                needsImpr: 'Needs Improvement - Minimal application'
              },
              {
                name: 'Presentation',
                excellent: 'Excellent - Well-organized and clear',
                good: 'Good - Organized and mostly clear',
                fair: 'Fair - Somewhat organized',
                needsImpr: 'Needs Improvement - Poorly organized'
              },
            ]
          }
        }
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'SBA task created successfully',
        data: {
          id: assessment.id,
          title: assessment.title,
          component: assessment.component,
          formLevel: assessment.formLevel,
          subject: assessment.subject.name,
          createdAt: assessment.createdAt,
        }
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error creating SBA task:', error)
return NextResponse.json(
{ error: 'Failed to create SBA task' },
{ status: 500 }
)
}
}

// GET - List SBA tasks
export async function GET(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['TEACHER', 'HOD', 'ADMIN'])) {
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const { searchParams } = new URL(request.url)
const formLevel = searchParams.get('formLevel') ? parseInt(searchParams.get('formLevel')!) : undefined
const subjectId = searchParams.get('subjectId')

try {
const tasks = await prisma.assessment.findMany({
where: {
schoolId,
component: 'SBA_TASK',
...(formLevel ? { formLevel } : {}),
...(subjectId ? { subjectId } : {}),
},
include: {
subject: true,
rubric: { include: { criteria: true } },
},
orderBy: { createdAt: 'desc' },
})

    return NextResponse.json({
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        title: task.title,
        subject: task.subject.name,
        formLevel: task.formLevel,
        component: task.component,
        type: task.type,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
      }))
    })

} catch (error) {
console.error('Error fetching SBA tasks:', error)
return NextResponse.json({ error: 'Failed to fetch SBA tasks' }, { status: 500 })
}
}

export const dynamic = 'force-dynamic'
B. Record SBA Scores (with 4-level rubric) app/api/assessments/sba-scores/route.ts
typescriptimport { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function POST(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['TEACHER', 'HOD', 'ADMIN'])) {
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const body = await request.json().catch(() => ({}))

// Validate Form 4 prevention
const assessment = await prisma.assessment.findUnique({
where: { id: body.assessmentId },
include: { subject: true }
})

if (!assessment) {
return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
}

if (body.formLevel === 4) {
return NextResponse.json(
{ error: 'Cannot record SBA for Form 4. Only Final Examination applies.' },
{ status: 400 }
)
}

try {
// Calculate total from rubric scores (4-level system)
// 4 = Excellent, 3 = Good, 2 = Fair, 1 = Needs Improvement
// For 4 criteria: max 4 \* 4 = 16 points, translate to 20-mark scale

    const rubricTotal = (body.excellentCount || 0) * 4 +
                       (body.goodCount || 0) * 3 +
                       (body.fairCount || 0) * 2 +
                       (body.needsImprovementCount || 0) * 1

    const markPerPoint = 20 / 16 // Normalize to 20 marks
    const calculatedScore = Math.round(rubricTotal * markPerPoint)

    const score = await prisma.assessmentScore.create({
      data: {
        assessment: { connect: { id: body.assessmentId } },
        learner: { connect: { id: body.learnerId } },
        school: { connect: { id: schoolId } },
        formLevel: body.formLevel,
        academicYear: body.academicYear,

        task1Score: body.taskNumber === 1 ? calculatedScore : undefined,
        task2Score: body.taskNumber === 2 ? calculatedScore : undefined,
        task3Score: body.taskNumber === 3 ? calculatedScore : undefined,
        termTestScore: body.taskNumber === 4 ? Math.min(40, calculatedScore * 2) : undefined,

        submissionStatus: 'COMPLETED',
      },
      include: {
        assessment: true,
        learner: true,
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'SBA score recorded successfully',
        data: {
          id: score.id,
          learner: score.learner.name,
          assessment: score.assessment.title,
          scoreRecorded: calculatedScore,
          formLevel: score.formLevel,
        }
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error recording SBA score:', error)
return NextResponse.json({ error: 'Failed to record score' }, { status: 500 })
}
}

// GET - Fetch scores for export to ECZ
export async function GET(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['TEACHER', 'HOD', 'ADMIN'])) {
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const { searchParams } = new URL(request.url)
const subjectId = searchParams.get('subjectId')
const formLevel = searchParams.get('formLevel') ? parseInt(searchParams.get('formLevel')!) : undefined
const academicYear = searchParams.get('academicYear') ? parseInt(searchParams.get('academicYear')!) : new Date().getFullYear()

try {
const scores = await prisma.assessmentScore.findMany({
where: {
schoolId,
formLevel, // Won't return Form 4
academicYear,
assessment: subjectId ? { subjectId } : undefined,
},
include: {
assessment: { include: { subject: true } },
learner: true,
},
orderBy: [{ assessment: { subject: { name: 'asc' } } }, { learner: { name: 'asc' } }],
})

    // Generate ECZ submission format
    const eczData = scores.map(score => ({
      learnerName: score.learner.name,
      learnerNumber: score.learner.studentId || 'N/A',
      subject: score.assessment.subject.name,
      sbaScore: score.totalSBAScore,
      formLevel: score.formLevel,
      academicYear: score.academicYear,
    }))

    return NextResponse.json({
      success: true,
      totalRecords: eczData.length,
      data: eczData,
      readyForSubmission: eczData.length > 0,
    })

} catch (error) {
console.error('Error fetching scores:', error)
return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
}
}

export const dynamic = 'force-dynamic'
C. ECZ Submission Generator app/api/ecz/submissions/route.ts
typescriptimport { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function POST(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
return NextResponse.json({ error: 'Only Admin/HOD can submit to ECZ' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const body = await request.json()
const { subjectId, formLevel, academicYear } = body

// CRITICAL: Validate deadline (31st January)
const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()

if (today > deadline) {
return NextResponse.json(
{
error: `Deadline passed. SBA scores must be submitted by 31st January ${academicYear + 1}`
},
{ status: 400 }
)
}

try {
// Fetch all scores for this subject/form/year
const scores = await prisma.assessmentScore.findMany({
where: {
schoolId,
formLevel,
academicYear,
assessment: { subjectId },
},
include: {
assessment: { include: { subject: true } },
learner: true,
},
})

    if (scores.length === 0) {
      return NextResponse.json(
        { error: 'No scores found for submission' },
        { status: 400 }
      )
    }

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, centreNumber: true }
    })

    // Generate ECZ CSV format
    const csvData = generateECZCSV(school, scores, formLevel, academicYear)

    // Create submission record
    const submission = await prisma.eczSubmission.create({
      data: {
        school: { connect: { id: schoolId } },
        subject: { connect: { id: subjectId } },
        formLevel,
        academicYear,
        totalLearners: scores.length,
        status: 'SUBMITTED_TO_ECZ',
        submittedAt: new Date(),
        submittedBy: auth.user.id,
        submissionFile: `ecz_submission_${subjectId}_f${formLevel}_${academicYear}.csv`,
      }
    })

    // Mark scores as submitted
    await prisma.assessmentScore.updateMany({
      where: {
        schoolId,
        formLevel,
        academicYear,
        assessment: { subjectId },
      },
      data: {
        submissionStatus: 'SUBMITTED_TO_ECZ',
        submittedAt: new Date(),
        submittedBy: auth.user.id,
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Submission prepared successfully',
        csvData,
        submissionId: submission.id,
        daysUntilDeadline: Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error creating submission:', error)
return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
}
}

function generateECZCSV(school: any, scores: any[], formLevel: number, year: number): string {
const headers = ['LEARNER_NAME', 'LEARNER_NUMBER', 'SBA_SCORE']

let csv = `SUBJECT,FORM,SCHOOL,CENTRE_NUMBER,YEAR\n`
csv += `${scores[0]?.assessment.subject.name},${formLevel},"${school.name}",${school.centreNumber},${year}\n\n`
csv += headers.join(',') + '\n'

scores.forEach(score => {
csv += `"${score.learner.name}",${score.learner.studentId},${score.totalSBAScore}\n`
})

return csv
}

// GET - Check deadline status
export async function GET(request: Request) {
const { searchParams } = new URL(request.url)
const academicYear = parseInt(searchParams.get('academicYear') || new Date().getFullYear().toString())

const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()
const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 _ 60 _ 60 \* 24))
const isUrgent = daysRemaining < 14
const isPassed = today > deadline

return NextResponse.json({
academicYear,
deadline: deadline.toISOString().split('T')[0],
daysRemaining,
isUrgent,
isPassed,
statusColor: isPassed ? 'red' : isUrgent ? 'orange' : 'green',
})
}

export const dynamic = 'force-dynamic'

STEP 4: FORM 4 PREVENTION MIDDLEWARE
Create lib/middleware/ecz-compliance.ts:
typescriptimport { NextResponse } from 'next/server'

export function validateFormLevelForSBA(formLevel: number): boolean {
if (formLevel === 4) {
throw new Error('Form 4 SBA Prevention: SBA cannot be administered to Form 4 learners')
}
return true
}

export function validateZambianContext(context: string): boolean {
const zambiaKeywords = [
'Zambia', 'Lusaka', 'Kitwe', 'Livingstone', 'Ndola', 'Kitwe',
'maize', 'copper', 'market', 'farmer', 'minibus', 'school',
'hospital', 'village', 'township', 'community', 'Soweto',
'Kwacha', 'Victoria Falls', 'Luangwa'
]

return zambiaKeywords.some(keyword =>
context.toLowerCase().includes(keyword.toLowerCase())
)
}

export function validateSubmissionDeadline(academicYear: number): { valid: boolean; error?: string } {
const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()

if (today > deadline) {
return {
valid: false,
error: `Deadline passed. Submission closed on 31st January ${academicYear + 1}`
}
}

return { valid: true }
}

STEP 5: UPDATE FRONTEND UI
Create Assessment with ECZ Logic - components/CreateAssessmentDialog.tsx
typescript'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'

interface CreateAssessmentDialogProps {
open: boolean
onOpenChange: (open: boolean) => void
onSuccess: () => void
}

export function CreateAssessmentDialog({
open,
onOpenChange,
onSuccess,
}: CreateAssessmentDialogProps) {
const [component, setComponent] = useState<'SBA_TASK' | 'FINAL_EXAMINATION'>('SBA_TASK')
const [formLevel, setFormLevel] = useState<'1' | '2' | '3' | '4'>('1')
const [context, setContext] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)
const [errors, setErrors] = useState<string[]>([])

const handleFormLevelChange = (value: string) => {
if (value === '4' && component === 'SBA_TASK') {
setErrors(['Form 4 cannot have SBA tasks. Only Final Examination is allowed.'])
return
}
setFormLevel(value as any)
setErrors([])
}

const handleComponentChange = (value: string) => {
if (value === 'SBA_TASK' && formLevel === '4') {
setErrors(['SBA tasks cannot be created for Form 4 learners.'])
return
}
setComponent(value as any)
setErrors([])
}

const validateContext = (text: string) => {
const zambiaKeywords = ['Zambia', 'Lusaka', 'Kitwe', 'Livingstone', 'farmer', 'market']
const hasZambiaContext = zambiaKeywords.some(keyword =>
text.toLowerCase().includes(keyword.toLowerCase())
)

    if (!hasZambiaContext) {
      setErrors(['Context must include real-life Zambian scenario (e.g., Lusaka, farmer, market)'])
      return false
    }
    return true

}

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
e.preventDefault()

    const newErrors: string[] = []
    if (component === 'SBA_TASK' && formLevel === '4') {
      newErrors.push('SBA cannot be created for Form 4')
    }
    if (!validateContext(context)) {
      return
    }
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/assessments/sba-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component,
          formLevel: parseInt(formLevel),
          context,
          // ... other fields
        }),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        setErrors([error.error || 'Failed to create assessment'])
      }
    } catch (error) {
      setErrors(['An error occurred'])
    } finally {
      setIsSubmitting(false)
    }

}

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="max-w-2xl">
<DialogHeader>
<DialogTitle>Create Assessment (ECZ Compliant)</DialogTitle>
</DialogHeader>

        {formLevel === '4' && component === 'SBA_TASK' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Form 4 SBA Prevention Active: SBA tasks cannot be created for Form 4. Only Final Examination (100% weighting) is allowed.
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-5">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Assessment Component *</label>
              <Select value={component} onValueChange={handleComponentChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SBA_TASK">SBA Task (30%)</SelectItem>
                  <SelectItem value="FINAL_EXAMINATION">Final Examination (70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Form Level *</label>
              <Select value={formLevel} onValueChange={handleFormLevelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1</SelectItem>
                  <SelectItem value="2">Form 2</SelectItem>
                  <SelectItem value="3">Form 3</SelectItem>
                  <SelectItem value="4">Form 4 (Exam only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Context/Scenario (Must include Zambian context) *
            </label>
            <Textarea
              placeholder="E.g., 'A farmer in Mkushi wants to...', 'A market vendor in Soweto...'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onBlur={() => validateContext(context)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must mention Zambian locations, occupations, or real-life scenarios
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Assessment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

)
}

STEP 6: DEADLINE TRACKER COMPONENT
Create components/ECZDeadlineTracker.tsx:
typescript'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export function ECZDeadlineTracker() {
const [deadline, setDeadline] = useState<any>(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
const fetchDeadline = async () => {
const year = new Date().getFullYear()
const res = await fetch(`/api/ecz/submissions?academicYear=${year}`)
const data = await res.json()
setDeadline(data)
setLoading(false)
}
fetchDeadline()
}, [])

if (loading) return null

if (deadline.isPassed) {
return (
<Alert variant="destructive">
<AlertTriangle className="h-4 w-4" />
<AlertDescription>
⚠️ DEADLINE PASSED: SBA submission deadline was 31st January {deadline.academicYear + 1}.
Contact ECZ immediately if you have late submissions.
</AlertDescription>
</Alert>
)
}

if (deadline.isUrgent) {
return (
<Alert className="border-orange-500 bg-orange-50">
<Clock className="h-4 w-4 text-orange-600" />
<AlertDescription className="text-orange-800">
⏱️ URGENT: Only {deadline.daysRemaining} days remaining until 31st January {deadline.academicYear + 1}
deadline for SBA score submissions to ECZ.
</AlertDescription>
</Alert>
)
}

return (
<Alert className="border-green-500 bg-green-50">
<CheckCircle className="h-4 w-4 text-green-600" />
<AlertDescription className="text-green-800">
✓ {deadline.daysRemaining} days remaining to submit SBA scores to ECZ (deadline: 31st January {deadline.academicYear + 1})
</AlertDescription>
</Alert>
)
}
