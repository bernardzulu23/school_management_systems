import { describe, expect, it } from 'vitest'
import {
  NAVBOT_MATCH_THRESHOLD,
  matchIntent,
  normalizeNavBotText,
  navBotIntents,
} from '@/lib/navbot/match-intent'

describe('navbot matcher', () => {
  it('matches every seed trigger to its intent', () => {
    for (const intent of navBotIntents) {
      for (const trigger of intent.triggers) {
        const result = matchIntent(trigger)
        expect(result.match?.intent.id).toBe(intent.id)
        expect(result.match?.score).toBeGreaterThanOrEqual(NAVBOT_MATCH_THRESHOLD)
      }
    }
  })

  it('normalizes punctuation and case before matching', () => {
    const result = matchIntent('What class do I have?!')
    expect(normalizeNavBotText("Can't log in?!")).toBe('can t log in')
    expect(result.match?.intent.id).toBe('view-timetable')
  })

  it('falls back on unrelated questions', () => {
    const result = matchIntent('what is photosynthesis and how does it work')
    expect(result.match).toBeNull()
    expect(result.bestCandidate?.score ?? 0).toBeLessThan(NAVBOT_MATCH_THRESHOLD)
  })
})
