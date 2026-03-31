import sgMail from '@sendgrid/mail'

function getEmailFrom() {
  const from = process.env.EMAIL_FROM
  if (!from) return null
  return from
}

function ensureSendgridConfigured() {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return false
  sgMail.setApiKey(apiKey)
  return true
}

export async function sendResetEmail(email, resetUrl) {
  const from = getEmailFrom()
  const configured = ensureSendgridConfigured()

  if (!configured || !from) {
    console.log('[email] SendGrid not configured. Missing SENDGRID_API_KEY or EMAIL_FROM.')
    console.log('[email] Reset URL:', resetUrl)
    return false
  }

  const msg = {
    to: email,
    from,
    subject: 'Reset Your Password - Ndake Day Secondary School',
    html: `
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
    `,
  }

  try {
    await sgMail.send(msg)
    return true
  } catch (error) {
    console.error('[email] SendGrid error:', error)
    if (error?.response?.body) {
      console.error('[email] SendGrid response body:', error.response.body)
    }
    return false
  }
}
