/**
 * Open a study-material URL with auth when the path is an API file route.
 * Public Blob / absolute CDN URLs open directly; /api/... routes are fetched
 * with session (cookies on web, Bearer via desktop installApiFetch).
 */
export function isAuthenticatedMaterialPath(fileUrl) {
  const raw = String(fileUrl || '').trim()
  if (!raw) return false
  try {
    if (raw.startsWith('/api/')) return true
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://local')
    return (
      u.pathname.startsWith('/api/teacher/materials/file/') ||
      u.pathname.startsWith('/api/student/materials/file/')
    )
  } catch {
    return raw.includes('/api/teacher/materials/file/')
  }
}

export function materialPathFromUrl(fileUrl) {
  const raw = String(fileUrl || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/api/')) return raw
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://local')
    return `${u.pathname}${u.search}`
  } catch {
    return raw
  }
}

/**
 * @param {string} fileUrl
 * @param {{ title?: string }} [opts]
 */
export async function openMaterialFile(fileUrl, opts = {}) {
  const raw = String(fileUrl || '').trim()
  if (!raw) throw new Error('No file URL')

  if (!isAuthenticatedMaterialPath(raw)) {
    if (typeof window !== 'undefined') {
      window.open(raw, '_blank', 'noopener,noreferrer')
    }
    return
  }

  const path = materialPathFromUrl(raw)
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || err?.message || `Could not open file (${res.status})`)
  }

  const blob = typeof res.blob === 'function' ? await res.blob() : null
  if (!blob || !(blob instanceof Blob) || blob.size === 0) {
    // Desktop shim may return JSON wrapper — openMaterialFile expects makeResponse binary support.
    throw new Error('File response was empty')
  }

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  const name = String(opts.title || 'material')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
