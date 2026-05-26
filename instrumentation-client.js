/**
 * Client-side Sentry initialization (browser).
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs'
import { getBaseSentryOptions, getSentryDsn, isSentryEnabled } from './lib/sentry/options'

Sentry.init({
  ...getBaseSentryOptions(),
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
