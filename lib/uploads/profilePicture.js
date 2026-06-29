import { put } from '@vercel/blob'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png'])
const MAX_BYTES = 2 * 1024 * 1024

export function validateProfilePictureFile(file) {
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'Invalid file', code: 'INVALID_FILE' }
  }
  const type = String(file.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, error: 'Only JPEG and PNG images are allowed', code: 'INVALID_TYPE' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Image too large (max 2MB)', code: 'FILE_TOO_LARGE' }
  }
  return { ok: true, type }
}

function blobEnabled() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim())
}

/**
 * Upload profile picture to Vercel Blob (public URL).
 * @param {{ schoolId: string, userId: string, file: File | Blob, contentType: string }} opts
 */
export async function uploadProfilePictureToBlob({ schoolId, userId, file, contentType }) {
  if (!blobEnabled()) {
    throw new Error('Blob storage is not configured')
  }
  const ext = contentType === 'image/png' ? 'png' : 'jpg'
  const pathname = `schools/${schoolId}/profile-pictures/${userId}-${Date.now()}.${ext}`
  const blob = await put(pathname, file, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })
  return blob.url
}
