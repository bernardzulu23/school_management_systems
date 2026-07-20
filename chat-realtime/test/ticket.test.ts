import { describe, it, expect } from 'vitest'
import { signTicket, verifyTicket, type TicketClaims } from '../src/ticket'

describe('chat-realtime ticket', () => {
  const secret = 'test-shared-secret'

  it('signs and verifies a ticket', async () => {
    const claims: TicketClaims = {
      sessionId: 'sess-1',
      userId: 'user-1',
      connectionRole: 'user',
      exp: Math.floor(Date.now() / 1000) + 300,
    }
    const token = await signTicket(claims, secret)
    const parsed = await verifyTicket(token, secret)
    expect(parsed).toEqual(claims)
  })

  it('rejects tampered tickets', async () => {
    const claims: TicketClaims = {
      sessionId: 'sess-1',
      userId: 'user-1',
      connectionRole: 'admin',
      exp: Math.floor(Date.now() / 1000) + 300,
    }
    const token = await signTicket(claims, secret)
    const bad = token.slice(0, -4) + 'xxxx'
    expect(await verifyTicket(bad, secret)).toBeNull()
  })

  it('rejects expired tickets', async () => {
    const claims: TicketClaims = {
      sessionId: 'sess-1',
      userId: 'user-1',
      connectionRole: 'user',
      exp: Math.floor(Date.now() / 1000) - 10,
    }
    const token = await signTicket(claims, secret)
    expect(await verifyTicket(token, secret)).toBeNull()
  })
})
