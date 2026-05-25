'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  getPaymentProviderLogoCandidates,
  getPaymentProvidersWithLogos,
} from '@/lib/payments/provider-logos'

function isRemoteSrc(src) {
  return /^https?:\/\//i.test(String(src || ''))
}

export function ProviderLogoImage({ providerKey, size = 32, className = '' }) {
  const candidates = getPaymentProviderLogoCandidates(providerKey)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const providers = getPaymentProvidersWithLogos()
  const p = providers.find((x) => x.key === providerKey) || providers[0]
  const displaySrc = candidates[candidateIndex]
  if (!displaySrc) return null

  const s = Number(size) || 32
  const alt = p?.name || providerKey
  const wrapClass = `rounded-lg overflow-hidden bg-white flex-shrink-0 ${className}`.trim()

  const tryFallback = () => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((i) => i + 1)
    }
  }

  if (isRemoteSrc(displaySrc)) {
    return (
      <div className={wrapClass} style={{ width: s, height: s }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt={alt}
          width={s}
          height={s}
          className="object-contain w-full h-full"
          loading="lazy"
          onError={tryFallback}
        />
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <Image
        key={displaySrc}
        src={displaySrc}
        alt={alt}
        width={s}
        height={s}
        className="object-contain"
        onError={tryFallback}
      />
    </div>
  )
}

export default function ProviderLogos({ size = 44, showLabels = true }) {
  const providers = getPaymentProvidersWithLogos()
  const s = Number(size) || 44

  return (
    <div className="flex flex-wrap items-center gap-3">
      {providers.map((p) => (
        <div key={p.key} className="flex items-center gap-2">
          <ProviderLogoImage providerKey={p.key} size={s} />
          {showLabels ? <div className="text-sm text-royalPurple-text2">{p.name}</div> : null}
        </div>
      ))}
    </div>
  )
}
