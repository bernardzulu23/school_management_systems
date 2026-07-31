import { describe, expect, it } from 'vitest'
import { canAccessTeachingStudio } from '@/lib/teaching/teachingStudioAccess'

describe('canAccessTeachingStudio', () => {
  it('allows teacher and hod roles', () => {
    expect(canAccessTeachingStudio({ id: '1', role: 'teacher', email: 'a@b.c' })).toBe(true)
    expect(canAccessTeachingStudio({ id: '1', role: 'hod', email: 'a@b.c' })).toBe(true)
    expect(canAccessTeachingStudio({ id: '1', role: 'Head of Department', email: 'a@b.c' })).toBe(
      true
    )
  })

  it('allows isHod claim on teacher role', () => {
    expect(canAccessTeachingStudio({ id: '1', role: 'teacher', email: 'a@b.c', isHod: true })).toBe(
      true
    )
  })

  it('allows senior teacher and deputy', () => {
    expect(canAccessTeachingStudio({ id: '1', role: 'senior teacher', email: 'a@b.c' })).toBe(true)
    expect(canAccessTeachingStudio({ id: '1', role: 'deputy head', email: 'a@b.c' })).toBe(true)
  })

  it('rejects students and missing users', () => {
    expect(canAccessTeachingStudio({ id: '1', role: 'student', email: 'a@b.c' })).toBe(false)
    expect(canAccessTeachingStudio(null)).toBe(false)
  })
})

describe('teaching studio page auth race (source)', () => {
  it('waits for auth hydration instead of nonexistent isLoading', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await fs.readFile(
      path.join(process.cwd(), 'app/dashboard/teacher/teaching-studio/page.tsx'),
      'utf8'
    )
    expect(src).toContain('useAuthHasHydrated')
    expect(src).toContain('canAccessTeachingStudio')
    expect(src).not.toContain('isLoading')
    expect(src).not.toContain("router.replace('/login')")
  })
})
