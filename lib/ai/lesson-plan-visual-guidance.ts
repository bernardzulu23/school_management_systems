/**
 * Subject/topic rules for when lesson-plan visualAids should be emitted.
 * Used by prompts and tests — never decorative graphs for non-visual topics.
 */

import { resolveCanonicalSubject } from '@/lib/ai/subject-adaptive-prompts'

const COORDINATE_TOPIC =
  /\b(coord|cartesian|x[- ]?y|plane|plot|graph|linear\s+eq|straight\s+line|quadratic|function|gradient|slope|intercept|simultaneous)\b/i

const STATS_TOPIC =
  /\b(stat|data|frequency|histogram|bar\s*chart|line\s*graph|mean|median|mode|probability|pie\s*chart|table)\b/i

const SCIENCE_GRAPH_TOPIC =
  /\b(force|motion|velocity|speed|acceleration|distance[- ]time|time[- ]graph|temperature|pressure|voltage|current|reaction\s+rate|growth|population|climate|rainfall|temperature)\b/i

const PROCESS_TOPIC =
  /\b(cycle|process|flow|system|circuit|life\s+cycle|water\s+cycle|food\s+chain|photosynthesis|digestion|procedure|algorithm|network)\b/i

export type VisualGuidanceKind = 'cartesian' | 'line' | 'bar' | 'conceptual' | 'none'

/**
 * Recommend visual aid kinds for a subject + topic. Empty array means omit visuals.
 */
export function recommendLessonPlanVisualKinds(
  subject: string,
  topic: string
): Exclude<VisualGuidanceKind, 'none'>[] {
  const canonical = resolveCanonicalSubject(subject)
  const hay = `${canonical} ${topic}`
  const kinds = new Set<Exclude<VisualGuidanceKind, 'none'>>()

  const mathLike = /math|additional\s*math|pure\s*math/i.test(canonical)
  const scienceLike = /physics|chemistry|biology|science|geography|agric/i.test(canonical)
  const commerceLike = /commerce|economics|accounts|business|entrepreneur/i.test(canonical)
  const ictLike = /computer|ict|information/i.test(canonical)

  if (mathLike && COORDINATE_TOPIC.test(hay)) {
    kinds.add('cartesian')
    kinds.add('line')
  }
  if ((mathLike || commerceLike || scienceLike) && STATS_TOPIC.test(hay)) {
    kinds.add('bar')
    kinds.add('line')
  }
  if (scienceLike && SCIENCE_GRAPH_TOPIC.test(hay)) {
    kinds.add('line')
    kinds.add('cartesian')
  }
  if ((scienceLike || ictLike) && PROCESS_TOPIC.test(hay)) {
    kinds.add('conceptual')
  }
  if (ictLike && !kinds.size) {
    kinds.add('conceptual')
  }

  return Array.from(kinds)
}

/**
 * Prompt block instructing the model when/how to emit visualAids.
 */
export function buildLessonPlanVisualGuidanceBlock(subject: string, topic: string): string {
  const recommended = recommendLessonPlanVisualKinds(subject, topic)
  if (!recommended.length) {
    return `
VISUAL AIDS:
- Do NOT invent decorative graphs for this subject/topic.
- Omit "visualAids" and set "mermaidDiagram" to null.
- Focus on rich table-ready teacher/learner activities instead.`
  }

  return `
VISUAL AIDS (mandatory when pedagogically useful — recommended types: ${recommended.join(', ')}):
- Include 1–2 items in "visualAids" using ONLY these typed objects:
  * cartesian: { type:"cartesian", title, caption?, xAxis:{min,max,label?,step?}, yAxis:{min,max,label?,step?}, series:[{name,points:[{x,y,label?}]}], showGrid? }
  * line: { type:"line", title, caption?, xAxis, yAxis, series:[{name,points:[{x,y}]}], showGrid? }
  * bar: { type:"bar", title, caption?, yLabel?, items:[{label,value}] }
  * conceptual: { type:"conceptual", title, caption?, mermaid:"flowchart TD\\n A-->B" }
- Use REAL numeric values that illustrate THIS topic (e.g. plot y=2x+1 points, rainfall by month, distance-time).
- Bounds: numbers between -1000 and 1000; max 4 series; max 40 points per series; max 12 bar items.
- Never invent unrelated business/shopping graphs for pure algebra unless the topic itself is financial.
- You may also set legacy "mermaidDiagram" for one conceptual flowchart; prefer visualAids.
- If a visual would not help learners, omit visualAids entirely.`
}
