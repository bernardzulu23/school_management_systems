import { generateAIObject } from '@/lib/ai/client'
import { FlashcardSessionFeedbackSchema } from '@/lib/ai/schemas'
import { FLASHCARD_AI_MODELS } from '@/lib/flashcards/generateDeck'

const FEEDBACK_SYSTEM =
  'You are a Zambian CBC study coach. Give encouraging, age-appropriate feedback after a flashcard quiz. ' +
  'Recommend only readable resources: books and articles (no videos, podcasts, or apps). ' +
  'Prefer Zambian curriculum context, open textbooks, and reputable educational articles where possible.'

function buildFeedbackPrompt({ subjectName, deckTitle, score, missed }) {
  const missedLines = missed.length
    ? missed
        .map(
          (m, i) =>
            `${i + 1}. Q: ${m.question}\n   Student chose: ${m.selected || '(skipped)'}\n   Correct: ${m.correctAnswer}`
        )
        .join('\n')
    : 'None — perfect score.'

  return `A Form-level student finished a ${subjectName} flashcard deck.
Deck: ${deckTitle || subjectName}
Score: ${score.correctCount}/${score.total} (${score.percent}%)
Rating band: ${score.rating.label}

Questions they missed:
${missedLines}

Return personalised feedback with:
- summary (2-3 sentences)
- topicsToImprove (specific CBC topics from missed questions)
- strengths (what they did well; if perfect, praise consistency)
- readingList: 3-5 items, each type "book" or "article" only, with title, optional author, and one-line reason to read it`
}

function fallbackFeedback({ subjectName, score, missed }) {
  const topics = missed.map((m) => m.question).slice(0, 5)
  return {
    summary:
      score.percent >= 75
        ? `Strong work in ${subjectName}. You answered ${score.correctCount} of ${score.total} correctly.`
        : `You scored ${score.correctCount}/${score.total} in ${subjectName}. Review the topics below and try again tomorrow.`,
    topicsToImprove: topics.length
      ? topics
      : ['Keep revising core syllabus topics for this subject'],
    strengths:
      score.percent === 100
        ? ['Answered every question correctly']
        : score.percent >= 60
          ? ['Good grasp of several topics in this deck']
          : ['Completed the full deck — regular practice will help'],
    readingList: [
      {
        type: 'book',
        title: `${subjectName} CBC Learner's Guide`,
        author: 'Ministry of Education Zambia',
        reason: 'Covers syllabus topics aligned to your grade.',
      },
      {
        type: 'article',
        title: `Revision notes: ${subjectName}`,
        author: 'ZSMS Study Library',
        reason: 'Short reading to reinforce concepts you missed today.',
      },
    ],
  }
}

/**
 * @param {{ subjectName: string, deckTitle?: string, score: ReturnType<import('./scoreSession').scoreFlashcardSession> }} params
 */
export async function generateFlashcardSessionFeedback({ subjectName, deckTitle, score }) {
  const prompt = buildFeedbackPrompt({
    subjectName,
    deckTitle,
    score,
    missed: score.missed,
  })

  try {
    const { object } = await generateAIObject(
      FlashcardSessionFeedbackSchema,
      FEEDBACK_SYSTEM,
      prompt,
      { models: FLASHCARD_AI_MODELS, maxTokens: 2000, temperature: 0.5 }
    )
    return object
  } catch {
    return fallbackFeedback({ subjectName, score, missed: score.missed })
  }
}
