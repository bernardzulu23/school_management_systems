'use client'

import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { configureMonacoLoader } from '@/lib/creative-teaching/configureMonaco'

function FallbackEditor({ value, onChange, height, language }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      spellCheck={false}
      aria-label={`Code editor (${language})`}
      style={{
        width: '100%',
        height,
        minHeight: 200,
        margin: 0,
        padding: '12px 14px',
        resize: 'vertical',
        border: 'none',
        outline: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.55,
        tabSize: 2,
        color: '#e2e8f0',
        background: '#1e1e2e',
        boxSizing: 'border-box',
      }}
    />
  )
}

export default function PlaygroundEditor({
  value,
  onChange,
  language,
  height,
  theme = 'vs-dark',
  options = {},
}) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setFailed(true)
    }, 12_000)

    configureMonacoLoader()
      .then(() => {
        if (cancelled) return
        clearTimeout(timeout)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  if (failed) {
    return (
      <div>
        <div
          style={{
            padding: '4px 10px',
            fontSize: 11,
            color: '#94a3b8',
            background: '#0f172a',
            borderBottom: '1px solid #334155',
          }}
        >
          Simple editor (Monaco unavailable — you can still write and run code)
        </div>
        <FallbackEditor value={value} onChange={onChange} height={height} language={language} />
      </div>
    )
  }

  if (!ready) {
    return (
      <div
        style={{
          height,
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
          background: '#1e1e2e',
        }}
      >
        Loading editor…
      </div>
    )
  }

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(v) => onChange?.(v || '')}
      theme={theme}
      options={options}
      loading={null}
    />
  )
}
