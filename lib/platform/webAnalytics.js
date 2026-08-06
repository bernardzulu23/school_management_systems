/**
 * Fetch website visitor stats from Vercel Web Analytics for the platform overview.
 *
 * Requires VERCEL_API_TOKEN (read access). Project/team IDs default to the linked
 * production project when unset.
 */

function analyticsConfig() {
  const token = String(process.env.VERCEL_API_TOKEN || '').trim()
  const projectId = String(process.env.VERCEL_PROJECT_ID || '').trim()
  const teamId = String(process.env.VERCEL_TEAM_ID || '').trim()
  return { token, projectId, teamId }
}

function daysAgoIso(days, now = new Date()) {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

function startOfUtcDayIso(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString()
}

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Normalize Vercel count payloads into { visitors, pageviews }. */
export function extractVisitTotals(payload) {
  const data = payload?.data
  if (!data || typeof data !== 'object') return { visitors: 0, pageviews: 0 }

  if (Array.isArray(data)) {
    return data.reduce(
      (acc, row) => {
        acc.visitors += asNumber(row?.visitors ?? row?.visitorCount ?? row?.uniqueVisitors)
        acc.pageviews += asNumber(
          row?.pageviews ?? row?.pageViews ?? row?.views ?? row?.total ?? row?.count
        )
        return acc
      },
      { visitors: 0, pageviews: 0 }
    )
  }

  return {
    visitors: asNumber(
      data.visitors ?? data.visitorCount ?? data.uniqueVisitors ?? data.devices ?? data.sessions
    ),
    pageviews: asNumber(data.pageviews ?? data.pageViews ?? data.views ?? data.total ?? data.count),
  }
}

/** Normalize daily aggregate rows for charts. */
export function extractDailySeries(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : []
  return rows
    .map((row) => {
      const ts = row?.timestamp || row?.day || row?.date || row?.period
      const labelDate = ts ? new Date(ts) : null
      const label =
        labelDate && !Number.isNaN(labelDate.getTime())
          ? labelDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : String(ts || '')
      return {
        label,
        timestamp: ts || null,
        visitors: asNumber(row?.visitors ?? row?.visitorCount ?? row?.uniqueVisitors),
        pageviews: asNumber(row?.pageviews ?? row?.pageViews ?? row?.views ?? row?.total),
      }
    })
    .filter((r) => r.label)
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return ta - tb
    })
}

async function vercelWebAnalyticsGet(path, query) {
  const { token, projectId, teamId } = analyticsConfig()
  if (!token || !projectId) {
    return {
      ok: false,
      status: 0,
      code: 'missing_token',
      error: 'VERCEL_API_TOKEN and VERCEL_PROJECT_ID must be configured',
      data: null,
    }
  }

  const params = new URLSearchParams({ projectId, ...query })
  if (teamId) params.set('teamId', teamId)

  const url = `https://api.vercel.com${path}?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      json?.error?.message || json?.message || `Vercel Analytics API error (${res.status})`
    const code = json?.error?.code || (res.status === 404 ? 'not_found' : 'api_error')
    return { ok: false, status: res.status, code, error: message, data: null }
  }

  return { ok: true, status: res.status, code: null, error: null, data: json }
}

async function countVisits({ since, until }) {
  return vercelWebAnalyticsGet('/v1/query/web-analytics/visits/count', {
    since,
    until,
  })
}

async function aggregateVisitsByDay({ since, until, limit = 31 }) {
  const params = new URLSearchParams()
  // `by` is repeated for array query params
  const { token, projectId, teamId } = analyticsConfig()
  if (!token) {
    return {
      ok: false,
      status: 0,
      code: 'missing_token',
      error: 'VERCEL_API_TOKEN is not configured',
      data: null,
    }
  }
  params.set('projectId', projectId)
  params.append('by', 'day')
  params.set('since', since)
  params.set('until', until)
  params.set('limit', String(limit))
  if (teamId) params.set('teamId', teamId)

  const url = `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      json?.error?.message || json?.message || `Vercel Analytics API error (${res.status})`
    const code = json?.error?.code || (res.status === 404 ? 'not_found' : 'api_error')
    return { ok: false, status: res.status, code, error: message, data: null }
  }
  return { ok: true, status: res.status, code: null, error: null, data: json }
}

/**
 * Overview payload for /api/platform/stats/web-analytics
 */
export async function getPlatformWebAnalytics(now = new Date()) {
  const { token } = analyticsConfig()
  if (!token) {
    return {
      configured: false,
      available: false,
      message:
        'Set VERCEL_API_TOKEN (and optionally VERCEL_PROJECT_ID / VERCEL_TEAM_ID) to load website traffic.',
      windows: null,
      daily: [],
    }
  }

  const until = now.toISOString()
  const since7 = daysAgoIso(7, now)
  const since30 = daysAgoIso(30, now)
  const since14 = daysAgoIso(14, now)
  const sinceToday = startOfUtcDayIso(now)

  const [todayRes, weekRes, monthRes, dailyRes] = await Promise.all([
    countVisits({ since: sinceToday, until }),
    countVisits({ since: since7, until }),
    countVisits({ since: since30, until }),
    aggregateVisitsByDay({ since: since14, until, limit: 31 }),
  ])

  const firstError = [todayRes, weekRes, monthRes, dailyRes].find((r) => !r.ok)
  if (firstError) {
    const notEnabled = firstError.code === 'not_found' || firstError.status === 404
    return {
      configured: true,
      available: false,
      message: notEnabled
        ? 'Enable Vercel Web Analytics on the project, deploy with @vercel/analytics, then wait for visits.'
        : firstError.error || 'Could not load Web Analytics',
      code: firstError.code,
      windows: null,
      daily: [],
    }
  }

  return {
    configured: true,
    available: true,
    message: null,
    windows: {
      today: extractVisitTotals(todayRes.data),
      last7Days: extractVisitTotals(weekRes.data),
      last30Days: extractVisitTotals(monthRes.data),
    },
    daily: extractDailySeries(dailyRes.data),
  }
}
