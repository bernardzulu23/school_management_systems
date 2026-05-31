import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/** Verification emails and automated portal links */
export function getNoreplyFrom() {
  return (
    process.env.EMAIL_FROM_NOREPLY ||
    process.env.EMAIL_FROM ||
    'ZSMS <noreply@bluepeacktechnologies.com>'
  )
}

/** Public enquiries — messages are delivered here; replies use this address */
export function getInfoEmail() {
  return process.env.EMAIL_INFO || 'info@bluepeacktechnologies.com'
}

async function sendEmail({ from, to, subject, html, replyTo }) {
  if (!resend || !from) {
    console.warn('[email] Resend not configured.')
    console.warn('[email] - RESEND_API_KEY:', !!process.env.RESEND_API_KEY)
    console.warn('[email] - From:', from)
    console.warn('[email] Email NOT sent to:', to)
    return false
  }

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    })

    if (response.error) {
      console.error('[email] Resend API returned error:', response.error)
      return false
    }

    return Boolean(response.data?.id)
  } catch (error) {
    console.error('[email] Exception thrown:', error?.message || error)
    return false
  }
}

async function sendNoreplyEmail(to, subject, html) {
  return sendEmail({ from: getNoreplyFrom(), to, subject, html })
}

async function sendInfoEmail({ to, subject, html, replyTo }) {
  const info = getInfoEmail()
  return sendEmail({
    from: `ZSMS <${info}>`,
    to,
    subject,
    html,
    replyTo: replyTo || info,
  })
}

export async function sendResetEmail(email, resetUrl) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2>Password Reset Request</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
            style="background-color: #FFA500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Or copy this link: <br>
          <code style="background-color: white; padding: 5px; border-radius: 3px;">${resetUrl}</code>
        </p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
      </div>
    </div>
  `
  return sendNoreplyEmail(email, 'Reset Your Password - Zambian School Management System', html)
}

/**
 * Sent after school portal is created — share link with teachers and learners.
 */
export async function sendSchoolPortalLinkEmail({
  to,
  schoolName,
  subdomain,
  loginUrl,
  adminName,
}) {
  const portalHost = loginUrl.replace(/\/login\/?$/, '')
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">Your school portal is ready</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 28px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hello${adminName ? ` ${adminName}` : ''},</p>
        <p>
          <strong>${schoolName}</strong> is now live on the Zambian School Management System.
          Share the portal link below with your <strong>teachers</strong>, <strong>heads of department</strong>,
          and <strong>learners</strong> so they can sign in.
        </p>
        <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin: 18px 0;">
          <div style="color: #c4b5fd; font-size: 13px; margin-bottom: 6px;">School portal link</div>
          <a href="${loginUrl}" style="color: #f59e0b; font-size: 16px; font-weight: bold; text-decoration: none; word-break: break-all;">
            ${loginUrl}
          </a>
          <div style="color: #94a3b8; font-size: 12px; margin-top: 10px;">Subdomain: ${subdomain}</div>
        </div>
        <p style="font-size: 14px; color: #334155;">
          <strong>How to distribute:</strong><br>
          1. Send this link to all teaching staff and HODs.<br>
          2. Share with learners/parents for the student portal.<br>
          3. Ask users to use the email addresses you register for them.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="background-color: #f59e0b; color: #111; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Open school portal
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-bottom: 0;">
          Questions? Contact us at <a href="mailto:${getInfoEmail()}">${getInfoEmail()}</a>.
          This message was sent from a no-reply address — please do not reply to this email.
        </p>
      </div>
    </div>
  `

  return sendNoreplyEmail(to, `${schoolName} — your school portal link`, html)
}

/** @deprecated use sendSchoolPortalLinkEmail */
export async function sendWelcomeEmail(params) {
  return sendSchoolPortalLinkEmail(params)
}

