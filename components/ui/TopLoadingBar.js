import React from 'react'

export default function TopLoadingBar({ active, percent, label }) {
  if (!active) return null

  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))
  const text = `${label || 'Refreshing'} ${p}%`

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div className="h-1 w-full bg-royalPurple-deep/60">
        <div
          className="h-1 bg-gradient-to-r from-royalPurple-accent via-royalPurple-pill to-royalPurple-success transition-[width] duration-200 ease-out"
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="flex justify-end px-4 pt-2">
        <div className="px-3 py-1 rounded-full bg-royalPurple-card/80 border border-royalPurple-border/40 text-xs font-semibold text-royalPurple-text1 backdrop-blur-sm">
          {text}
        </div>
      </div>
    </div>
  )
}
