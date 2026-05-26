/**
 * Convert structured LessonPlan (Zod) to plain text for display / Word export.
 */

/**
 * @param {import('./schemas.js').LessonPlanSchema extends import('zod').ZodType<infer T> ? T : never} plan
 */
export function structuredLessonPlanToPlainText(plan) {
  const lines = []
  lines.push('MINISTRY OF EDUCATION — LESSON PLAN')
  lines.push('')
  lines.push(`TITLE: ${plan.title}`)
  lines.push(`SUBJECT: ${plan.subject}`)
  lines.push(`FORM/GRADE: ${plan.gradeOrForm}`)
  lines.push(`DURATION: ${plan.duration} minutes`)
  lines.push('')
  lines.push('LEARNING OBJECTIVES:')
  plan.objectives.forEach((obj, i) => {
    lines.push(`${i + 1}. ${obj.objective} (${obj.bloomsLevel} — ${obj.competency})`)
  })
  lines.push('')
  lines.push('PRIOR KNOWLEDGE:')
  lines.push(plan.priorKnowledge)
  lines.push('')
  lines.push('MATERIALS REQUIRED:')
  plan.materialsRequired.forEach((m, i) => lines.push(`${i + 1}. ${m}`))
  lines.push('')
  lines.push('LESSON ACTIVITIES:')
  plan.activities.forEach((act) => {
    lines.push('')
    lines.push(`${act.phase.toUpperCase()} (${act.durationMinutes} min)`)
    lines.push(`Activity: ${act.activity}`)
    lines.push(`Teacher: ${act.teacherAction}`)
    lines.push(`Learners: ${act.learnerAction}`)
    if (act.resources?.length) {
      lines.push(`Resources: ${act.resources.join(', ')}`)
    }
    if (act.zambiaCulturalContext) {
      lines.push(`Zambia context: ${act.zambiaCulturalContext}`)
    }
  })
  lines.push('')
  lines.push('ASSESSMENT:')
  lines.push(`Method: ${plan.assessment.method}`)
  lines.push(`Tool: ${plan.assessment.tool}`)
  lines.push(`Criteria: ${plan.assessment.criteria}`)
  lines.push('')
  lines.push('CROSS-CUTTING THEMES:')
  plan.crossCuttingThemes.forEach((t) => lines.push(`- ${t}`))
  lines.push('')
  lines.push('CORE COMPETENCIES:')
  plan.coreCompetencies.forEach((c) => lines.push(`- ${c}`))
  lines.push('')
  lines.push('REAL-WORLD ZAMBIAN CONTEXT:')
  lines.push(plan.realWorldZambianContext)
  if (plan.teacherReflectionPrompts?.length) {
    lines.push('')
    lines.push('TEACHER REFLECTION:')
    plan.teacherReflectionPrompts.forEach((p, i) => lines.push(`${i + 1}. ${p}`))
  }
  return lines.join('\n')
}
