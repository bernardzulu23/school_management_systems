import { api } from './client'

export async function verifyTwinAuth(input: {
  sessionId: string
  studentId: string
  pin?: string
  biometricVerified?: boolean
}): Promise<{ verified: boolean; method: string }> {
  const res = await api<{ success: boolean; data: { verified: boolean; method: string } }>(
    `/api/mobile/attendance/sessions/${input.sessionId}/twin-verify`,
    {
      method: 'POST',
      body: JSON.stringify({
        studentId: input.studentId,
        pin: input.pin,
        biometricVerified: input.biometricVerified,
      }),
    }
  )
  return res.data
}
