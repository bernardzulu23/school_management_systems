'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { colors, typography, spacing } from '@/lib/design-tokens'
import { TRIAL_MONTHS } from '@/lib/billing/subscription'

export function Hero() {
  return (
    <section
      style={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${colors.gray[200]}`,
        padding: `${spacing.xl} ${spacing.md}`,
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Eyebrow/Label */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.primary[600],
            letterSpacing: '0.05em',
            marginBottom: spacing.md,
            textTransform: 'uppercase',
          }}
        >
          School Management System
        </div>

        {/* Main Headline */}
        <h1
          style={{
            ...typography.h1,
            color: colors.gray[900],
            marginBottom: spacing.lg,
            marginTop: 0,
          }}
        >
          Built for Zambian schools
        </h1>

        {/* Subheadline */}
        <p
          style={{
            ...typography.body,
            color: colors.gray[600],
            marginBottom: spacing.xl,
            lineHeight: '1.8',
            marginTop: 0,
          }}
        >
          Manage attendance, track grades, generate reports, and coordinate teachers. All from one
          platform. No more paper registers. No more lost records.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: spacing.lg,
          }}
        >
          <Button variant="primary" size="lg">
            Start free trial
          </Button>
          <Button variant="secondary" size="lg">
            View features
          </Button>
        </div>

        {/* Trust Signal */}
        <p
          style={{
            ...typography.caption,
            color: colors.gray[500],
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          Free {TRIAL_MONTHS}-month trial. No credit card required. Subscribe after trial.
        </p>
      </div>
    </section>
  )
}
