export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  uploadProfilePictureToBlob,
  validateProfilePictureFile,
} from '@/lib/uploads/profilePicture'

export const POST = withErrorHandler(async function POST(request) {
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
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const form = await request.formData()
  const file = form.get('file')
  const validation = validateProfilePictureFile(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const blob = new Blob([bytes], { type: validation.type })
  let profileUrl

  try {
    profileUrl = await uploadProfilePictureToBlob({
      schoolId,
      userId: auth.user.id,
      file: blob,
      contentType: validation.type,
    })
  } catch {
    return NextResponse.json(
      {
        error: 'Profile picture upload is unavailable. Blob storage must be configured.',
        code: 'BLOB_NOT_CONFIGURED',
      },
      { status: 501 }
    )
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id, schoolId },
    data: { profile_picture_url: profileUrl },
    select: {
      id: true,
      profile_picture_url: true,
      role: true,
      email: true,
      name: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      user: updated,
      url: profileUrl,
    },
  })
})
