export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateStudentGoalSchema } from '@/lib/schemas'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true, name: true, class: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where: { schoolId, studentId: student.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.goal.count({ where: { schoolId, studentId: student.id } }),
    ])

    // Group goals by type for the frontend
    const groupedGoals = {
      academic: goals.filter((g) => g.category !== 'personal').map(formatGoal),
      personal: goals.filter((g) => g.category === 'personal').map(formatGoal),
    }

    return NextResponse.json({
      success: true,
      data: groupedGoals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch student goals error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

function formatGoal(goal) {
  return {
    id: goal.id,
    title: goal.title,
    category: goal.category,
    description: goal.description,
    targetDate: goal.deadline ? goal.deadline.toISOString().split('T')[0] : '', // YYYY-MM-DD
    progress: goal.progress,
    status:
      goal.status === 'in_progress'
        ? 'in_progress'
        : goal.status === 'completed'
          ? 'completed'
          : 'pending',
    priority: 'medium',
    currentValue: '',
    targetValue: '',
    milestones: [],
  }
}

export async function POST(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const { data: body, error: validationError } = await validateBody(
      request,
      CreateStudentGoalSchema
    )
    if (validationError) return validationError

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const title = body.title
    const category = body.type === 'personal' ? 'personal' : 'academic'
    const description = body.description ? String(body.description) : null
    const deadline = body.targetDate ? new Date(body.targetDate) : null
    if (deadline && Number.isNaN(deadline.getTime())) {
      return NextResponse.json({ error: 'Invalid targetDate' }, { status: 400 })
    }

    const newGoal = await prisma.goal.create({
      data: {
        schoolId,
        studentId: student.id,
        title,
        description,
        deadline,
        status: 'in_progress',
        progress: 0,
        category,
      },
    })

    return NextResponse.json({ success: true, data: formatGoal(newGoal) })
  } catch (error) {
    console.error('Create goal error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })

    const data = {}
    if (updates.title !== undefined) {
      const t = String(updates.title || '').trim()
      if (!t) return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
      data.title = t
    }
    if (updates.description !== undefined) {
      data.description = updates.description ? String(updates.description) : null
    }
    if (updates.targetDate !== undefined) {
      const d = updates.targetDate ? new Date(updates.targetDate) : null
      if (d && Number.isNaN(d.getTime()))
        return NextResponse.json({ error: 'Invalid targetDate' }, { status: 400 })
      data.deadline = d
    }
    if (updates.status !== undefined) {
      const s = String(updates.status || '')
        .trim()
        .toLowerCase()
      if (!['pending', 'in_progress', 'completed'].includes(s)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = s
    }
    if (updates.progress !== undefined) {
      const p = Number(updates.progress)
      if (!Number.isFinite(p) || p < 0 || p > 100)
        return NextResponse.json({ error: 'Invalid progress' }, { status: 400 })
      data.progress = Math.round(p)
    }

    const updated = await prisma.goal.updateMany({
      where: { id, schoolId, studentId: student.id },
      data,
    })
    if (updated.count === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    const updatedGoal = await prisma.goal.findFirst({
      where: { id, schoolId, studentId: student.id },
    })
    return NextResponse.json({ success: true, data: formatGoal(updatedGoal) })
  } catch (error) {
    console.error('Update goal error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden: Student access only' }, { status: 403 })
    }

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })

    const deleted = await prisma.goal.deleteMany({
      where: { id, schoolId, studentId: student.id },
    })
    if (deleted.count === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete goal error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
