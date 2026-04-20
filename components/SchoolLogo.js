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

  // Use unoptimized if remote OR if it's a known internal asset that might fail in some environments
  // For the specific logo.jpg case, we can try to force unoptimized to bypass the 503 from _next/image
  const shouldBeUnoptimized = isRemote || normalizedSrc.includes('logo.jpg')

  return (
    <Image
      src={normalizedSrc}
      width={256}
      height={64}
      sizes="(max-width: 768px) 128px, 256px"
      priority={Boolean(priority)}
      unoptimized={shouldBeUnoptimized}
      alt={alt || 'School logo'}
      className={className}
    />
  )
}
