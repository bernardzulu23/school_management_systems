import { useEffect, useMemo, useState } from 'react'

const clampPercent = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  mode = 'percent',
  progress,
  label = 'Loading',
}) => {
  const [simulated, setSimulated] = useState(0)

  useEffect(() => {
    if (mode !== 'percent' || progress !== undefined) return
    setSimulated(0)
    const interval = setInterval(() => {
      setSimulated((p) => {
        if (p >= 95) return p
        const step = Math.floor(Math.random() * 7) + 1
        return Math.min(95, p + step)
      })
    }, 220)

    return () => clearInterval(interval)
  }, [mode, progress])

  const percent = useMemo(() => {
    if (mode !== 'percent') return 0
    return clampPercent(progress !== undefined ? progress : simulated)
  }, [mode, progress, simulated])

  const spinnerSizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  }

  const spinnerColors = {
    primary: 'border-royalPurple-border2',
    secondary: 'border-royalPurple-border',
    white: 'border-white',
    success: 'border-royalPurple-border',
    danger: 'border-royalPurple-border',
  }

  const barWidths = {
    sm: 'w-32',
    md: 'w-48',
    lg: 'w-64',
    xl: 'w-80',
  }

  const barHeights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
    xl: 'h-3',
  }

  const fillColors = {
    primary: 'bg-royalPurple-accent',
    secondary: 'bg-royalPurple-border2',
    white: 'bg-white',
    success: 'bg-royalPurple-success',
    danger: 'bg-royalPurple-danger',
  }

  if (mode === 'spinner') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`animate-spin rounded-full border-t-transparent ${spinnerSizes[size] || spinnerSizes.md} ${
            spinnerColors[color] || spinnerColors.primary
          }`}
          role="status"
          aria-label={label}
        >
          <span className="sr-only">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label={label}
    >
      <div className="text-sm font-semibold text-royalPurple-text1">
        {label} {percent}%
      </div>
      <div
        className={`${barWidths[size] || barWidths.md} ${barHeights[size] || barHeights.md} rounded-full bg-royalPurple-muted overflow-hidden border border-royalPurple-border/40`}
      >
        <div
          className={`${barHeights[size] || barHeights.md} ${fillColors[color] || fillColors.primary}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default LoadingSpinner
