/**
 * Persist SecurityAlert for brute-force patterns (deduped per school+ip+email / hour).
 */
import prisma from '@/lib/prisma'

/**
 * @param {{ schoolId: string, email?: string, ip?: string, attempts: number, userId?: string|null, country?: string|null }} opts
 */
export async function maybeCreateBruteForceAlert(opts) {
  const schoolId = String(opts?.schoolId || '').trim()
  const attempts = Number(opts?.attempts) || 0
  if (!schoolId || schoolId === 'platform' || schoolId === 'global') return null
  if (attempts < 5) return null

  const email =
    String(opts?.email || '')
      .trim()
      .toLowerCase() || null
  const ip = String(opts?.ip || '').trim() || null
  const severity = attempts >= 10 ? 'critical' : 'high'

  try {
    const since = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await prisma.securityAlert.findFirst({
      where: {
        schoolId,
        pattern: 'BRUTE_FORCE',
        resolved: false,
        createdAt: { gte: since },
        ...(email ? { email } : {}),
        ...(ip ? { ipAddress: ip } : {}),
      },
      select: { id: true },
    })
    if (existing) {
      await prisma.securityAlert.update({
        where: { id: existing.id },
        data: {
          severity,
          details: { attempts, email, ip },
        },
      })
      return existing
    }

    return await prisma.securityAlert.create({
      data: {
        schoolId,
        userId: opts?.userId || null,
        email,
        ipAddress: ip,
        country: opts?.country || null,
        pattern: 'BRUTE_FORCE',
        severity,
        details: { attempts, email, ip },
      },
    })
  } catch (err) {
    console.error('[SecurityAlert] BRUTE_FORCE create failed:', err?.message || err)
    return null
  }
}
