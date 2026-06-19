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
