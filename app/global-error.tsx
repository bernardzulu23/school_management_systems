'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#475569', marginBottom: 20 }}>
            We could not load this page. Please refresh and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Refresh page
          </button>
        </div>
      </body>
    </html>
  )
}
