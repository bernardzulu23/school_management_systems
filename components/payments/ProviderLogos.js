'use client'

import Image from 'next/image'

const PROVIDERS = [
  { key: 'mtn', name: 'MTN Zambia', src: '/payments/mtn.svg' },
  { key: 'airtel', name: 'Airtel Zambia', src: '/payments/airtel.svg' },
  { key: 'zamtel', name: 'Zamtel', src: '/payments/zamtel.svg' },
]

export default function ProviderLogos({ size = 44 }) {
  const s = Number(size) || 44
  return (
    <div className="flex items-center gap-3">
      {PROVIDERS.map((p) => (
        <div key={p.key} className="flex items-center gap-2">
          <div className="rounded-lg overflow-hidden bg-white">
            <Image src={p.src} alt={`${p.name} logo`} width={s} height={s} />
          </div>
          <div className="text-sm text-royalPurple-text2">{p.name}</div>
        </div>
      ))}
    </div>
  )
}
