import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware } from '@/lib/middleware/auth'

export class TenantResolutionError extends Error {
  constructor(message = 'Unable to resolve school tenant from request.') {
    super(message)
    this.name = 'TenantResolutionError'
  }
}

function getSubdomainFromHost(host) {
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  const base = String(
    process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN || 'bluepeacktechnologies.com'
  )
    .toLowerCase()
    .trim()

  if (!hostName || hostName === 'localhost' || hostName.startsWith('127.0.0.1')) return null
  if (hostName === base || hostName === `www.${base}`) return null
  if (hostName.endsWith(`.${base}`)) {
    const sub = hostName.slice(0, -(base.length + 1)).split('.')[0]
    return sub && sub !== 'www' ? sub : null
  }
  return null
}

/**
 * Resolve schoolId from host subdomain or authenticated JWT (apex / localhost).
 * @param {import('next/server').NextRequest} request
 */
export async function getSchoolId(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const slug = getSubdomainFromHost(host)

  if (slug) {
    const school = await basePrisma.school.findFirst({
      where: { subdomain: slug, active: true },
      select: { id: true },
    })
    if (school?.id) return school.id
  }

  const auth = await authMiddleware(request)
  if (auth.isAuthenticated && auth.user?.schoolId) {
    return String(auth.user.schoolId)
  }

  throw new TenantResolutionError()
}

/**
 * Run handler with tenant-scoped Prisma client.
 * @template T
 * @param {import('next/server').NextRequest} request
 * @param {(db: ReturnType<typeof getTenantClient>, ctx: { schoolId: string, user?: object }) => Promise<T>} fn
 */
export async function withTenantClient(request, fn) {
  try {
    const schoolId = await getSchoolId(request)
    const auth = await authMiddleware(request)
    const db = getTenantClient(schoolId)

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs')
        Sentry.setTag('schoolId', schoolId)
        if (auth.isAuthenticated && auth.user?.id) {
          Sentry.setUser({ id: String(auth.user.id) })
        }
      } catch {
        /* optional */
      }
    }

    return await fn(db, {
      schoolId,
      user: auth.isAuthenticated ? auth.user : undefined,
    })
  } catch (e) {
    if (e instanceof TenantResolutionError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw e
  }
}
