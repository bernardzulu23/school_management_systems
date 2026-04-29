'use client'

import React, { useState } from 'react'

export interface CardProps {
  children: React.ReactNode
  clickable?: boolean
  variant?: 'white' | 'glass'
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Card({
  children,
  clickable = false,
  variant = 'white',
  className,
  style,
  onClick,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const baseStyles: React.CSSProperties = { ...style }
  const baseClass =
    variant === 'glass'
      ? 'backdrop-blur-lg bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-3xl shadow-2xl'
      : 'white-card border border-card shadow-sm'

  return (
    <div
      style={baseStyles}
      className={[
        baseClass,
        'transition-all duration-200',
        clickable ? 'cursor-pointer hover:shadow-md hover:border-brand-primary' : '',
        isHovered && clickable ? 'hover:border-brand-primary' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
      marginBottom: '16px',
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
    style={{ margin: 0, ...style }}
    className={['zsms-card-title', className].filter(Boolean).join(' ')}
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
    style={{ margin: 0, ...style }}
    className={['zsms-card-description', className].filter(Boolean).join(' ')}
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
    style={{ display: 'flex', alignItems: 'center', marginTop: '16px', ...style }}
    className={className}
  >
    {children}
  </div>
)
