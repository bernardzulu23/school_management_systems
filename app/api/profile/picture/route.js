import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function PUT(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
  if (typeof file === 'string') return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

  const mime = String(file.type || '')
  const ext = ALLOWED[mime]
  if (!ext) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPG, PNG, or WEBP.' },
      { status: 400 }
    )
  }

  const size = Number(file.size || 0)
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
  }
  if (size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const buf = Buffer.from(await file.arrayBuffer())
  const relDir = path.join('uploads', 'profile')
  const absDir = path.join(process.cwd(), 'public', relDir)
  await mkdir(absDir, { recursive: true })

  const filename = `${user.id}-${Date.now()}.${ext}`
  const absPath = path.join(absDir, filename)
  await writeFile(absPath, buf)

  const url = `/api/profile/picture/file/${encodeURIComponent(filename)}`
  await prisma.user.update({
    where: { id: user.id },
    data: { profile_picture_url: url },
  })

  return NextResponse.json({ success: true, profile_picture_url: url })
}
