import path from 'path'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { put } from '@vercel/blob'

/** Direct multipart through the serverless function (Vercel ~4.5 MB). */
export const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024
/** Ceiling when uploading via Vercel Blob client or server put. */
export const MAX_BLOB_UPLOAD_BYTES = 50 * 1024 * 1024

const STUDY_EXT_TO_TYPE = {
  pdf: 'pdf',
  doc: 'file',
  docx: 'file',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  png: 'image',
  webp: 'image',
  gif: 'image',
  txt: 'file',
}

const RAG_EXTS = new Set(['pdf', 'docx', 'txt'])

/** MIME types accepted by Vercel Blob token generation (include Windows fallbacks). */
export const STUDY_BLOB_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
]

export const RAG_BLOB_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
  'text/plain',
  'text/markdown',
]

export function blobStorageEnabled() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim())
}

export function extensionFromName(fileName) {
  const base = path.basename(String(fileName || ''))
  const idx = base.lastIndexOf('.')
  if (idx < 0) return ''
  return base.slice(idx + 1).toLowerCase()
}

export function inferStudyMaterialType(fileName, mimeType = '') {
  const ext = extensionFromName(fileName)
  if (STUDY_EXT_TO_TYPE[ext]) return STUDY_EXT_TO_TYPE[ext]
  const mime = String(mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'powerpoint'
  if (mime.includes('zip')) return 'zip'
  return 'file'
}

export function inferRagFileType(fileName) {
  const ext = extensionFromName(fileName)
  if (RAG_EXTS.has(ext)) return ext
  return null
}

export function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function isAllowedStudyExtension(fileName) {
  return Boolean(STUDY_EXT_TO_TYPE[extensionFromName(fileName)])
}

export function isAllowedRagExtension(fileName) {
  return RAG_EXTS.has(extensionFromName(fileName))
}

function safeFileStem(fileName) {
  return String(fileName || 'upload')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function localStudyMaterialsDir(schoolId) {
  return path.join(process.cwd(), '.uploads', 'study-materials', String(schoolId))
}

/**
 * Persist a study/RAG material file to Vercel Blob (preferred) or local `.uploads`.
 * @param {{
 *   schoolId: string
 *   userId: string
 *   file: File | Blob
 *   fileName?: string
 *   purpose?: 'study' | 'rag'
 *   maxBytes?: number
 * }} opts
 */
export async function storeMaterialFile({
  schoolId,
  userId,
  file,
  fileName,
  purpose = 'study',
  maxBytes,
}) {
  if (!file || typeof file === 'string') {
    throw Object.assign(new Error('File is required'), { status: 400, code: 'INVALID_FILE' })
  }

  const name = String(fileName || file.name || 'upload').trim() || 'upload'
  const size = Number(file.size || 0)
  const limit = maxBytes ?? (blobStorageEnabled() ? MAX_BLOB_UPLOAD_BYTES : MAX_DIRECT_UPLOAD_BYTES)

  if (!Number.isFinite(size) || size <= 0) {
    throw Object.assign(new Error('Invalid file size'), { status: 400, code: 'INVALID_SIZE' })
  }
  if (size > limit) {
    throw Object.assign(
      new Error(
        `File too large (max ${formatFileSize(limit)}). ${
          blobStorageEnabled() ? '' : 'Split the file or ask an admin to enable blob storage.'
        }`.trim()
      ),
      { status: 413, code: 'FILE_TOO_LARGE' }
    )
  }

  if (purpose === 'rag') {
    if (!isAllowedRagExtension(name)) {
      throw Object.assign(new Error('Only PDF, DOCX, or TXT files are allowed for AI indexing'), {
        status: 400,
        code: 'INVALID_TYPE',
      })
    }
  } else if (!isAllowedStudyExtension(name)) {
    throw Object.assign(
      new Error('Unsupported file type. Use PDF, Word, PowerPoint, ZIP, image, or video.'),
      { status: 400, code: 'INVALID_TYPE' }
    )
  }

  const ext = extensionFromName(name) || 'bin'
  const stem = safeFileStem(name.replace(/\.[^.]+$/, '') || 'material')
  const pathname = `schools/${schoolId}/materials/${purpose}/${userId}-${Date.now()}-${stem}.${ext}`
  const contentType =
    String(file.type || '').trim() ||
    (ext === 'pdf' ? 'application/pdf' : ext === 'txt' ? 'text/plain' : 'application/octet-stream')

  if (blobStorageEnabled()) {
    const blob = await put(pathname, file, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return {
      fileUrl: blob.url,
      fileName: name,
      sizeBytes: size,
      sizeLabel: formatFileSize(size),
      type: purpose === 'rag' ? inferRagFileType(name) : inferStudyMaterialType(name, contentType),
      storage: 'blob',
    }
  }

  // Study materials need a durable URL. On Vercel the filesystem is ephemeral,
  // so refuse rather than storing a file that will disappear after the deploy.
  if (purpose === 'study' && process.env.VERCEL) {
    throw Object.assign(
      new Error(
        'File storage is not configured on this server (missing BLOB_READ_WRITE_TOKEN). Ask an administrator to enable Vercel Blob, or paste an existing File URL.'
      ),
      { status: 501, code: 'STORAGE_NOT_CONFIGURED' }
    )
  }

  const absDir = localStudyMaterialsDir(schoolId)
  await mkdir(absDir, { recursive: true })
  const filename = `${userId.slice(0, 8)}-${Date.now()}-${stem}.${ext}`
  const absPath = path.join(absDir, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(absPath, buf)

  const fileUrl = `/api/teacher/materials/file/${encodeURIComponent(schoolId)}/${encodeURIComponent(filename)}`
  return {
    fileUrl,
    fileName: name,
    sizeBytes: size,
    sizeLabel: formatFileSize(size),
    type: purpose === 'rag' ? inferRagFileType(name) : inferStudyMaterialType(name, contentType),
    storage: 'local',
    relativePath: path.join('.uploads', 'study-materials', schoolId, filename).replace(/\\/g, '/'),
  }
}

/**
 * Read a locally stored study material file (path-traversal safe).
 * @returns {Promise<{ buffer: Buffer, contentType: string } | null>}
 */
export async function readLocalStudyMaterialFile(schoolId, filename) {
  const safeName = path.basename(String(filename || ''))
  if (!safeName || safeName.includes('..')) return null
  const absPath = path.join(localStudyMaterialsDir(schoolId), safeName)
  const resolved = path.resolve(absPath)
  const root = path.resolve(localStudyMaterialsDir(schoolId))
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null
  try {
    const buffer = await readFile(resolved)
    const ext = extensionFromName(safeName)
    const contentType =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'txt'
              ? 'text/plain'
              : 'application/octet-stream'
    return { buffer, contentType, fileName: safeName }
  } catch {
    return null
  }
}
