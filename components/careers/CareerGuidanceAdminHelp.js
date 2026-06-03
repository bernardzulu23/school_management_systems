'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

const STEPS_CLUSTERS = [
  {
    title: 'Step 1 — Plan your groups',
    body: 'Decide how you want to group careers. Examples: Science & Technology, Health Sciences, Business & Finance, Arts & Creative.',
  },
  {
    title: 'Step 2 — Add a cluster',
    body: 'Click “Add cluster”. Enter a clear name and a short description (2–4 sentences) explaining what kinds of jobs belong in this group and who it suits.',
  },
  {
    title: 'Step 3 — Check the order',
    body: 'Use “Display order” if you want popular clusters to appear first (0 = top). Lower numbers show first on the student page.',
  },
  {
    title: 'Step 4 — Add careers next',
    body: 'When clusters are ready, open “Manage careers” and add each job under the right cluster.',
  },
]

const STEPS_CAREERS = [
  {
    title: 'Step 1 — Pick the cluster',
    body: 'Every career must sit under one cluster (e.g. Network Engineer under Science & Technology).',
  },
  {
    title: 'Step 2 — Title and summary',
    body: 'Use the real job name students know. The summary is one sentence shown in lists (e.g. “Designs and maintains computer networks for organisations”).',
  },
  {
    title: 'Step 3 — Subjects by grade',
    body: 'Write which subjects matter and when. Example: “Grade 10: Mathematics, Integrated Science. Grade 11–12: Computer Studies, Physics.”',
  },
  {
    title: 'Step 4 — Courses and colleges',
    body: 'List certificates, diplomas, or degrees (CCNA, Diploma in IT, BSc). Name Zambian colleges or universities where students can train.',
  },
  {
    title: 'Step 5 — Salary and progression',
    body: 'Give realistic salary ranges in Zambian Kwacha if known. Describe how a graduate might grow (e.g. technician → engineer → senior engineer).',
  },
  {
    title: 'Step 6 — Publish',
    body: 'Click “Publish career” so students can see it. Use “Hide” to keep a draft while you are still editing. Students only see published (Live) careers.',
  },
]

const EXAMPLE = {
  title: 'Example: Network Engineer',
  fields: [
    { label: 'Cluster', value: 'Science & Technology' },
    {
      label: 'Subjects (Grade 10 focus)',
      value: 'Mathematics, Integrated Science; in senior grades add Computer Studies and Physics.',
    },
    {
      label: 'Courses',
      value:
        'IT diploma, networking certificates (e.g. CCNA), or a degree in computer science / information technology.',
    },
    {
      label: 'Colleges',
      value: 'UNZA, CBU, Evelyn Hone, ZCAS, or accredited private colleges offering IT programmes.',
    },
    {
      label: 'Salary (indicative)',
      value:
        'Entry: roughly K3,000–K8,000/month; experienced roles higher — adjust to current local market.',
    },
  ],
}

/**
 * @param {'clusters'|'careers'} page
 */
export function CareerGuidanceAdminHelp({ page = 'careers' }) {
  const [open, setOpen] = useState(false)
  const steps = page === 'clusters' ? STEPS_CLUSTERS : STEPS_CAREERS

  return (
    <Card className="border-royalPurple-border2/50 bg-royalPurple-accent/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-royalPurple-text1">
            <HelpCircle className="h-5 w-5 text-royalPurple-accentTx" />
            How to set up career guidance (training guide)
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide guide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show guide
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-royalPurple-text2 font-normal">
          {page === 'clusters'
            ? 'Follow these steps to create career groups before adding individual jobs.'
            : 'Use this checklist when adding careers so students get complete, accurate advice.'}
        </p>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 pt-0">
          <ol className="space-y-3 list-none">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-3 text-sm border-l-2 border-royalPurple-accent pl-3"
              >
                <span className="font-bold text-royalPurple-accentTx shrink-0">{i + 1}.</span>
                <div>
                  <span className="font-semibold text-royalPurple-text1">{step.title}</span>
                  <p className="text-royalPurple-text2 mt-0.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {page === 'careers' && (
            <div className="rounded-lg border border-royalPurple-border bg-royalPurple-card/60 p-4">
              <h4 className="font-semibold text-royalPurple-text1 mb-2">{EXAMPLE.title}</h4>
              <dl className="space-y-2 text-sm">
                {EXAMPLE.fields.map((row) => (
                  <div key={row.label}>
                    <dt className="font-medium text-royalPurple-accentTx">{row.label}</dt>
                    <dd className="text-royalPurple-text2 mt-0.5">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="text-xs text-royalPurple-text3 space-y-1 border-t border-royalPurple-border pt-3">
            <p>
              <strong>Tip:</strong> Write in plain language — students and parents will read this
              directly.
            </p>
            <p>
              <strong>Student view:</strong> Open Career guidance from the student menu to preview
              what you published.
            </p>
            {page === 'clusters' && (
              <p>
                <strong>Order of work:</strong> Clusters first, then careers. You need at least one
                cluster before adding a career.
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
