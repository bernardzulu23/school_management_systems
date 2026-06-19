import prisma from '@/lib/prisma'

export async function listGrants(schoolId, academicYear) {
  const where = { schoolId }
  if (academicYear) where.academicYear = academicYear

  const grants = await prisma.schoolGrant.findMany({
    where,
    include: { allocations: true },
    orderBy: [{ academicYear: 'desc' }, { receivedDate: 'desc' }],
  })

  return grants.map((g) => {
    const budgeted = g.allocations.reduce((sum, a) => sum + Number(a.budgeted || 0), 0)
    const spent = g.allocations.reduce((sum, a) => sum + Number(a.spent || 0), 0)
    return {
      ...g,
      totalBudgeted: budgeted,
      totalSpent: spent,
      balance: Number(g.amountReceived) - spent,
    }
  })
}

export async function getGrantsSummary(schoolId, academicYear) {
  const grants = await listGrants(schoolId, academicYear)
  const totalReceived = grants.reduce((s, g) => s + Number(g.amountReceived || 0), 0)
  const totalBudgeted = grants.reduce((s, g) => s + g.totalBudgeted, 0)
  const totalSpent = grants.reduce((s, g) => s + g.totalSpent, 0)
  return {
    totalReceived,
    totalBudgeted,
    totalSpent,
    balance: totalReceived - totalSpent,
    grantCount: grants.length,
  }
}

export async function createGrant(schoolId, data) {
  return prisma.schoolGrant.create({
    data: {
      schoolId,
      grantType: data.grantType,
      amountReceived: Number(data.amountReceived),
      receivedDate: new Date(data.receivedDate),
      academicYear: Number(data.academicYear),
      term: Number(data.term),
      pupilCount: Number(data.pupilCount),
      notes: data.notes || null,
    },
    include: { allocations: true },
  })
}

export async function getGrantForSchool(schoolId, grantId) {
  return prisma.schoolGrant.findFirst({
    where: { id: grantId, schoolId },
    include: { allocations: true },
  })
}

export async function addAllocation(schoolId, grantId, data) {
  const grant = await getGrantForSchool(schoolId, grantId)
  if (!grant) return null
  return prisma.grantAllocation.create({
    data: {
      grantId,
      schoolId,
      lineItem: data.lineItem,
      budgeted: Number(data.budgeted),
      spent: Number(data.spent || 0),
      receipts: Array.isArray(data.receipts) ? data.receipts : [],
    },
  })
}

export async function updateAllocation(schoolId, grantId, allocId, data) {
  const grant = await getGrantForSchool(schoolId, grantId)
  if (!grant) return null
  const existing = grant.allocations.find((a) => a.id === allocId)
  if (!existing) return null
  return prisma.grantAllocation.update({
    where: { id: allocId },
    data: {
      ...(data.spent !== undefined ? { spent: Number(data.spent) } : {}),
      ...(data.receipts !== undefined
        ? { receipts: Array.isArray(data.receipts) ? data.receipts : [] }
        : {}),
      ...(data.budgeted !== undefined ? { budgeted: Number(data.budgeted) } : {}),
    },
  })
}
