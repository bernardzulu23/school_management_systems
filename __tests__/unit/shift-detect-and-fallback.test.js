import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  detectShift,
  shiftDecode,
  scoreEnglish,
  encodedFocus,
} from '@/lib/curriculum/cdcShiftDetect'
import {
  resolveStaticFallback,
  buildFallbackContextBlock,
  __resetFallbackResolverCache,
} from '@/lib/ai/fallback-resolver'

describe('cdcShiftDetect', () => {
  it('detects +29 on encoded CDC table sample', () => {
    // "CONCEPTS SUB-TOPICS SPECIFIC COMPETENCES" encoded with -29
    const encoded = shiftDecode('CONCEPTS SUB-TOPICS SPECIFIC COMPETENCES LEARNING ACTIVITIES', -29)
    const { shift, confidence } = detectShift(encoded)
    expect(shift).toBe(29)
    expect(confidence).toBeGreaterThan(0.8)
  })

  it('detects 0 on already-readable English', () => {
    const sample =
      'TOPIC SUB-TOPIC SPECIFIC COMPETENCES LEARNING ACTIVITIES EXPECTED STANDARD\n' +
      '1.1.1 Nature of Science Inquiry in Biology\n' +
      'Apply scientific inquiry in carrying out scientific investigations'
    const { shift, confidence } = detectShift(sample)
    expect(shift).toBe(0)
    expect(confidence).toBeGreaterThan(0.9)
  })

  it('encodedFocus prefers control-character lines on mixed pages', () => {
    const readable = 'BIOLOGY SYLLABUS SECONDARY EDUCATION ORDINARY LEVEL'
    const encoded = shiftDecode('CONCEPTS SUB-TOPICS SPECIFIC COMPETENCES', -29)
    const focus = encodedFocus(`${readable}\n${encoded}`)
    expect(focus).toContain(encoded)
    expect(scoreEnglish(shiftDecode(focus, 29))).toBeGreaterThan(0.8)
  })
})

describe('fallback-resolver', () => {
  beforeEach(() => {
    __resetFallbackResolverCache()
    vi.restoreAllMocks()
  })

  it('returns Form-1 hit when static-fallback exists for subject', () => {
    const hit = resolveStaticFallback('Chemistry', 'Form 1', 'matter')
    expect(hit).not.toBeNull()
    expect(hit.form).toBe(1)
    expect(['A', 'B', 'C']).toContain(hit.tier)
    expect(hit.data).toBeTruthy()
    expect(buildFallbackContextBlock(hit)).toContain('Form 1')
    expect(buildFallbackContextBlock(hit)).not.toMatch(/all forms covered/i)
  })

  it('Form 2 Chemistry hit when form-2 bank exists (not known-gap)', () => {
    const hit = resolveStaticFallback('Chemistry', 'Form 2', 'matter')
    // After Form-2 STEM ingest, Chemistry form-2 should resolve; if bank missing, null.
    const form2Dir = require('path').join(
      process.cwd(),
      'data',
      'static-fallback',
      'chemistry',
      'form-2'
    )
    if (require('fs').existsSync(form2Dir)) {
      expect(hit).not.toBeNull()
      expect(hit.form).toBe(2)
      expect(hit.data).toBeTruthy()
      expect(buildFallbackContextBlock(hit)).toContain('Form 2')
      expect(buildFallbackContextBlock(hit)).not.toMatch(/all forms covered/i)
    } else {
      expect(hit).toBeNull()
    }
  })

  it('Form 3 and Form 4 STEM remain known-gaps until sourced', () => {
    expect(resolveStaticFallback('Physics', 3, 'waves')).toBeNull()
    expect(resolveStaticFallback('Mathematics', 'Form 4', 'calculus')).toBeNull()
    expect(resolveStaticFallback('Chemistry', 'Form 3', 'organic')).toBeNull()
  })
})