export async function sendSchoolVerificationEmail({ to, schoolName, subdomain, verifyUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">Verify your school portal</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 28px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hi ${schoolName},</p>
        <p>Please verify this email to activate your school portal.</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin: 18px 0;">
          <div style="color: #c4b5fd; font-size: 13px; margin-bottom: 6px;">Portal URL</div>
          <div style="color: #f59e0b; font-size: 16px; font-weight: bold;">
            ${subdomain}.bluepeacktechnologies.com
          </div>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #f59e0b; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Activate Portal
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-bottom: 0;">
          If the button does not work, copy this link:<br />
          <code style="background-color: white; padding: 6px; border-radius: 6px; display: inline-block; margin-top: 8px;">${verifyUrl}</code>
        </p>
      </div>
    </div>
  `

  return sendNoreplyEmail(to, `Activate your ${schoolName} portal`, html)
}

export async function sendOnboardingVerificationEmail({ to, verifyUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">Verify your email</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 28px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Welcome,</p>
        <p>Please verify your email to continue with plan selection and school portal setup.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #f59e0b; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-bottom: 0;">
          If the button does not work, copy this link:<br />
          <code style="background-color: white; padding: 6px; border-radius: 6px; display: inline-block; margin-top: 8px;">${verifyUrl}</code>
        </p>
      </div>
    </div>
  `

  return sendNoreplyEmail(to, 'Verify your email to continue registration', html)
}

/** Notify info@ about a public enquiry; optional auto-reply to the sender */
export async function sendPublicEnquiryEmail({ name, email, message, phone }) {
  const info = getInfoEmail()
  const safeName = String(name || 'Visitor').trim()
  const safeEmail = String(email || '').trim()
  const safeMessage = String(message || '').trim()
  const safePhone = String(phone || '').trim()

  const staffHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 640px;">
      <h2>New enquiry from the website</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail || 'Not provided'}</p>
      ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; background: #f1f5f9; padding: 12px; border-radius: 8px;">${safeMessage}</p>
      <p style="font-size: 12px; color: #64748b;">Reply to the sender from ${info}</p>
    </div>
  `

  const sentToStaff = await sendEmail({
    from: `ZSMS Website <${info}>`,
    to: info,
    subject: `Website enquiry from ${safeName}`,
    html: staffHtml,
    replyTo: safeEmail || undefined,
  })

  if (safeEmail) {
    const replyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 640px;">
        <p>Hello ${safeName},</p>
        <p>Thank you for contacting Blue Peak Technologies / Zambian School Management System.</p>
        <p>We have received your message and will respond shortly from <strong>${info}</strong>.</p>
        <p style="color: #64748b; font-size: 12px;">Please do not reply to noreply@ addresses.</p>
      </div>
    `
    await sendInfoEmail({
      to: safeEmail,
      subject: 'We received your enquiry',
      html: replyHtml,
    })
  }

  return sentToStaff
}

/**
 * Notify platform operators when a school completes pilot (free trial) onboarding.
 * @param {object} params
 * @param {string[]} params.recipients
 * @param {number} [params.pilotSchoolCount] - active trial schools after this join
 */
export async function sendPilotSchoolJoinedEmail({
  recipients,
  schoolName,
  subdomain,
  adminName,
  adminEmail,
  adminPhone,
  level,
  province,
  district,
  loginUrl,
  pilotSchoolCount,
}) {
  const to = (recipients || []).filter(Boolean)
  if (!to.length) {
    console.warn('[email] No PILOT_NOTIFY_EMAILS — pilot join alert skipped')
    return false
  }

  const safe = (v) =>
    String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const countLine =
    typeof pilotSchoolCount === 'number'
      ? `<p style="margin: 16px 0; padding: 12px; background: #fef3c7; border-radius: 8px; font-size: 15px;">
           <strong>Pilot schools (active trial):</strong> ${pilotSchoolCount}
         </p>`
      : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">New pilot school joined</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 28px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">A school has completed free-trial onboarding on ZSMS.</p>
        ${countLine}
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">School</td><td style="padding: 8px 0;"><strong>${safe(schoolName)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Subdomain</td><td style="padding: 8px 0;">${safe(subdomain)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Level</td><td style="padding: 8px 0;">${safe(level)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Location</td><td style="padding: 8px 0;">${safe(province)}${district ? `, ${safe(district)}` : ''}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Headteacher</td><td style="padding: 8px 0;">${safe(adminName)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${safe(adminEmail)}">${safe(adminEmail)}</a></td></tr>
          ${adminPhone ? `<tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0;">${safe(adminPhone)}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #64748b;">Portal</td><td style="padding: 8px 0;"><a href="${safe(loginUrl)}">${safe(loginUrl)}</a></td></tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${safe(loginUrl)}" style="background-color: #f59e0b; color: #111; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Open school portal
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
          View all schools in the <a href="https://${safe(process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN || 'bluepeacktechnologies.com')}/platform/dashboard">platform dashboard</a>.
        </p>
      </div>
    </div>
  `

  return sendEmail({
    from: getNoreplyFrom(),
    to,
    subject: `[ZSMS Pilot] New school: ${schoolName}`,
    html,
  })
}
