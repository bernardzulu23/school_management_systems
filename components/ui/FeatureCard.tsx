'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { colors, typography, spacing } from '@/lib/design-tokens'
import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  detail?: string
  className?: string
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  detail,
  className,
}: FeatureCardProps) {
  return (
    <Card className={className}>
      <div style={{ marginBottom: spacing.md }}>
        <Icon size={32} color={colors.primary[600]} style={{ strokeWidth: 1.5 }} />
      </div>
      <h3
        style={{
          ...typography.h3,
          color: colors.gray[900],
          marginBottom: spacing.sm,
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          ...typography.body,
          color: colors.gray[600],
          marginBottom: detail ? spacing.sm : 0,
          marginTop: 0,
        }}
      >
        {description}
      </p>

      {detail && (
        <p
          style={{
            ...typography.caption,
            color: colors.gray[500],
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          {detail}
        </p>
      )}
    </Card>
  )
}
