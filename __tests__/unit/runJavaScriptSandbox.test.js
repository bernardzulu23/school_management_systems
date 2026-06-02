import { describe, it, expect } from 'vitest'
import { runJavaScriptSandbox } from '@/lib/creative-teaching/runJavaScriptSandbox'

describe('runJavaScriptSandbox', () => {
  it('captures console.log output', () => {
    const r = runJavaScriptSandbox('console.log("Hello", 2 + 2)')
    expect(r.stderr).toBe('')
    expect(r.stdout).toContain('Hello 4')
  })

  it('returns syntax errors in stderr', () => {
    const r = runJavaScriptSandbox('console.log(')
    expect(r.stderr).toBeTruthy()
  })
})
