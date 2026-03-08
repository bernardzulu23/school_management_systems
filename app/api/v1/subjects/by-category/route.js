import { NextResponse } from 'next/server'
import { SCHOOL_SUBJECTS, SUBJECT_CATEGORIES } from '@/data/subjects'

export async function GET() {
  try {
    // If SUBJECT_CATEGORIES is not exported or defined, derive it
    const categories = SUBJECT_CATEGORIES || [...new Set(SCHOOL_SUBJECTS.map((s) => s.category))]

    const grouped = categories.reduce((acc, category) => {
      acc[category] = SCHOOL_SUBJECTS.filter((s) => s.category === category)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: grouped,
    })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subjects',
      },
      { status: 500 }
    )
  }
}
