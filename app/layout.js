import { validateEnv } from '@/lib/config/env'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const SITE_DESCRIPTION =
  'The complete school management platform for Zambian primary and secondary schools. ECZ SBA, CBC curriculum, attendance, timetables, and AI tools — built for Zambia.'

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    'https://www.bluepeacktechnologies.com'
)

// Validate on server startup — throws if required vars are missing
if (typeof window === 'undefined') {
  validateEnv()
}

export const metadata = {
  metadataBase,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  title: {
    default: 'Zambian School Management System | Blue Peak Technologies',
    template: '%s | ZSMS',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'en_ZM',
    url: '/',
    siteName: 'Blue Peak Technologies — ZSMS',
    title: 'Zambian School Management System',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ZSMS — Zambian School Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zambian School Management System',
    description: SITE_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
}

// Nonce CSP requires per-request headers — opt out of static prerender at the root.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="font-sans antialiased bg-paper text-ink">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'zsms-toast',
              success: {
                duration: 3000,
                iconTheme: {
                  primary: 'var(--color-brand-primary)',
                  secondary: 'var(--color-white)',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: 'var(--color-kpi-fail)',
                  secondary: 'var(--color-white)',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
