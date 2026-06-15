export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolPlanForUsage } from '@/lib/middleware/aiUsageTracker'
import { ingestMaterialText } from '@/lib/rag/ingest'
import { extractTextFromBuffer, inferFileTypeFromName } from '@/lib/rag/parse'
import { assertTeacherMaterialSubject } from '@/lib/materials/teacherMaterialSubject'

function normalize(v) {
  return String(v || '').trim()
}

function toApiError(error) {
  const message = String(error?.message || 'Ingestion failed')
  const lower = message.toLowerCase()

  if (
    lower.includes('no embedding provider is configured') ||
    (lower.includes('api_key is required') &&
      !lower.includes('rate limit') &&
      !lower.includes('payment method'))
  ) {
    return new ApiError(`RAG embedding provider is not configured: ${message}`, 503)
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('payment method') ||
    lower.includes(' rpm') ||
    lower.includes('too many requests')
  ) {
    return new ApiError(
      `Embedding rate limit reached. Try again in a minute — other configured providers (Gemini, Jina, OpenRouter, HuggingFace) will be used automatically on retry. ${message}`,
      429
    )
  }

  if (
    lower.includes('embedding failed') ||
    lower.includes('huggingface') ||
    lower.includes('voyage') ||
    lower.includes('openai')
  ) {
    return new ApiError(message, 502)
  }

  if (
    lower.includes('unsupported file type') ||
    lower.includes('no text content to index') ||
    lower.includes('filetype')
  ) {
    return new ApiError(message, 400)
  }

  if (lower.includes('rag is not enabled')) {
    return new ApiError(message, 403)
  }

  return new ApiError(message, 500)
}

/**
 * POST /api/materials/ingest
 * Body JSON: { materialId, text? } OR multipart: file + metadata fields.
 * Creates SchoolMaterial when materialId omitted.
 */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) throw new ApiError('School not found', 404)

  const contentType = request.headers.get('content-type') || ''
  let materialId = ''
  let text = ''
  let title = ''
  let subject = ''
  let gradeLevel = ''
  let fileUrl = ''
  let fileType = ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    materialId = normalize(form.get('materialId'))
    title = normalize(form.get('title'))
    subject = normalize(form.get('subject'))
    gradeLevel = normalize(form.get('gradeLevel'))
    fileUrl = normalize(form.get('fileUrl'))
    fileType = normalize(form.get('fileType'))
    text = normalize(form.get('text'))

    const file = form.get('file')
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const inferred = inferFileTypeFromName(file.name) || fileType
      if (!inferred) throw new ApiError('fileType must be pdf, docx, or txt', 400)
      fileType = inferred
      if (!text) text = await extractTextFromBuffer(buffer, fileType)
      if (!fileUrl) fileUrl = file.name || 'upload'
      if (!title) title = file.name || 'Uploaded material'
    }
  } else {
    const body = await request.json().catch(() => ({}))
    materialId = normalize(body?.materialId)
    text = normalize(body?.text)
    title = normalize(body?.title)
    subject = normalize(body?.subject)
    gradeLevel = normalize(body?.gradeLevel || body?.grade)
    fileUrl = normalize(body?.fileUrl)
    fileType = normalize(body?.fileType)

    // When the client uploaded directly to blob storage it sends only the URL.
    // Fetch the bytes server-side (this does not count against the request-body
    // limit) and extract text here.
    if (!text && /^https?:\/\//i.test(fileUrl)) {
      const inferred = inferFileTypeFromName(fileUrl) || fileType
      if (!inferred) throw new ApiError('fileType must be pdf, docx, or txt', 400)
      fileType = inferred
      let res
      try {
        res = await fetch(fileUrl)
      } catch {
        throw new ApiError('Could not download the uploaded file from storage', 502)
      }
      if (!res.ok) {
        throw new ApiError(`Could not download the uploaded file (status ${res.status})`, 502)
      }
      const MAX_FETCH_BYTES = 60 * 1024 * 1024
      const arrayBuffer = await res.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_FETCH_BYTES) {
        throw new ApiError('Uploaded file exceeds the maximum size for indexing', 413)
      }
      const buffer = Buffer.from(arrayBuffer)
      text = await extractTextFromBuffer(buffer, fileType)
      if (!title) title = fileUrl.split('/').pop() || 'Uploaded material'
    }
  }

  if (!text) {
    throw new ApiError('text or file content is required for ingestion', 400)
  }

  const subjectCheck = await assertTeacherMaterialSubject({
    schoolId,
    userId,
    userRole: auth.user?.role,
    subject,
    requireSubject: true,
  })
  if (!subjectCheck.ok) {
    throw new ApiError(subjectCheck.error, subjectCheck.status)
  }

  if (!materialId) {
    if (!title || !fileUrl || !fileType) {
      throw new ApiError(
        'title, fileUrl, and fileType are required when creating a new material',
        400
      )
    }
    const created = await prisma.schoolMaterial.create({
      data: {
        schoolId,
        title,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        fileUrl,
        fileType: fileType.toLowerCase(),
        uploadedBy: userId,
      },
    })
    materialId = created.id
  }

  let result
  try {
    result = await ingestMaterialText({
      schoolId,
      materialId,
      text,
      schoolPlan: school.plan,
    })
  } catch (error) {
    throw toApiError(error)
  }

  return NextResponse.json({
    success: true,
    materialId,
    chunksIndexed: result.chunksIndexed,
    materialTitle: result.materialTitle,
  })
})
