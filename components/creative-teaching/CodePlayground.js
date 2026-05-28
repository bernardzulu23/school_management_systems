'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import {
  PLAYGROUND_LANGUAGES,
  buildPreviewDocument,
  fileNameForLanguage,
  isPistonLanguage,
  monacoLanguageFor,
} from '@/lib/creative-teaching/playgroundLanguages'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const CHALLENGES = [
  {
    title: 'Hello World',
    desc: 'Print "Hello, Zambia!"',
    starter: (lang) => lang.starter,
  },
  {
    title: 'Sum 1 to N',
    desc: 'Calculate sum of numbers 1 to 10',
    starter: () =>
      '# Calculate sum of 1 to 10\ntotal = 0\nfor i in range(1, 11):\n    total += i\nprint(f"Sum from 1 to 10 = {total}")\n',
  },
]

/**
 * @param {{ embedded?: boolean }} props
 */
export default function CodePlayground({ embedded = false }) {
  const [lang, setLang] = useState(PLAYGROUND_LANGUAGES[0])
  const [code, setCode] = useState(PLAYGROUND_LANGUAGES[0].starter)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)
  const [showChallenges, setShowChallenges] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const previewHtml = useMemo(() => buildPreviewDocument(lang, code), [lang, code])
  const showPreview = lang.runtime === 'iframe' || lang.runtime === 'css-preview'
  const editorHeight = embedded ? 'min(50vh, 420px)' : 'calc(100vh - 120px)'

  const runCode = async () => {
    if (!isPistonLanguage(lang) || !code.trim()) return
    setRunning(true)
    setOutput('')
    setError(false)

    try {
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang.id,
          version: lang.version,
          files: [{ name: fileNameForLanguage(lang.id), content: code }],
          stdin: '',
          args: [],
          compile_timeout: 10000,
          run_timeout: 5000,
        }),
      })

      const data = await res.json().catch(() => ({}))
      const stdout = String(data?.run?.stdout || '')
      const stderr = String(data?.run?.stderr || data?.compile?.stderr || '')

      if (stderr) {
        setOutput(stderr)
        setError(true)
      } else {
        setOutput(stdout || '(No output)')
        setError(false)
      }
    } catch {
      setOutput('Network error — check your connection')
      setError(true)
    } finally {
      setRunning(false)
    }
  }

  const changeLang = (newLang) => {
    setLang(newLang)
    setCode(newLang.starter)
    setOutput('')
    setError(false)
  }

  const applyChallenge = (challenge) => {
    setCode(challenge.starter(lang))
    setOutput('')
    setShowChallenges(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: embedded ? 'auto' : '100vh',
        minHeight: embedded ? 480 : undefined,
        background: '#1e1e2e',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #111111',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 18 }}>{'</>'}</span>
        <span style={{ color: '#111111', fontWeight: 700 }}>Code Playground</span>

        <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexWrap: 'wrap' }}>
          {PLAYGROUND_LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => changeLang(l)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
                border: `1px solid ${lang.id === l.id ? '#FF3B00' : '#111111'}`,
                background: lang.id === l.id ? '#FF3B00' : 'transparent',
                color: lang.id === l.id ? '#fff' : '#666666',
                fontWeight: 600,
              }}
            >
              {l.icon} {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isPistonLanguage(lang) ? (
            <>
              <button
                type="button"
                onClick={() => setShowChallenges(!showChallenges)}
                style={{
                  padding: '7px 14px',
                  background: '#F5F2EB',
                  border: '1px solid #111111',
                  borderRadius: 8,
                  color: '#666666',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Challenges
              </button>
              <button
                type="button"
                onClick={runCode}
                disabled={running}
                style={{
                  padding: '7px 20px',
                  background: running ? '#A8A7A2' : '#22c55e',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
              >
                {running ? 'Running…' : 'Run Code'}
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#666' }}>Live preview</span>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {showChallenges && isPistonLanguage(lang) ? (
        <div
          style={{ background: '#FFFFFF', borderBottom: '1px solid #111111', padding: '12px 16px' }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CHALLENGES.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyChallenge(c)}
                style={{
                  padding: '8px 14px',
                  background: '#F5F2EB',
                  border: '1px solid #111111',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ color: '#111111', fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                <div style={{ color: '#666666', fontSize: 11 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          overflow: 'hidden',
        }}
      >
        <div style={{ borderRight: isMobile ? 'none' : '1px solid #111111', overflow: 'hidden' }}>
          <div
            style={{
              padding: '6px 14px',
              background: '#EFECE5',
              borderBottom: '1px solid #111111',
            }}
          >
            <span style={{ color: '#666666', fontSize: 11, fontWeight: 600 }}>
              EDITOR — {lang.label}
            </span>
          </div>
          <Editor
            height={editorHeight}
            language={monacoLanguageFor(lang)}
            value={code}
            onChange={(v) => setCode(v || '')}
            theme="vs-dark"
            options={{
              fontSize: isMobile ? 13 : 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: isMobile ? 220 : undefined,
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              background: '#EFECE5',
              borderBottom: '1px solid #111111',
            }}
          >
            <span style={{ color: '#666666', fontSize: 11, fontWeight: 600 }}>
              {showPreview ? 'PREVIEW' : 'OUTPUT'}
            </span>
          </div>

          {showPreview ? (
            <iframe
              title="Preview"
              sandbox="allow-scripts"
              srcDoc={previewHtml}
              style={{
                flex: 1,
                width: '100%',
                minHeight: isMobile ? 200 : 300,
                border: 'none',
                background: '#fff',
              }}
            />
          ) : (
            <pre
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                margin: 0,
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                color: error ? '#fca5a5' : '#86efac',
                background: '#0d0d1a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {running ? 'Running your code…\n' : null}
              {!running && !output ? (
                <span style={{ color: '#94a3b8' }}>Click Run Code to see output here…</span>
              ) : null}
              {output}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
