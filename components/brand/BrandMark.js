'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

export const ZSMS_MARK_SRC = '/icons/zsms-mark.svg'

/**
 * Official ZSMS brand mark (SVG). Use as the default logo when a school
 * has no custom logo_url — Sidebar, Navbar, login, platform, marketing.
 */
export function BrandMark({ size = 32, className = '', alt = 'ZSMS', priority = false }) {
  const px = Number(size) || 32
  return (
    <Image
      src={ZSMS_MARK_SRC}
      alt={alt}
      width={px}
      height={px}
      priority={priority}
      unoptimized
      className={cn('object-contain shrink-0', className)}
    />
  )
}
