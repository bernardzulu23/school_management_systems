STEP 1: ECZ SUBJECTS & CONSTRUCTS SEED DATA
Create lib/ecz/ecz-subjects-data.ts:
typescript/\*\*

- ECZ Assessment Guidelines - All 18 Subjects
- Includes Constructs and Elements of Construct for each subject
- Reference: ECZ_ASSESSMENT_GUIDELINES.pdf
  \*/

export const ECZ_SUBJECTS = [
{
name: 'Mathematics I',
code: 'MATH1',
construct: 'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
elements: [
{
number: 1,
statement: 'Interprets and performs operations on numbers to make decisions (Numbers, Integers, Approximation)'
},
{
number: 2,
statement: 'Uses algebraic thinking to model and solve problems (Algebra, Sets, Relations & Functions)'
},
{
number: 3,
statement: 'Applies spatial reasoning to geometric situations (Angles, Polygons, Similarity & Congruency)'
},
{
number: 4,
statement: 'Interprets and analyses data to make informed decisions (Statistics, Financial Arithmetic)'
}
]
},
{
name: 'Mathematics II',
code: 'MATH2',
construct: 'Demonstrates numerical proficiency, critical thinking, logical and spatial reasoning to solve problems in real life.',
elements: [
{
number: 1,
statement: 'Understands the structure of atoms and the periodic table (Index Notation, Number Bases)'
},
{
number: 2,
statement: 'Explains chemical bonding and the properties of compounds (Equations, Matrices)'
},
{
number: 3,
statement: 'Performs calculations using the mole concept and stoichiometry (Variation, Mensuration)'
},
{
number: 4,
statement: 'Analyses chemical reactions and energy changes (Symmetry, Probability)'
}
]
},
{
name: 'English Language',
code: 'ENG',
construct: 'Communicates effectively and confidently in English language both orally and in writing across various contexts and audiences.',
elements: [
{
number: 1,
statement: 'Listens and responds appropriately in various contexts (Listening and Speaking)'
},
{
number: 2,
statement: 'Reads and comprehends various text types (Reading Comprehension)'
},
{
number: 3,
statement: 'Writes clearly and coherently for different purposes (Composition Writing)'
},
{
number: 4,
statement: 'Applies grammatical structures accurately (Structure)'
},
{
number: 5,
statement: 'Summarises information concisely (Summary)'
}
]
},
{
name: 'Biology',
code: 'BIO',
construct: 'Demonstrates understanding of living organisms, their structure, functions, and interactions with the environment through scientific inquiry.',
elements: [
{
number: 1,
statement: 'Demonstrates understanding of cell structure and function'
},
{
number: 2,
statement: 'Explains the processes of nutrition, transport, and respiration in organisms'
},
{
number: 3,
statement: 'Demonstrates understanding of reproduction, growth, and development'
},
{
number: 4,
statement: 'Analyses ecological relationships and human impact on the environment'
}
]
},
{
name: 'Chemistry',
code: 'CHEM',
construct: 'Demonstrates understanding of the composition, structure, properties, and transformations of matter through experimental inquiry.',
elements: [
{
number: 1,
statement: 'Understands the structure of atoms and the periodic table'
},
{
number: 2,
statement: 'Explains chemical bonding and the properties of compounds'
},
{
number: 3,
statement: 'Performs calculations using the mole concept and stoichiometry'
},
{
number: 4,
statement: 'Analyses chemical reactions and energy changes'
},
{
number: 5,
statement: 'Demonstrates practical laboratory skills'
}
]
},
{
name: 'Physics',
code: 'PHYS',
construct: 'Demonstrates understanding of matter, energy, and their interactions through experimental investigation and problem-solving.',
elements: [
{
number: 1,
statement: 'Applies measurement and units to physical quantities'
},
{
number: 2,
statement: 'Analyses forces, motion, and energy in real-life contexts'
},
{
number: 3,
statement: 'Understands wave phenomena including light and sound'
},
{
number: 4,
statement: 'Demonstrates knowledge of electricity, magnetism, and electronics'
}
]
},
{
name: 'Civic Education',
code: 'CIVIC',
construct: 'Demonstrates understanding of civic rights, responsibilities, governance systems, and national values to participate effectively in Zambian society.',
elements: [
{
number: 1,
statement: 'Understands the political development and governance of Zambia'
},
{
number: 2,
statement: 'Demonstrates knowledge of citizenship rights, duties, and responsibilities'
},
{
number: 3,
statement: 'Analyses the constitution, elections, and the legal system'
},
{
number: 4,
statement: 'Promotes national values, peace, and conflict resolution'
}
]
},
{
name: 'History',
code: 'HIST',
construct: 'Demonstrates understanding of Zambia\'s historical development, African heritage, and global events to promote good citizenship and national identity.',
elements: [
{
number: 1,
statement: 'Analyses Zambia\'s early history, including the origins of its peoples'
},
{
number: 2,
statement: 'Examines the slave trade, colonialism, and the independence struggle'
},
{
number: 3,
statement: 'Evaluates post-independence political and economic development'
},
{
number: 4,
statement: 'Analyses global events such as the World Wars and the Cold War'
}
]
},
{
name: 'Geography',
code: 'GEOG',
construct: 'Analyses spatial relationships, human-environmental interaction, and sustainable development using geographical tools and technologies.',
elements: [
{
number: 1,
statement: 'Understands the solar system, Earth\'s structure, and weather/climate'
},
{
number: 2,
statement: 'Applies map reading skills to locate features and navigate'
},
{
number: 3,
statement: 'Analyses population, settlement patterns, and urbanisation'
},
{
number: 4,
statement: 'Evaluates the use and management of natural resources'
}
]
},
{
name: 'Religious Education',
code: 'RE',
construct: 'Demonstrates understanding of religious beliefs, values, and practices from Christianity, Islam, Hinduism, and Zambian Traditional Religion to promote moral living and social harmony.',
elements: [
{
number: 1,
statement: 'Demonstrates knowledge of the four main religions in Zambia'
},
{
number: 2,
statement: 'Analyses moral issues and ethical decision-making'
},
{
number: 3,
statement: 'Applies religious teachings to real-life situations'
},
{
number: 4,
statement: 'Evaluates the role of religion in promoting peace and unity'
}
]
},
{
name: 'Zambian Languages',
code: 'ZLANG',
construct: 'Communicates effectively in a Zambian language, demonstrating appreciation of Zambian cultural values, oral traditions, and linguistic structures.',
elements: [
{
number: 1,
statement: 'Listens and speaks appropriately in various contexts'
},
{
number: 2,
statement: 'Reads and comprehends texts in a Zambian language'
},
{
number: 3,
statement: 'Writes clearly and correctly in a Zambian language'
},
{
number: 4,
statement: 'Applies grammatical structures appropriately'
},
{
number: 5,
statement: 'Understands and uses oral literature (proverbs, riddles, folktales)'
}
]
},
{
name: 'Literature in English',
code: 'LIT',
construct: 'Demonstrates understanding and appreciation of literary works through critical analysis, interpretation, and creative expression.',
elements: [
{
number: 1,
statement: 'Understands the genres and forms of literature'
},
{
number: 2,
statement: 'Analyses prose, drama, and poetry using literary devices'
},
{
number: 3,
statement: 'Interprets themes, characters, and settings in literary texts'
},
{
number: 4,
statement: 'Creates original literary works'
}
]
},
{
name: 'Computer Studies/ICT',
code: 'ICT',
construct: 'Demonstrates digital literacy skills to use ICT tools responsibly and effectively for learning, communication, and problem-solving.',
elements: [
{
number: 1,
statement: 'Demonstrates understanding of computer hardware and software'
},
{
number: 2,
statement: 'Uses productivity tools (word processors, spreadsheets, presentations)'
},
{
number: 3,
statement: 'Navigates the internet and uses online tools safely'
},
{
number: 4,
statement: 'Understands cybersecurity and digital citizenship'
}
]
},
{
name: 'Physical Education and Sport',
code: 'PE',
construct: 'Demonstrates physical literacy, understanding of health, fitness, and sports skills to promote lifelong healthy living.',
elements: [
{
number: 1,
statement: 'Demonstrates knowledge of the history and importance of physical education'
},
{
number: 2,
statement: 'Performs fitness activities and understands health-related components'
},
{
number: 3,
statement: 'Applies skills in various sports and games'
},
{
number: 4,
statement: 'Understands anatomy, physiology, and sports biomechanics'
}
]
},
{
name: 'Art and Design',
code: 'ART',
construct: 'Demonstrates creative expression, visual literacy, and technical skills through various art forms to communicate ideas and appreciate cultural heritage.',
elements: [
{
number: 1,
statement: 'Demonstrates understanding of visual arts elements and principles'
},
{
number: 2,
statement: 'Creates original artworks in various media (drawing, painting, crafts)'
},
{
number: 3,
statement: 'Appreciates Zambian and African art heritage'
},
{
number: 4,
statement: 'Applies entrepreneurial skills in art'
}
]
},
{
name: 'Music Arts',
code: 'MUSIC',
construct: 'Demonstrates musical understanding, creativity, and performance skills through analysing, composing, and performing music.',
elements: [
{
number: 1,
statement: 'Understands music theory (rhythm, pitch, intervals, harmony)'
},
{
number: 2,
statement: 'Appreciates Zambian and African music styles'
},
{
number: 3,
statement: 'Demonstrates performance skills on voice or instrument'
},
{
number: 4,
statement: 'Composes original music'
}
]
},
{
name: 'Food and Nutrition',
code: 'FN',
construct: 'Demonstrates understanding of food science, nutrition principles, and practical culinary skills to promote health and entrepreneurship.',
elements: [
{
number: 1,
statement: 'Understands food nutrients and their importance'
},
{
number: 2,
statement: 'Applies principles of meal planning and food preparation'
},
{
number: 3,
statement: 'Demonstrates food safety and hygiene practices'
},
{
number: 4,
statement: 'Explores entrepreneurial opportunities in food'
}
]
},
{
name: 'Travel and Tourism',
code: 'TT',
construct: 'Demonstrates understanding of the travel and tourism industry, including destinations, services, sustainability, and entrepreneurship.',
elements: [
{
number: 1,
statement: 'Understands the history and structure of the tourism industry in Zambia'
},
{
number: 2,
statement: 'Identifies and promotes tourist attractions in Zambia'
},
{
number: 3,
statement: 'Applies principles of customer care and tour guiding'
},
{
number: 4,
statement: 'Analyses sustainable tourism practices'
}
]
},
{
name: 'Agricultural Science',
code: 'AGR',
construct: 'Demonstrates understanding of agricultural principles, practices, and enterprises to contribute to food security and economic development.',
elements: [
{
number: 1,
statement: 'Understands agriculture in Zambia (importance, activities, factors)'
},
{
number: 2,
statement: 'Applies principles of soil science and crop production'
},
{
number: 3,
statement: 'Demonstrates knowledge of livestock production'
},
{
number: 4,
statement: 'Understands farm management and entrepreneurship'
}
]
}
]

