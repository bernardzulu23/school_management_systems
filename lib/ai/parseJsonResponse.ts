/**
 * Strip markdown code fences and parse JSON from LLM text responses.
 */

export function stripMarkdownJsonFences(response: string): string {
  return String(response || '')
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()
}

function sliceJsonObject(candidate: string): string | null {
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  return candidate.slice(first, last + 1)
}

function sliceJsonArray(candidate: string): string | null {
  const first = candidate.indexOf('[')
  const last = candidate.lastIndexOf(']')
  if (first === -1 || last === -1 || last <= first) return null
  return candidate.slice(first, last + 1)
}

export function parseJsonFromAiResponse<T = unknown>(response: string): T | null {
  const clean = stripMarkdownJsonFences(response)
  if (!clean) return null

  try {
    return JSON.parse(clean) as T
  } catch {
    // fall through to bracket slicing
  }

  const objectSlice = sliceJsonObject(clean)
  if (objectSlice) {
    try {
      return JSON.parse(objectSlice) as T
    } catch {
      // try array next
    }
  }

  const arraySlice = sliceJsonArray(clean)
  if (arraySlice) {
    try {
      return JSON.parse(arraySlice) as T
    } catch {
      return null
    }
  }

  return null
}

export function extractJSONObject(text: string): Record<string, unknown> | null {
  const parsed = parseJsonFromAiResponse<Record<string, unknown>>(text)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed

  const clean = stripMarkdownJsonFences(text)
  const objectSlice = sliceJsonObject(clean)
  if (!objectSlice) return null

  try {
    const value = JSON.parse(objectSlice) as unknown
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function extractJSONArray(text: string): unknown[] | null {
  const parsed = parseJsonFromAiResponse<unknown>(text)
  if (Array.isArray(parsed)) return parsed

  const clean = stripMarkdownJsonFences(text)
  const arraySlice = sliceJsonArray(clean)
  if (!arraySlice) return null

  try {
    const value = JSON.parse(arraySlice) as unknown
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}
