'use client'

import { Component, useEffect, useState } from 'react'
import { configureMonacoLoader } from '@/lib/creative-teaching/configureMonaco'

function FallbackEditor({ value, onChange, height, language, note }) {
  return (
    <div>
      {note ? (
        <div
          style={{
            padding: '4px 10px',
            fontSize: 11,
            color: '#94a3b8',
            background: '#0f172a',
            borderBottom: '1px solid #334155',
          }}
        >
          {note}
        </div>
      ) : null}
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
    </div>
  )
}

class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <FallbackEditor
          {...this.props}
          note="Simple editor — advanced highlighting unavailable in this browser."
        />
      )
    }
    return this.props.children
  }
}

export default function PlaygroundEditor({
  value,
  onChange,
  language,
  height,
  theme = 'vs-dark',
  options = {},
}) {
  const [MonacoEditor, setMonacoEditor] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    configureMonacoLoader()
      .then(() => import('@monaco-editor/react'))
      .then((mod) => {
        if (!cancelled) setMonacoEditor(() => mod.default)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return (
      <FallbackEditor
        value={value}
        onChange={onChange}
        height={height}
        language={language}
        note="Simple editor — you can still write and run code."
      />
    )
  }

  if (!MonacoEditor) {
    return <FallbackEditor value={value} onChange={onChange} height={height} language={language} />
  }

  return (
    <EditorErrorBoundary value={value} onChange={onChange} height={height} language={language}>
      <MonacoEditor
        key={language}
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange?.(v || '')}
        theme={theme}
        options={options}
        loading={null}
        beforeMount={(monaco) => {
          if (monaco?.editor?.setTheme) monaco.editor.setTheme(theme)
        }}
      />
    </EditorErrorBoundary>
  )
}
