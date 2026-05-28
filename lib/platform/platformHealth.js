/**
 * Phase 1–3 platform readiness checklist for super-admin health page.
 */
import prisma from '@/lib/prisma'
import { getSecurityHeaders } from '@/lib/security/headers'
import fs from 'fs'
import path from 'path'

/**
 * @returns {Promise<Array<{ id: string, label: string, status: 'ok' | 'warn' | 'fail', hint?: string, doc?: string }>>}
 */
export async function getPlatformHealthChecks() {
  const checks = []

  const sec = getSecurityHeaders({ includeHsts: process.env.NODE_ENV === 'production' })
  checks.push({
    id: 'csp',
    label: 'Content-Security-Policy',
    status: sec['Content-Security-Policy'] ? 'ok' : 'fail',
    hint: sec['Content-Security-Policy'] ? undefined : 'Configure lib/security/headers.js',
  })
  checks.push({
    id: 'hsts',
    label: 'Strict-Transport-Security (production)',
    status:
      process.env.NODE_ENV !== 'production' || sec['Strict-Transport-Security'] ? 'ok' : 'warn',
    hint:
      process.env.NODE_ENV === 'production' && !sec['Strict-Transport-Security']
        ? 'HSTS only applied in production builds'
        : undefined,
  })
  checks.push({
    id: 'groq',
    label: 'Groq API (AI features)',
    status: String(process.env.GROQ_API_KEY || '').trim() ? 'ok' : 'fail',
    hint: !process.env.GROQ_API_KEY ? 'Set GROQ_API_KEY in environment' : undefined,
    doc: '/docs/DEVELOPER_GUIDE.md',
  })

  const lipilaOk =
    String(process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY || '').trim() ||
    String(process.env.LIPILA_PUBLIC_KEY || '').trim()
  checks.push({
    id: 'lipila',
    label: 'Lipila payments',
    status: lipilaOk ? 'ok' : 'warn',
    hint: lipilaOk ? undefined : 'Set Lipila keys for billing',
  })

  const ussdOk = Boolean(process.env.AFRICAS_TALKING_USERNAME || process.env.AT_USERNAME)
  checks.push({
    id: 'ussd',
    label: "Africa's Talking (USSD parents)",
    status: ussdOk ? 'ok' : 'warn',
    hint: ussdOk ? undefined : 'Set AFRICAS_TALKING_USERNAME for USSD',
    doc: '/docs/USSD_GUIDE.md',
  })

  const ortoolsUrl = String(process.env.ORTOOLS_SOLVER_URL || '').trim()
  let ortoolsStatus = 'warn'
  let ortoolsHint = 'Optional — greedy solver used if unset'
  if (ortoolsUrl) {
    try {
      const res = await fetch(ortoolsUrl.replace(/\/+$/, ''), {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      ortoolsStatus = res.ok ? 'ok' : 'warn'
      ortoolsHint = res.ok ? undefined : `OR-Tools service returned ${res.status}`
    } catch {
      ortoolsStatus = 'fail'
      ortoolsHint = 'ORTOOLS_SOLVER_URL set but service unreachable'
    }
  }
  checks.push({
    id: 'ortools',
    label: 'OR-Tools timetable solver',
    status: ortoolsStatus,
    hint: ortoolsHint,
    doc: '/docs/ORTOOLS_SOLVER.md',
  })

  let cronOk = false
  try {
    const vercelPath = path.join(process.cwd(), 'vercel.json')
    const raw = fs.readFileSync(vercelPath, 'utf8')
    cronOk = raw.includes('/api/cron/ecz-reminder')
  } catch {
    cronOk = false
  }
  checks.push({
    id: 'ecz_cron',
    label: 'ECZ deadline reminder cron',
    status: cronOk ? 'ok' : 'warn',
    hint: cronOk ? undefined : 'Add ecz-reminder to vercel.json crons',
    doc: '/docs/ECZ_COMPLIANCE.md',
  })

  let rlsOk = false
  try {
    const rows = await prisma.$queryRaw`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'Student' LIMIT 1
    `
    rlsOk = Boolean(rows?.[0]?.relrowsecurity)
  } catch {
    rlsOk = false
  }
  checks.push({
    id: 'rls',
    label: 'PostgreSQL RLS on Student',
    status: rlsOk ? 'ok' : 'warn',
    hint: rlsOk ? undefined : 'Run migration 20260528120000_enable_rls on Neon',
    doc: '/docs/RLS.md',
  })

  checks.push({
    id: 'jwt',
    label: 'JWT_SECRET configured',
    status: String(process.env.JWT_SECRET || '').trim().length >= 16 ? 'ok' : 'fail',
    hint:
      String(process.env.JWT_SECRET || '').length < 16
        ? 'Set a strong JWT_SECRET (32+ chars recommended)'
        : undefined,
  })

  return checks
}
