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
            name: true,
            email: true,
            role: true,
            profile_picture_url: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  return { students, total }
}

export async function findStudentByUserId(userId) {
  return await prisma.student.findUnique({
    where: { userId },
    include: { user: true },
  })
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
            name: true,
            email: true,
            role: true,
            contact_number: true,
            profile_picture_url: true,
          },
        },
        classes: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.teacher.count({ where }),
  ])

  return { teachers, total }
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

export async function findSubjectById(id) {
  return await prisma.subject.findUnique({
    where: { id },
  })
}

// --- CLASS QUERIES ---

export async function findAllClasses(schoolId, page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const where = { ...(schoolId ? { schoolId } : {}) }

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

export async function findClassById(id) {
  return await prisma.class.findUnique({
    where: { id },
  })
}

export async function findHods(schoolId) {
  return await prisma.user.findMany({
    where: {
      schoolId,
      role: 'HOD',
    },
    include: {
      hodProfile: true,
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
    where.category = category
  }

  if (grade && grade !== 'all') {
    where.grade = grade
  }

  if (featured === 'true' || featured === true) {
    where.featured = true
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { student: { name: { contains: search, mode: 'insensitive' } } },
      { tags: { hasSome: [search] } },
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
