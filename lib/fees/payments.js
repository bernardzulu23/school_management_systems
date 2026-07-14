import prisma from '@/lib/prisma'
import { computeInvoiceStatus } from '@/lib/fees/helpers'

export async function recordPayment(schoolId, userId, data) {
  const invoiceId = String(data.invoiceId || '')
  const paid = Number(data.amount)
  if (!invoiceId || !Number.isFinite(paid) || paid <= 0) {
    throw new Error('invoiceId and positive amount are required')
  }

  const invoice = await prisma.studentInvoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: {
      student: { select: { id: true, name: true, class: true } },
      schedule: { select: { name: true } },
    },
  })
  if (!invoice) return null

  const newPaid = Math.round((invoice.amountPaid + paid) * 100) / 100
  const newBalance = Math.max(0, Math.round((invoice.netAmount - newPaid) * 100) / 100)
  const newStatus = computeInvoiceStatus(invoice.netAmount, newPaid, invoice.dueDate)

  const [payment, updatedInvoice] = await prisma.$transaction([
    prisma.feePayment.create({
      data: {
        schoolId,
        invoiceId,
        amount: paid,
        method: String(data.method || 'cash'),
        reference: data.reference ? String(data.reference) : null,
        notes: data.notes ? String(data.notes) : null,
        recordedBy: String(userId || ''),
      },
    }),
    prisma.studentInvoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newPaid, balance: newBalance, status: newStatus },
    }),
  ])

  const actorUser = userId
    ? await prisma.user.findFirst({
        where: { id: String(userId), schoolId },
        select: { id: true, name: true, role: true },
      })
    : null
  if (actorUser) {
    const { recordChangeLog, actorFromUser } = await import('@/lib/changelog/record')
    const { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } =
      await import('@/lib/changelog/constants')
    const a = actorFromUser(actorUser)
    const studentName = invoice.student?.name || 'student'
    const scheduleName = invoice.schedule?.name || 'fee invoice'
    await recordChangeLog({
      schoolId,
      actor: a,
      action: CHANGE_LOG_ACTIONS.RECORDED,
      module: CHANGE_LOG_MODULES.FEES,
      entityType: 'FeePayment',
      entityId: payment.id,
      entityLabel: `Fee payment: ${studentName} — ${scheduleName}`,
      summary: `${buildActorLabel(a)} recorded a ${paid.toFixed(2)} payment for ${studentName} (${scheduleName})`,
      before: {
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status,
      },
      after: {
        amountPaid: newPaid,
        balance: newBalance,
        status: newStatus,
        paymentId: payment.id,
        amount: paid,
        method: payment.method,
      },
      changedFields: ['amountPaid', 'balance', 'status'],
      metadata: { studentId: invoice.studentId, invoiceId },
    })
  }

  return { payment, invoice: updatedInvoice }
}

export async function listRecentPayments(schoolId, limit = 50) {
  return prisma.feePayment.findMany({
    where: { schoolId },
    include: {
      invoice: {
        include: {
          student: { select: { name: true, class: true } },
          schedule: { select: { name: true } },
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
    take: limit,
  })
}