export type EczSubjectData = typeof ECZ_SUBJECTS[0]

export function getSubjectByCode(code: string) {
return ECZ_SUBJECTS.find(s => s.code === code)
}

export function getSubjectByName(name: string) {
return ECZ_SUBJECTS.find(s => s.name === name)
}

export function getAllSubjects() {
return ECZ_SUBJECTS
}

STEP 2: COMPLETE API IMPLEMENTATION
A. Seed ECZ Subjects app/api/ecz/subjects/seed/route.ts
typescriptimport { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { ECZ_SUBJECTS } from '@/lib/ecz/ecz-subjects-data'

export async function POST(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

// Only ADMIN can seed subjects
if (!roleCheck(auth.user, ['ADMIN'])) {
return NextResponse.json({ error: 'Only admins can seed subjects' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

try {
let createdCount = 0
let skippedCount = 0

    for (const subjectData of ECZ_SUBJECTS) {
      // Check if subject already exists
      const existing = await prisma.subject.findFirst({
        where: {
          schoolId,
          code: subjectData.code,
        },
      })

      if (existing) {
        skippedCount++
        continue
      }

      // Create subject with its elements
      await prisma.subject.create({
        data: {
          name: subjectData.name,
          code: subjectData.code,
          description: `ECZ ${subjectData.code}: ${subjectData.construct}`,
          construct: subjectData.construct,
          school: { connect: { id: schoolId } },
          constructElements: {
            create: subjectData.elements.map(el => ({
              elementNumber: el.number,
              statement: el.statement,
            })),
          },
        },
      })

      createdCount++
    }

    return NextResponse.json(
      {
        success: true,
        message: `Seeded ECZ subjects`,
        created: createdCount,
        skipped: skippedCount,
        total: ECZ_SUBJECTS.length,
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error seeding subjects:', error)
return NextResponse.json({ error: 'Failed to seed subjects' }, { status: 500 })
}
}

// GET - List all seeded subjects for this school
export async function GET(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

try {
const subjects = await prisma.subject.findMany({
where: { schoolId },
include: {
constructElements: {
orderBy: { elementNumber: 'asc' },
},
},
orderBy: { name: 'asc' },
})

    return NextResponse.json({
      success: true,
      count: subjects.length,
      data: subjects.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        construct: s.construct,
        elements: s.constructElements.map(e => ({
          number: e.elementNumber,
          statement: e.statement,
        })),
      })),
    })

} catch (error) {
console.error('Error fetching subjects:', error)
return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
}
}

export const dynamic = 'force-dynamic'
B. Create SBA Assessment app/api/ecz/assessments/create/route.ts
typescriptimport { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import {
validateFormLevelForSBA,
validateZambianContext,
} from '@/lib/ecz/ecz-compliance'

const ZAMBIA_KEYWORDS = [
'Zambia',
'Lusaka',
'Kitwe',
'Livingstone',
'Ndola',
'Mkushi',
'maize',
'copper',
'market',
'farmer',
'minibus',
'Soweto',
'Kafue',
'Victoria Falls',
'Luangwa',
'traditional',
'ceremony',
'Kuomboka',
'Ncwala',
'teacher',
'school',
'community',
'village',
]

export async function POST(request: Request) {
const auth = authMiddleware(request)
if (!auth.isAuthenticated) return auth.response

if (!roleCheck(auth.user, ['TEACHER', 'HOD', 'ADMIN'])) {
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

const body = await request.json().catch(() => ({}))
const errors: string[] = []

// Validation: Form 4 SBA Prevention
if (body.component === 'SBA_TASK' && body.formLevel === 4) {
errors.push('❌ Form 4 SBA Prevention: SBA cannot be created for Form 4 learners. Only Final Examination applies.')
}

// Validation: Zambian Context
const hasZambiaContext = ZAMBIA_KEYWORDS.some(keyword =>
body.context?.toLowerCase().includes(keyword.toLowerCase())
)
if (!hasZambiaContext && body.component === 'SBA_TASK') {
errors.push(
'❌ Context must include real-life Zambian scenario (e.g., Lusaka, farmer, market, teacher, school, community)'
)
}

if (errors.length > 0) {
return NextResponse.json({ errors }, { status: 400 })
}

try {
// Get subject
const subject = await prisma.subject.findUnique({
where: { id: body.subjectId },
})

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Create assessment
    const assessment = await prisma.eczAssessment.create({
      data: {
        subject: { connect: { id: subject.id } },
        school: { connect: { id: schoolId } },
        component: body.component,
        formLevel: body.formLevel,
        title: body.title,
        description: body.description,
        type: body.type || 'Project',
        context: body.context,
        sbaTaskTemplate: body.sbaTaskTemplate,
        materialsProvided: body.materialsProvided || [],
        elementLabel: body.elementLabel,
        maxMarks: body.maxMarks || 20,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        submissionDeadline:
          body.component === 'SBA_TASK'
            ? new Date(new Date().getFullYear() + 1, 0, 31) // 31st January next year
            : null,
        createdBy: auth.user.id,
        status: 'DRAFT',
      },
      include: { subject: true },
    })

    // Create default 4-level rubric
    if (body.createDefaultRubric !== false) {
      const rubric = await prisma.eczRubric.create({
        data: {
          assessment: { connect: { id: assessment.id } },
          criteria: {
            create: [
              {
                name: 'Quality and Accuracy',
                excellent: 'Excellent (4): Exceeds expectations, outstanding quality and accuracy',
                good: 'Good (3): Meets expectations, quality work',
                fair: 'Fair (2): Partially meets expectations, some inaccuracies',
                needsImpr: 'Needs Improvement (1): Below expectations, significant errors',
              },
              {
                name: 'Understanding and Application',
                excellent:
                  'Excellent (4): Deep understanding, creative real-world application',
                good: 'Good (3): Solid understanding, appropriate application',
                fair: 'Fair (2): Basic understanding, some application with support',
                needsImpr:
                  'Needs Improvement (1): Limited understanding, minimal application',
              },
              {
                name: 'Presentation and Organization',
                excellent:
                  'Excellent (4): Well-organized, clear communication, excellent presentation',
                good: 'Good (3): Organized, mostly clear communication',
                fair: 'Fair (2): Somewhat organized, adequate presentation',
                needsImpr:
                  'Needs Improvement (1): Poorly organized, unclear communication',
              },
              {
                name: 'Completeness',
                excellent: 'Excellent (4): All requirements fully completed',
                good: 'Good (3): Most requirements completed',
                fair: 'Fair (2): Some requirements completed',
                needsImpr:
                  'Needs Improvement (1): Minimal requirements completed',
              },
            ],
          },
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'SBA assessment created successfully',
        data: {
          id: assessment.id,
          title: assessment.title,
          component: assessment.component,
          formLevel: assessment.formLevel,
          subject: subject.name,
          maxMarks: assessment.maxMarks,
          dueDate: assessment.dueDate,
          createdAt: assessment.createdAt,
        },
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error creating assessment:', error)
return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
}
}

export const dynamic = 'force-dynamic'
C. Record SBA Scores (with 4-level Rubric) app/api/ecz/assessments/scores/route.ts
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
const assessment = await prisma.eczAssessment.findUnique({
where: { id: body.assessmentId },
})

if (!assessment) {
return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
}

if (body.formLevel === 4 && assessment.component === 'SBA_TASK') {
return NextResponse.json(
{
error:
'❌ Cannot record SBA for Form 4. Only Final Examination (70% weighting) applies for Form 4.',
},
{ status: 400 }
)
}

try {
// Calculate score from 4-level rubric
// Excellent=4, Good=3, Fair=2, Needs Improvement=1
// Score out of 20
const rubricTotal =
(body.excellentCount || 0) _ 4 +
(body.goodCount || 0) _ 3 +
(body.fairCount || 0) _ 2 +
(body.needsImprovementCount || 0) _ 1

    // Normalize to max marks (typically 20 per task)
    const maxRubricPoints = (body.criteriaCount || 4) * 4
    const calculatedScore = Math.round((rubricTotal / maxRubricPoints) * assessment.maxMarks)

    // Check if score already exists
    const existing = await prisma.eczAssessmentScore.findFirst({
      where: {
        assessmentId: body.assessmentId,
        studentId: body.studentId,
        academicYear: body.academicYear,
      },
    })

    let scoreRecord
    if (existing) {
      // Update existing score
      scoreRecord = await prisma.eczAssessmentScore.update({
        where: { id: existing.id },
        data: {
          ...(body.taskNumber === 1 && { task1Score: calculatedScore }),
          ...(body.taskNumber === 2 && { task2Score: calculatedScore }),
          ...(body.taskNumber === 3 && { task3Score: calculatedScore }),
          ...(body.taskNumber === 4 && { termTestScore: Math.min(40, calculatedScore * 2) }),
          rubricBreakdown: {
            excellent: body.excellentCount || 0,
            good: body.goodCount || 0,
            fair: body.fairCount || 0,
            needsImprovement: body.needsImprovementCount || 0,
          },
        },
        include: { student: true, assessment: true },
      })
    } else {
      // Create new score record
      scoreRecord = await prisma.eczAssessmentScore.create({
        data: {
          assessment: { connect: { id: body.assessmentId } },
          student: { connect: { id: body.studentId } },
          school: { connect: { id: schoolId } },
          formLevel: body.formLevel,
          academicYear: body.academicYear,

          ...(body.taskNumber === 1 && { task1Score: calculatedScore }),
          ...(body.taskNumber === 2 && { task2Score: calculatedScore }),
          ...(body.taskNumber === 3 && { task3Score: calculatedScore }),
          ...(body.taskNumber === 4 && { termTestScore: Math.min(40, calculatedScore * 2) }),

          rubricBreakdown: {
            excellent: body.excellentCount || 0,
            good: body.goodCount || 0,
            fair: body.fairCount || 0,
            needsImprovement: body.needsImprovementCount || 0,
          },

          submissionStatus: 'COMPLETED',
        },
        include: { student: true, assessment: true },
      })
    }

    // Recalculate total SBA score
    const totalScore = (scoreRecord.task1Score || 0) +
      (scoreRecord.task2Score || 0) +
      (scoreRecord.task3Score || 0) +
      (scoreRecord.termTestScore || 0)

    await prisma.eczAssessmentScore.update({
      where: { id: scoreRecord.id },
      data: { totalSBAScore: totalScore },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Score recorded successfully',
        data: {
          id: scoreRecord.id,
          student: scoreRecord.student.name,
          taskNumber: body.taskNumber,
          scoreRecorded: calculatedScore,
          formLevel: scoreRecord.formLevel,
        },
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error recording score:', error)
return NextResponse.json({ error: 'Failed to record score' }, { status: 500 })
}
}

// GET - Fetch scores for export
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
const academicYear = searchParams.get('academicYear')
? parseInt(searchParams.get('academicYear')!)
: new Date().getFullYear()

try {
const scores = await prisma.eczAssessmentScore.findMany({
where: {
schoolId,
...(formLevel && { formLevel }),
academicYear,
assessment: subjectId ? { subjectId } : undefined,
},
include: {
assessment: { include: { subject: true } },
student: true,
},
orderBy: [
{ assessment: { subject: { name: 'asc' } } },
{ student: { name: 'asc' } },
],
})

    return NextResponse.json({
      success: true,
      totalRecords: scores.length,
      readyForSubmission: scores.length > 0,
      data: scores.map(score => ({
        learnerName: score.student.name,
        learnerNumber: score.student.exam_number || 'N/A',
        subject: score.assessment.subject.name,
        formLevel: score.formLevel,
        sbaScore: score.totalSBAScore,
        task1: score.task1Score,
        task2: score.task2Score,
        task3: score.task3Score,
        termTest: score.termTestScore,
        academicYear: score.academicYear,
      })),
    })

} catch (error) {
console.error('Error fetching scores:', error)
return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
}
}

export const dynamic = 'force-dynamic'
D. ECZ Submission with Deadline Enforcement app/api/ecz/submissions/generate/route.ts
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

const body = await request.json().catch(() => ({}))
const { subjectId, formLevel, academicYear } = body

// ⚠️ CRITICAL: Validate deadline (31st January)
const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()

if (today > deadline) {
return NextResponse.json(
{
success: false,
error: `❌ DEADLINE PASSED: SBA scores must be submitted by 31st January ${academicYear + 1}. Contact ECZ immediately.`,
},
{ status: 400 }
)
}

try {
// Fetch all scores for submission
const scores = await prisma.eczAssessmentScore.findMany({
where: {
schoolId,
formLevel,
academicYear,
assessment: { subjectId },
},
include: {
assessment: { include: { subject: true } },
student: true,
},
})

    if (scores.length === 0) {
      return NextResponse.json(
        { error: 'No scores found for submission' },
        { status: 400 }
      )
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, eczCentreNumber: true },
    })

    // Generate ECZ CSV
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
      },
    })

    // Update scores to submitted
    await prisma.eczAssessmentScore.updateMany({
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
      },
    })

    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json(
      {
        success: true,
        message: '✅ Submission generated successfully',
        csvData,
        submissionId: submission.id,
        daysUntilDeadline,
        school: school?.name,
        centreNumber: school?.eczCentreNumber,
        totalLearners: scores.length,
      },
      { status: 201 }
    )

} catch (error) {
console.error('Error generating submission:', error)
return NextResponse.json({ error: 'Failed to generate submission' }, { status: 500 })
}
}

function generateECZCSV(
school: any,
scores: any[],
formLevel: number,
year: number
): string {
let csv = `SUBJECT,FORM,SCHOOL,CENTRE_NUMBER,YEAR\n`
csv += `"${scores[0]?.assessment.subject.name}",${formLevel},"${school.name}",${school.eczCentreNumber || 'N/A'},${year}\n\n`
csv += `LEARNER_NAME,LEARNER_NUMBER,SBA_SCORE(0-100)\n`

scores.forEach(score => {
csv += `"${score.student.name}",${score.student.exam_number || 'N/A'},${score.totalSBAScore}\n`
})

return csv
}

// GET - Deadline status
export async function GET(request: Request) {
const { searchParams } = new URL(request.url)
const academicYear = parseInt(
searchParams.get('academicYear') || new Date().getFullYear().toString()
)

const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()
const daysRemaining = Math.ceil(
(deadline.getTime() - today.getTime()) / (1000 _ 60 _ 60 \* 24)
)

const statusColor =
today > deadline ? 'red' : daysRemaining < 14 ? 'orange' : 'green'
const statusMessage =
today > deadline
? '❌ DEADLINE PASSED'
: daysRemaining < 14
? '⚠️ URGENT'
: '✅ ON TRACK'

return NextResponse.json({
academicYear,
deadline: deadline.toISOString().split('T')[0],
daysRemaining: Math.max(0, daysRemaining),
isPassed: today > deadline,
isUrgent: daysRemaining < 14,
statusColor,
statusMessage,
})
}

export const dynamic = 'force-dynamic'

STEP 3: ECZ COMPLIANCE VALIDATION LIBRARY
Create lib/ecz/ecz-compliance.ts:
typescript/\*\*

- ECZ Compliance Validation
- Ensures all assessments follow ECZ guidelines strictly
  \*/

export interface ValidationResult {
valid: boolean
errors: string[]
warnings: string[]
}

/\*\*

- Form 4 SBA Prevention - MANDATORY ECZ REQUIREMENT
- Form 4 learners CANNOT have SBA
- Only Final Examination (70% weighting) applies
  \*/
  export function validateFormLevelForSBA(formLevel: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

if (formLevel === 4) {
errors.push(
'❌ ECZ COMPLIANCE: Form 4 cannot have SBA tasks. Only Final Examination applies (70% weighting).'
)
}

return {
valid: errors.length === 0,
errors,
warnings,
}
}

/\*\*

- Zambian Context Validation - MANDATORY ECZ REQUIREMENT
- All SBA tasks MUST include real-life Zambian context
  \*/
  export function validateZambianContext(context: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

const zambiaKeywords = [
'Zambia',
'Lusaka',
'Kitwe',
'Livingstone',
'Ndola',
'Mkushi',
'Kafue',
'maize',
'copper',
'market',
'farmer',
'minibus',
'Soweto',
'Victoria Falls',
'Luangwa',
'traditional',
'ceremony',
'teacher',
'school',
'community',
'village',
'Kwacha',
]

const hasZambiaContext = zambiaKeywords.some(keyword =>
context.toLowerCase().includes(keyword.toLowerCase())
)

if (!hasZambiaContext) {
errors.push(
'❌ Context must include real-life Zambian scenario (e.g., locations: Lusaka, Kitwe, Livingstone; occupations: farmer, teacher; items: maize, copper, market)'
)
}

return {
valid: errors.length === 0,
errors,
warnings,
}
}

/\*\*

- ECZ Submission Deadline Validation - MANDATORY ECZ REQUIREMENT
- SBA scores MUST be submitted by 31st January of the year after the academic year
  \*/
  export function validateSubmissionDeadline(
  academicYear: number
  ): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

const deadline = new Date(`${academicYear + 1}-01-31`)
const today = new Date()

if (today > deadline) {
errors.push(
`❌ DEADLINE PASSED: SBA scores must be submitted by 31st January ${academicYear + 1}. Contact ECZ immediately.`
)
}

const daysRemaining = Math.ceil(
(deadline.getTime() - today.getTime()) / (1000 _ 60 _ 60 \* 24)
)

if (daysRemaining < 14 && daysRemaining > 0) {
warnings.push(
`⚠️ URGENT: Only ${daysRemaining} days remaining until 31st January ${academicYear + 1} deadline.`
)
}

return {
valid: errors.length === 0,
errors,
warnings,
}
}

/\*\*

- 4-Level Rubric Scoring
- Excellent (4), Good (3), Fair (2), Needs Improvement (1)
  _/
  export function calculateRubricScore(
  excellentCount: number,
  goodCount: number,
  fairCount: number,
  needsImprovementCount: number,
  maxMarks: number = 20
  ): number {
  const totalCriteria = excellentCount + goodCount + fairCount + needsImprovementCount
  const totalPoints =
  excellentCount _ 4 + goodCount _ 3 + fairCount _ 2 + needsImprovementCount \* 1

const maxPossiblePoints = totalCriteria \* 4
if (maxPossiblePoints === 0) return 0

return Math.round((totalPoints / maxPossiblePoints) \* maxMarks)
}

/\*\*

- SBA Weighting Validation
- SBA = 30%, Final Examination = 70%
  _/
  export function validateWeighting(sbaScore: number, examScore: number): number {
  const sbaWeighted = sbaScore _ 0.3 // 30%
  const examWeighted = examScore \* 0.7 // 70%
  return Math.round(sbaWeighted + examWeighted)
  }

/\*\*

- Form-Level Specific Validation
  \*/
  export function validateFormLevelAssessmentStructure(
  formLevel: number,
  component: 'SBA_TASK' | 'FINAL_EXAMINATION'
  ): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

if (formLevel < 1 || formLevel > 4) {
errors.push('❌ Invalid form level. Must be 1, 2, 3, or 4.')
}

if (formLevel === 4 && component === 'SBA_TASK') {
errors.push(
'❌ Form 4 cannot have SBA tasks. Only Final Examination (100%) applies.'
)
}

if (formLevel < 4 && component === 'FINAL_EXAMINATION') {
warnings.push(
'⚠️ For Forms 1-3: Include both SBA (30%) and Final Examination (70%) for comprehensive assessment.'
)
}

return {
valid: errors.length === 0,
errors,
warnings,
}
}

