import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(request) {
  try {
    const headersList = headers()
    const userId = headersList.get('x-user-id')
    
    // For demo purposes, we'll fetch the first student if no user ID is provided
    // In a real app, we would use the authenticated user's ID
    let student = null
    
    if (userId) {
      student = await prisma.student.findUnique({
        where: { userId: userId },
        include: { user: true }
      })
    }
    
    if (!student) {
      student = await prisma.student.findFirst({
        include: { user: true }
      })
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where: { studentId: student.id },
        include: {
          milestones: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.goal.count({ where: { studentId: student.id } })
    ])

    // Group goals by type for the frontend
    const groupedGoals = {
      academic: goals.filter(g => g.type === 'academic').map(formatGoal),
      personal: goals.filter(g => g.type === 'personal').map(formatGoal)
    }

    return NextResponse.json({
      success: true,
      data: groupedGoals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Fetch student goals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

function formatGoal(goal) {
  return {
    id: goal.id,
    title: goal.title,
    category: goal.category,
    description: goal.description,
    targetDate: goal.targetDate.toISOString().split('T')[0], // YYYY-MM-DD
    progress: goal.progress,
    status: goal.status,
    priority: goal.priority,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    milestones: goal.milestones.map(m => ({
      id: m.id,
      name: m.name,
      completed: m.completed
    }))
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, type, category, description, targetDate, priority, currentValue, targetValue, milestones } = body

    const student = await prisma.student.findFirst() // Demo: grab first student
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const newGoal = await prisma.goal.create({
      data: {
        studentId: student.id,
        title,
        type,
        category,
        description,
        targetDate: new Date(targetDate),
        status: 'in_progress',
        priority,
        progress: 0,
        currentValue,
        targetValue,
        milestones: {
          create: milestones?.map(m => ({
            name: m.name,
            completed: false
          })) || []
        }
      },
      include: {
        milestones: true
      }
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
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })

    // Handle milestones update separately if provided
    if (updates.milestones) {
       // This is a simplified update logic. 
       // In a real app, you might want to handle add/update/delete of milestones more carefully.
       // Here we just update the completed status of existing ones.
       for (const m of updates.milestones) {
         if (m.id) {
           await prisma.goalMilestone.update({
             where: { id: m.id },
             data: { completed: m.completed }
           })
         }
       }
       delete updates.milestones
    }

    if (updates.targetDate) {
      updates.targetDate = new Date(updates.targetDate)
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: updates,
      include: { milestones: true }
    })

    return NextResponse.json({ success: true, data: formatGoal(updatedGoal) })

  } catch (error) {
    console.error('Update goal error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })

    await prisma.goal.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete goal error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
