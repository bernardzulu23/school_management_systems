import prisma from '@/lib/prisma'

/**
 * Common Database Queries for School Management System
 * Centralized for reusability, consistency, and easier auditing.
 */

// --- USER QUERIES ---

export async function findUserByEmail(schoolId, email) {
  return await prisma.user.findFirst({
    where: {
      schoolId,
      email: {
        equals: String(email || ''),
        mode: 'insensitive',
      },
    },
    include: {
      studentProfile: true,
      teacherProfile: true,
      hodProfile: true,
    },
  })
}

export async function findUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      studentProfile: true,
      teacherProfile: true,
      hodProfile: true,
    },
  })
}

// --- STUDENT QUERIES ---

export async function findStudentsByClass(schoolId, className, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const where = {
    schoolId,
    ...(className ? { class: className } : {}),
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture_url: true,
            contact_number: true,
          },
        },
        results: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        subjectEnrollments: { include: { subject: true, class: true } },
        gamificationProfile: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  // Map user fields to top level for frontend
  const shaped = students.map((s) => ({
    ...s,
    email: s.user?.email ?? null,
    profilePicture: s.user?.profile_picture_url ?? null,
    contactNumber: s.user?.contact_number ?? null,
  }))

  return { students: shaped, total }
}

export async function findStudentsByClassNames(
  schoolId,
  classNames,
  classId = null,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit
  const names = Array.isArray(classNames)
    ? Array.from(new Set(classNames.map((c) => String(c || '').trim()).filter(Boolean)))
    : []

  const or = []
  if (names.length > 0) or.push({ class: { in: names } })
  if (classId) or.push({ classId: String(classId) })

  const where = {
    schoolId,
    ...(or.length > 0 ? { OR: or } : {}),
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture_url: true,
            contact_number: true,
          },
        },
        results: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        subjectEnrollments: { include: { subject: true, class: true } },
        gamificationProfile: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  const shaped = students.map((s) => ({
    ...s,
    email: s.user?.email ?? null,
    profilePicture: s.user?.profile_picture_url ?? null,
    contactNumber: s.user?.contact_number ?? null,
  }))

  return { students: shaped, total }
}

export async function findStudentByUserId(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile_picture_url: true,
          contact_number: true,
        },
      },
      results: true,
      attendance: { orderBy: { date: 'desc' }, take: 30 },
      subjectEnrollments: { include: { subject: true, class: true } },
      gamificationProfile: true,
    },
  })

  if (!student) return null

  return {
    ...student,
    email: student.user?.email ?? null,
    profilePicture: student.user?.profile_picture_url ?? null,
    contactNumber: student.user?.contact_number ?? null,
  }
}

// --- TEACHER QUERIES ---

export async function findTeachersByDepartment(schoolId, department, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  let where = {
    ...(schoolId ? { schoolId } : {}),
  }

  if (department) {
    const dept = await prisma.department.findFirst({
      where: {
        ...(schoolId ? { schoolId } : {}),
        name: department,
      },
      select: { id: true },
    })

    where = dept
      ? {
          ...where,
          departments: {
            some: {
              departmentId: dept.id,
            },
          },
        }
      : {
          ...where,
          department: department,
        }
  }

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture_url: true,
            contact_number: true,
            employeeId: true,
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
        teachingAssignments: {
          include: {
            class: true,
            subject: true,
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.teacher.count({ where }),
  ])

  // Map user fields to top level
  const shaped = teachers.map((t) => ({
    ...t,
    name: t.user?.name ?? t.name,
    email: t.user?.email ?? null,
    profilePicture: t.user?.profile_picture_url ?? null,
    contactNumber: t.user?.contact_number ?? null,
    employeeId: t.user?.employeeId ?? null,
  }))

  return { teachers: shaped, total }
}

// --- SUBJECT QUERIES ---

export async function findAllSubjects(schoolId, page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const where = { ...(schoolId ? { schoolId } : {}) }

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.subject.count({ where }),
  ])

  return { subjects, total }
}

export async function findSubjectById(schoolId, id) {
  return await prisma.subject.findFirst({
    where: { id, schoolId },
  })
}

// --- CLASS QUERIES ---

export async function findAllClasses(schoolId, page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const where = { schoolId }

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.class.count({ where }),
  ])

  return { classes, total }
}

export async function findClassById(schoolId, id) {
  return await prisma.class.findFirst({
    where: { id, schoolId },
  })
}

export async function findHods(schoolId) {
  return await prisma.headOfDepartment.findMany({
    where: {
      schoolId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile_picture_url: true,
          contact_number: true,
        },
      },
      departmentRef: true,
    },
  })
}

// --- ASSESSMENT QUERIES ---

export async function findAssessmentsByClass(schoolId, className) {
  return await prisma.assessment.findMany({
    where: {
      schoolId,
      class: className,
    },
    orderBy: {
      date: 'desc',
    },
  })
}

// --- STUDENT WORK QUERIES ---

export async function findStudentWorks(schoolId, filters = {}) {
  const { category, grade, featured, search, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where = { ...(schoolId ? { schoolId } : {}) }

  if (category && category !== 'all') {
    where.type = String(category)
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { student: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [works, total] = await Promise.all([
    prisma.studentWork.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            class: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.studentWork.count({ where }),
  ])

  return { works, total }
}
