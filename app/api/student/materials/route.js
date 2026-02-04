import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(request) {
  try {
    const headersList = headers()
    const userId = headersList.get('x-user-id')
    let studentId = null

    if (userId) {
      const student = await prisma.student.findUnique({
        where: { userId: userId },
        select: { id: true }
      })
      if (student) {
        studentId = student.id
      }
    }

    // Fallback for dev/demo if no user context
    if (!studentId) {
      const student = await prisma.student.findFirst()
      if (student) studentId = student.id
    }

    const materials = await prisma.studyMaterial.findMany({
      include: {
        teacher: {
          include: { user: true }
        },
        studentInteractions: studentId ? {
          where: { studentId: studentId }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedMaterials = materials.map(m => {
      const interaction = m.studentInteractions?.[0]
      return {
        id: m.id,
        title: m.title,
        subject: m.subject,
        teacher: m.teacher?.user?.name || 'Unknown Teacher',
        type: m.type,
        size: m.size || 'Unknown',
        uploadDate: m.createdAt.toISOString().split('T')[0],
        downloads: m.downloads + (interaction?.isDownloaded ? 0 : 0), // Use total downloads from material model
        views: m.views,
        rating: m.rating || 0,
        description: m.description,
        tags: m.tags,
        fileUrl: m.fileUrl,
        isBookmarked: interaction?.isBookmarked || false,
        isDownloaded: interaction?.isDownloaded || false
      }
    })

    return NextResponse.json({ success: true, data: formattedMaterials })

  } catch (error) {
    console.error('Fetch materials error:', error)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { materialId, action } = await request.json()
    const headersList = headers()
    const userId = headersList.get('x-user-id')
    
    let student = null
    if (userId) {
      student = await prisma.student.findUnique({
        where: { userId: userId }
      })
    }

    if (!student) {
      student = await prisma.student.findFirst()
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!materialId || !['bookmark', 'download'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Check existing interaction first
    const existingInteraction = await prisma.studentMaterial.findUnique({
      where: {
        studentId_studyMaterialId: {
          studentId: student.id,
          studyMaterialId: materialId
        }
      }
    })

    if (action === 'bookmark') {
      if (existingInteraction) {
        // Toggle
        await prisma.studentMaterial.update({
          where: { id: existingInteraction.id },
          data: { isBookmarked: !existingInteraction.isBookmarked }
        })
      } else {
        // Create
        await prisma.studentMaterial.create({
          data: {
            studentId: student.id,
            studyMaterialId: materialId,
            isBookmarked: true
          }
        })
      }
    } else if (action === 'download') {
       if (existingInteraction) {
        await prisma.studentMaterial.update({
          where: { id: existingInteraction.id },
          data: { 
            isDownloaded: true,
            downloadDate: new Date()
          }
        })
      } else {
        await prisma.studentMaterial.create({
          data: {
            studentId: student.id,
            studyMaterialId: materialId,
            isDownloaded: true,
            downloadDate: new Date()
          }
        })
      }
      
      // Increment total downloads on material
      await prisma.studyMaterial.update({
        where: { id: materialId },
        data: { downloads: { increment: 1 } }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Material interaction error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
