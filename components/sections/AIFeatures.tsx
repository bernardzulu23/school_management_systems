'use client'

import React, { useEffect, useState } from 'react'
import { BookOpen, FileText, HelpCircle, MessageSquare, Wand2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { AI_FEATURE_CATALOG } from '@/lib/marketing/featureCatalog'

const ICONS: Record<string, typeof BookOpen> = {
  'ai-lesson-planner': BookOpen,
  'ai-story-weaver': Wand2,
  'ai-quiz-maker': HelpCircle,
  'ai-report-comments': MessageSquare,
  'ecz-practice': FileText,
}

type AiFeature = {
  id: string
  title: string
  description: string
  detail: string
  planLabel: string
  loginHint?: string
}

export function AIFeatures({ registerUrl }: { registerUrl: string }) {
  const [features, setFeatures] = useState<AiFeature[]>([])
  const [stats, setStats] = useState<{
    activeSchools: number
    totalResults: number
  } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/public/features').then((r) => r.json()),
      fetch('/api/public/platform-stats').then((r) => r.json()),
    ])
      .then(([featRes, statsRes]) => {
        if (!active) return
        if (featRes?.aiFeatures) setFeatures(featRes.aiFeatures)
        if (statsRes?.stats) setStats(statsRes.stats)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const loginBase = '/login'

  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[var(--color-accent)] tracking-[0.12em] uppercase mb-4">
            Teaching assistants
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            AI tools that support — not replace — ECZ SBA
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Formal School-Based Assessment lives in the ECZ SBA Hub. AI helps with lesson prep,
            practice materials, and report comments on Standard plans and above.
          </p>
          {stats && stats.activeSchools > 0 && (
            <p className="text-sm text-gray-500 mt-4">
              Used across {stats.activeSchools.toLocaleString()} active schools ·{' '}
              {stats.totalResults.toLocaleString()} results tracked platform-wide
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(features.length ? features : AI_FEATURE_CATALOG).map((feature) => {
            const Icon = ICONS[feature.id] || BookOpen
            const toolHref = `${loginBase}?from=${encodeURIComponent(feature.loginHint || feature.id)}`
            return (
              <Card key={feature.id} className="flex flex-col">
                <div className="mb-4">
                  <Icon size={40} color="#7c3aed" strokeWidth={1.5} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>

                <p className="text-gray-700 mb-3 font-medium">{feature.description}</p>

                <p className="text-sm text-gray-600 mb-4 flex-grow">{feature.detail}</p>

                <div className="pt-4 border-t border-gray-200 mt-auto">
                  <p className="text-xs text-purple-600 font-semibold mb-3">{feature.planLabel}</p>
                  <Link
                    href={toolHref}
                    className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Sign in to use →
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-lg text-gray-700 mb-6">
            ECZ SBA on every plan. AI extras on Standard and Premium.
          </p>
          <a
            href={registerUrl}
            className="inline-flex items-center justify-center bg-royalPurple-accent text-royalPurple-accentTx px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
          >
            Start free trial
          </a>
        </div>
      </div>
    </section>
  )
}
