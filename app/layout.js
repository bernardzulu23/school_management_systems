import './globals.css'
import '../styles/accessibility.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata = {
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
              style: {
                background: 'var(--rp-card)',
                color: 'var(--rp-text1)',
                border: '1px solid var(--rp-border)',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: 'var(--rp-accent)',
                  secondary: '#ffffff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#dc2626',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
