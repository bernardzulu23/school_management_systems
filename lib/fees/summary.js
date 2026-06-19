import prisma from '@/lib/prisma'

export async function getFeeSummary(schoolId) {
  const agg = await prisma.studentInvoice.aggregate({
    where: { schoolId },
    _sum: { netAmount: true, amountPaid: true, balance: true },
    _count: { id: true },
  })

  const overdueCount = await prisma.studentInvoice.count({
    where: { schoolId, status: 'overdue' },
  })

  const totalBilled = agg._sum.netAmount || 0
  const totalCollected = agg._sum.amountPaid || 0
  const outstanding = agg._sum.balance || 0
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0

  return {
    totalBilled,
    totalCollected,
    outstanding,
    collectionRate,
    overdueCount,
    invoiceCount: agg._count.id || 0,
  }
}
