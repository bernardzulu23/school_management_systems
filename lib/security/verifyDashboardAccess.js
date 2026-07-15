import { cookies } from 'next/headers'
import { forbidden, redirect } from 'next/navigation'
import * as jose from 'jose'
import { matchDashboardRoleGate, roleMatchesDashboardGroups } from './dashboardRouteAuth'

function jwtSecretKeys() {
  const enc = new TextEncoder()
  const keys = [enc.encode(String(process.env.JWT_SECRET || '').trim())]
  const previous = String(process.env.JWT_SECRET_PREVIOUS || '').trim()
  if (previous) keys.push(enc.encode(previous))
  return keys.filter((k) => k.length > 0)
}

async function decodeAccessToken(token) {
  const keys = jwtSecretKeys()
  if (!keys.length || !token) return null

  for (const key of keys) {
    try {
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] })
      return payload || null
    } catch {
      /* try next signing key */
    }
  }
  return null
}

/**
 * Server Component guard for role-restricted dashboard segments.
 * Returns 403 via forbidden() when the session role is not allowed.
 */
export async function requireDashboardRole(pathPrefix) {
  const gate = matchDashboardRoleGate(pathPrefix)
  if (!gate) return

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) {
    redirect(`/login?from=${encodeURIComponent(pathPrefix)}`)
  }

  const payload = await decodeAccessToken(token)
  if (!payload?.id) {
    redirect(`/login?from=${encodeURIComponent(pathPrefix)}`)
  }

  if (!roleMatchesDashboardGroups(payload.role, gate.groups)) {
    forbidden()
  }
}
