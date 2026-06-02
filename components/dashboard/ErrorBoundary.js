'use client'

import React from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/utils/logger'

function reportToSentry(error, errorInfo) {
  if (process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_SENTRY_DSN) return
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } })
    })
    .catch(() => {})
}

function openSentryReportDialog() {
  import('@sentry/nextjs')
    .then((Sentry) => {
      if (typeof Sentry.showReportDialog === 'function') {
        Sentry.showReportDialog()
      }
    })
    .catch(() => {})
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Dashboard Error Boundary caught an error', error, errorInfo)
    reportToSentry(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-royalPurple-border bg-royalPurple-danger m-4">
          <CardHeader>
            <CardTitle className="flex items-center text-royalPurple-dangerTx">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-royalPurple-dangerTx">
              We encountered an error while loading this page. Our team has been notified.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try again
              </Button>
              {process.env.NEXT_PUBLIC_SENTRY_DSN ? (
                <Button type="button" variant="ghost" onClick={openSentryReportDialog}>
                  Report feedback
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
