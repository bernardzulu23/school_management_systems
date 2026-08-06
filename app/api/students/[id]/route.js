export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'
import { withTenantRequest } from '@/lib/tenant/context'
import { deleteStudentCascade, deleteUserCascade } from '@/lib/db/deleteCascade'
import { toSafePupilDto, PII_FIELD_GROUPS } from '@/lib/privacy/pupilDto'
import { logPiiAccess, clientMetaFromRequest } from '@/lib/privacy/piiAccessLog'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'ADMIN',
      'headteacher',
      'HOD',
      'hod',
      'TEACHER',
      'teacher',
      'STUDENT',
      'student',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Student id is required', 400)

  const result = await withTenantRequest(request, auth.user, async ({ schoolId, db }) => {
    const student = await db.student.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture_url: true,
            contact_number: true,
          },
        },
        results: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        subjectEnrollments: { include: { subject: true, class: true } },
        gamificationProfile: true,
      },
    })

    if (!student) throw new ApiError('Not found', 404)

    const isSelf = roleCheck(auth.user, ['STUDENT', 'student']) && student.userId === auth.user.id
    if (roleCheck(auth.user, ['STUDENT', 'student']) && !isSelf) {
      throw new ApiError('Forbidden', 403)
    }

    const canViewMedical = isSelf || roleCheck(auth.user, ['ADMIN', 'headteacher'])
    const shaped = {
      ...student,
      email: student.user?.email ?? null,
      profilePicture: student.user?.profile_picture_url ?? null,
      contactNumber: student.user?.contact_number ?? null,
    }

    const data = toSafePupilDto(shaped, {
      includeFace: false,
      includeMedical: canViewMedical,
      includeGuardianContacts: true,
      includeAddresses: canViewMedical,
    })

    if (!isSelf) {
      const fields = []
      if (canViewMedical) {
        fields.push(...PII_FIELD_GROUPS.medical.filter((k) => shaped[k] != null))
        for (const k of ['guardian_address', 'emergency_contact_address']) {
          if (shaped[k] != null) fields.push(k)
        }
      }
      fields.push(...PII_FIELD_GROUPS.guardian.filter((k) => shaped[k] != null && data[k] != null))
      if (fields.length) {
        await logPiiAccess({
          schoolId,
          actorUserId: auth.user.id,
          actorRole: auth.user.role,
          action: 'READ',
          resourceType: 'Student',
          resourceId: student.id,
          fieldsAccessed: [...new Set(fields)],
          ...clientMetaFromRequest(request),
        })
      }
    }

    return {
      success: true,
      data: {
        ...data,
        updatedAt: student.updatedAt,
      },
    }
  })

  if (result instanceof Response) return result
  return NextResponse.json(result)
})

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Student id is required', 400)

  const body = await request.json()
  const baseUpdatedAt = body.baseUpdatedAt ? new Date(body.baseUpdatedAt) : null
  const resolution = body.resolution ? String(body.resolution) : null

  const result = await withTenantRequest(request, auth.user, async ({ schoolId, db, tx }) => {
    const existing = await db.student.findFirst({
      where: { id, schoolId },
    })
    if (!existing) throw new ApiError('Not found', 404)

    if (baseUpdatedAt && existing.updatedAt.getTime() !== baseUpdatedAt.getTime() && !resolution) {
      return {
        status: 409,
        body: {
          success: false,
          conflict: true,
          server: toSafePupilDto(existing, {
            includeMedical: false,
            includeGuardianContacts: true,
          }),
        },
      }
    }

    if (resolution === 'keep_server') {
      return {
        status: 200,
        body: {
          success: true,
          data: toSafePupilDto(
            { ...existing, updatedAt: existing.updatedAt },
            { includeMedical: false, includeGuardianContacts: true }
          ),
        },
      }
    }

    const allowed = [
      'name',
      'class',
      'exam_number',
      'selected_subjects',
      'emergency_contact_name',
      'emergency_contact_phone',
      'emergency_contact_relationship',
      'emergency_contact_address',
      'blood_type',
      'medical_aid_scheme',
      'medical_aid_number',
      'family_doctor_name',
      'family_doctor_contact',
      'medical_conditions',
      'allergies',
      'enrollmentStatus',
    ]

    const data = {}
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key]
    }

    if (data.enrollmentStatus != null) {
      const st = String(data.enrollmentStatus).trim().toUpperCase()
      const ok = ['ACTIVE', 'WITHDRAWN', 'GRADUATED', 'TRANSFERRED'].includes(st)
      if (!ok) throw new ApiError('Invalid enrollmentStatus', 400)
      data.enrollmentStatus = st
    }

    const yearGroup = body.year_group ? String(body.year_group).trim() : null
    const section = body.section ? String(body.section).trim() : null
    const classNameFromParts = yearGroup && section ? `${yearGroup}${section}` : null

    const classId = safeStringId(body.classId)
    const classRecord = classId
      ? await tx.class.findFirst({
          where: { id: classId, schoolId },
          select: { id: true, name: true },
        })
      : classNameFromParts
        ? await tx.class.upsert({
            where: { schoolId_name: { schoolId, name: classNameFromParts } },
            create: {
              schoolId,
              name: classNameFromParts,
              year_group: yearGroup,
              section,
            },
            update: {},
            select: { id: true, name: true },
          })
        : null

    if (classRecord) {
      data.class = classRecord.name
    }

    if (data.enrollmentStatus && data.enrollmentStatus !== existing.enrollmentStatus) {
      const { onStudentEnrollmentStatusChange } = await import('@/lib/consent/facialAttendance')
      await onStudentEnrollmentStatusChange({
        schoolId,
        pupilId: existing.id,
        previousStatus: existing.enrollmentStatus,
        nextStatus: data.enrollmentStatus,
        db: tx,
      })
    }

    await tx.student.updateMany({
      where: { id: existing.id, schoolId },
      data,
    })

    const studentUpdated = await tx.student.findFirst({
      where: { id: existing.id, schoolId },
    })
    if (!studentUpdated) {
      throw new Error('Student update failed')
    }

    if (existing.userId) {
      const userUpdates = {}
      if (body.user?.name !== undefined) userUpdates.name = String(body.user.name)
      if (body.user?.email !== undefined) userUpdates.email = String(body.user.email)
      if (body.user?.contact_number !== undefined)
        userUpdates.contact_number = String(body.user.contact_number)

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.updateMany({
          where: { id: existing.userId, schoolId },
          data: userUpdates,
        })
      }
    }

    const subjects = Array.isArray(body.selected_subjects)
      ? body.selected_subjects.map(String).filter(Boolean)
      : null

    if (subjects && classRecord) {
      const subjectRecords = await Promise.all(
        subjects.map((subjectName) =>
          tx.subject.upsert({
            where: { schoolId_name: { schoolId, name: subjectName } },
            create: { schoolId, name: subjectName, topics: [] },
            update: {},
            select: { id: true },
          })
        )
      )

      await tx.pupilSubjectEnrollment.deleteMany({
        where: { schoolId, pupilId: existing.id },
      })

      await tx.pupilSubjectEnrollment.createMany({
        data: subjectRecords.map((s) => ({
          schoolId,
          pupilId: existing.id,
          subjectId: s.id,
          classId: classRecord.id,
        })),
        skipDuplicates: true,
      })
    }

    return {
      status: 200,
      body: {
        success: true,
        data: toSafePupilDto(
          { ...studentUpdated, updatedAt: studentUpdated.updatedAt },
          {
            includeMedical: roleCheck(auth.user, ['ADMIN', 'headteacher']),
            includeGuardianContacts: true,
          }
        ),
      },
    }
  })

  if (result instanceof Response) return result
  return NextResponse.json(result.body, { status: result.status || 200 })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Student id is required', 400)

  const result = await withTenantRequest(request, auth.user, async ({ schoolId, tx }) => {
    const existing = await tx.student.findFirst({
      where: { id, schoolId },
      select: { id: true, userId: true, name: true, class: true },
    })
    if (!existing) throw new ApiError('Not found', 404)

    const studentLabel = `Student record: ${existing.name}${existing.class ? ` (${existing.class})` : ''}`

    if (existing.userId) {
      await deleteUserCascade({ tx, schoolId, userId: existing.userId, actor: auth.user })
    } else {
      await deleteStudentCascade({
        tx,
        schoolId,
        studentId: existing.id,
        actor: auth.user,
        studentLabel,
      })
    }

    await logPiiAccess({
      schoolId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role,
      action: 'DELETE',
      resourceType: 'Student',
      resourceId: existing.id,
      fieldsAccessed: ['student_record'],
      ...clientMetaFromRequest(request),
    })

    return { success: true }
  })

  if (result instanceof Response) return result
  return NextResponse.json(result)
})
