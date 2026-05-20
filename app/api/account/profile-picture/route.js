export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

export async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

  if (typeof file === 'string') {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const type = String(file.type || '')
  if (!type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 })
  }

  const maxBytes = 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Image too large (max 1MB)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const dataUrl = `data:${type};base64,${base64}`

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: { profile_picture_url: dataUrl },
    select: {
      id: true,
      profile_picture_url: true,
      role: true,
      email: true,
      name: true,
      schoolId: true,
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
