export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureApi } from '@/lib/middleware/secureApi'
import {
  computeEvidenceExpiryDate,
  EVIDENCE_ALLOWED_MIME,
  EVIDENCE_MAX_BYTES,
  getEvidenceRetentionStatus,
  daysUntilExpiry,
} from '@/lib/ecz/ecz-evidence'

const CAN_ACCESS = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

function mapEvidenceRow(f, schoolId) {
  const status = getEvidenceRetentionStatus(f.expiryDate)
  return {
    id: f.id,
    scoreId: f.scoreId,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    fileUrl: `/api/ecz/evidence/file/${encodeURIComponent(path.basename(f.filePath))}`,
    uploadedAt: f.uploadedAt,
    uploadedBy: f.uploadedBy,
    expiryDate: f.expiryDate,
    retentionStatus: status,
    daysUntilExpiry: daysUntilExpiry(f.expiryDate),
    learnerName: f.score?.student?.name,
    learnerNumber: f.score?.student?.exam_number,
    subject: f.score?.assessment?.subject?.name,
    formLevel: f.score?.formLevel,
    academicYear: f.score?.academicYear,
    schoolId,
  }
}

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_ACCESS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const scoreId = searchParams.get('scoreId') || undefined
  const statusFilter = searchParams.get('status') // ok | urgent | expired

  try {
    const files = await prisma.eczEvidenceFile.findMany({
      where: {
        score: { schoolId },
        ...(scoreId ? { scoreId } : {}),
      },
      include: {
        score: {
          include: {
            student: { select: { name: true, exam_number: true } },
            assessment: { include: { subject: { select: { name: true } } } },
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    let data = files.map((f) => mapEvidenceRow(f, schoolId))
    if (statusFilter) {
      data = data.filter((d) => d.retentionStatus === statusFilter)
    }

    const summary = {
      total: data.length,
      ok: data.filter((d) => d.retentionStatus === 'ok').length,
      urgent: data.filter((d) => d.retentionStatus === 'urgent').length,
      expired: data.filter((d) => d.retentionStatus === 'expired').length,
    }

    return NextResponse.json({ success: true, data, summary })
  } catch (error) {
    console.error('ECZ evidence GET:', error)
    return NextResponse.json({ error: 'Failed to load evidence' }, { status: 500 })
  }
})

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_ACCESS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const formData = await request.formData()
  const file = formData.get('file')
  const scoreId = String(formData.get('scoreId') || '').trim()

  if (!scoreId) return NextResponse.json({ error: 'scoreId is required' }, { status: 400 })
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const mime = String(file.type || '')
  const ext = EVIDENCE_ALLOWED_MIME[mime]
  if (!ext) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPG, PNG, PDF, or MP4.' },
      { status: 400 }
    )
  }

  const size = Number(file.size || 0)
  if (!Number.isFinite(size) || size <= 0 || size > EVIDENCE_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  const score = await prisma.eczAssessmentScore.findFirst({
    where: { id: scoreId, schoolId },
    include: { student: true },
  })
  if (!score) return NextResponse.json({ error: 'SBA score record not found' }, { status: 404 })

  const uploadedAt = new Date()
  const expiryDate = computeEvidenceExpiryDate(uploadedAt)

  const relDir = path.join('uploads', 'ecz-evidence', schoolId)
  const absDir = path.join(process.cwd(), relDir)
  await mkdir(absDir, { recursive: true })

  const safeBase = `${scoreId}-${Date.now()}`
  const filename = `${safeBase}.${ext}`
  const absPath = path.join(absDir, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(absPath, buf)

  const relPath = path.join(relDir, filename).replace(/\\/g, '/')

  try {
    const row = await prisma.eczEvidenceFile.create({
      data: {
        scoreId,
        fileName: file.name || filename,
        filePath: relPath,
        fileType: mime,
        fileSize: size,
        uploadedBy: auth.user.id,
        expiryDate,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Evidence stored until ${expiryDate.toISOString().slice(0, 10)} (2-year ECZ retention)`,
        data: {
          id: row.id,
          expiryDate: row.expiryDate,
          retentionStatus: getEvidenceRetentionStatus(row.expiryDate),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('ECZ evidence POST:', error)
    return NextResponse.json({ error: 'Failed to save evidence' }, { status: 500 })
  }
})
