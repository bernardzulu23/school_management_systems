import { sendOnboardingCompletedNotifyEmail } from '@/config/email'
import { getPilotNotifyRecipients } from '@/lib/platform/pilotNotifyEmails'
import { captureError } from '@/lib/utils/logger'

/**
 * Notify platform operators when any school or individual workspace completes onboarding.
 */
export async function notifyOnboardingComplete({
  route,
  schoolId,
  schoolName,
  subdomain,
  schoolType = 'SCHOOL',
  plan,
  adminName,
  adminEmail,
  adminPhone,
  level,
  province,
  district,
  loginUrl,
}) {
  try {
    const recipients = getPilotNotifyRecipients()
    if (!recipients.length) {
      console.warn(
        '[onboarding] No notify recipients configured (PILOT_NOTIFY_EMAILS / PLATFORM_ADMIN_EMAILS / EMAIL_INFO)'
      )
      return false
    }

    return sendOnboardingCompletedNotifyEmail({
      recipients,
      schoolName,
      subdomain,
      schoolType,
      plan,
      adminName,
      adminEmail,
      adminPhone,
      level,
      province,
      district,
      loginUrl,
    })
  } catch (err) {
    captureError(err, { route, schoolId, event: 'onboarding_notify' })
    return false
  }
}
