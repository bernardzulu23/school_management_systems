import { headers } from 'next/headers'

/** Authenticated portal — never statically prerendered at build time. */
export const dynamic = 'force-dynamic'

const BASE_DOMAIN =
  process.env.APP_BASE_DOMAIN || process.env.BASE_DOMAIN || 'bluepeacktechnologies.com'

function portalUrlFromHost(host) {
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  if (!hostName || hostName === 'localhost' || hostName.startsWith('127.0.0.1')) {
    return new URL(
      process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_APP_ORIGIN ||
        'http://localhost:3000'
    )
  }
  if (hostName === BASE_DOMAIN || hostName === `www.${BASE_DOMAIN}`) {
    return new URL(`https://www.${BASE_DOMAIN}`)
  }
  if (hostName.endsWith(`.${BASE_DOMAIN}`)) {
    return new URL(`https://${hostName}`)
  }
  return new URL(`https://${hostName}`)
}

export async function generateMetadata() {
  const host = (await headers()).get('host') || ''
  const portal = portalUrlFromHost(host)
  const subdomain = host.split('.')[0]
  const isSchoolPortal =
    host &&
    !host.includes('localhost') &&
    host !== BASE_DOMAIN &&
    host !== `www.${BASE_DOMAIN}` &&
    host.endsWith(`.${BASE_DOMAIN}`)

  const schoolTitle = isSchoolPortal
    ? `${subdomain.replace(/-/g, ' ')} — School Portal`
    : 'Zambian School Management System'

  return {
    title: schoolTitle,
    openGraph: {
      url: portal.pathname === '/' ? portal.origin : portal.href,
      siteName: 'Blue Peak Technologies — ZSMS',
      title: schoolTitle,
    },
  }
}

export default function DashboardLayout({ children }) {
  return children
}
