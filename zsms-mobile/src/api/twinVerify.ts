import { api } from './client'

/** Twin secondary auth — PIN only (server bcrypt). Returns a short-lived twinAuthToken. */
export async function verifyTwinAuth(input: {
  sessionId: string
  studentId: string
  pin: string
}): Promise<{ verified: boolean; method: string; twinAuthToken: string; expiresAt?: string }> {
  const res = await api<{
    success: boolean
    data: {
      verified: boolean
      method: string
      twinAuthToken: string
      expiresAt?: string
    }
  }>(`/api/mobile/attendance/sessions/${input.sessionId}/twin-verify`, {
    method: 'POST',
    body: JSON.stringify({
      studentId: input.studentId,
      pin: input.pin,
    }),
  })
  return res.data
}