/\*\*

- Complete ECZ Assessment Validation
  \*/
  export interface EczAssessmentValidationInput {
  formLevel: number
  component: 'SBA_TASK' | 'FINAL_EXAMINATION'
  context?: string
  academicYear: number
  }

export function validateEczAssessment(
input: EczAssessmentValidationInput
): ValidationResult {
const allErrors: string[] = []
const allWarnings: string[] = []

// 1. Form level validation
const formValidation = validateFormLevelAssessmentStructure(
input.formLevel,
input.component
)
allErrors.push(...formValidation.errors)
allWarnings.push(...formValidation.warnings)

// 2. Zambian context validation (for SBA only)
if (input.component === 'SBA_TASK' && input.context) {
const contextValidation = validateZambianContext(input.context)
allErrors.push(...contextValidation.errors)
allWarnings.push(...contextValidation.warnings)
}

// 3. Deadline validation (for SBA submission)
if (input.component === 'SBA_TASK') {
const deadlineValidation = validateSubmissionDeadline(input.academicYear)
allErrors.push(...deadlineValidation.errors)
allWarnings.push(...deadlineValidation.warnings)
}

return {
valid: allErrors.length === 0,
errors: allErrors,
warnings: allWarnings,
}
}

STEP 4: FRONTEND COMPONENTS
A. ECZ Assessment Hub app/dashboard/teacher/assessments/ecz/page.tsx
typescript'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
AlertTriangle,
Calendar,
CheckCircle,
Clock,
Download,
Plus,
} from 'lucide-react'
import { CreateEczAssessmentForm } from '@/components/ecz/CreateEczAssessmentForm'
import { ECZDeadlineTracker } from '@/components/ecz/ECZDeadlineTracker'

