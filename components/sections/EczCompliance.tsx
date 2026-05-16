'use client'

import React from 'react'
import { BookMarked, Calendar, ClipboardCheck, FileSpreadsheet, MapPin, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'

const pillars = [
  {
    icon: Scale,
    title: '30% SBA · 70% final exam',
    description:
      'Forms 1–3 follow ECZ CBA weighting. Form 4 is exam year with no SBA — enforced in the system.',
  },
  {
    icon: ClipboardCheck,
    title: '100-mark SBA structure',
    description:
      'Three tasks at 20 marks each plus a 40-mark term test. Record scores with a four-level analytical rubric.',
  },
  {
    icon: BookMarked,
    title: '19 subjects & constructs',
    description:
      'Sync Mathematics I & II, Sciences, Civic Education, and all ECZ guideline subjects with elements of construct.',
  },
  {
    icon: MapPin,
    title: 'Zambian context required',
    description:
      'SBA tasks must use real-life Zambian settings — locations, occupations, and community scenarios validated on create.',
  },
  {
    icon: Calendar,
    title: '31 January deadline',
    description:
      'Track days remaining until ECZ SBA submission. Export centre-ready CSV when scores are complete.',
  },
  {
    icon: FileSpreadsheet,
    title: 'ECZ CSV export',
    description:
      'Generate submission files with centre number, subject, form, and learner SBA totals for HOD and ECZ handover.',
  },
]

const checklist = [
  'Four-level rubric: Excellent → Needs Improvement',
  'SBA task types: written, practical, portfolio, fieldwork, presentation',
  'Teacher ECZ SBA Hub: create tasks, record scores, export',
  'Construct elements seeded from ECZ Assessment Guidelines',
]

export function EczCompliance({ registerUrl }: { registerUrl: string }) {
  return (
    <section
      id="ecz"
      className="bg-[var(--surface-alt)] py-20 px-6 border-y border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-[var(--color-accent)] tracking-[0.12em] uppercase mb-4">
            ECZ CBA compliance
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">
            School-Based Assessment aligned with ECZ guidelines
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Built from the ECZ Assessment Guidelines blueprint — not a generic gradebook adapted
            from another country. Manage SBA the way the examinations council expects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {pillars.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="h-full">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--rp-accentbg)]">
                  <Icon size={22} color="var(--color-accent)" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.description}
                </p>
              </Card>
            )
          })}
        </div>

        <Card>
          <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide mb-4">
            What teachers get in the ECZ SBA Hub
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {checklist.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="text-[var(--color-accent)] font-bold shrink-0" aria-hidden>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
          <a
            href={registerUrl}
            className="inline-flex items-center justify-center bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Start ECZ-ready trial →
          </a>
        </Card>
      </div>
    </section>
  )
}
