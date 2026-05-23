export const FACE_MATCH_THRESHOLD = 0.72
/** MobileFaceNet (expo-face-detection / ML Kit pipeline) — 192-d L2-normalized vectors. */
export const MOBILE_FACE_EMBEDDING_DIM = 192
export const FACE_L2_THRESHOLD = 1.1

export function parseEmbedding(raw) {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n))
  const str = String(raw).trim()
  if (!str) return null
  try {
    const parsed = JSON.parse(str)
    if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => Number.isFinite(n))
  } catch {
    /* ignore */
  }
  return null
}

export function l2Distance(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function l2DistanceToScore(distance) {
  if (!Number.isFinite(distance)) return 0
  return Math.max(0, Math.min(1, 1 - distance / FACE_L2_THRESHOLD))
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
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

/**
 * @param {number[]} probeEmbedding
 * @param {Array<{ id: string, faceEmbedding?: string|null, name?: string }>} candidates
 */
export function findBestFaceMatch(
  probeEmbedding,
  candidates,
  threshold = FACE_MATCH_THRESHOLD,
  l2Threshold = FACE_L2_THRESHOLD
) {
  const probe = parseEmbedding(probeEmbedding)
  if (!probe?.length) return null

  const useL2 = probe.length === MOBILE_FACE_EMBEDDING_DIM
  let best = null

  for (const c of candidates) {
    const enrolled = parseEmbedding(c.faceEmbedding)
    if (!enrolled?.length || enrolled.length !== probe.length) continue

    if (useL2) {
      const distance = l2Distance(probe, enrolled)
      if (!best || distance < best.distance) {
        best = {
          studentId: c.id,
          name: c.name,
          distance,
          score: l2DistanceToScore(distance),
        }
      }
    } else {
      const score = cosineSimilarity(probe, enrolled)
      if (!best || score > best.score) {
        best = { studentId: c.id, name: c.name, score }
      }
    }
  }

  if (!best) return null
  if (useL2) {
    if (best.distance > l2Threshold) return null
    return best
  }
  if (best.score < threshold) return null
  return best
}
