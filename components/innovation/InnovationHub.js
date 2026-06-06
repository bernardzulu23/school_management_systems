'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { InnovationProjectsPanel } from '@/components/innovation/InnovationProjectsPanel'
import { getInnovationTools } from '@/lib/innovation/constants'
import {
  ArrowRight,
  Brain,
  ExternalLink,
  Glasses,
  Heart,
  Rocket,
  Shield,
  Sparkles,
} from 'lucide-react'

const ICONS = {
  Brain,
  Glasses,
  Heart,
  Shield,
}

function StatusPill({ status }) {
  const styles = {
    active: 'bg-royalPurple-success/15 text-royalPurple-successTx border-royalPurple-success/30',
    beta: 'bg-royalPurple-accent/15 text-royalPurple-accentTx border-royalPurple-accent/30',
  }
  const labels = { active: 'Live', beta: 'Beta' }
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.active}`}
    >
      {labels[status] || 'Live'}
    </span>
  )
}

export default function InnovationHub() {
  const { user } = useAuth()
  const role = user?.role || 'student'
  const sections = useMemo(() => getInnovationTools(role), [role])
  const [activeSection, setActiveSection] = useState(null)

  const toolCount = sections.reduce((n, s) => n + s.tools.length, 0)
  const active = sections.find((s) => s.id === activeSection)

  if (active) {
    const Icon = ICONS[active.icon] || Rocket
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setActiveSection(null)}>
            ← Back to hub
          </Button>
          <StatusPill status={active.status} />
        </div>

        <Card className="white-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-royalPurple-accent/10">
                <Icon className="h-5 w-5 text-royalPurple-accentTx" />
              </span>
              {active.title}
            </CardTitle>
            <p className="text-sm text-royalPurple-text2">{active.description}</p>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {active.tools.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-royalPurple-border bg-white p-4 hover:border-royalPurple-border2 hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-semibold text-royalPurple-text1 group-hover:text-royalPurple-accentTx">
                        {tool.name}
                      </p>
                      <p className="text-sm text-royalPurple-text3 mt-1">{tool.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-royalPurple-text3 group-hover:text-royalPurple-accentTx mt-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-8 w-8 text-royalPurple-accentTx" aria-hidden="true" />
          <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-royalPurple-text1">Innovation Hub</h1>
        <p className="text-royalPurple-text2 mt-2 max-w-2xl">
          Launch AI tools, interactive learning, wellness programmes, and verified records — all
          connected to features already running in ZSMS.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-royalPurple-border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-royalPurple-text1">{toolCount}</p>
          <p className="text-xs text-royalPurple-text3">Tools for your role</p>
        </div>
        <div className="rounded-xl border border-royalPurple-border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-royalPurple-text1">{sections.length}</p>
          <p className="text-xs text-royalPurple-text3">Innovation areas</p>
        </div>
        <div className="rounded-xl border border-royalPurple-border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-royalPurple-text1">5</p>
          <p className="text-xs text-royalPurple-text3">Lab types</p>
        </div>
        <div className="rounded-xl border border-royalPurple-border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-royalPurple-text1">Live</p>
          <p className="text-xs text-royalPurple-text3">No placeholder demos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = ICONS[section.icon] || Rocket
          return (
            <Card
              key={section.id}
              className="white-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveSection(section.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-royalPurple-accentTx shrink-0" />
                    {section.title}
                  </CardTitle>
                  <StatusPill status={section.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-royalPurple-text2 mb-4">{section.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-royalPurple-text3">
                    {section.tools.length} linked tools
                  </span>
                  <span className="inline-flex items-center text-sm font-medium text-royalPurple-accentTx">
                    Open
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <InnovationProjectsPanel />
    </div>
  )
}
