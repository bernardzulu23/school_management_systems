'use client'

import React, { useState } from 'react'
import { colors, spacing, radius, shadows } from '@/lib/design-tokens'

export interface CardProps {
  children: React.ReactNode
  clickable?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Card({ children, clickable = false, className, style, onClick }: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const baseStyles: React.CSSProperties = {
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: isHovered && clickable ? shadows.md : shadows.sm,
    transition: 'all 200ms ease',
    cursor: clickable ? 'pointer' : 'default',
    borderColor: isHovered && clickable ? colors.primary[600] : undefined,
    ...style,
  }

  return (
    <div
      style={baseStyles}
      className={['white-card border border-card', className].filter(Boolean).join(' ')}
      onClick={onClick}
      onMouseEnter={() => clickable && setIsHovered(true)}
      onMouseLeave={() => clickable && setIsHovered(false)}
    >
      {children}
    </div>
  )
}

// Support components for compatibility with existing card components
export const CardHeader = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      marginBottom: spacing.md,
      ...style,
    }}
    className={className}
  >
    {children}
  </div>
)

export const CardTitle = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) => (
  <h3
    style={{
      fontSize: '18px',
      fontWeight: '600',
      color: 'rgb(var(--card-text-primary, 15 23 42))',
      margin: 0,
      ...style,
    }}
    className={className}
  >
    {children}
  </h3>
)

export const CardDescription = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) => (
  <p
    style={{
      fontSize: '14px',
      color: 'rgb(var(--card-text-secondary, 71 85 105))',
      margin: 0,
      ...style,
    }}
    className={className}
  >
    {children}
  </p>
)

export const CardContent = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) => (
  <div style={{ ...style }} className={className}>
    {children}
  </div>
)

export const CardFooter = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) => (
  <div
    style={{ display: 'flex', alignItems: 'center', marginTop: spacing.md, ...style }}
    className={className}
  >
    {children}
  </div>
)
