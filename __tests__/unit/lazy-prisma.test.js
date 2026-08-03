import { afterEach, describe, expect, it, vi } from 'vitest'

describe('lazy prisma client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    delete globalThis.__basePrisma
    delete globalThis.__basePrismaSlowQueryBound
  })

  it('imports without DATABASE_URL (build-time page collection)', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const mod = await import('@/lib/prisma/client')
    expect(mod.basePrisma).toBeTruthy()
    expect(mod.default).toBe(mod.basePrisma)
  })
})
