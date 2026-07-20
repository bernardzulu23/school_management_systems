import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const FORBIDDEN = [
  /@\/lib\/ai\/chat\//,
  /@\/lib\/ai\/curriculum-context/,
  /provider-fallback/,
  /groq/i,
  /gemini/i,
  /openrouter/i,
  /scoped-context/,
  /\/api\/ai\//,
  /ChatPanel/,
]

describe('student navbot UI wiring', () => {
  it('Sidebar exposes ZSMS Help for students', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/Sidebar.js'), 'utf8')
    expect(src).toContain("href: '/dashboard/student/help'")
    expect(src).toContain("name: 'ZSMS Help'")
  })

  it('student help page mounts StudentNavBot', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/student/help/page.js'),
      'utf8'
    )
    expect(src).toContain("from '@/components/student/StudentNavBot'")
    expect(src).toContain('<StudentNavBot')
  })

  it('StudentNavBot only calls /api/chat/navbot and stays off generative chat', () => {
    const files = [
      path.join(process.cwd(), 'components/student/StudentNavBot.js'),
      path.join(process.cwd(), 'app/dashboard/student/help/page.js'),
    ]

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN) {
        expect(source).not.toMatch(pattern)
      }
    }

    const panel = fs.readFileSync(
      path.join(process.cwd(), 'components/student/StudentNavBot.js'),
      'utf8'
    )
    expect(panel).toContain("fetch('/api/chat/navbot'")
    expect(panel).not.toContain('/api/ai/study-assistant')
  })

  it('student home quick actions link to help', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/student/page.js'), 'utf8')
    expect(src).toContain('href="/dashboard/student/help"')
    expect(src).toContain('ZSMS Help')
  })
})
