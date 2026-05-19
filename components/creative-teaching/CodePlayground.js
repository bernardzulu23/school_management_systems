'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const LANGUAGES = [
  {
    id: 'python',
    label: 'Python',
    version: '3.10.0',
    icon: 'PY',
    starter:
      '# Python Playground\n# Write your code here\n\nname = "Chanda"\nprint(f"Hello from Zambia! My name is {name}")\n\nfor i in range(1, 6):\n    print(f"{i} x {i} = {i * i}")\n',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    version: '18.15.0',
    icon: 'JS',
    starter:
      '// JavaScript Playground\n// Write your code here\n\nconst name = "Mwamba";\nconsole.log(`Hello from Zambia! My name is ${name}`);\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nfor (let i = 0; i < 8; i++) {\n  console.log(`fibonacci(${i}) = ${fibonacci(i)}`);\n}\n',
  },
  {
    id: 'java',
    label: 'Java',
    version: '15.0.2',
    icon: 'JAVA',
    starter:
      '// Java Playground\npublic class Main {\n  public static void main(String[] args) {\n    String name = "Nalumino";\n    System.out.println("Hello from Zambia! My name is " + name);\n\n    for (int i = 1; i <= 5; i++) {\n      System.out.println(i + " squared = " + (i * i));\n    }\n  }\n}\n',
  },
  {
    id: 'c',
    label: 'C',
    version: '10.2.0',
    icon: 'C',
    starter:
      '#include <stdio.h>\n\nint main() {\n  printf(\"Hello from Zambia!\\n\");\n\n  for (int i = 1; i <= 5; i++) {\n    printf(\"%d squared = %d\\n\", i, i * i);\n  }\n\n  return 0;\n}\n',
  },
  {
    id: 'bash',
    label: 'Bash',
    version: '5.2.0',
    icon: 'SH',
    starter:
      '#!/bin/bash\n# Bash Playground\n\nname="Bwalya"\necho "Hello from Zambia! My name is $name"\n\nfor i in 1 2 3 4 5; do\n  echo "$i squared = $((i * i))"\ndone\n',
  },
]

const CHALLENGES = [
  {
    title: 'Hello World',
    desc: 'Print "Hello, Zambia!"',
    starter: (langId) => LANGUAGES.find((l) => l.id === langId)?.starter || '',
  },
  {
    title: 'Sum 1 to N',
    desc: 'Calculate sum of numbers 1 to 10',
    starter: () =>
      '# Calculate sum of 1 to 10\ntotal = 0\nfor i in range(1, 11):\n    total += i\nprint(f"Sum from 1 to 10 = {total}")\n',
  },
  {
    title: 'Even or Odd',
    desc: 'Check if a number is even or odd',
    starter: () =>
      '# Check even or odd\nnumbers = [1, 2, 7, 12, 15, 20]\nfor num in numbers:\n    if num % 2 == 0:\n        print(f"{num} is even")\n    else:\n        print(f"{num} is odd")\n',
  },
  {
    title: 'Simple Calculator',
    desc: 'Add, subtract, multiply, divide',
    starter: () =>
      '# Simple calculator\ndef calculate(a, b, op):\n    if op == "+":\n        return a + b\n    elif op == "-":\n        return a - b\n    elif op == "*":\n        return a * b\n    elif op == "/":\n        return a / b if b != 0 else "Error: division by zero"\n\nprint(calculate(10, 3, "+"))\nprint(calculate(10, 3, "-"))\nprint(calculate(10, 3, "*"))\nprint(calculate(10, 3, "/"))\n',
  },
]

function fileNameForLanguage(langId) {
  if (langId === 'javascript') return 'main.js'
  if (langId === 'java') return 'Main.java'
  if (langId === 'bash') return 'main.sh'
  if (langId === 'python') return 'main.py'
  if (langId === 'c') return 'main.c'
  return `main.${langId}`
}

export default function CodePlayground() {
  const [lang, setLang] = useState(LANGUAGES[0])
  const [code, setCode] = useState(LANGUAGES[0].starter)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)
  const [showChallenges, setShowChallenges] = useState(false)

  const runCode = async () => {
    if (!code.trim()) return
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
    setCode(challenge.starter(lang.id))
    setOutput('')
    setShowChallenges(false)
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e2e' }}
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
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => changeLang(l)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
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
          <button
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {running ? (
              <>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid #fff3',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Running...
              </>
            ) : (
              'Run Code'
            )}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {showChallenges ? (
        <div
          style={{ background: '#FFFFFF', borderBottom: '1px solid #111111', padding: '12px 16px' }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CHALLENGES.map((c, i) => (
              <button
                key={i}
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

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid #111111', overflow: 'hidden' }}>
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
            height="calc(100vh - 100px)"
            language={lang.id === 'bash' ? 'shell' : lang.id}
            value={code}
            onChange={(v) => setCode(v || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              roundedSelection: true,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '6px 14px',
              background: '#EFECE5',
              borderBottom: '1px solid #111111',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#666666', fontSize: 11, fontWeight: 600 }}>OUTPUT</span>
            {output ? (
              <button
                onClick={() => setOutput('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
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
            {running ? 'Running your code...\n' : null}
            {!running && !output ? (
              <span style={{ color: '#111111' }}>Click Run Code to see output here...</span>
            ) : null}
            {output}
          </pre>
        </div>
      </div>
    </div>
  )
}
