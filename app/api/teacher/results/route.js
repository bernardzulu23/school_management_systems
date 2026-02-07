import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    const { results } = body

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    console.log('Received results to save:', results.length)

    // Save to database using Prisma
    // Prisma doesn't support bulk upsert easily, so we use transaction
    const operations = results.map(result => {
      // Ensure score is number or null
      const score = result.score === '' || result.score === null ? null : Number(result.score)
      
      return prisma.result.upsert({
        where: {
          studentId_subject_term: {
            studentId: result.studentId,
            subject: result.subject,
            term: result.term
          }
        },
        update: {
          score: score,
          class: result.class, // Update class just in case
        },
        create: {
          studentId: result.studentId,
          subject: result.subject,
          term: result.term,
          class: result.class,
          score: score
        }
      })
    })

    const data = await prisma.$transaction(operations)

    return NextResponse.json({ 
      success: true, 
      message: `Successfully saved ${results.length} results`,
      data: data 
    })
  } catch (error) {
    console.error('Error saving results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
