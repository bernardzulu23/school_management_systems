import prisma from '@/lib/prisma'
import { getRequestIp } from '@/lib/security/loginBruteForce'
import { enrichIp } from '@/lib/security/ipIntelligence'

function extractRequestMeta(request) {
  if (!request) {
    return { ip: 'system', userAgent: 'system' }
  }
  // Plain object already shaped { ip, userAgent }
  if (typeof request.headers?.get !== 'function' && (request.ip || request.userAgent)) {
    return {
      ip: String(request.ip || 'system'),
      userAgent: String(request.userAgent || 'system'),
    }
  }
  try {
    return {
      ip: getRequestIp(request),
      userAgent: String(request.headers?.get?.('user-agent') || 'unknown').slice(0, 512),
    }
  } catch {
    return { ip: 'unknown', userAgent: 'unknown' }
  }
}

export async function logAuditAction({
  userId,
  schoolId,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  request = null,
}) {
  try {
    // School-scoped events require schoolId; platform LOGIN may omit it.
    const sid = schoolId ? String(schoolId).trim() : null
    if (!sid && action !== 'LOGIN' && action !== 'LOGIN_FAILED') return

    const { ip, userAgent } = extractRequestMeta(request)
    const data = {
      userId: userId || null,
      schoolId: sid,
      action,
      entity,
      entityId: String(entityId || 'unknown'),
      oldValue,
      newValue,
      ipAddress: ip,
      userAgent,
    }

    if (action === 'LOGIN' || action === 'LOGIN_FAILED') {
      const geo = await enrichIp(ip)
      Object.assign(data, {
        country: geo.country,
        city: geo.city,
        region: geo.region,
        isp: geo.isp,
        isVpn: Boolean(geo.isVpn),
        isTor: Boolean(geo.isTor),
        isProxy: Boolean(geo.isProxy),
        threatScore: geo.threatScore,
      })
    }

    await prisma.auditLog.create({ data })
  } catch (error) {
    console.error('[AuditLog Error]:', error)
    // We do not throw here to avoid breaking the main operation
    // just because logging failed.
  }
}
