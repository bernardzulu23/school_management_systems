'use client'

import React from 'react'
import { BookOpen, FileText, HelpCircle, MessageSquare, Wand2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

const aiFeatures = [
  {
    icon: BookOpen,
    title: 'Lesson Planner',
    description: 'Generate ECZ-aligned lesson plans in 30 seconds',
    detail: 'Save 1.5 hours per plan',
    plan: 'Standard, Premium',
  },
  {
    icon: Wand2,
    title: 'Story Weaver',
    description: 'Create engaging reading materials on demand',
    detail: 'Perfect for Grade 1-7 reading lessons',
    plan: 'Standard, Premium',
  },
  {
    icon: HelpCircle,
    title: 'Quiz Maker',
    description: 'Generate instant assessments with answer keys',
    detail: 'Multiple choice, true/false, short answer',
    plan: 'Standard, Premium',
  },
  {
    icon: MessageSquare,
    title: 'Report Comments',
    description: 'Write personalized student feedback at scale',
    detail: 'Save 8+ hours per report cycle',
    plan: 'Premium only',
  },
  {
    icon: FileText,
    title: 'ECZ Practice Papers',
    description: 'Generate exam-style practice questions',
    detail: 'All subjects, all grades',
    plan: 'Standard, Premium',
  },
]

export function AIFeatures({ registerUrl }: { registerUrl: string }) {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-purple-600 tracking-wide uppercase mb-4">
            AI-Powered Teaching
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Five AI tools that save teachers 14+ hours monthly
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Available on Standard plan and above. Teachers use AI as a starting point, then
            customize for their classroom.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <div className="mb-4">
                  <Icon size={40} color="#7c3aed" strokeWidth={1.5} aria-hidden="true" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>

                <p className="text-gray-700 mb-3 font-medium">{feature.description}</p>

                <p className="text-sm text-gray-600 mb-4">{feature.detail}</p>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-purple-600 font-semibold">{feature.plan}</p>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-lg text-gray-700 mb-6">
            See AI in action. Start your free 30-day trial.
          </p>
          <a
            href={registerUrl}
            className="inline-flex items-center justify-center bg-royalPurple-accent text-royalPurple-accentTx px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
          >
            Try all AI features free
          </a>
        </div>
      </div>
    </section>
  )
}
