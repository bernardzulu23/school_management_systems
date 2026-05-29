export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { SCHOOL_SUBJECTS, SUBJECT_CATEGORIES } from '@/data/subjects'

export async function GET() {
  try {
    // SUBJECT_CATEGORIES entries are objects ({ id, name }), so use the id as
    // both the group key and the match value — using the object directly would
    // produce "[object Object]" keys and never match s.category.
    const categories = (
      SUBJECT_CATEGORIES || [...new Set(SCHOOL_SUBJECTS.map((s) => s.category))]
    ).map((c) => (typeof c === 'string' ? c : c.id))

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
