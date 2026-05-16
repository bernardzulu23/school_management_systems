import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  title: 'School Management System - Zambia',
  description:
    'Complete school management solution built with Next.js for Zambian schools, supporting rural education, health, and nutrition.',
  openGraph: {
    title: 'School Management System - Zambia',
    description: 'Complete school management solution built with Next.js for Zambian schools.',
    url: 'https://zambianschool.com',
    siteName: 'EduZambia',
    images: [
      {
        url: 'https://zambianschool.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_ZM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'School Management System - Zambia',
    description: 'Complete school management solution built with Next.js for Zambian schools.',
    images: ['https://zambianschool.com/twitter-image.jpg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="font-sans antialiased">
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
