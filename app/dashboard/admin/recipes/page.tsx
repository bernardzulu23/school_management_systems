'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import {
  RecipeTemplateSelector,
  type RecipeTemplate,
} from '@/components/timetable/RecipeTemplateSelector'
import {
  BlockConfigurationModal,
  type RecipeBlockDraft,
} from '@/components/timetable/BlockConfigurationModal'
import { RecipeValidationDisplay } from '@/components/timetable/RecipeValidationDisplay'

type TeachingAssignmentRow = {
  id: string
  teacher?: { user?: { name?: string | null } | null } | null
  subject?: { name?: string | null } | null
  class?: { name?: string | null; year_group?: string | null } | null
}

export default function AdminRecipesPage() {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [lastValidation, setLastValidation] = useState<any>(null)

  const assignmentsQuery = useQuery({
    queryKey: ['teaching-assignments'],
    queryFn: async () => {
      const res = await fetch('/api/teaching-assignments', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load teaching assignments')
      return (Array.isArray(json?.data) ? json.data : []) as TeachingAssignmentRow[]
    },
  })

  const recipesQuery = useQuery({
    queryKey: ['recipes', selectedAssignmentId],
    enabled: Boolean(selectedAssignmentId),
    queryFn: async () => {
      const res = await fetch(
        `/api/recipes?assignmentId=${encodeURIComponent(selectedAssignmentId)}`,
        { cache: 'no-store' }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load recipes')
      return Array.isArray(json?.data) ? json.data : []
    },
  })

  const assignmentLabel = useMemo(() => {
    const a = (assignmentsQuery.data || []).find(
      (x) => String(x.id) === String(selectedAssignmentId)
    )
    if (!a) return ''
    const teacher = a.teacher?.user?.name || 'Teacher'
    const subject = a.subject?.name || 'Subject'
    const cls = a.class?.name || 'Class'
    return `${subject} · ${cls} · ${teacher}`
  }, [assignmentsQuery.data, selectedAssignmentId])

  const onTemplateSelect = (tpl: RecipeTemplate) => {
    setSelectedTemplate(tpl)
    setLastValidation(null)
    setConfigOpen(true)
  }

  const createRecipe = async (payload: {
    expectedPeriodsPerWeek: number
    blocks: RecipeBlockDraft[]
  }) => {
    if (!selectedAssignmentId) {
      toast.error('Select a teaching assignment first')
      return
    }
    const res = await fetch('/api/recipes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teachingAssignmentId: selectedAssignmentId,
        expectedPeriodsPerWeek: payload.expectedPeriodsPerWeek,
        blocks: payload.blocks.map((b) => ({
          type: b.type,
          size: b.size,
          quantity: b.quantity,
          placementPriority: b.placementPriority,
        })),
        constraints: [],
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to create recipe')
    setLastValidation(json?.data?.validationErrors || null)
    toast.success('Recipe created')
    recipesQuery.refetch()
  }

  return (
    <DashboardLayout title="Scheduling Recipes">
      <div className="space-y-6">
        <div className="onboard-card p-5">
          <div className="text-royalPurple-text1 font-bold text-lg">Scheduling Recipes</div>
          <div className="text-royalPurple-text2 text-sm mt-1">
            Build atomic block recipes (singles/doubles/triples). The solver uses these to keep
            lessons consecutive and season-aware.
          </div>
        </div>

        <div className="onboard-card p-5">
          <div className="text-sm font-bold text-royalPurple-text1">Select Teaching Assignment</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <select
                className="zsms-select w-full"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              >
                <option value="">Select assignment…</option>
                {(assignmentsQuery.data || []).map((a) => {
                  const teacher = a.teacher?.user?.name || 'Teacher'
                  const subject = a.subject?.name || 'Subject'
                  const cls = a.class?.name || 'Class'
                  return (
                    <option key={a.id} value={a.id}>
                      {subject} · {cls} · {teacher}
                    </option>
                  )
                })}
              </select>
              {assignmentLabel ? (
                <div className="text-xs text-royalPurple-text3 mt-2">{assignmentLabel}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => recipesQuery.refetch()}
                disabled={!selectedAssignmentId || recipesQuery.isFetching}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {selectedAssignmentId ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <RecipeTemplateSelector onSelect={onTemplateSelect} />

              {recipesQuery.data?.length ? (
                <div className="onboard-card p-5">
                  <div className="text-royalPurple-text1 font-bold text-lg">Existing Recipes</div>
                  <div className="mt-3 space-y-2">
                    {recipesQuery.data.map((r: any) => (
                      <div
                        key={String(r.id)}
                        className="rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card/60 p-4 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-royalPurple-text1">
                            {String(r.status)} {r.season ? `· ${r.season}` : ''}
                          </div>
                          <div className="text-xs text-royalPurple-text3 mt-1">
                            Expected: {r.expectedPeriodsPerWeek ?? '—'} · Valid:{' '}
                            {String(Boolean(r.isValid))}
                          </div>
                        </div>
                        <div className="text-xs text-royalPurple-text3">
                          Blocks:{' '}
                          {(r.blocks || [])
                            .map((b: any) => `${b.quantity}×${b.size}`)
                            .join(' · ') || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text1 font-bold text-lg">Validation</div>
                <div className="text-royalPurple-text2 text-sm mt-1">
                  Shows the latest create/validate result.
                </div>
                <div className="mt-4">
                  <RecipeValidationDisplay validation={lastValidation} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <BlockConfigurationModal
          isOpen={configOpen}
          onClose={() => setConfigOpen(false)}
          expectedPeriodsPerWeek={selectedTemplate?.expectedPeriodsPerWeek || 0}
          initialBlocks={(selectedTemplate?.blocks || []).map((b) => ({
            type: b.type,
            size: b.size,
            quantity: b.quantity,
            placementPriority: b.placementPriority,
          }))}
          onSave={async (next) => {
            try {
              await createRecipe(next)
              setConfigOpen(false)
            } catch (e: any) {
              toast.error(e?.message || 'Failed to create recipe')
            }
          }}
        />
      </div>
    </DashboardLayout>
  )
}
