import { api } from './client'
import type { SessionContext } from '@/types'

export async function loadSessionContext(): Promise<SessionContext> {
  return api<SessionContext>('/api/mobile/session-context')
}
