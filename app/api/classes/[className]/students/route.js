import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request, { params }) {
  try {
    const { className } = params
    
    // Decode URI component just in case (e.g. "Form%201A")
    const decodedClass = decodeURIComponent(className)
    
    const students = await prisma.student.findMany({
      where: {
        class: decodedClass
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Also fetch current results for these students to pre-fill
    // Ideally we would filter by subject/term if provided in query params
    // But for now, let's just return students and let frontend handle result fetching
    // OR we can include results if the frontend logic needs it.
    // The frontend logic currently: 
    // "mockStudents ... currentScore: null"
    
    // Let's enhance this to return students with current score if subject/term params exist
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const term = searchParams.get('term')
    
    let studentsWithScores = students
    
    if (subject && term) {
       const results = await prisma.result.findMany({
         where: {
           class: decodedClass,
           subject: subject,
           term: term
         }
       })
       
       const resultMap = new Map()
       results.forEach(r => resultMap.set(r.studentId, r.score))
       
       studentsWithScores = students.map(s => ({
         ...s,
         currentScore: resultMap.get(s.id) ?? null
       }))
    } else {
       studentsWithScores = students.map(s => ({
         ...s,
         currentScore: null
       }))
    }
    
    return NextResponse.json(studentsWithScores)
    
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
