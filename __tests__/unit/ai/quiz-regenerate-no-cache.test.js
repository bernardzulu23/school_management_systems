import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd())

function readRoute(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

describe('assessment generation must not return permanent AiCache hits', () => {
  it('quiz-maker skips cache read/write and uses variationSeed + higher temperature', () => {
    const src = readRoute('app/api/ai/quiz-maker/route.ts')
    expect(src).not.toMatch(/getCachedAIResponse/)
    expect(src).not.toMatch(/setCachedAIResponse/)
    expect(src).toMatch(/variationSeed/)
    expect(src).toMatch(/QUIZ_TEMPERATURE\s*=\s*0\.7/)
    expect(src).toMatch(/Produce a fresh unique set of questions/)
  })

  it('ecz-practice skips cache read/write and varies each run', () => {
    const src = readRoute('app/api/ai/ecz-practice/route.js')
    expect(src).not.toMatch(/getCachedAIResponse/)
    expect(src).not.toMatch(/setCachedAIResponse/)
    expect(src).toMatch(/variationSeed/)
    expect(src).toMatch(/temperature:\s*0\.7/)
    expect(src).toMatch(/Produce a fresh unique practice set/)
  })

  it('ecz-exam-questions skips cache read/write and varies each run', () => {
    const src = readRoute('app/api/ai/ecz-exam-questions/route.js')
    expect(src).not.toMatch(/getCachedAIResponse/)
    expect(src).not.toMatch(/setCachedAIResponse/)
    expect(src).toMatch(/variationSeed/)
    expect(src).toMatch(/temperature:\s*0\.7/)
    expect(src).toMatch(/Produce a fresh unique set of scenarios/)
  })

  it('quiz-maker UI sends forceRefresh and variationSeed on Create Quiz', () => {
    const src = readRoute('app/dashboard/teacher/quiz-maker/page.js')
    expect(src).toMatch(/forceRefresh:\s*true/)
    expect(src).toMatch(/variationSeed/)
  })

  it('topic-test UI sends forceRefresh and variationSeed', () => {
    const src = readRoute('app/dashboard/teacher/topic-test/page.js')
    expect(src).toMatch(/forceRefresh:\s*true/)
    expect(src).toMatch(/variationSeed/)
  })

  it('flashcards vary each generate and allow forceRefresh replace', () => {
    const route = readRoute('app/api/student/flashcards/route.js')
    const deck = readRoute('lib/flashcards/generateDeck.js')
    const ui = readRoute('app/dashboard/student/flashcards/page.js')
    expect(route).toMatch(/variationSeed/)
    expect(route).toMatch(/forceRefresh/)
    expect(route).toMatch(/Produce a fresh unique set of flashcards/)
    expect(deck).toMatch(/FLASHCARD_TEMPERATURE\s*=\s*0\.7/)
    expect(ui).toMatch(/forceRefresh:\s*true/)
    expect(ui).toMatch(/variationSeed/)
  })

  it('mock exam varies each start with higher temperature', () => {
    const paper = readRoute('lib/mock-exam/generate-paper.js')
    const start = readRoute('app/api/student/mock-exam/start/route.js')
    const ui = readRoute('app/dashboard/student/mock-exam/page.js')
    expect(paper).toMatch(/MOCK_EXAM_TEMPERATURE\s*=\s*0\.7/)
    expect(paper).toMatch(/variationSeed/)
    expect(paper).toMatch(/Produce a fresh unique mock exam paper/)
    expect(start).toMatch(/variationSeed:\s*body\.variationSeed/)
    expect(ui).toMatch(/forceRefresh:\s*true/)
    expect(ui).toMatch(/variationSeed/)
  })

  it('ecz-practice and exam-scenario UIs send variationSeed', () => {
    const practice = readRoute('app/dashboard/student/ecz-practice/page.js')
    const builder = readRoute('components/assessments/EczExamScenarioBuilder.js')
    expect(practice).toMatch(/forceRefresh:\s*true/)
    expect(practice).toMatch(/variationSeed/)
    expect(builder).toMatch(/forceRefresh:\s*true/)
    expect(builder).toMatch(/variationSeed/)
  })

  it('project-maker skips AiCache and varies each run', () => {
    const src = readRoute('app/api/ai/project-maker/route.ts')
    expect(src).not.toMatch(/getCachedAIResponse/)
    expect(src).not.toMatch(/setCachedAIResponse/)
    expect(src).toMatch(/variationSeed/)
    expect(src).toMatch(/PROJECT_TEMPERATURE\s*=\s*0\.7/)
    expect(src).toMatch(/Produce a fresh unique project brief/)
  })

  it('ECZ assessment form sends forceRefresh and variationSeed for projects', () => {
    const src = readRoute('components/assessments/CreateEczAssessmentForm.js')
    expect(src).toMatch(/\/api\/ai\/project-maker/)
    expect(src).toMatch(/forceRefresh:\s*true/)
    expect(src).toMatch(/variationSeed/)
    expect(src).toMatch(/CurriculumTopicSelect/)
  })

  it('assessment surfaces expose PDF and Word (DOCX) export, not HTML-only', () => {
    const quiz = readRoute('app/dashboard/teacher/quiz-maker/page.js')
    const topic = readRoute('app/dashboard/teacher/topic-test/page.js')
    const scenarios = readRoute('components/assessments/EczExamScenarioBuilder.js')
    const practice = readRoute('app/dashboard/student/ecz-practice/page.js')
    const api = readRoute('app/api/exports/assessment-paper/route.js')
    expect(api).toMatch(/generateAssessmentWordDoc/)
    expect(api).toMatch(/buildPdfDocument/)
    expect(api).not.toMatch(/text\/html/)
    for (const src of [quiz, topic, scenarios, practice]) {
      expect(src).toMatch(/downloadAssessmentPaper/)
      expect(src).toMatch(/['"]pdf['"]/)
      expect(src).toMatch(/['"]word['"]/)
    }
  })
})
