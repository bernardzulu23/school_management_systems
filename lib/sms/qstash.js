import { Client } from '@upstash/qstash'
import { Receiver } from '@upstash/qstash'

let client = null
let receiver = null

export function isQStashConfigured() {
  return Boolean(String(process.env.QSTASH_TOKEN || '').trim())
}

export function getQStashClient() {
  if (!isQStashConfigured()) return null
  if (!client) {
    client = new Client({ token: process.env.QSTASH_TOKEN })
  }
  return client
}

export function getQStashReceiver() {
  const current = String(process.env.QSTASH_CURRENT_SIGNING_KEY || '').trim()
  const next = String(process.env.QSTASH_NEXT_SIGNING_KEY || '').trim()
  if (!current || !next) return null
  if (!receiver) {
    receiver = new Receiver({ currentSigningKey: current, nextSigningKey: next })
  }
  return receiver
}

/** Public base URL for QStash callbacks (must be reachable from Upstash). */
export function getAppBaseUrl() {
  return (
    String(process.env.QSTASH_CALLBACK_URL || '').trim() ||
    String(process.env.NEXT_PUBLIC_APP_URL || '').trim() ||
    String(process.env.NEXT_PUBLIC_APP_ORIGIN || '').trim() ||
    ''
  ).replace(/\/+$/, '')
}

export function workerUrl(path) {
  const base = getAppBaseUrl()
  if (!base)
    throw new Error('QSTASH_CALLBACK_URL or NEXT_PUBLIC_APP_URL is required for SMS workers')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function verifyQStashRequest(request, rawBody, url) {
  const signature = request.headers.get('upstash-signature')
  if (!signature) return false
  const recv = getQStashReceiver()
  if (!recv) return false
  try {
    return await recv.verify({ signature, body: rawBody, url })
  } catch {
    return false
  }
}
