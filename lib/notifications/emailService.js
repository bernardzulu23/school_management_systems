import { getNoreplyFrom } from '@/config/email'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function buildHtml({ schoolName, title, message, actionUrl, unsubscribeUrl }) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://bluepeacktechnologies.com'
  const logoUrl = `${appBase}/icons/icon-192.png`
  const actionBlock = actionUrl
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${actionUrl}" style="background:#FF3B00;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
          View in ZSMS
        </a>
      </div>`
    : ''
  const unsub = unsubscribeUrl || `${appBase}/dashboard/settings/notifications`

  return `<!DOCTYPE html>
<html><body style="margin:0;background:#F5F2ED;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#2d1b4e;color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
      <img src="${logoUrl}" alt="ZSMS" width="48" height="48" style="border-radius:8px;" />
      <h2 style="margin:12px 0 0;">${schoolName || 'ZSMS'}</h2>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 8px 8px;border:1px solid #ddd;">
      <h3 style="margin-top:0;">${title}</h3>
      <p style="line-height:1.6;white-space:pre-wrap;">${message}</p>
      ${actionBlock}
      <p style="color:#666;font-size:12px;margin-top:32px;">
        You receive these emails because notifications are enabled for your ZSMS account.
        <a href="${unsub}">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body></html>`
}

/**
 * @returns {{ ok: boolean, providerId?: string, error?: string }}
 */
export async function sendNotificationEmail({ to, schoolName, title, message, actionUrl }) {
  if (!resend || !to) {
    return { ok: false, error: 'Resend not configured or missing recipient' }
  }

  try {
    const response = await resend.emails.send({
      from: getNoreplyFrom(),
      to,
      subject: title,
      html: buildHtml({ schoolName, title, message, actionUrl }),
    })
    if (response.error) {
      return { ok: false, error: response.error.message || 'Resend error' }
    }
    return { ok: true, providerId: response.data?.id || null, provider: 'RESEND' }
  } catch (error) {
    return { ok: false, error: error?.message || 'Email send failed' }
  }
}
