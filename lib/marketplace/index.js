/**
 * Teaching Materials Marketplace helpers.
 *
 * PRIVACY: marketplace listings must never expose the source schoolId or the
 * author's contact details. Only the province is shown, and the author's name
 * only when they opted in (`showAuthorName`). Use `toPublicListing` / `toPublicDetail`
 * for every response that leaves the server.
 */

export const MARKETPLACE_TYPES = ['lesson_plan', 'sba_task', 'rubric', 'exam_question']

/** Map a SharedMaterial row to a privacy-safe list card. */
export function toPublicListing(m) {
  return {
    id: m.id,
    type: m.type,
    title: m.title,
    subject: m.subject,
    form: m.form,
    topic: m.topic,
    resourceLevel: m.resourceLevel,
    cbcCompetencies: Array.isArray(m.cbcCompetencies) ? m.cbcCompetencies : [],
    tags: Array.isArray(m.tags) ? m.tags : [],
    province: m.province || null,
    author: m.showAuthorName ? m.teacher?.name || null : null,
    rating: m.rating ?? null,
    ratingCount: m.ratingCount ?? 0,
    downloadCount: m.downloadCount ?? 0,
    createdAt: m.createdAt,
  }
}

/** Full detail (adds content) — still privacy-safe. */
export function toPublicDetail(m) {
  return {
    ...toPublicListing(m),
    content: m.content ?? null,
  }
}

/**
 * Recompute and persist the cached average rating + count for a material.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} materialId
 */
export async function recomputeMaterialRating(prisma, materialId) {
  const agg = await prisma.materialRating.aggregate({
    where: { materialId },
    _avg: { score: true },
    _count: { score: true },
  })
  const avg = agg._avg.score
  await prisma.sharedMaterial.update({
    where: { id: materialId },
    data: {
      rating: avg != null ? Math.round(avg * 10) / 10 : null,
      ratingCount: agg._count.score || 0,
    },
  })
}

/**
 * Build the marketplace `content` JSON blob from a teacher's lesson plan,
 * capturing everything needed to recreate it on download.
 */
export function lessonPlanToContent(plan) {
  return {
    grade: plan.grade,
    subject: plan.subject,
    topic: plan.topic,
    subTopic: plan.subTopic || null,
    duration: plan.duration ?? null,
    term: plan.term || null,
    templateType: plan.templateType || 'professional',
    content: plan.content || '',
    structuredContent: plan.structuredContent ?? null,
  }
}
