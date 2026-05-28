import { describe, it, expect } from 'vitest'
import {
  PLAYGROUND_LANGUAGES,
  fileNameForLanguage,
  buildPreviewDocument,
  isPistonLanguage,
} from '@/lib/creative-teaching/playgroundLanguages'

describe('playground languages', () => {
  it('includes C++, C#, HTML, CSS', () => {
    const ids = PLAYGROUND_LANGUAGES.map((l) => l.id)
    expect(ids).toContain('c++')
    expect(ids).toContain('csharp.net')
    expect(ids).toContain('html')
    expect(ids).toContain('css')
  })

  it('maps filenames for compiled languages', () => {
    expect(fileNameForLanguage('c++')).toBe('main.cpp')
    expect(fileNameForLanguage('csharp.net')).toBe('Program.cs')
    expect(fileNameForLanguage('python')).toBe('main.py')
  })

  it('builds CSS preview document with demo HTML', () => {
    const css = PLAYGROUND_LANGUAGES.find((l) => l.id === 'css')
    const doc = buildPreviewDocument(css, 'h1 { color: red; }')
    expect(doc).toContain('<style>h1 { color: red; }</style>')
    expect(doc).toContain('<h1>Welcome</h1>')
  })

  it('distinguishes piston vs preview runtimes', () => {
    const py = PLAYGROUND_LANGUAGES.find((l) => l.id === 'python')
    const html = PLAYGROUND_LANGUAGES.find((l) => l.id === 'html')
    expect(isPistonLanguage(py)).toBe(true)
    expect(isPistonLanguage(html)).toBe(false)
  })
})
