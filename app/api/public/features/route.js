import { NextResponse } from 'next/server'
import {
  AI_FEATURE_CATALOG,
  CURRICULUM_FEATURE_CATALOG,
  HEADTEACHER_PREVIEW_PILLS,
} from '@/lib/marketing/featureCatalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    aiFeatures: AI_FEATURE_CATALOG,
    curriculumFeatures: CURRICULUM_FEATURE_CATALOG,
    headteacherPreview: HEADTEACHER_PREVIEW_PILLS,
  })
}
