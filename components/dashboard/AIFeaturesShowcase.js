'use client'

import {
  Sparkles,
  BookOpen,
  ClipboardList,
  HelpCircle,
  FileText,
  Target,
  ChevronRight,
  Upload,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { resolveAiChatHref, resolveAiChatLabel } from '@/lib/ai/chat/ui-entry'

const AI_FEATURES = [
  {
    id: 'ai-assistant',
    // name/description/href resolved per role in the component
    icon: MessageSquare,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
    chatEntry: true,
  },
  {
    id: 'ai-reference-materials',
    name: 'AI Reference Materials',
    description:
      'Upload PDFs and notes so lesson plans, quizzes, and the study assistant use your content',
    icon: Upload,
    href: '/dashboard/teacher/ai-materials',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
  {
    id: 'lesson-planner',
    name: 'AI Lesson Planner',
    description: '30-second lesson plans aligned to Zambian curriculum',
    icon: ClipboardList,
    href: '/dashboard/teacher/lesson-planner',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
  {
    id: 'story-weaver',
    name: 'AI Story Weaver',
    description: 'Engaging reading materials with Zambian context',
    icon: BookOpen,
    href: '/dashboard/teacher/story-weaver',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
  {
    id: 'quiz-maker',
    name: 'AI Quiz Maker',
    description: 'Instant assessments and multiple choice questions',
    icon: HelpCircle,
    href: '/dashboard/teacher/quiz-maker',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
  {
    id: 'report-comments',
    name: 'AI Report Comments',
    description: 'Personalized student feedback and strategic reviews',
    icon: FileText,
    href: '/dashboard/teacher/report-comments',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    roles: ['teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
  {
    id: 'ecz-practice',
    name: 'ECZ Practice Papers',
    description: 'Exam preparation tools for Grade 7, 9 and 12',
    icon: Target,
    href: '/dashboard/student/ecz-practice',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    roles: ['student', 'teacher', 'hod', 'headteacher', 'administrator', 'admin'],
  },
]

export default function AIFeaturesShowcase() {
  const { user } = useAuth()
  const userRole = String(user?.role || '').toLowerCase()
  const chatLabel = resolveAiChatLabel(userRole)

  const accessibleFeatures = AI_FEATURES.filter((f) => f.roles.includes(userRole)).map((f) => {
    if (f.chatEntry) {
      return {
        ...f,
        name: chatLabel.name,
        description: chatLabel.description,
        href: resolveAiChatHref(userRole),
      }
    }
    return f
  })

  if (accessibleFeatures.length === 0) return null

  return (
    <section className="mt-8" data-testid="ai-features-showcase">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-royalPurple-text1 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-royalPurple-accent" />
          AI FEATURES SHOWCASE (NEW)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessibleFeatures.map((feature) => (
          <Link key={feature.id} href={feature.href}>
            <Card className="h-full border-royalPurple-border/40 bg-royalPurple-muted/40 hover:bg-royalPurple-muted/60 transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${feature.bgColor} ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-royalPurple-text1 truncate group-hover:text-royalPurple-accent transition-colors">
                        {feature.name}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-royalPurple-text3 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-royalPurple-text2 line-clamp-2">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
