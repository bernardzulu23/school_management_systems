'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Rocket,
  Map,
  Layers,
  UserCheck,
  Users,
  MessageSquare,
  PenTool,
  Target,
  Eye,
  Heart,
  Users as HandshakeIcon,
  ClipboardCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import CreativeTeachingHub from '@/components/creative-teaching/CreativeTeachingHub'
import { EczGuidelinesCatalog } from '@/components/assessments/EczGuidelinesCatalog'
import { ECZDeadlineTracker } from '@/components/assessments/ECZDeadlineTracker'
import {
  ECZ_RULES,
  ECZ_IMPLEMENTED_FEATURES,
  ECZ_TEACHING_PRACTICES,
  ADVANCED_TAB_ECZ,
} from '@/lib/ecz/ecz-feature-catalog'
import { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'

const TABS = [
  { id: 'ecz-system', label: 'ECZ Assessment System', icon: ClipboardCheck },
  { id: 'creative-teaching', label: 'Creative Teaching & STEM', icon: Rocket },
  { id: 'curriculum-mapping', label: 'Curriculum Mapping', icon: Map },
  { id: 'differentiated-instruction', label: 'Differentiated Instruction', icon: Layers },
  { id: 'student-portfolios', label: 'Student Portfolios', icon: UserCheck },
  { id: 'lesson-planning', label: 'Collaborative Lesson Planning', icon: Users },
  { id: 'parent-conferences', label: 'Parent-Teacher Conferences', icon: MessageSquare },
  { id: 'assessment-builder', label: 'Assessment Builder', icon: PenTool },
  { id: 'learning-objectives', label: 'Learning Objectives', icon: Target },
  { id: 'behavior-management', label: 'Behavior Management', icon: Eye },
  { id: 'professional-community', label: 'Professional Community', icon: Heart },
  { id: 'mentorship', label: 'Mentorship Program', icon: HandshakeIcon },
]

function StatusBadge({ status }) {
  if (status === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 text-green-200 px-2 py-0.5 text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        Live
      </span>
    )
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-200 px-2 py-0.5 text-xs font-medium">
        <Clock className="h-3 w-3" />
        Partial
      </span>
    )
  }
  return (
    <span className="rounded-full bg-royalPurple-muted px-2 py-0.5 text-xs text-royalPurple-text3">
      Planned
    </span>
  )
}

function RuleCard({ rule }) {
  return (
    <div className="rounded-xl border border-royalPurple-border/50 bg-royalPurple-card/50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-accent uppercase tracking-wide">Rule {rule.rule}</p>
          <h4 className="font-semibold text-royalPurple-text1">{rule.title}</h4>
        </div>
        <StatusBadge status={rule.implemented} />
      </div>
      <p className="text-sm text-royalPurple-text2 leading-relaxed">{rule.summary}</p>
      {rule.href ? (
        <Link href={rule.href}>
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            {rule.cta}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ) : null}
    </div>
  )
}

function FeatureLinkCard({ feature }) {
  return (
    <Link
      href={feature.href}
      className="block rounded-xl border border-royalPurple-border/50 bg-royalPurple-deep/40 p-4 hover:border-accent/50 hover:bg-royalPurple-card/60 transition-colors"
    >
      <h4 className="font-semibold text-royalPurple-text1 text-sm">{feature.title}</h4>
      <p className="text-xs text-royalPurple-text2 mt-1 leading-relaxed">{feature.description}</p>
      <span className="text-xs text-accent mt-2 inline-flex items-center gap-1">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}

function TeachingPracticeCard({ practice }) {
  return (
    <div className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-muted/30 p-3">
      <p className="font-medium text-royalPurple-text1 text-sm">{practice.title}</p>
      <p className="text-xs text-royalPurple-text2 mt-1 leading-relaxed">{practice.body}</p>
    </div>
  )
}

function EczTabIntro({ tabId }) {
  const meta = ADVANCED_TAB_ECZ[tabId]
  if (!meta) return null
  return (
    <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 p-4">
      <p className="text-xs font-bold text-accent uppercase tracking-wide">ECZ alignment</p>
      <h3 className="text-lg font-bold text-royalPurple-text1 mt-1">{meta.title}</h3>
      <p className="text-sm text-royalPurple-text2 mt-1">{meta.subtitle}</p>
    </div>
  )
}

function EczTabSections({ tabId, subjects, subjectsLoading }) {
  const meta = ADVANCED_TAB_ECZ[tabId]
  if (!meta) return null

  const rules = ECZ_RULES.filter((r) => meta.ruleIds.includes(r.id))
  const features = ECZ_IMPLEMENTED_FEATURES.filter((f) => meta.featureIds.includes(f.id))
  const practices = ECZ_TEACHING_PRACTICES.filter((p) => meta.practiceIds.includes(p.id))

  const showGuidelines =
    tabId === 'curriculum-mapping' || tabId === 'learning-objectives' || tabId === 'ecz-system'

  return (
    <div className="space-y-6">
      <EczTabIntro tabId={tabId} />

      {tabId !== 'ecz-system' ? <ECZDeadlineTracker /> : null}

      <div>
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">
          How ECZ wants this taught
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {practices.map((p) => (
            <TeachingPracticeCard key={p.id} practice={p} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">
          Implemented in this system
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <FeatureLinkCard key={f.id} feature={f} />
          ))}
        </div>
      </div>

      {rules.length > 0 && tabId !== 'ecz-system' ? (
        <div>
          <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">Related ECZ rules</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((r) => (
              <RuleCard key={r.id} rule={r} />
            ))}
          </div>
        </div>
      ) : null}

      {showGuidelines ? (
        <div className="rounded-xl border border-royalPurple-border/50 p-4">
          <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            ECZ Assessment Guidelines ({ECZ_GUIDELINES_SUBJECT_COUNT} subjects)
          </h4>
          <EczGuidelinesCatalog subjects={subjects} loading={subjectsLoading} />
        </div>
      ) : null}
    </div>
  )
}

