Virtualsciencelab · JS

'use client'

import { useState } from 'react'

const LABS = [
{
id: 'circuit',
name: 'Circuit Construction Kit',
subject: 'Physics',
topic: 'Electricity & Circuits',
grade: 'Form 3–5',
difficulty: 'Intermediate',
duration: '30 mins',
icon: 'ELEC',
color: '#f59e0b',
colorBg: 'rgba(245,158,11,0.12)',
description: 'Build and test electrical circuits with batteries, wires, bulbs, and switches — safely without any physical equipment.',
curriculum: 'Zambian Physics Form 3: Electric circuits, Ohm\'s Law',
url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html',
objectives: ['Understand series vs parallel circuits', 'Measure voltage and current', 'Apply Ohm\'s Law'],
},
{
id: 'acid-base',
name: 'Acid-Base Solutions',
subject: 'Chemistry',
topic: 'Acids, Bases & pH',
grade: 'Form 4–5',
difficulty: 'Intermediate',
duration: '25 mins',
icon: 'CHEM',
color: '#10b981',
colorBg: 'rgba(16,185,129,0.12)',
description: 'Explore how acids and bases affect pH, test household liquids, and understand neutralisation reactions without lab chemicals.',
curriculum: 'Zambian Chemistry Form 4: Acids, bases and salts',
url: 'https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_en.html',
objectives: ['Distinguish strong vs weak acids', 'Use pH scale', 'Understand ionisation'],
},
{
id: 'natural-selection',
name: 'Natural Selection',
subject: 'Biology',
topic: 'Evolution & Adaptation',
grade: 'Form 2–4',
difficulty: 'Beginner',
duration: '20 mins',
icon: 'BIO',
color: '#8b5cf6',
colorBg: 'rgba(139,92,246,0.12)',
description: 'Simulate how animals adapt and evolve over generations through natural selection — relevant to Zambian wildlife.',
curriculum: 'Zambian Biology Form 3: Variation, adaptation and natural selection',
url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html',
objectives: ['Understand survival of the fittest', 'Observe trait inheritance', 'See environmental effects'],
},
{
id: 'waves',
name: 'Wave on a String',
subject: 'Physics',
topic: 'Waves & Sound',
grade: 'Form 3–4',
difficulty: 'Beginner',
duration: '20 mins',
icon: '〜',
color: '#06b6d4',
colorBg: 'rgba(6,182,212,0.12)',
description: 'Visualise wave motion, frequency, amplitude, and wavelength using an interactive string simulation.',
curriculum: 'Zambian Physics Form 3: Waves — transverse and longitudinal',
url: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html',
objectives: ['Identify wave properties', 'Compare wave types', 'Measure wave speed'],
},
{
id: 'balancing-equations',
name: 'Balancing Chemical Equations',
subject: 'Chemistry',
topic: 'Chemical Equations',
grade: 'Form 3–5',
difficulty: 'Intermediate',
duration: '25 mins',
icon: 'CHEM',
color: '#ef4444',
colorBg: 'rgba(239,68,68,0.12)',
description: 'Practise balancing chemical equations interactively with visual molecular models — no more trial and error.',
curriculum: 'Zambian Chemistry Form 3: Chemical reactions and equations',
url: 'https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_en.html',
objectives: ['Apply conservation of mass', 'Balance complex equations', 'Recognise reaction types'],
},
{
id: 'forces',
name: 'Forces and Motion',
subject: 'Physics',
topic: "Newton's Laws",
grade: 'Form 1–3',
difficulty: 'Beginner',
duration: '15 mins',
icon: 'MOTION',
color: '#f97316',
colorBg: 'rgba(249,115,22,0.12)',
description: "Explore Newton's laws of motion with a skateboard, applied forces, and friction. Intuitive and visual.",
curriculum: "Zambian Physics Form 2: Newton's laws of motion",
url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html',
objectives: ['Understand inertia', 'Apply F=ma', 'Observe friction effects'],
},
{
id: 'photoelectric',
name: 'Photoelectric Effect',
subject: 'Physics',
topic: 'Light & Quantum Physics',
grade: 'Form 5',
difficulty: 'Advanced',
duration: '35 mins',
icon: 'IDEA',
color: '#fbbf24',
colorBg: 'rgba(251,191,36,0.12)',
description: 'Explore how light ejects electrons from metals — the experiment that won Einstein the Nobel Prize.',
curriculum: 'Zambian Physics Form 5: Quantum physics and photoelectric effect',
url: 'https://phet.colorado.edu/sims/html/photoelectric-effect/latest/photoelectric-effect_en.html',
objectives: ['Understand photons', 'Measure work function', 'Explain threshold frequency'],
},
{
id: 'gas-laws',
name: 'Gas Laws',
subject: 'Chemistry',
topic: 'States of Matter',
grade: 'Form 4–5',
difficulty: 'Intermediate',
duration: '30 mins',
icon: 'BUBBLE',
color: '#a78bfa',
colorBg: 'rgba(167,139,250,0.12)',
description: 'Visualise Boyle\'s Law, Charles\'s Law, and Gay-Lussac\'s Law by manipulating pressure, temperature, and volume.',
curriculum: 'Zambian Chemistry Form 4: Gases and gas laws',
url: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html',
objectives: ['Apply Boyle\'s Law', 'Apply Charles\'s Law', 'Understand kinetic theory'],
},
{
id: 'ohms-law',
name: "Ohm's Law",
subject: 'Physics',
topic: 'Electricity',
grade: 'Form 3–4',
difficulty: 'Beginner',
duration: '15 mins',
icon: 'POWER',
color: '#34d399',
colorBg: 'rgba(52,211,153,0.12)',
description: 'Investigate the relationship between voltage, current, and resistance using a virtual ammeter and voltmeter.',
curriculum: "Zambian Physics Form 3: Ohm's Law and resistance",
url: 'https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_en.html',
objectives: ['Measure V, I, R', 'Verify V = IR', 'Plot I-V graphs'],
},
]

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Biology']
const GRADES = ['All Grades', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']
const DIFFICULTIES = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']

export default function VirtualScienceLab({ user }) {
const [filterSubject, setFilterSubject] = useState('All')
const [filterGrade, setFilterGrade] = useState('All Grades')
const [filterDiff, setFilterDiff] = useState('All Levels')
const [activeLab, setActiveLab] = useState(null)
const [search, setSearch] = useState('')

const filtered = LABS.filter(lab => {
if (filterSubject !== 'All' && lab.subject !== filterSubject) return false
if (filterGrade !== 'All Grades' && !lab.grade.includes(filterGrade.replace('Form ', ''))) return false
if (filterDiff !== 'All Levels' && lab.difficulty !== filterDiff) return false
if (search && !lab.name.toLowerCase().includes(search.toLowerCase()) && !lab.topic.toLowerCase().includes(search.toLowerCase())) return false
return true
})

if (activeLab) {
return (

<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#170d28' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#2d1f4e', borderBottom: '1px solid #3b2a66' }}>
<button
onClick={() => setActiveLab(null)}
style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', cursor: 'pointer', fontSize: 13 }} >
← Back to Labs
</button>
<span style={{ fontSize: 20 }}>{activeLab.icon}</span>
<div>
<span style={{ color: '#ede9fe', fontWeight: 700, fontSize: 15 }}>{activeLab.name}</span>
<span style={{ color: '#6d28d9', fontSize: 12, marginLeft: 10 }}>{activeLab.grade} · {activeLab.duration}</span>
</div>
<div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
{activeLab.objectives.map((o, i) => (
<span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: activeLab.colorBg, color: activeLab.color, border: `1px solid ${activeLab.color}40` }}>
{o}
</span>
))}
</div>
</div>
<iframe
src={activeLab.url}
style={{ flex: 1, border: 'none', width: '100%' }}
title={activeLab.name}
allow="accelerometer; camera; microphone"
/>
</div>
)
}

