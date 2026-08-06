/**
 * Diagnose Africa's Talking SMS config + optional live send.
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/debug-at-sms.ts
 *   npx tsx --tsconfig tsconfig.json scripts/debug-at-sms.ts --send --phone=0977934996
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import AfricasTalking from 'africastalking'

function argFlag(name: string) {
  return process.argv.includes(`--${name}`)
}
function argValue(name: string, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

function normalizeZm(input: string) {
  const raw = String(input || '').trim()
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  if (raw.startsWith('+')) return `+${digits}`
  if (digits.startsWith('260')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`
  if (digits.length === 9) return `+260${digits}`
  return `+${digits}`
}

async function main() {
  const username = process.env.AFRICASTALKING_USERNAME || process.env.AFRICAS_TALKING_USERNAME || ''
  const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AFRICAS_TALKING_API_KEY || ''
  const sender = process.env.AFRICASTALKING_SENDER_ID || process.env.AFRICAS_TALKING_SENDER_ID || ''

  console.log("=== Africa's Talking env ===")
  console.log({
    hasUsername: Boolean(username),
    usernameLen: username.length,
    usernamePreview: username ? `${username.slice(0, 3)}…${username.slice(-2)}` : null,
    isSandbox: username.trim().toLowerCase() === 'sandbox',
    hasApiKey: Boolean(apiKey),
    apiKeyLen: apiKey.length,
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 6)}…` : null,
    senderId: sender || '(none — AT default shortcode/sender)',
  })

  const prisma = new PrismaClient()
  const schoolId = '818097ac-d9d6-44cc-9526-7056237814fb'
  const logs = await prisma.smsLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      provider: true,
      status: true,
      failureReason: true,
      recipient: true,
      channel: true,
      createdAt: true,
      body: true,
    },
  })
  console.log('\n=== Recent SmsLog (Ndake Day) ===')
  for (const l of logs) {
    console.log(
      [
        l.createdAt.toISOString(),
        l.provider,
        l.status,
        l.channel,
        l.recipient,
        l.failureReason || '-',
        String(l.body || '').slice(0, 40),
      ].join(' | ')
    )
  }

  const gateway = await prisma.sMSGateway.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { deviceName: true, lastSeenAt: true, isActive: true },
  })
  const settings = await prisma.schoolSmsSettings.findUnique({
    where: { schoolId },
    select: { customGatewayEnabled: true, smsBalance: true, parentSmsPresent: true },
  })
  console.log('\n=== Gateway / settings ===')
  console.log({ settings, gateway })

  if (!argFlag('send')) {
    console.log('\n(Pass --send --phone=0977934996 to attempt a live AT API call)')
    await prisma.$disconnect()
    return
  }

  if (!username || !apiKey) {
    throw new Error("Missing Africa's Talking credentials")
  }

  const phone = normalizeZm(argValue('phone', '0977934996'))
  if (!phone) throw new Error('Invalid phone')

  const at = AfricasTalking({ apiKey, username })
  const payload: Record<string, unknown> = {
    to: [phone],
    message: `ZSMS AT diagnostic ${new Date().toISOString()}`,
    enqueue: true,
  }
  if (sender) payload.from = sender

  console.log('\n=== Live AT send ===')
  console.log({ to: phone, from: sender || null, usernameIsSandbox: username === 'sandbox' })
  try {
    const result = await at.SMS.send(payload)
    console.log(JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error('AT SEND ERROR')
    console.error({
      message: err?.message,
      statusCode: err?.statusCode || err?.response?.status,
      response: err?.response?.data || err?.data || null,
      stack: err?.stack?.split('\n').slice(0, 5),
    })
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
