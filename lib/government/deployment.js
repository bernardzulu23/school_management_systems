import prisma from '@/lib/prisma'

export async function listDeployments(schoolId) {
  return prisma.teacherDeployment.findMany({
    where: { schoolId },
    include: {
      teacher: {
        select: {
          id: true,
          ts_number: true,
          qualifications: true,
          department: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function upsertDeployment(schoolId, data) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: data.teacherId, schoolId },
    select: { id: true, ts_number: true, qualifications: true },
  })
  if (!teacher) return null

  const tsNumber = data.tsNumber ?? teacher.ts_number ?? null
  const qualification = data.qualification ?? teacher.qualifications ?? null

  const payload = {
    deployedFrom: data.deployedFrom ?? null,
    deploymentDate: data.deploymentDate ? new Date(data.deploymentDate) : null,
    tsNumber,
    gradeLevel: data.gradeLevel ?? null,
    qualification,
    subjectSpec: Array.isArray(data.subjectSpec) ? data.subjectSpec : [],
  }

  const record = await prisma.teacherDeployment.upsert({
    where: { teacherId: teacher.id },
    create: {
      schoolId,
      teacherId: teacher.id,
      ...payload,
    },
    update: payload,
    include: {
      teacher: {
        select: {
          id: true,
          ts_number: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (tsNumber && tsNumber !== teacher.ts_number) {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { ts_number: tsNumber },
    })
  }

  return record
}

export async function patchDeployment(schoolId, teacherId, data) {
  const existing = await prisma.teacherDeployment.findFirst({
    where: { schoolId, teacherId },
  })
  if (!existing) return null
  return upsertDeployment(schoolId, { teacherId, ...data })
}
