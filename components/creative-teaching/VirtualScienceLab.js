'use client'

import { useMemo, useState } from 'react'

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
    description:
      'Build and test electrical circuits with batteries, wires, bulbs, and switches — safely without any physical equipment.',
    curriculum: "Zambian Physics Form 3: Electric circuits, Ohm's Law",
    url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html',
    objectives: [
      'Understand series vs parallel circuits',
      'Measure voltage and current',
      "Apply Ohm's Law",
    ],
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
    description:
      'Explore how acids and bases affect pH, test household liquids, and understand neutralisation reactions without lab chemicals.',
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
    description:
      'Simulate how animals adapt and evolve over generations through natural selection — relevant to Zambian wildlife.',
    curriculum: 'Zambian Biology Form 3: Variation, adaptation and natural selection',
    url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html',
    objectives: [
      'Understand survival of the fittest',
      'Observe trait inheritance',
      'See environmental effects',
    ],
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
    description:
      'Visualise wave motion, frequency, amplitude, and wavelength using an interactive string simulation.',
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
    description:
      'Practise balancing chemical equations interactively with visual molecular models — no more trial and error.',
    curriculum: 'Zambian Chemistry Form 3: Chemical reactions and equations',
    url: 'https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_en.html',
    objectives: [
      'Apply conservation of mass',
      'Balance complex equations',
      'Recognise reaction types',
    ],
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
    description: "Explore Newton's laws of motion with a skateboard, applied forces, and friction.",
    curriculum: 'Zambian Physics Form 1–3: Forces, motion and friction',
    url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html',
    objectives: [
      'Understand net force',
      'Compare friction levels',
      'Connect force and acceleration',
    ],
  },
  {
    id: 'photoelectric',
    name: 'Photoelectric Effect',
    subject: 'Physics',
    topic: 'Modern Physics',
    grade: 'Form 5',
    difficulty: 'Advanced',
    duration: '20 mins',
    icon: 'PHYS',
    color: '#666666',
    colorBg: 'rgba(167,139,250,0.12)',
    description: 'Explore how light knocks electrons loose from a metal surface.',
    curriculum: 'Zambian Physics Form 5: Photoelectric effect',
    url: 'https://phet.colorado.edu/sims/html/photoelectric-effect/latest/photoelectric-effect_en.html',
    objectives: [
      'Connect frequency to energy',
      'Observe threshold frequency',
      'Understand photon model',
    ],
  },
  {
    id: 'states-of-matter',
    name: 'States of Matter',
    subject: 'Chemistry',
    topic: 'Particles & States',
    grade: 'Form 1–3',
    difficulty: 'Beginner',
    duration: '15 mins',
    icon: 'STATE',
    color: '#38bdf8',
    colorBg: 'rgba(56,189,248,0.12)',
    description:
      'Visualise particles in solids, liquids and gases and how temperature changes behavior.',
    curriculum: 'Zambian Science: Particle model of matter',
    url: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html',
    objectives: ['Compare particle spacing', 'See phase changes', 'Connect temperature to motion'],
  },
  {
    id: 'ohms-law',
    name: "Ohm's Law",
    subject: 'Physics',
    topic: 'Voltage, Current, Resistance',
    grade: 'Form 3–5',
    difficulty: 'Intermediate',
    duration: '15 mins',
    icon: 'ELEC',
    color: '#22c55e',
    colorBg: 'rgba(34,197,94,0.12)',
    description: 'Explore the relationship between voltage, current, and resistance.',
    curriculum: "Zambian Physics Form 3: Ohm's Law",
    url: 'https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_en.html',
    objectives: ['Manipulate V/I/R', 'Observe linear relationship', 'Apply to circuit problems'],
  },
]

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Biology']
const GRADES = ['All Grades', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']
const DIFFICULTIES = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']

export default function VirtualScienceLab() {
  const [filterSubject, setFilterSubject] = useState('All')
  const [filterGrade, setFilterGrade] = useState('All Grades')
  const [filterDiff, setFilterDiff] = useState('All Levels')
  const [activeLab, setActiveLab] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return LABS.filter((lab) => {
      if (filterSubject !== 'All' && lab.subject !== filterSubject) return false
      if (
        filterGrade !== 'All Grades' &&
        !String(lab.grade || '').includes(filterGrade.replace('Form ', ''))
      )
        return false
      if (filterDiff !== 'All Levels' && lab.difficulty !== filterDiff) return false
      if (
        search &&
        !String(lab.name || '')
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        !String(lab.topic || '')
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [filterDiff, filterGrade, filterSubject, search])

  if (activeLab) {
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#EFECE5' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: '#FFFFFF',
            borderBottom: '1px solid #111111',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveLab(null)}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #111111',
              borderRadius: 8,
              color: '#666666',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Back to Labs
          </button>
          <span style={{ fontSize: 20 }}>{activeLab.icon}</span>
          <div>
            <span style={{ color: '#111111', fontWeight: 700, fontSize: 15 }}>
              {activeLab.name}
            </span>
            <span style={{ color: '#666666', fontSize: 12, marginLeft: 10 }}>
              {activeLab.grade} · {activeLab.duration}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {activeLab.objectives.map((o, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: activeLab.colorBg,
                  color: activeLab.color,
                  border: `1px solid ${activeLab.color}40`,
                }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
        <iframe
          src={activeLab.url}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="PhET Virtual Science Laboratory"
          // PhET HTML sims boot without allow-same-origin (verified: circuit, acid-base,
          // natural-selection). Omitting it keeps an opaque origin so scripts cannot use
          // the framed page's real origin storage — matching CodePlayground preview iframes.
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          allow="accelerometer; camera; microphone"
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#EFECE5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '1.25rem 1.5rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #111111',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div>
            <h2 style={{ color: '#111111', fontWeight: 700, fontSize: 18, margin: 0 }}>
              Virtual Science Lab
            </h2>
            <p style={{ color: '#666666', fontSize: 12, margin: 0 }}>
              PhET interactive simulations · Zambian curriculum aligned · No equipment needed
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ color: '#666666', fontSize: 13 }}>{filtered.length} labs available</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Search labs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              background: '#F5F2EB',
              border: '1px solid #111111',
              borderRadius: 8,
              color: '#111111',
              fontSize: 13,
              outline: 'none',
              width: 180,
            }}
          />
          {[
            { val: filterSubject, set: setFilterSubject, opts: SUBJECTS },
            { val: filterGrade, set: setFilterGrade, opts: GRADES },
            { val: filterDiff, set: setFilterDiff, opts: DIFFICULTIES },
          ].map((f, i) => (
            <select
              key={i}
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              style={{
                padding: '7px 12px',
                background: '#F5F2EB',
                border: '1px solid #111111',
                borderRadius: 8,
                color: '#666666',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {f.opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666666' }}>
            No labs match your filters. Try adjusting the subject or grade.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {filtered.map((lab) => (
              <div
                key={lab.id}
                style={{
                  background: `${lab.colorBg}, #FFFFFF`,
                  border: `1px solid ${lab.color}30`,
                  borderRadius: 14,
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => setActiveLab(lab)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, ${lab.color}, transparent)`,
                  }}
                />

                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: lab.colorBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {lab.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 14,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {lab.name}
                    </p>
                    <p
                      style={{ color: lab.color, fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}
                    >
                      {lab.subject} · {lab.topic}
                    </p>
                  </div>
                </div>

                <p style={{ color: '#666666', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
                  {lab.description}
                </p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: '#F5F2EB',
                      color: '#666666',
                      border: '1px solid #111111',
                    }}
                  >
                    {lab.grade}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: '#F5F2EB',
                      color: '#666666',
                      border: '1px solid #111111',
                    }}
                  >
                    {lab.difficulty}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: '#F5F2EB',
                      color: '#666666',
                      border: '1px solid #111111',
                    }}
                  >
                    {lab.duration}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: '#A8A7A2', marginBottom: 12, lineHeight: 1.5 }}>
                  {lab.curriculum}
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '9px',
                    background: lab.color,
                    border: 'none',
                    borderRadius: 8,
                    color: '#EFECE5',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Start Lab
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
