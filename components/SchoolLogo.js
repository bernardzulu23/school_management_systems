'use client'

import { useMemo } from 'react'
import Image from 'next/image'

function normalizeLogoSrc(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return raw
  try {
    const u = new URL(raw)
    const path = `${u.pathname || ''}${u.search || ''}`.trim()
    if (path.startsWith('/')) return path
  } catch {}
  return raw
}

export function SchoolLogo({ src, alt, className, priority = false }) {
  const normalizedSrc = useMemo(() => normalizeLogoSrc(src), [src])
  if (!normalizedSrc) return null
  const isRemote = normalizedSrc.startsWith('http://') || normalizedSrc.startsWith('https://')
  return (
    <Image
      src={normalizedSrc}
      width={256}
      height={64}
      sizes="(max-width: 768px) 128px, 256px"
      priority={Boolean(priority)}
      unoptimized={isRemote}
      alt={alt || 'School logo'}
      className={className}
    />
  )
}