function EczSystemPanel({ subjects, subjectsLoading }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
        <h3 className="text-lg font-bold text-royalPurple-text1">
          ECZ Assessment System — what your school has now
        </h3>
        <p className="text-sm text-royalPurple-text2 mt-2 leading-relaxed">
          This system follows Examination Council of Zambia rules for School-Based Assessment: form
          weighting, Zambian contexts, the 31 January deadline, four-level rubrics,{' '}
          {ECZ_GUIDELINES_SUBJECT_COUNT} official subjects, and CSV export for submission.
        </p>
        <Link href="/dashboard/teacher/assessments/ecz" className="inline-block mt-3">
          <Button>
            Open ECZ SBA Hub
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <ECZDeadlineTracker />

      <div>
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">All seven ECZ rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ECZ_RULES.map((r) => (
            <RuleCard key={r.id} rule={r} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">Every live feature</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ECZ_IMPLEMENTED_FEATURES.map((f) => (
            <FeatureLinkCard key={f.id} feature={f} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">
          How ECZ wants lessons taught
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ECZ_TEACHING_PRACTICES.map((p) => (
            <TeachingPracticeCard key={p.id} practice={p} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-royalPurple-border/50 p-4">
        <h4 className="text-sm font-semibold text-royalPurple-text1 mb-3">
          Official subjects & constructs
        </h4>
        <EczGuidelinesCatalog subjects={subjects} loading={subjectsLoading} />
      </div>
    </div>
  )
}

function AssessmentBuilderTab({ subjects, subjectsLoading }) {
  return (
    <div className="space-y-6">
      <EczTabSections
        tabId="assessment-builder"
        subjects={subjects}
        subjectsLoading={subjectsLoading}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-royalPurple-border/40">
        <Link href="/dashboard/teacher/assessments" className="block">
          <Button variant="outline" className="w-full justify-start">
            General assessments
          </Button>
        </Link>
        <Link href="/dashboard/teacher/assessments/calendar" className="block">
          <Button variant="outline" className="w-full justify-start">
            Assessment calendar
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function AdvancedTeachingTools() {
  const [activeTab, setActiveTab] = useState('ecz-system')
  const [subjects, setSubjects] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true)
    try {
      const res = await fetch('/api/ecz/subjects/seed?sync=true', { credentials: 'include' })
      const json = await res.json()
      setSubjects(Array.isArray(json?.data) ? json.data : [])
    } catch {
      setSubjects([])
    } finally {
      setSubjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  const renderTab = () => {
    switch (activeTab) {
      case 'ecz-system':
        return <EczSystemPanel subjects={subjects} subjectsLoading={subjectsLoading} />
      case 'creative-teaching':
        return (
          <div className="space-y-6">
            <EczTabSections
              tabId="creative-teaching"
              subjects={subjects}
              subjectsLoading={subjectsLoading}
            />
            <div className="border-t border-royalPurple-border/40 pt-6">
              <CreativeTeachingHub />
            </div>
          </div>
        )
      case 'assessment-builder':
        return <AssessmentBuilderTab subjects={subjects} subjectsLoading={subjectsLoading} />
      case 'curriculum-mapping':
      case 'learning-objectives':
      case 'differentiated-instruction':
      case 'student-portfolios':
      case 'lesson-planning':
      case 'parent-conferences':
      case 'behavior-management':
      case 'professional-community':
      case 'mentorship':
        return (
          <EczTabSections tabId={activeTab} subjects={subjects} subjectsLoading={subjectsLoading} />
        )
      default:
        return (
          <EczTabSections tabId={activeTab} subjects={subjects} subjectsLoading={subjectsLoading} />
        )
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={
                active
                  ? 'bg-gradient-to-r from-accent to-warn text-royalPurple-text1'
                  : 'text-royalPurple-text2 border-royalPurple-border hover:bg-royalPurple-muted'
              }
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>
      {renderTab()}
    </div>
  )
}
