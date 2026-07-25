/**
 * Parse old-syllabus PDF text into OldSyllabusDocument JSON shape.
 * Anchors: topic "10.1 SETS", outcomes "10.1.1.1", optional SEQUENCE table.
 */
import { OLD_SYLLABUS_DOMAINS } from '@/lib/curriculum/validateOldSyllabus'

const DOMAIN_HINTS = [
  { re: /\b(set|number|base|fraction|ratio|percent)/i, domain: 'Numbers & Calculations' },
  { re: /\b(algebra|equation|formula|expression|quadratic|linear)/i, domain: 'Algebra' },
  { re: /\b(geometry|angle|triangle|circle|transform)/i, domain: 'Geometry' },
  { re: /\b(computer|ict|binary|algorithm)/i, domain: 'Computers' },
  { re: /\b(measure|length|area|volume|mass|time)/i, domain: 'Measures' },
  { re: /\b(probability|statistic|mean|median|mode|data)/i, domain: 'Probability & Statistics' },
  { re: /\b(relation|function|graph|mapping)/i, domain: 'Relations' },
]

function guessDomain(topicName) {
  for (const h of DOMAIN_HINTS) {
    if (h.re.test(topicName)) return h.domain
  }
  return 'Numbers & Calculations'
}

function deriveSubjectFromFilename(filename) {
  let base = String(filename || '')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(g\.?c\.?e\.?|internal|watermarked)\b/gi, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ') // strip years like 2021/2024
    .replace(/\b(grade|g)\s*(10|11|12)\b/gi, ' ')
    .replace(/\b(10|11|12)\b/gi, ' ')
    .replace(/\b(to|and)\b/gi, ' ')
    .replace(/\b(o.?level|syllabus|grades?|paper|p)\s*[12]?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Normalize common abbreviations to syllabus subject names (longest / most specific first)
  const aliases = [
    ['literature in english', 'Literature In English'],
    ['literature', 'Literature In English'],
    ['mathematics', 'Mathematics'],
    ['maths', 'Mathematics'],
    ['math', 'Mathematics'],
    ['biology', 'Biology'],
    ['bio', 'Biology'],
    ['chemistry', 'Chemistry'],
    ['chem', 'Chemistry'],
    ['physics', 'Physics'],
    ['phys', 'Physics'],
    ['geography', 'Geography'],
    ['geo', 'Geography'],
    ['english', 'English'],
    ['eng', 'English'],
  ]
  const key = base.toLowerCase()
  for (const [alias, canonical] of aliases) {
    if (
      key === alias ||
      new RegExp(`(^|\\b)${alias.replace(/\s+/g, '\\s+')}(\\b|$)`, 'i').test(key)
    ) {
      return canonical
    }
  }

  if (!base) return 'Unknown'
  return base
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Best-effort parse of corrected PDF text into schema-shaped JSON.
 * Older scans are noisy — validation may fail; callers persist INVALID rows.
 */
export function parseOldSyllabusText(text, subject) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const topicsByGrade = new Map([
    [10, []],
    [11, []],
    [12, []],
  ])

  let currentGrade = 10
  let currentTopic = null
  let currentSubtopic = null

  const topicRe = /^(\d{2})\.(\d+)\s+([A-Za-z].+)$/
  const outcomeRe = /^(\d{2}\.\d+\.\d+\.\d+)\s+(.+)$/
  const subtopicRe = /^(\d{2}\.\d+\.\d+)\s+(.+)$/

  for (const line of lines) {
    const topicMatch = line.match(topicRe)
    if (topicMatch && !line.match(outcomeRe) && !line.match(subtopicRe)) {
      const grade = Number(topicMatch[1])
      if (![10, 11, 12].includes(grade)) continue
      // Skip if this looks like an outcome id with only 2 segments after grade - already handled
      if (/^\d{2}\.\d+\.\d+/.test(line)) {
        // fall through to subtopic/outcome
      } else {
        currentGrade = grade
        currentTopic = {
          topicId: `${topicMatch[1]}.${topicMatch[2]}`,
          topicName: topicMatch[3].trim(),
          domain: guessDomain(topicMatch[3]),
          subtopics: [],
        }
        currentSubtopic = null
        topicsByGrade.get(grade).push(currentTopic)
        continue
      }
    }

    const outcomeMatch = line.match(outcomeRe)
    if (outcomeMatch) {
      const outcomeId = outcomeMatch[1]
      const statement = outcomeMatch[2].trim()
      const parts = outcomeId.split('.')
      const grade = Number(parts[0])
      if (!currentTopic || currentTopic.topicId !== `${parts[0]}.${parts[1]}`) {
        currentGrade = grade
        currentTopic = {
          topicId: `${parts[0]}.${parts[1]}`,
          topicName: `Topic ${parts[0]}.${parts[1]}`,
          domain: guessDomain(statement),
          subtopics: [],
        }
        topicsByGrade.get(grade)?.push(currentTopic)
        currentSubtopic = null
      }
      const subId = `${parts[0]}.${parts[1]}.${parts[2]}`
      if (!currentSubtopic || currentSubtopic.subtopicId !== subId) {
        currentSubtopic = {
          subtopicId: subId,
          subtopicName: `Subtopic ${subId}`,
          specificOutcomes: [],
        }
        currentTopic.subtopics.push(currentSubtopic)
      }
      currentSubtopic.specificOutcomes.push({
        outcomeId,
        statement: statement.length >= 3 ? statement : `${statement}…`,
        knowledge: [],
        skills: [],
        values: [],
      })
      continue
    }

    const subMatch = line.match(subtopicRe)
    if (subMatch && currentTopic) {
      currentSubtopic = {
        subtopicId: subMatch[1],
        subtopicName: subMatch[2].trim(),
        specificOutcomes: [],
      }
      currentTopic.subtopics.push(currentSubtopic)
    }
  }

  // Ensure every topic has at least one subtopic/outcome for validation attempts
  for (const [, topics] of topicsByGrade) {
    for (const topic of topics) {
      if (!topic.subtopics.length) {
        topic.subtopics.push({
          subtopicId: `${topic.topicId}.1`,
          subtopicName: topic.topicName,
          specificOutcomes: [
            {
              outcomeId: `${topic.topicId}.1.1`,
              statement: `Demonstrate understanding of ${topic.topicName}`,
              knowledge: [],
              skills: [],
              values: [],
            },
          ],
        })
      } else {
        for (const st of topic.subtopics) {
          if (!st.specificOutcomes.length) {
            st.specificOutcomes.push({
              outcomeId: `${st.subtopicId}.1`,
              statement: `Demonstrate understanding of ${st.subtopicName}`,
              knowledge: [],
              skills: [],
              values: [],
            })
          }
        }
      }
    }
  }

  const gradeContent = [10, 11, 12]
    .map((grade) => ({
      grade,
      topics: topicsByGrade.get(grade) || [],
    }))
    .filter((g) => g.topics.length > 0)

  const domainsUsed = new Set()
  for (const g of gradeContent) {
    for (const t of g.topics) domainsUsed.add(t.domain)
  }

  return {
    subject: subject || 'Unknown',
    level: 'O-LEVEL',
    assessmentPhilosophy: { structureKnown: false },
    domains: domainsUsed.size
      ? Array.from(domainsUsed).filter((d) => OLD_SYLLABUS_DOMAINS.includes(d))
      : ['Numbers & Calculations'],
    gradeContent:
      gradeContent.length > 0
        ? gradeContent
        : [
            {
              grade: 10,
              topics: [
                {
                  topicId: '10.1',
                  topicName: 'General content',
                  domain: 'Numbers & Calculations',
                  subtopics: [
                    {
                      subtopicId: '10.1.1',
                      subtopicName: 'Introduction',
                      specificOutcomes: [
                        {
                          outcomeId: '10.1.1.1',
                          statement:
                            'Content could not be auto-extracted; requires manual curation',
                          knowledge: [],
                          skills: [],
                          values: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
    verticalProgression: [],
  }
}

export { deriveSubjectFromFilename, guessDomain }
