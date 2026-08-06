import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import AfricasTalking from 'africastalking'

async function main() {
  const username = process.env.AFRICASTALKING_USERNAME || process.env.AFRICAS_TALKING_USERNAME || ''
  const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AFRICAS_TALKING_API_KEY || ''
  const sender = process.env.AFRICASTALKING_SENDER_ID || process.env.AFRICAS_TALKING_SENDER_ID || ''

  console.log({
    usernamePreview: username ? `${username.slice(0, 3)}…${username.slice(-2)}` : null,
    isSandbox: username.trim().toLowerCase() === 'sandbox',
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 6)}…` : null,
    sender: sender || null,
  })

  if (!username || !apiKey) throw new Error('Missing credentials')

  const at = AfricasTalking({ apiKey, username })
  const payload: Record<string, unknown> = {
    to: ['+260977934996'],
    message: `ZSMS AT diagnostic ${new Date().toISOString()}`,
    enqueue: true,
  }
  if (sender) payload.from = sender

  try {
    const result = await at.SMS.send(payload)
    console.log('OK', JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error('FAIL message:', err?.message)
    console.error(
      'FAIL details:',
      JSON.stringify(
        {
          statusCode: err?.statusCode || err?.response?.status,
          data: err?.response?.data || err?.data || null,
          raw: String(err),
        },
        null,
        2
      )
    )
  }
}

main()