return (

<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#170d28', overflow: 'hidden' }}>
{/_ Header _/}
<div style={{ padding: '1.25rem 1.5rem', background: '#2d1f4e', borderBottom: '1px solid #3b2a66' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
<span style={{ fontSize: 24 }} />
<div>
<h2 style={{ color: '#ede9fe', fontWeight: 700, fontSize: 18, margin: 0 }}>Virtual Science Lab</h2>
<p style={{ color: '#6d28d9', fontSize: 12, margin: 0 }}>PhET interactive simulations · Zambian curriculum aligned · No equipment needed</p>
</div>
<div style={{ marginLeft: 'auto' }}>
<span style={{ color: '#a78bfa', fontSize: 13 }}>{filtered.length} labs available</span>
</div>
</div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Search labs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 12px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#ede9fe', fontSize: 13, outline: 'none', width: 180 }}
          />
          {[
            { val: filterSubject, set: setFilterSubject, opts: SUBJECTS },
            { val: filterGrade, set: setFilterGrade, opts: GRADES },
            { val: filterDiff, set: setFilterDiff, opts: DIFFICULTIES },
          ].map((f, i) => (
            <select
              key={i}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              style={{ padding: '7px 12px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontSize: 13, cursor: 'pointer' }}
            >
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Lab Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6d28d9' }}>
            No labs match your filters. Try adjusting the subject or grade.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map(lab => (
              <div
                key={lab.id}
                style={{
                  background: `${lab.colorBg}, #2d1f4e`,
                  border: `1px solid ${lab.color}30`,
                  borderRadius: 14, padding: '1.25rem', cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative', overflow: 'hidden'
                }}
                onClick={() => setActiveLab(lab)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3)` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${lab.color}, transparent)` }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: lab.colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {lab.icon}
                  </div>
                  <div>
                    <p style={{ color: '#ede9fe', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.3 }}>{lab.name}</p>
                    <p style={{ color: lab.color, fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>{lab.subject} · {lab.topic}</p>
                  </div>
                </div>

                <p style={{ color: '#a78bfa', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{lab.description}</p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#261843', color: '#6d28d9', border: '1px solid #3b2a66' }}>{lab.grade}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#261843', color: '#6d28d9', border: '1px solid #3b2a66' }}>{lab.difficulty}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#261843', color: '#6d28d9', border: '1px solid #3b2a66' }}>{lab.duration}</span>
                </div>

                <div style={{ fontSize: 11, color: '#4b3575', marginBottom: 12, lineHeight: 1.5 }}>
                  {lab.curriculum}
                </div>

                <button style={{
                  width: '100%', padding: '9px', background: lab.color,
                  border: 'none', borderRadius: 8, color: '#170d28',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}>
                  Start Lab →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

)

//Codeplayground · JS
'use client'

import dynamic from 'next/dynamic'
import { useState, useRef } from 'react'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const LANGUAGES = [
{ id: 'python', label: 'Python', version: '3.10.0', icon: 'PY',
starter: '# Python Playground\n# Write your code here\n\nname = "Chanda"\nprint(f"Hello from Zambia! My name is {name}")\n\n# Try a simple calculation\nfor i in range(1, 6):\n print(f"{i} x {i} = {i _ i}")'
},
{ id: 'javascript', label: 'JavaScript', version: '18.15.0', icon: 'JS',
starter: '// JavaScript Playground\n// Write your code here\n\nconst name = "Mwamba";\nconsole.log(`Hello from Zambia! My name is ${name}`);\n\n// Try a simple function\nfunction fibonacci(n) {\n if (n <= 1) return n;\n return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nfor (let i = 0; i < 8; i++) {\n console.log(`fibonacci(${i}) = ${fibonacci(i)}`);\n}'
},
{ id: 'java', label: 'Java', version: '15.0.2', icon: 'JAVA',
starter: '// Java Playground\npublic class Main {\n public static void main(String[] args) {\n String name = "Nalumino";\n System.out.println("Hello from Zambia! My name is " + name);\n \n // Simple loop\n for (int i = 1; i <= 5; i++) {\n System.out.println(i + " squared = " + (i _ i));\n }\n }\n}'
},
{ id: 'c', label: 'C', version: '10.2.0', icon: 'C',
starter: '#include <stdio.h>\n\nint main() {\n printf("Hello from Zambia!\\n");\n \n // Count to 5\n for (int i = 1; i <= 5; i++) {\n printf("%d squared = %d\\n", i, i _ i);\n }\n \n return 0;\n}'
},
{ id: 'bash', label: 'Bash', version: '5.2.0', icon: 'SH',
starter: '#!/bin/bash\n# Bash Playground\n\nname="Bwalya"\necho "Hello from Zambia! My name is $name"\n\n# Simple loop\nfor i in 1 2 3 4 5; do\n    echo "$i squared = $((i _ i))"\ndone'
},
]

const CHALLENGES = [
{ title: 'Hello World', desc: 'Print "Hello, Zambia!"', starter: (lang) => LANGUAGES.find(l => l.id === lang)?.starter || '' },
{ title: 'Sum 1 to N', desc: 'Calculate sum of numbers 1 to 10', starter: () => '# Calculate sum of 1 to 10\ntotal = 0\nfor i in range(1, 11):\n total += i\nprint(f"Sum from 1 to 10 = {total}")' },
{ title: 'Even or Odd', desc: 'Check if a number is even or odd', starter: () => '# Check even or odd\nnumbers = [1, 2, 7, 12, 15, 20]\nfor num in numbers:\n if num % 2 == 0:\n print(f"{num} is even")\n else:\n print(f"{num} is odd")' },
{ title: 'Simple Calculator', desc: 'Add, subtract, multiply, divide', starter: () => '# Simple calculator\ndef calculate(a, b, op):\n if op == "+":\n return a + b\n elif op == "-":\n return a - b\n elif op == "_":\n return a _ b\n elif op == "/":\n return a / b if b != 0 else "Error: division by zero"\n\nprint(calculate(10, 3, "+"))\nprint(calculate(10, 3, "-"))\nprint(calculate(10, 3, "\*"))\nprint(calculate(10, 3, "/"))' },
]

export default function CodePlayground({ user }) {
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
          files: [{ name: `main.${lang.id === 'javascript' ? 'js' : lang.id === 'java' ? 'java' : lang.id === 'bash' ? 'sh' : lang.id}`, content: code }],
          stdin: '',
          args: [],
          compile_timeout: 10000,
          run_timeout: 5000,
        })
      })

      const data = await res.json()
      const stdout = data.run?.stdout || ''
      const stderr = data.run?.stderr || data.compile?.stderr || ''

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

<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e2e' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        background: '#2d1f4e', borderBottom: '1px solid #3b2a66', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 18 }}>{'</>'}</span>
        <span style={{ color: '#ede9fe', fontWeight: 700 }}>Code Playground</span>

        {/* Language tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              onClick={() => changeLang(l)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${lang.id === l.id ? '#7c3aed' : '#3b2a66'}`,
                background: lang.id === l.id ? '#7c3aed' : 'transparent',
                color: lang.id === l.id ? '#fff' : '#a78bfa', fontWeight: 600
              }}
            >
              {l.icon} {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowChallenges(!showChallenges)}
            style={{ padding: '7px 14px', background: '#261843', border: '1px solid #3b2a66', borderRadius: 8, color: '#a78bfa', fontSize: 13, cursor: 'pointer' }}
          >
            Challenges
          </button>
          <button
            onClick={runCode}
            disabled={running}
            style={{
              padding: '7px 20px', background: running ? '#4b3575' : '#22c55e',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {running ? (
              <><div style={{ width: 12, height: 12, border: '2px solid #fff3', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Running...</>
            ) : 'Run Code'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Challenges dropdown */}
      {showChallenges && (
        <div style={{ background: '#2d1f4e', borderBottom: '1px solid #3b2a66', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CHALLENGES.map((c, i) => (
              <button
                key={i}
                onClick={() => applyChallenge(c)}
                style={{
                  padding: '8px 14px', background: '#261843', border: '1px solid #3b2a66',
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ color: '#ede9fe', fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                <div style={{ color: '#6d28d9', fontSize: 11 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor + Output split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Monaco Editor */}
        <div style={{ borderRight: '1px solid #3b2a66', overflow: 'hidden' }}>
          <div style={{ padding: '6px 14px', background: '#170d28', borderBottom: '1px solid #3b2a66' }}>
            <span style={{ color: '#6d28d9', fontSize: 11, fontWeight: 600 }}>EDITOR — {lang.label}</span>
          </div>
          <Editor
            height="calc(100vh - 100px)"
            language={lang.id === 'bash' ? 'shell' : lang.id}
            value={code}
            onChange={v => setCode(v || '')}
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

        {/* Output panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '6px 14px', background: '#170d28', borderBottom: '1px solid #3b2a66', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6d28d9', fontSize: 11, fontWeight: 600 }}>OUTPUT</span>
            {output && <button onClick={() => setOutput('')} style={{ background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', fontSize: 11 }}>Clear</button>}
          </div>
          <pre style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            margin: 0, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6,
            color: error ? '#fca5a5' : '#86efac',
            background: '#0d0d1a',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {running && 'Running your code...\n'}
            {!running && !output && (
              <span style={{ color: '#3b2a66' }}>Click Run Code to see output here...</span>
            )}
            {output}
          </pre>
        </div>
      </div>
    </div>

)

//install.md

# Creative Features — Installation & Integration Guide

## 1. Install required packages

```bash
npm install @excalidraw/excalidraw @monaco-editor/react tone
```

## 2. Copy fonts for Excalidraw (required!)

Add to package.json scripts:

```json
"scripts": {
  "copy:assets": "cp -r node_modules/@excalidraw/excalidraw/dist/prod/fonts ./public/fonts",
  "dev": "npm run copy:assets && next dev",
  "build": "npm run copy:assets && next build"
}
```

## 3. Environment variables needed

Add to .env.local and Railway:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx   ← for AI Story Weaver
```

## 4. File placement in your project

### Interactive Whiteboard

- Copy: `whiteboard/InteractiveWhiteboard.js`
- Place at: `components/creative/InteractiveWhiteboard.js`
- Page: `app/dashboard/teacher/whiteboard/page.js`

### AI Story Weaver

- Copy: `story-weaver/AIStoryWeaver.js`
- Place at: `components/creative/AIStoryWeaver.js`
- Copy: `story-weaver/route.js`
- Place at: `app/api/ai/story-weaver/route.js`
- Page: `app/dashboard/teacher/story-weaver/page.js`

### Digital Music Composer

- Copy: `music-composer/DigitalMusicComposer.js`
- Place at: `components/creative/DigitalMusicComposer.js`
- Page: `app/dashboard/student/music/page.js`

### Virtual Science Lab

- Copy: `virtual-lab/VirtualScienceLab.js`
- Place at: `components/creative/VirtualScienceLab.js`
- Page: `app/dashboard/student/virtual-lab/page.js`

### Code Playground

- Copy: `code-playground/CodePlayground.js`
- Place at: `components/creative/CodePlayground.js`
- Page: `app/dashboard/student/code-playground/page.js`

## 5. Example page wrapper (same pattern for all)

```javascript
// app/dashboard/teacher/whiteboard/page.js
import { requireRole } from '@/lib/middleware/requireRole'
import { headers } from 'next/headers'
import InteractiveWhiteboard from '@/components/creative/InteractiveWhiteboard'

export default async function WhiteboardPage() {
  return <InteractiveWhiteboard />
}
```

## 6. Wire up to your CreativeTeachingHub cards

In your `CreativeTeachingHub.js`, replace "Coming Soon" buttons with links:

```javascript
const FEATURE_ROUTES = {
  'interactive-whiteboard': '/dashboard/teacher/whiteboard',
  'ai-story-weaver': '/dashboard/teacher/story-weaver',
  'digital-music-composer': '/dashboard/student/music',
  'virtual-science-lab': '/dashboard/student/virtual-lab',
  'code-playground': '/dashboard/student/code-playground',
}

// In your card render:
const route = FEATURE_ROUTES[feature.featureId]
{
  route ? (
    <Link href={route}>
      <button>Open →</button>
    </Link>
  ) : (
    <button disabled>Coming Soon</button>
  )
}
```

## 7. Access control per feature

```javascript
// Whiteboard — teachers + HODs only
// Story Weaver — teachers + HODs + headteachers
// Music Composer — all students
// Virtual Lab — students + teachers
// Code Playground — students + teachers (ICT)
```

## 8. 3D Shape Builder

Uses Three.js which is already in your dependencies.
See the implementation in the previous conversation for the full component.
