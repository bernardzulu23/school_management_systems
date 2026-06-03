import path from 'path'
import { mkdir, writeFile, unlink } from 'fs/promises'

export const HOD_FILE_ENTITY_TYPES = new Set([
  'meeting',
  'correspondence',
  'daily_routine',
  'budget',
  'stock',
  'weekly_routine',
])

export const HOD_FILE_LABELS = new Set([
  'attachment',
  'minutes',
  'schedule',
  'agenda',
  'letter',
  'receipt',
  'report',
  'inventory',
])

export const HOD_ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
}

export const HOD_MAX_FILE_BYTES = 25 * 1024 * 1024

export function hodFileDownloadUrl(fileId) {
  return `/api/hod/files/download/${encodeURIComponent(fileId)}`
}

export function mapHodFileRow(row) {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    label: row.label,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    fileUrl: hodFileDownloadUrl(row.id),
  }
}

/**
 * @param {{ schoolId: string, entityType: string, entityId: string, file: File, label?: string, uploadedBy: string, departmentId?: string | null }} opts
 */
export async function saveHodUpload({
  schoolId,
  entityType,
  entityId,
  file,
  label,
  uploadedBy,
  departmentId,
}) {
  const mime = String(file.type || '')
  const ext = HOD_ALLOWED_MIME[mime]
  if (!ext) {
    throw new Error('Invalid file type. Use PDF, Word, Excel, CSV, TXT, or images.')
  }

  const size = Number(file.size || 0)
  if (!Number.isFinite(size) || size <= 0 || size > HOD_MAX_FILE_BYTES) {
    throw new Error('File too large (max 25MB)')
  }

  const relDir = path.join('uploads', 'hod-files', schoolId, entityType)
  const absDir = path.join(process.cwd(), relDir)
  await mkdir(absDir, { recursive: true })

  const safeBase = `${entityId.slice(0, 8)}-${Date.now()}`
  const filename = `${safeBase}.${ext}`
  const absPath = path.join(absDir, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(absPath, buf)

  const relPath = path.join(relDir, filename).replace(/\\/g, '/')

  return {
    relPath,
    fileName: file.name || filename,
    fileType: mime,
    fileSize: size,
    label: label && HOD_FILE_LABELS.has(label) ? label : 'attachment',
    departmentId: departmentId ?? null,
    uploadedBy,
  }
}

export async function deleteHodFileFromDisk(filePath) {
  try {
    await unlink(path.join(process.cwd(), filePath))
  } catch {
    // ignore missing file on disk
  }
}
