/**
 * Sentry server-side configuration (Node.js API routes, SSR).
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs'
import { getBaseSentryOptions } from './lib/sentry/options'

Sentry.init(getBaseSentryOptions())
