import { Platform } from 'react-native'

/** MobileFaceNet via expo-face-detection (Android native, custom dev build). */
export const MOBILE_FACE_EMBEDDING_DIM = 192
export const DEFAULT_MATCH_L2_THRESHOLD = 1.1

type FaceModule = typeof import('expo-face-detection')

let cached: FaceModule | null = null
let loadAttempted = false

export function isMobileFaceNetAvailable(): boolean {
  if (Platform.OS !== 'android') return false
  return getFaceModule() !== null
}

function getFaceModule(): FaceModule | null {
  if (!isMobileFaceNetAvailable()) return null
  if (loadAttempted) return cached
  loadAttempted = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-face-detection') as FaceModule
    if ((cached as FaceModule & { __isStub?: boolean }).__isStub) {
      cached = null
      return cached
    }
    cached.setMatchThreshold(DEFAULT_MATCH_L2_THRESHOLD)
  } catch {
    cached = null
  }
  return cached
}

export async function extractProbeEmbedding(imageBase64: string): Promise<{
  embedding: number[] | null
  error?: string
}> {
  const mod = getFaceModule()
  if (!mod) {
    return { embedding: null, error: 'Face ML is only available on Android (dev build).' }
  }
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const result = await mod.extractEmbedding(raw)
  if (!result.success || !result.embedding?.length) {
    return {
      embedding: null,
      error: result.errorMessage || 'No face detected — hold still and try again.',
    }
  }
  return { embedding: result.embedding }
}

export async function isProbeLive(imageBase64: string): Promise<boolean> {
  const mod = getFaceModule()
  if (!mod) return true
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const result = await mod.checkLiveness(raw)
  return Boolean(result.faceDetected && result.isLive)
}

export async function registerFaceFromThreePhotos(
  frontBase64: string,
  leftBase64: string,
  rightBase64: string
): Promise<{ embedding: number[] | null; error?: string }> {
  const mod = getFaceModule()
  if (!mod) {
    return { embedding: null, error: 'Face enrollment requires Android (dev build).' }
  }
  const strip = (s: string) => s.replace(/^data:image\/\w+;base64,/, '')
  const result = await mod.registerFace(strip(frontBase64), strip(leftBase64), strip(rightBase64))
  if (!result.success || !result.embedding?.length) {
    return { embedding: null, error: result.errorMessage || 'Enrollment failed' }
  }
  return { embedding: result.embedding }
}