export default function ECZAssessmentHub() {
const [deadline, setDeadline] = useState<any>(null)
const [loading, setLoading] = useState(true)
const [showCreateForm, setShowCreateForm] = useState(false)

useEffect(() => {
fetchDeadlineStatus()
}, [])

const fetchDeadlineStatus = async () => {
try {
const year = new Date().getFullYear()
const res = await fetch(`/api/ecz/submissions/generate?academicYear=${year}`)
const data = await res.json()
setDeadline(data)
} catch (error) {
console.error('Failed to fetch deadline:', error)
} finally {
setLoading(false)
}
}

if (loading) {
return <div className="animate-pulse">Loading...</div>
}

return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<h1 className="text-3xl font-bold">ECZ SBA Assessment Hub (Zambia)</h1>
<Button onClick={() => setShowCreateForm(true)} className="gap-2">
<Plus className="h-4 w-4" />
Create SBA Task
</Button>
</div>

      {/* Deadline Tracker */}
      <ECZDeadlineTracker deadline={deadline} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total SBA Tasks</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scores Recorded</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Days to Deadline</p>
              <p className="text-2xl font-bold">{deadline?.daysRemaining || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submissions</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <Download className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Important Notes */}
      <Alert className="border-l-4 border-blue-500 bg-blue-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>ECZ Compliance Requirements:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            <li>✅ Form 1-3: SBA (30%) + Final Exam (70%)</li>
            <li>❌ Form 4: NO SBA. Only Final Examination (100%)</li>
            <li>📍 All SBA tasks MUST include real-life Zambian context</li>
            <li>📅 SBA scores must be submitted by 31st January</li>
            <li>🎯 Use 4-level rubric: Excellent (4), Good (3), Fair (2), Needs Improvement (1)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Create Assessment Form Modal */}
      {showCreateForm && (
        <CreateEczAssessmentForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            // Refresh data
          }}
        />
      )}
    </div>

)
}
B. Create Assessment Form components/ecz/CreateEczAssessmentForm.tsx
typescript'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface CreateEczAssessmentFormProps {
onClose: () => void
onSuccess: () => void
}

