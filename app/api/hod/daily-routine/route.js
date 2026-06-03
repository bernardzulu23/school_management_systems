export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateHodDailyRoutineSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'

function dayRange(isoDate) {
  const start = new Date(`${isoDate}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { gte: start, lt: end }
}

function mapTask(t) {
  return {
    id: t.id,
    time: t.taskTime || '',
    task: t.title,
    description: t.description || '',
    priority: t.priority,
    status: t.status,
    duration: t.duration || '',
    assignedTo: t.assignedTo || '',
    category: t.category || '',
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const { db, departmentId } = scope
  const deptWhere = hodDepartmentWhere(departmentId)

  const [tasks, weekly] = await Promise.all([
    db.hodDailyRoutineTask.findMany({
      where: { ...deptWhere, taskDate: dayRange(date) },
      orderBy: [{ taskTime: 'asc' }, { createdAt: 'asc' }],
    }),
    db.hodWeeklyRoutinePlan.findMany({
      where: deptWhere,
      orderBy: [{ sortOrder: 'asc' }, { dayName: 'asc' }],
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      today: tasks.map(mapTask),
      weekly: weekly.map((w) => ({
        day: w.dayName,
        focus: w.focus || '',
        tasks: w.tasks || [],
      })),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(
    request,
    CreateHodDailyRoutineSchema
  )
  if (validationError) return validationError

  const { db, departmentId } = scope

  if (body.kind === 'weekly') {
    const plan = await db.hodWeeklyRoutinePlan.upsert({
      where: {
        schoolId_departmentId_dayName: {
          schoolId: scope.schoolId,
          departmentId,
          dayName: body.dayName,
        },
      },
      create: {
        departmentId,
        dayName: body.dayName,
        focus: body.focus,
        tasks: body.tasks || [],
        sortOrder: body.sortOrder ?? 0,
      },
      update: {
        focus: body.focus,
        tasks: body.tasks,
        sortOrder: body.sortOrder,
      },
    })
    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  }

  const created = await db.hodDailyRoutineTask.create({
    data: {
      departmentId,
      taskDate: new Date(`${body.taskDate}T12:00:00.000Z`),
      taskTime: body.taskTime,
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      status: body.status || 'pending',
      duration: body.duration,
      assignedTo: body.assignedTo,
      category: body.category,
    },
  })

  return NextResponse.json({ success: true, data: mapTask(created) }, { status: 201 })
})
