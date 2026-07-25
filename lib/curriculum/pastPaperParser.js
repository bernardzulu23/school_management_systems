/**
 * Past-paper structure helpers: section / choice-rule detection + topic keyword tagging.
 */
export function detectChoiceRule(sectionText) {
  const text = String(sectionText || '')
  const m = text.match(/answer\s+any\s+(\w+)\s+questions?/i)
  if (m) {
    const word = m[1].toLowerCase()
    const map = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
    }
    const n = map[word] || Number(word)
    if (Number.isFinite(n) && n > 0) {
      return { choiceRule: 'answer_n_of_m', chooseCount: n }
    }
  }
  return { choiceRule: 'answer_all' }
}

export function parsePastPaperCover(text) {
  const raw = String(text || '')
  const codeMatch = raw.match(/\b(\d{3,4})\s*\/\s*([12])\b/)
  const yearMatch = raw.match(/\b(19|20)\d{2}\b/)
  const durationMatch = raw.match(/(\d{2,3})\s*(minutes|mins|min)\b/i)
  const marksMatch = raw.match(/(\d{2,3})\s*marks?\b/i)

  const paperNumber = codeMatch ? Number(codeMatch[2]) : 1
  const paperCode = codeMatch ? codeMatch[1] : '0000'
  const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear()
  const durationMinutes = durationMatch ? Number(durationMatch[1]) : 120
  const totalMarks = marksMatch ? Number(marksMatch[1]) : 100
  const calculatorAllowed = /calculator\s+(is\s+)?(allowed|permitted)/i.test(raw)
  const formulaSheetProvided = /formula\s+sheet/i.test(raw)

  return {
    paperCode,
    paperNumber,
    year,
    durationMinutes,
    totalMarks,
    calculatorAllowed,
    formulaSheetProvided,
  }
}

export function parsePastPaperSections(text) {
  const raw = String(text || '')
  const sectionHeaderRe = /Section\s+([A-Z])\s*[\(\[]?\s*(\d+)\s*marks?\s*[\)\]]?/gi
  const headers = [...raw.matchAll(sectionHeaderRe)]

  if (!headers.length) {
    // Paper 1 style — all compulsory
    return [
      {
        sectionLabel: null,
        questionCount: 23,
        choiceRule: 'answer_all',
        totalMarks: undefined,
      },
    ]
  }

  const sections = []
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    const start = h.index + h[0].length
    const end = i + 1 < headers.length ? headers[i + 1].index : raw.length
    const body = raw.slice(start, end)
    const choice = detectChoiceRule(body)
    const qCount =
      (body.match(/\bQuestion\s+\d+/gi) || []).length ||
      (body.match(/\bQ\.?\s*\d+/gi) || []).length ||
      (choice.choiceRule === 'answer_n_of_m' ? Math.max(choice.chooseCount + 2, 6) : 10)

    sections.push({
      sectionLabel: `Section ${h[1]}`,
      questionCount: qCount,
      ...choice,
      totalMarks: Number(h[2]),
    })
  }
  return sections
}

/**
 * Keyword-match question snippets against syllabus topic names.
 * Always marks needsReview: true — auto tags are not ground truth.
 */
export function buildTopicCoverage(questionSnippets, topicNames) {
  const coverage = []
  const topics = (topicNames || []).map((t) => String(t || '').trim()).filter(Boolean)

  for (const topic of topics) {
    const tokens = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
    const refs = []
    ;(questionSnippets || []).forEach((q, idx) => {
      const hay = String(q || '').toLowerCase()
      if (tokens.some((tok) => hay.includes(tok))) {
        refs.push(`Q${idx + 1}`)
      }
    })
    if (refs.length) {
      coverage.push({ topic, questionRefs: refs, needsReview: true })
    }
  }

  return { topicCoverage: coverage, needsReview: true }
}

export function listTopicNamesFromContentJson(contentJson) {
  const names = []
  for (const grade of contentJson?.gradeContent || []) {
    for (const topic of grade.topics || []) {
      if (topic.topicName) names.push(topic.topicName)
    }
  }
  return names
}
