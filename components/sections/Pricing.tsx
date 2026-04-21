'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { colors, typography, spacing } from '@/lib/design-tokens'

const plans = [
  {
    name: 'Trial',
    price: 'Free',
    period: '30 days',
    description: 'Test everything risk-free',
    features: [
      'All AI features (10 requests)',
      'Attendance tracking',
      'Student records',
      'Basic school management',
      'Email support',
    ],
    highlight: false,
    cta: 'Start free trial',
  },
  {
    name: 'Basic',
    price: 'K150',
    period: '/month',
    description: 'Core management only',
    features: [
      'Attendance tracking',
      'Student management',
      'Grade entry',
      'Basic reporting',
      'No AI features',
    ],
    highlight: false,
    cta: 'Choose Basic',
  },
  {
    name: 'Standard',
    price: 'K300',
    period: '/month',
    description: 'Most popular for schools',
    features: [
      'Everything in Basic, plus:',
      'AI Lesson Planner',
      'AI Story Weaver',
      'AI Quiz Maker',
      'ECZ Practice Papers',
      '50 AI requests/month',
    ],
    highlight: true,
    cta: 'Start Standard trial',
  },
  {
    name: 'Premium',
    price: 'K600',
    period: '/month',
    description: 'Unlimited for large schools',
    features: [
      'Everything in Standard, plus:',
      'AI Report Comments',
      'Unlimited AI requests',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    highlight: false,
    cta: 'Start Premium trial',
  },
]

export function Pricing() {
  const router = useRouter()

  const planSlug = (name: string) => {
    const key = String(name || '')
      .trim()
      .toLowerCase()
    if (key === 'trial') return 'trial'
    if (key === 'basic' || key === 'standard' || key === 'premium') return key
    return 'standard'
  }

  return (
    <section style={{ backgroundColor: colors.gray[50], padding: `${spacing.xxl} ${spacing.md}` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.primary[600],
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: spacing.sm,
            }}
          >
            Simple Pricing
          </div>
          <h2
            style={{
              ...typography.h2,
              color: colors.gray[900],
              marginBottom: spacing.md,
              marginTop: 0,
            }}
          >
            Plans for every school
          </h2>
          <p style={{ ...typography.body, color: colors.gray[600], margin: 0 }}>
            All plans accept Airtel Money, MTN Mobile Money, or bank transfer. No credit card
            required. Cancel anytime.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: spacing.md,
          }}
        >
          {plans.map((plan) => (
            <div key={plan.name} style={{ position: 'relative' }}>
              {plan.highlight ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: colors.primary[600],
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    MOST POPULAR
                  </span>
                </div>
              ) : null}

              <Card
                style={{
                  border: plan.highlight
                    ? `2px solid ${colors.primary[600]}`
                    : `1px solid ${colors.gray[200]}`,
                  height: '100%',
                }}
              >
                <h3 style={{ fontSize: 22, fontWeight: 800, color: colors.gray[900], margin: 0 }}>
                  {plan.name}
                </h3>

                <p
                  style={{
                    ...typography.caption,
                    color: colors.gray[600],
                    marginTop: spacing.xs,
                    marginBottom: spacing.md,
                  }}
                >
                  {plan.description}
                </p>

                <div style={{ marginBottom: spacing.lg }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: colors.gray[900] }}>
                    {plan.price}
                  </div>
                  <div style={{ fontSize: 13, color: colors.gray[600] }}>{plan.period}</div>
                </div>

                <Button
                  variant={plan.highlight ? 'primary' : 'secondary'}
                  fullWidth
                  style={{ marginBottom: spacing.lg }}
                  type="button"
                  onClick={() => router.push(`/onboarding?plan=${planSlug(plan.name)}`)}
                >
                  {plan.cta}
                </Button>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {plan.features.map((feature, idx) => {
                    const isDivider = feature.includes('Everything')
                    return (
                      <li
                        key={idx}
                        style={{
                          fontSize: 14,
                          lineHeight: '1.6',
                          color: isDivider ? colors.gray[900] : colors.gray[600],
                          fontWeight: isDivider ? 700 : 400,
                          padding: `${spacing.xs} 0`,
                          borderTop: isDivider ? `1px solid ${colors.gray[200]}` : 'none',
                          paddingTop: isDivider ? spacing.md : spacing.xs,
                        }}
                      >
                        {feature}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: spacing.xl }}>
          <p style={{ ...typography.body, color: colors.gray[600], margin: 0 }}>
            All plans come with email support and access to our documentation. Need custom terms?{' '}
            <a
              href="mailto:info@bluepeacktechnologies.com"
              style={{ color: colors.primary[600], fontWeight: 700, textDecoration: 'none' }}
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
