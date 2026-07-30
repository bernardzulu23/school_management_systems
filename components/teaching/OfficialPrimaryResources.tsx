'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Baby, Layers, Loader2, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ResourceItem = {
  id: string
  kind: string
  section: string
  title: string
  subject?: string
  gradeLabel?: string
  term?: string | null
  source?: string
  unitCount?: number | null
  lessonCount?: number | null
  recordCount?: number | null
  path?: string
}

type ResourcesPayload = {
  syllabi: ResourceItem[]
  teachingModules: ResourceItem[]
  ece: ResourceItem[]
  counts: { syllabi: number; teachingModules: number; ece: number; total: number }
}

function ResourceList({ items, emptyLabel }: { items: ResourceItem[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {[item.gradeLabel, item.term, item.source].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {item.unitCount != null ? `${item.unitCount} units` : null}
            {item.lessonCount != null ? `${item.lessonCount} lessons` : null}
            {item.recordCount != null ? `${item.recordCount} topics` : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Official CDC primary / ECE resources (not school Study Materials uploads).
 * Visible to every primary school; ECE always included.
 */
export function OfficialPrimaryResources({ className }: { className?: string }) {
  const [data, setData] = useState<ResourcesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [section, setSection] = useState<'syllabi' | 'teachingModules' | 'ece'>('syllabi')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/curriculum/primary-resources', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Could not load official primary resources')
          setData(null)
          return
        }
        setData(json.data || null)
      } catch {
        if (!cancelled) setError('Could not load official primary resources')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = [
    { id: 'syllabi' as const, label: 'Syllabi', icon: BookOpen, count: data?.counts?.syllabi },
    {
      id: 'teachingModules' as const,
      label: 'Teaching Modules',
      icon: Layers,
      count: data?.counts?.teachingModules,
    },
    { id: 'ece' as const, label: 'ECE', icon: Baby, count: data?.counts?.ece },
  ]

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Official Primary Resources
        </CardTitle>
        <CardDescription>
          CDC syllabi, MoE teaching modules, and ECE materials for Grades ECE–7. Separate from
          school-uploaded Study Materials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm',
                section === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              {typeof t.count === 'number' ? (
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{t.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading official resources…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            {section === 'syllabi' && (
              <ResourceList
                items={data?.syllabi || []}
                emptyLabel="No primary syllabi ingested yet. Run npm run ingest:primary."
              />
            )}
            {section === 'teachingModules' && (
              <ResourceList
                items={data?.teachingModules || []}
                emptyLabel="No primary teaching modules ingested yet."
              />
            )}
            {section === 'ece' && (
              <ResourceList
                items={data?.ece || []}
                emptyLabel="No ECE syllabi ingested yet. ECE resources will appear here for every primary school once ingested."
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
