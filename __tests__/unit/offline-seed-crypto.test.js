import { describe, expect, it } from 'vitest'
import { decryptSeedPayload, encryptSeedPayload } from '@/lib/offline/seed-crypto'

describe('seed crypto', () => {
  it('round-trips an encrypted seed envelope', async () => {
    const payload = {
      schoolId: 'sch-1',
      userId: 'user-1',
      role: 'TEACHER',
      exportedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      data: { caches: { 'seed:x': { ok: true } }, rosters: [] },
    }
    const envelope = await encryptSeedPayload(payload, 'secret1')
    expect(envelope.format).toBe('zsmsseed')
    expect(envelope.ciphertext).toBeTruthy()
    const plain = await decryptSeedPayload(envelope, 'secret1')
    expect(plain.schoolId).toBe('sch-1')
    expect(plain.data.caches['seed:x'].ok).toBe(true)
  })

  it('rejects a wrong passphrase', async () => {
    const envelope = await encryptSeedPayload(
      {
        schoolId: 's',
        userId: 'u',
        role: 'TEACHER',
        exportedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        data: { caches: {}, rosters: [] },
      },
      'secret1'
    )
    await expect(decryptSeedPayload(envelope, 'wrong!!')).rejects.toBeTruthy()
  })
})
