/**
 * Authenticate Android gateway polls via X-Gateway-Token header.
 * deviceToken column stores SHA-256(raw); apiTokenEncrypted holds ciphertext only.
 */
import { basePrisma } from '@/lib/prisma/client'
import { hashDeviceToken } from '@/lib/sms/encryption'

export function getGatewayTokenFromRequest(request: Request): string {
  const header = request.headers.get('x-gateway-token') || request.headers.get('X-Gateway-Token')
  return String(header || '').trim()
}

export async function findGatewayByRawToken(rawToken: string) {
  const token = String(rawToken || '').trim()
  if (!token) return null
  const hashed = hashDeviceToken(token)
  return basePrisma.sMSGateway.findUnique({
    where: { deviceToken: hashed },
  })
}

export async function requireActiveGateway(request: Request) {
  const raw = getGatewayTokenFromRequest(request)
  if (!raw) {
    return { ok: false as const, status: 401, error: 'Missing X-Gateway-Token' }
  }
  const gateway = await findGatewayByRawToken(raw)
  if (!gateway) {
    return { ok: false as const, status: 401, error: 'Invalid gateway token' }
  }
  if (!gateway.isActive) {
    return { ok: false as const, status: 403, error: 'Gateway deactivated' }
  }
  return { ok: true as const, gateway }
}
