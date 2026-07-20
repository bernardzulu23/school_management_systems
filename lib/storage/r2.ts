/**
 * Cloudflare R2 (S3-compatible) helpers for lesson-plan .docx storage.
 *
 * Env vars:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *   R2_PUBLIC_URL (optional — unused for downloads; signed URLs are preferred)
 *   R2_ENDPOINT (optional override; default https://{accountId}.r2.cloudflarestorage.com)
 *
 * Credentials missing → local filesystem fallback under .uploads/ (dev). Never crash at import.
 */

import { randomUUID } from 'crypto'
import { mkdir, writeFile, readFile } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'storage:r2' })

export type UploadResult = {
  /** Durable object key stored in LessonPlanSubmission.fileUrl */
  key: string
  backend: 'r2' | 'local'
}

function env(name: string): string {
  return String(process.env[name] || '').trim()
}

/** Lazy check — safe to call at request time; does not throw at module load. */
export function isR2Configured(): boolean {
  return Boolean(
    env('R2_ACCOUNT_ID') &&
    env('R2_ACCESS_KEY_ID') &&
    env('R2_SECRET_ACCESS_KEY') &&
    env('R2_BUCKET')
  )
}

function r2Endpoint(): string {
  const override = env('R2_ENDPOINT')
  if (override) return override.replace(/\/$/, '')
  return `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
}

async function getS3Client(): Promise<{
  client: import('@aws-sdk/client-s3').S3Client
  bucket: string
}> {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const bucket = env('R2_BUCKET')
  const client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint(),
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  })
  return { client, bucket }
}

function localRoot(): string {
  return path.join(process.cwd(), '.uploads', 'lesson-plans')
}

/**
 * Upload a .docx buffer. Returns a durable key (not a public URL).
 */
export async function uploadLessonPlanDocx(params: {
  schoolId: string
  submissionId: string
  buffer: Buffer
  filename?: string
}): Promise<UploadResult> {
  const safeName = String(params.filename || 'lesson-plan.docx')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80)
  const key = `lesson-plans/${params.schoolId}/${params.submissionId}/${safeName || 'lesson-plan.docx'}`

  if (isR2Configured()) {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3')
      const { client, bucket } = await getS3Client()
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: params.buffer,
          ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      )
      return { key, backend: 'r2' }
    } catch (err) {
      log.error('R2 upload failed — falling back to local', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    log.warn('R2 credentials missing — storing lesson plan docx locally (.uploads/)')
  }

  const abs = path.join(localRoot(), params.schoolId, params.submissionId)
  await mkdir(abs, { recursive: true })
  const filePath = path.join(abs, safeName || 'lesson-plan.docx')
  await writeFile(filePath, params.buffer)
  // Prefix so download helper knows this is a local path key
  return {
    key: `local:${params.schoolId}/${params.submissionId}/${safeName || 'lesson-plan.docx'}`,
    backend: 'local',
  }
}

/**
 * Create a short-lived signed download URL (R2) or a local tokenized path.
 * Default expiry: 15 minutes.
 */
export async function getSignedDownloadUrl(
  fileKey: string,
  expiresInSec = 900
): Promise<{ url: string; expiresIn: number; backend: 'r2' | 'local' }> {
  const key = String(fileKey || '').trim()
  if (!key) throw new Error('Missing file key')

  if (key.startsWith('local:')) {
    // Local/dev: caller should use the authenticated download API which streams the file.
    // Return a relative API-style marker; the download route reads the buffer directly.
    return {
      url: '',
      expiresIn: expiresInSec,
      backend: 'local',
    }
  }

  if (!isR2Configured()) {
    throw new Error(
      'R2 is not configured and file is not local. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.'
    )
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const { client, bucket } = await getS3Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSec })
  return { url, expiresIn: expiresInSec, backend: 'r2' }
}

/** Read object bytes (R2 or local) for authenticated streaming download. */
export async function readLessonPlanObject(fileKey: string): Promise<Buffer> {
  const key = String(fileKey || '').trim()
  if (!key) throw new Error('Missing file key')

  if (key.startsWith('local:')) {
    const rel = key.slice('local:'.length)
    const abs = path.join(localRoot(), rel)
    // Prevent path traversal outside .uploads/lesson-plans
    const root = path.resolve(localRoot())
    const resolved = path.resolve(abs)
    if (!resolved.startsWith(root)) {
      throw new Error('Invalid local file key')
    }
    return readFile(resolved)
  }

  if (!isR2Configured()) {
    throw new Error('R2 is not configured')
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { client, bucket } = await getS3Client()
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const body = out.Body
  if (!body) throw new Error('Empty R2 object body')
  const bytes = await body.transformToByteArray()
  return Buffer.from(bytes)
}

/** Helper for tests — build a unique draft key without uploading. */
export function makeDraftObjectKey(schoolId: string): string {
  return `lesson-plans/${schoolId}/${randomUUID()}/lesson-plan.docx`
}