export function CreateEczAssessmentForm({
onClose,
onSuccess,
}: CreateEczAssessmentFormProps) {
const [component, setComponent] = useState<'SBA_TASK' | 'FINAL_EXAMINATION'>(
'SBA_TASK'
)
const [formLevel, setFormLevel] = useState<'1' | '2' | '3' | '4'>('1')
const [context, setContext] = useState('')
const [errors, setErrors] = useState<string[]>([])
const [isSubmitting, setIsSubmitting] = useState(false)

const handleFormLevelChange = (value: string) => {
if (value === '4' && component === 'SBA_TASK') {
setErrors([
'❌ Form 4 cannot have SBA tasks. Select Final Examination instead.',
])
return
}
setFormLevel(value as any)
setErrors([])
}

const handleComponentChange = (value: string) => {
if (value === 'SBA_TASK' && formLevel === '4') {
setErrors([
'❌ Form 4 SBA Prevention: SBA tasks cannot be created for Form 4.',
])
return
}
setComponent(value as any)
setErrors([])
}

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
e.preventDefault()

    // Form 4 SBA Prevention
    if (component === 'SBA_TASK' && formLevel === '4') {
      setErrors([
        '❌ Cannot create SBA for Form 4. Only Final Examination applies.',
      ])
      return
    }

    // Zambian context validation
    const zambiaKeywords = [
      'Zambia',
      'Lusaka',
      'farmer',
      'market',
      'teacher',
      'school',
      'community',
    ]
    const hasZambiaContext = zambiaKeywords.some(keyword =>
      context.toLowerCase().includes(keyword.toLowerCase())
    )

    if (!hasZambiaContext && component === 'SBA_TASK') {
      setErrors([
        '❌ Context must include real-life Zambian scenario (e.g., Lusaka, farmer, market, school)',
      ])
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ecz/assessments/create', {
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
      } else {
        const error = await response.json()
        setErrors(error.errors || [error.error])
      }
    } finally {
      setIsSubmitting(false)
    }

}

