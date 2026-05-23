import { DEFAULT_MATCH_L2_THRESHOLD, MOBILE_FACE_EMBEDDING_DIM } from '@/face/mobileFaceNet'

/** Cosine similarity threshold (legacy / non–MobileFaceNet embeddings). */
export const FACE_MATCH_THRESHOLD = 0.72

/** L2 distance threshold for 192-d MobileFaceNet (expo-face-detection). */
export const FACE_L2_THRESHOLD = DEFAULT_MATCH_L2_THRESHOLD

export function parseEmbedding(raw: unknown): number[] | null {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n))
  const str = String(raw).trim()
  if (!str) return null
  try {
    const parsed = JSON.parse(str) as unknown
    if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => Number.isFinite(n))
  } catch {
    /* ignore */
  }
  return null
}

export function l2Distance(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function l2DistanceToScore(distance: number): number {
  if (!Number.isFinite(distance)) return 0
  return Math.max(0, Math.min(1, 1 - distance / FACE_L2_THRESHOLD))
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}

export interface FaceCandidate {
  id: string
  name: string
  faceEmbedding?: string | null
}

export function findBestLocalMatch(
  probe: number[],
  candidates: FaceCandidate[],
  options?: { cosineThreshold?: number; l2Threshold?: number }
): { studentId: string; name: string; score: number; distance?: number } | null {
  if (!probe.length) return null

  const useL2 = probe.length === MOBILE_FACE_EMBEDDING_DIM
  const l2Threshold = options?.l2Threshold ?? FACE_L2_THRESHOLD
  const cosineThreshold = options?.cosineThreshold ?? FACE_MATCH_THRESHOLD

  let bestL2: { studentId: string; name: string; distance: number } | null = null
  let bestCosine: { studentId: string; name: string; score: number } | null = null

  for (const c of candidates) {
    const enrolled = parseEmbedding(c.faceEmbedding)
    if (!enrolled?.length || enrolled.length !== probe.length) continue

    if (useL2) {
      const distance = l2Distance(probe, enrolled)
      if (!bestL2 || distance < bestL2.distance) {
        bestL2 = { studentId: c.id, name: c.name, distance }
      }
    } else {
      const score = cosineSimilarity(probe, enrolled)
      if (!bestCosine || score > bestCosine.score) {
        bestCosine = { studentId: c.id, name: c.name, score }
      }
    }
  }

  if (useL2 && bestL2) {
    if (bestL2.distance > l2Threshold) return null
    return {
      studentId: bestL2.studentId,
      name: bestL2.name,
      score: l2DistanceToScore(bestL2.distance),
      distance: bestL2.distance,
    }
  }

  if (bestCosine && bestCosine.score >= cosineThreshold) {
    return bestCosine
  }
  return null
}
