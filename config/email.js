import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function getEmailFrom() {
  const from = process.env.EMAIL_FROM
  if (!from) return null
  return from
}

async function sendEmail(to, subject, html) {
  const from = getEmailFrom()

  if (!resend || !from) {
    console.warn('[email] Resend not configured. Missing RESEND_API_KEY or EMAIL_FROM.')
    console.warn('[email] Email not sent to:', to)
    return false
  }

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('[email] Resend error:', error)
    return false
  }
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
          Or copy this link in your browser: <br>
          <code style="background-color: white; padding: 5px; border-radius: 3px;">${resetUrl}</code>
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          <strong>⏰ Important:</strong> This link expires in 1 hour.<br>
          If you didn't request a password reset, please ignore this email.
        </p>

        <p style="color: #999; font-size: 11px;">
          © 2024 Ndake Day Secondary School. All rights reserved.
        </p>
      </div>
    </div>
  `

  return sendEmail(email, 'Reset Your Password - Ndake Day Secondary School', html)
}

export async function sendWelcomeEmail({ to, schoolName, subdomain, loginUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background-color: #2d1b4e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">Welcome to your school portal</h2>
      </div>
      <div style="background-color: #f5f5f5; padding: 28px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Your portal for <strong>${schoolName}</strong> is ready.</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin: 18px 0;">
          <div style="color: #c4b5fd; font-size: 13px; margin-bottom: 6px;">Your portal URL</div>
          <a href="${loginUrl}" style="color: #f59e0b; font-size: 16px; font-weight: bold; text-decoration: none;">
            ${subdomain}
          </a>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="background-color: #f59e0b; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Go to Login
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-bottom: 0;">
          If the button doesn’t work, copy and paste this link into your browser:<br />
          <code style="background-color: white; padding: 6px; border-radius: 6px; display: inline-block; margin-top: 8px;">${loginUrl}</code>
        </p>
      </div>
    </div>
  `

  return sendEmail(to, `Your ${schoolName} portal is ready`, html)
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
          If the button doesn’t work, copy and paste this link into your browser:<br />
          <code style="background-color: white; padding: 6px; border-radius: 6px; display: inline-block; margin-top: 8px;">${verifyUrl}</code>
        </p>
      </div>
    </div>
  `

  return sendEmail(to, `Activate your ${schoolName} portal`, html)
}