return (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
<div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4">
<h2 className="text-xl font-bold">Create ECZ Assessment</h2>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Assessment Component *
              </label>
              <Select value={component} onValueChange={handleComponentChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SBA_TASK">SBA Task (30%)</SelectItem>
                  <SelectItem value="FINAL_EXAMINATION">
                    Final Examination (70%)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Form Level *</label>
              <Select value={formLevel} onValueChange={handleFormLevelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1</SelectItem>
                  <SelectItem value="2">Form 2</SelectItem>
                  <SelectItem value="3">Form 3</SelectItem>
                  <SelectItem value="4">
                    Form 4 (Exam Only) {component === 'SBA_TASK' ? '❌' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Context (Must include Zambian scenario) *
            </label>
            <Textarea
              placeholder="E.g., 'A farmer in Mkushi selling maize at the market wants to calculate profit...'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="h-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must mention: Zambian locations (Lusaka, Kitwe), occupations (farmer, teacher), or scenarios
            </p>
          </div>

          {component === 'SBA_TASK' && formLevel !== '4' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Form {formLevel} SBA Task: Students will be assessed on both SBA (30%) and Final Examination (70%)
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Assessment'}
            </Button>
          </div>
        </form>
      </div>
    </div>

)
}

STEP 5: DATABASE MIGRATION
bashnpx prisma migrate dev --name ecz_assessment_compliance
npx prisma generate

STEP 6: COMPLETE CHECKLIST
markdown# ECZ Assessment Implementation Checklist

## Database Setup

- [x] Run Prisma migration (ecz_assessment_compliance)
- [x] Create ECZ models:
  - SubjectConstructElement
  - EczAssessment
  - EczAssessmentItem
  - EczAssessmentScore
  - EczRubric, EczRubricCriterion
  - EczSubmission
  - SpecialAccommodation
  - QuestionBank

## Data Seeding

- [ ] Seed all 18 ECZ subjects with constructs
- [ ] Verify Subject data with constructs populated
- [ ] Update School with eczCentreNumber

## API Implementation

- [ ] POST /api/ecz/subjects/seed (seed 18 subjects)
- [ ] GET /api/ecz/subjects/seed (list subjects)
- [ ] POST /api/ecz/assessments/create (create SBA/exam)
- [ ] POST /api/ecz/assessments/scores (record scores)
- [ ] GET /api/ecz/assessments/scores (export scores)
- [ ] POST /api/ecz/submissions/generate (ECZ CSV)
- [ ] GET /api/ecz/submissions/generate (deadline status)

## Validation Logic

- [ ] Form 4 SBA prevention (block SBA for Form 4)
- [ ] Zambian context validation (all SBA tasks)
- [ ] 31st January deadline enforcement
- [ ] 4-level rubric scoring (Excellent, Good, Fair, Needs Improvement)
- [ ] 30/70 weighting calculation (SBA 30%, Exam 70%)

## Frontend Components

- [ ] ECZ Assessment Hub page
- [ ] Create Assessment Form with Form 4 prevention
- [ ] Deadline Tracker with urgent alerts
- [ ] SBA Score Recording Form (4-level rubric)
- [ ] ECZ Submission Preview & Export

## Testing

- [ ] Test Form 4 SBA prevention (should BLOCK)
- [ ] Test Zambian context validation
- [ ] Test 31 January deadline blocking
- [ ] Test 4-level rubric scoring
- [ ] Test ECZ CSV generation
- [ ] Test complete assessment workflow

## Documentation

- [ ] Update teacher guide (ECZ compliance)
- [ ] Create HOD training materials
- [ ] Document API endpoints
- [ ] Create FAQ for common issues

## Deployment

- [ ] Deploy to staging
- [ ] Conduct full ECZ compliance audit
- [ ] Train all HODs
- [ ] Deploy to production
- [ ] Monitor submissions during January

CRITICAL REMINDERS - NON-NEGOTIABLE
🔴 FORM 4 SBA PREVENTION: MANDATORY
❌ Form 4 learners cannot receive SBA tasks
✅ Form 4 = Final Examination 100% only

🔴 31ST JANUARY DEADLINE: MANDATORY
📅 SBA scores MUST be submitted by 31st January
❌ System blocks submissions after this date
⏰ Send urgent alerts when < 14 days remain

🔴 ZAMBIAN CONTEXT: MANDATORY
📍 Every SBA task MUST include real-life Zambia scenario
✅ Examples: Lusaka market vendor, Mkushi farmer, teacher

🔴 4-LEVEL RUBRIC: MANDATORY
⭐ Excellent (4), Good (3), Fair (2), Needs Improvement (1)
📊 Use for all SBA scoring

🔴 30/70 WEIGHTING: MANDATORY
📊 Forms 1-3: SBA 30% + Exam 70%
📊 Form 4: Exam 100% (no SBA)
