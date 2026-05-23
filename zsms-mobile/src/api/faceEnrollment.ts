import { api } from './client'

export async function saveStudentFaceEmbedding(
  studentId: string,
  embedding: number[]
): Promise<void> {
  await api<{ success: boolean }>(`/api/students/${studentId}/face-enrollment`, {
    method: 'POST',
    body: JSON.stringify({ embedding: JSON.stringify(embedding) }),
  })
}
