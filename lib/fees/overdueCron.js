import { basePrisma } from '@/lib/prisma/client'
import { sendSchoolSms, normalizePhoneNumbers } from '@/lib/sms'
import { pickParentPhone } from '@/lib/fees/helpers'

export async function runFeeOverdueCron({ batchSize = 200 } = {}) {
  const now = new Date()

  const overdueInvoices = await basePrisma.studentInvoice.findMany({
    where: {
      status: { in: ['unpaid', 'partial'] },
      dueDate: { lt: now },
      balance: { gt: 0 },
      school: { ownershipType: { in: ['PRIVATE', 'GRANT_AIDED'] } },
    },
    include: {
      student: {
        select: {
          name: true,
          parent_father_contact: true,
          parent_mother_contact: true,
          guardian_contact: true,
        },
      },
      school: { select: { name: true } },
      schedule: { select: { name: true } },
    },
    take: batchSize,
  })

  let notified = 0

  for (const invoice of overdueInvoices) {
    const phone = pickParentPhone(invoice.student)
    if (phone) {
      const recipients = normalizePhoneNumbers([phone])
      if (recipients.length) {
        const message = `FEE REMINDER: ${invoice.student.name}'s ${invoice.schedule.name} fee of K${Number(invoice.balance).toFixed(2)} is overdue. Please contact ${invoice.school.name}. - ZSMS`
        try {
          await sendSchoolSms({
            to: recipients,
            message,
            schoolId: invoice.schoolId || null,
          })
          notified += 1
        } catch {
          // continue with status update even if SMS fails
        }
      }
    }

    await basePrisma.studentInvoice.update({
      where: { id: invoice.id },
      data: { status: 'overdue' },
    })
  }

  return { processed: overdueInvoices.length, notified }
}
