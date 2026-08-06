export const dynamic = 'force-dynamic'

import { withApiHandler, apiOk } from '@/lib/middleware/withApiHandler'
import { SmsBalanceSettingsSchema } from '@/lib/schemas'
import { getOrCreateSmsSettings, TRIAL_SMS_CREDITS } from '@/lib/sms/balance'
import prisma from '@/lib/prisma'

/**
 * GET/PATCH /api/sms/balance — Phase 3 example (sms domain).
 */
export const GET = withApiHandler(
  async ({ schoolId }) => {
    const settings = await getOrCreateSmsSettings(schoolId)

    const recent = await prisma.smsBroadcast.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        validCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
      },
    })

    return apiOk({
      data: {
        smsBalance: settings.smsBalance,
        smsTrialGranted: settings.smsTrialGranted ?? 0,
        smsTrialUsed: settings.smsTrialUsed ?? 0,
        trialSmsGrantedAt: settings.trialSmsGrantedAt ?? null,
        trialSmsAllowance: settings.trialSmsGrantedAt ? TRIAL_SMS_CREDITS : null,
        lowBalanceThreshold: settings.lowBalanceThreshold,
        lowBalanceAlertEmail: settings.lowBalanceAlertEmail,
        parentSmsAbsent: settings.parentSmsAbsent ?? true,
        parentSmsLate: settings.parentSmsLate ?? true,
        parentSmsPresent: settings.parentSmsPresent ?? false,
        parentSmsExcused: settings.parentSmsExcused ?? false,
        recentBroadcasts: recent,
      },
    })
  },
  {
    roles: ['ADMIN', 'headteacher', 'HOD', 'hod'],
  }
)

export const PATCH = withApiHandler(
  async ({ schoolId, body }) => {
    const updated = await prisma.schoolSmsSettings.upsert({
      where: { schoolId },
      create: {
        schoolId,
        lowBalanceThreshold: body.lowBalanceThreshold ?? 50,
        lowBalanceAlertEmail: body.lowBalanceAlertEmail ?? null,
        ...(body.parentSmsAbsent !== undefined ? { parentSmsAbsent: body.parentSmsAbsent } : {}),
        ...(body.parentSmsLate !== undefined ? { parentSmsLate: body.parentSmsLate } : {}),
        ...(body.parentSmsPresent !== undefined ? { parentSmsPresent: body.parentSmsPresent } : {}),
        ...(body.parentSmsExcused !== undefined ? { parentSmsExcused: body.parentSmsExcused } : {}),
      },
      update: {
        ...(body.lowBalanceThreshold !== undefined
          ? { lowBalanceThreshold: body.lowBalanceThreshold }
          : {}),
        ...(body.lowBalanceAlertEmail !== undefined
          ? { lowBalanceAlertEmail: body.lowBalanceAlertEmail }
          : {}),
        ...(body.parentSmsAbsent !== undefined ? { parentSmsAbsent: body.parentSmsAbsent } : {}),
        ...(body.parentSmsLate !== undefined ? { parentSmsLate: body.parentSmsLate } : {}),
        ...(body.parentSmsPresent !== undefined ? { parentSmsPresent: body.parentSmsPresent } : {}),
        ...(body.parentSmsExcused !== undefined ? { parentSmsExcused: body.parentSmsExcused } : {}),
      },
    })

    return apiOk({ data: updated })
  },
  {
    roles: ['ADMIN', 'headteacher'],
    body: SmsBalanceSettingsSchema,
  }
)
