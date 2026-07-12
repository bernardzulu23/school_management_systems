import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

let snsClient = null

function getSnsClient() {
  if (snsClient) return snsClient
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
  if (!region) return null
  snsClient = new SNSClient({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  })
  return snsClient
}

function normalizeE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('260')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`
  if (digits.length === 9) return `+260${digits}`
  if (String(phone).startsWith('+')) return String(phone)
  return `+${digits}`
}

function splitSms(message, maxLen = 160) {
  const text = String(message || '').trim()
  if (text.length <= maxLen) return [text]
  const parts = []
  let i = 0
  while (i < text.length) {
    parts.push(text.slice(i, i + maxLen))
    i += maxLen
  }
  return parts
}

/**
 * Critical alerts only — AWS SNS direct publish.
 * @returns {{ ok: boolean, providerId?: string, error?: string, provider?: string }}
 */
export async function sendNotificationSms({ phoneNumber, message }) {
  const client = getSnsClient()
  const to = normalizeE164(phoneNumber)
  if (!client || !to) {
    return {
      ok: false,
      error: 'AWS SNS not configured or invalid phone number',
      provider: 'AWS_SNS',
    }
  }

  const topicArn = process.env.AWS_SNS_TOPIC_ARN
  const parts = splitSms(message)
  let lastId = null

  try {
    for (const part of parts) {
      const input = topicArn
        ? {
            TopicArn: topicArn,
            Message: part,
            MessageAttributes: {
              phone: { DataType: 'String', StringValue: to },
            },
          }
        : {
            PhoneNumber: to,
            Message: part,
            MessageAttributes: {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: process.env.AWS_SNS_SENDER_ID || 'ZSMS',
              },
            },
          }

      const result = await client.send(new PublishCommand(input))
      lastId = result.MessageId || lastId
    }
    return { ok: true, providerId: lastId, provider: 'AWS_SNS' }
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'SMS send failed',
      provider: 'AWS_SNS',
    }
  }
}
