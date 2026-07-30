import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hasHodPortalAccess } from '@/lib/hod/hodAccess'

describe('hasHodPortalAccess', () => {
  it('allows role hod', () => {
    expect(hasHodPortalAccess({ role: 'hod' })).toBe(true)
  })

  it('allows isHod claim without hodProfile', () => {
    expect(hasHodPortalAccess({ role: 'teacher', isHod: true })).toBe(true)
  })

  it('allows hodProfile without role upgrade', () => {
    expect(hasHodPortalAccess({ role: 'teacher', hodProfile: { id: '1' } })).toBe(true)
  })

  it('rejects plain teachers', () => {
    expect(hasHodPortalAccess({ role: 'teacher' })).toBe(false)
  })

  it('rejects missing user', () => {
    expect(hasHodPortalAccess(null)).toBe(false)
  })
})

describe('HOD navigation rendering', () => {
  it('uses document navigation for sidebar links', () => {
    const source = readFileSync(join(process.cwd(), 'components/dashboard/Sidebar.js'), 'utf8')
    expect(source).toContain('<a')
    expect(source).toContain('href={item.href}')
    expect(source).toContain('window.location.assign(item.href)')
    expect(source).not.toContain("import Link from 'next/link'")
  })

  it('defines deep background opacity utilities used by HOD progress cards', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
    expect(css).toContain('.bg-royalPurple-deep\\/60')
    expect(css).toContain('background-color: rgb(26 26 26 / 0.6)')
  })
})
