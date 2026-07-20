/**
 * Security-critical: returns already-authorized context snippets only.
 * Does NOT invent authz — uses getTenantClient (auto schoolId) + the same
 * role/user filters authorized dashboard routes use.
 */
import type { ChatUserRole } from '@prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { logger } from '@/lib/utils/logger'

export type ScopedContextInput = {
  /** schoolId — product tenantId */
  tenantId: string
  userId: string
  role: ChatUserRole
  query: string
  schoolPlan?: string | null
  schoolName?: string | null
}

export type ScopedContextSnippet = {
  source: string
  content: string
}

export type ScopedContextResult = {
  snippets: ScopedContextSnippet[]
  /** Joined text for <retrieved_context> */
  text: string
  sources: Array<{ source: string; ref?: number }>
}

function joinSnippets(snippets: ScopedContextSnippet[]): string {
  return snippets
    .map((s) => `### ${s.source}\n${s.content}`)
    .join('\n\n')
    .trim()
}

async function teacherSnippets(db: ReturnType<typeof getTenantClient>, userId: string) {
  const teacher = await db.teacher.findFirst({
    where: { userId },
    select: { id: true, department: true },
  })
  if (!teacher) {
    return [{ source: 'teacher_profile', content: 'No teacher profile linked to this user.' }]
  }

  const assignments = await db.teachingAssignment.findMany({
    where: { teacherId: teacher.id },
    select: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
    take: 40,
  })

  const lessonPlans = await db.lessonPlan.findMany({
    where: { createdByUserId: userId },
    select: { topic: true, subject: true, grade: true, status: true, weekNumber: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  const assignmentLines = assignments.length
    ? assignments
        .map((a) => `- ${a.subject?.name || 'Subject'} → ${a.class?.name || 'Class'}`)
        .join('\n')
    : '- (no teaching assignments)'

  const planLines = lessonPlans.length
    ? lessonPlans
        .map(
          (p) =>
            `- [${p.status}] ${p.subject || ''} ${p.grade || ''} wk${p.weekNumber ?? '?'} — ${p.topic || ''}`
        )
        .join('\n')
    : '- (no recent lesson plans)'

  return [
    {
      source: 'assigned_classes',
      content: `Department: ${teacher.department || 'n/a'}\nAssignments:\n${assignmentLines}`,
    },
    {
      source: 'recent_lesson_plans',
      content: planLines,
    },
  ]
}

async function hodSnippets(db: ReturnType<typeof getTenantClient>, userId: string) {
  const hod = await db.headOfDepartment.findFirst({
    where: { userId },
    select: { department: true, departmentId: true },
  })
  if (!hod) {
    return [{ source: 'hod_profile', content: 'No HOD profile linked to this user.' }]
  }

  const deptName = String(hod.department || '').trim()

  const deptTeachers = await db.teacher.findMany({
    where: deptName
      ? { department: { equals: deptName, mode: 'insensitive' } }
      : { id: '__none__' },
    select: {
      user: { select: { name: true } },
      department: true,
      assignedSubjects: true,
    },
    take: 50,
  })

  const subjectNames = new Set<string>()
  for (const t of deptTeachers) {
    for (const s of t.assignedSubjects || []) {
      if (s) subjectNames.add(String(s))
    }
  }

  return [
    {
      source: 'hod_department',
      content: `Department: ${deptName || 'n/a'}\nTeachers in department:\n${
        deptTeachers.length
          ? deptTeachers
              .map((t) => `- ${t.user?.name || 'Teacher'} (${t.department || ''})`)
              .join('\n')
          : '- (none listed)'
      }\nAssigned subjects (from teacher profiles):\n${
        subjectNames.size
          ? [...subjectNames]
              .slice(0, 40)
              .map((s) => `- ${s}`)
              .join('\n')
          : '- (none listed)'
      }`,
    },
  ]
}

/**
 * Build role-scoped retrieved context. Caller must already have verified
 * JWT + schoolId (via authMiddleware + resolveAuthenticatedSchoolId).
 */
export async function buildScopedContext(input: ScopedContextInput): Promise<ScopedContextResult> {
  const schoolId = String(input.tenantId || '').trim()
  const userId = String(input.userId || '').trim()
  const role = input.role
  const query = String(input.query || '').trim()

  if (!schoolId || !userId) {
    return { snippets: [], text: '', sources: [] }
  }

  // Never use generative scoped context for headteacher — Phase 1b owns that path.
  if (role === 'HEADTEACHER') {
    return {
      snippets: [
        {
          source: 'headteacher_notice',
          content:
            'Headteacher sessions use the retrieval-only analytics path. Generative school-wide context is not provided here.',
        },
      ],
      text: 'Headteacher sessions use the retrieval-only analytics path.',
      sources: [{ source: 'headteacher_notice' }],
    }
  }

  if (role === 'STUDENT') {
    return {
      snippets: [],
      text: '',
      sources: [],
    }
  }

  const db = getTenantClient(schoolId)
  const snippets: ScopedContextSnippet[] = []

  try {
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, plan: true, academicYear: true, level: true },
    })
    if (school) {
      snippets.push({
        source: 'school_meta',
        content: `Name: ${school.name}\nPlan: ${school.plan}\nLevel: ${school.level}\nAcademic year: ${school.academicYear || 'n/a'}`,
      })
    }

    if (role === 'TEACHER' || role === 'SOLO_TEACHER' || role === 'PLATFORM_ADMIN') {
      snippets.push(...(await teacherSnippets(db, userId)))
    }

    if (role === 'HOD' || role === 'PLATFORM_ADMIN') {
      snippets.push(...(await hodSnippets(db, userId)))
    }

    // Curriculum / school-material RAG — same helper AI routes already use.
    if (
      query &&
      (role === 'TEACHER' || role === 'HOD' || role === 'SOLO_TEACHER' || role === 'PLATFORM_ADMIN')
    ) {
      const rag = await buildRagContextForQuery({
        query,
        schoolId,
        schoolPlan: input.schoolPlan ?? school?.plan,
      })
      if (rag.block) {
        snippets.push({
          source: 'curriculum_rag',
          content: rag.block,
        })
      }
    }
  } catch (err) {
    logger.warn('chat.scoped_context.failed', {
      schoolId,
      userId,
      message: err instanceof Error ? err.message : String(err),
    })
  }

  const text = joinSnippets(snippets)
  return {
    snippets,
    text,
    sources: snippets.map((s, i) => ({ source: s.source, ref: i + 1 })),
  }
}
