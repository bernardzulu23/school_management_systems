import { describe, expect, it } from 'vitest'
import { resolveAiChatHref, resolveAiChatLabel } from '@/lib/ai/chat/ui-entry'

describe('AI chat discoverability helpers', () => {
  it('routes each staff role to the correct chat page', () => {
    expect(resolveAiChatHref('teacher')).toBe('/dashboard/teacher/chat')
    expect(resolveAiChatHref('hod')).toBe('/dashboard/hod/chat')
    expect(resolveAiChatHref('headteacher')).toBe('/dashboard/headteacher/chat')
    expect(resolveAiChatHref('admin')).toBe('/dashboard/headteacher/chat')
    expect(resolveAiChatHref('administrator')).toBe('/dashboard/headteacher/chat')
  })

  it('labels headteacher chat as Analytics Assistant', () => {
    expect(resolveAiChatLabel('headteacher').name).toBe('Analytics Assistant')
    expect(resolveAiChatLabel('teacher').name).toBe('AI Assistant')
    expect(resolveAiChatLabel('hod').name).toBe('AI Assistant')
  })
})

describe('staff chat nav wiring (source)', () => {
  it('Sidebar includes chat entry points for teacher, HOD, and headteacher', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await fs.readFile(
      path.join(process.cwd(), 'components/dashboard/Sidebar.js'),
      'utf8'
    )
    expect(src).toContain("href: '/dashboard/teacher/chat'")
    expect(src).toContain("href: '/dashboard/hod/chat'")
    expect(src).toContain("href: '/dashboard/hod/chat-lesson-plans'")
    expect(src).toContain("href: '/dashboard/headteacher/chat'")
  })

  it('PlatformShell includes support queue', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await fs.readFile(
      path.join(process.cwd(), 'components/platform/PlatformShell.js'),
      'utf8'
    )
    expect(src).toContain("href: '/platform/support'")
  })

  it('PlatformShell includes SMS Gateway registration', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const shell = await fs.readFile(
      path.join(process.cwd(), 'components/platform/PlatformShell.js'),
      'utf8'
    )
    const page = await fs.readFile(
      path.join(process.cwd(), 'app/platform/sms-gateway/page.js'),
      'utf8'
    )
    expect(shell).toContain("href: '/platform/sms-gateway'")
    expect(page).toContain('/api/sms/gateway/register')
    expect(page).toContain('/api/admin/sms-gateway-status')
    expect(page).toContain('/api/platform/schools')
    expect(page).not.toContain('localStorage.setItem')
    expect(page).not.toContain('sessionStorage.setItem')
    expect(page).not.toMatch(/\blocalStorage\b/)
    expect(page).not.toMatch(/\bsessionStorage\b/)
  })

  it('AIFeaturesShowcase lists the chatbot entry first', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await fs.readFile(
      path.join(process.cwd(), 'components/dashboard/AIFeaturesShowcase.js'),
      'utf8'
    )
    const assistantIdx = src.indexOf("id: 'ai-assistant'")
    const materialsIdx = src.indexOf("id: 'ai-reference-materials'")
    expect(assistantIdx).toBeGreaterThan(-1)
    expect(assistantIdx).toBeLessThan(materialsIdx)
  })

  it('staff ChatPanel subtitle is accurate for teachers/HODs (not student generative chat)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await fs.readFile(path.join(process.cwd(), 'components/chat/ChatPanel.js'), 'utf8')
    expect(src).toContain('Teachers and HODs can chat here; students use ZSMS Help.')
    expect(src).not.toContain('Student chat is not enabled')
  })
})
