'use client'

import { useEffect, useState } from 'react'
import { Layers, Loader2, FileText } from 'lucide-react'
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
  lessonCount?: number | null
  path?: string
}

type ResourcesPayload = {
  teachingModules: ResourceItem[]
  counts: { teachingModules: number; total: number }
}

/**
 * Official MoE secondary teaching modules (not school Study Materials uploads).
 * Visible to secondary and combined schools.
 */
export function OfficialSecondaryResources({ className }: { className?: string }) {
  const [data, setData] = useState<ResourcesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/curriculum/secondary-resources', {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Could not load official secondary teaching modules')
          setData(null)
          return
        }
        setData(json.data || null)
      } catch {
        if (!cancelled) setError('Could not load official secondary teaching modules')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Official Secondary Teaching Modules
        </CardTitle>
        <CardDescription>
          MoE form-level teaching modules used to enrich schemes, lesson plans, and AI planning.
          Separate from school-uploaded Study Materials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading modules…
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && (
          <>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {data?.counts?.teachingModules ?? 0} modules available
            </p>
            {!data?.teachingModules?.length ? (
              <p className="text-sm text-muted-foreground">
                No secondary teaching modules ingested yet.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {data.teachingModules.map((item) => (
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
                      {item.lessonCount != null ? `${item.lessonCount} lessons` : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
