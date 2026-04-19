'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'

export type RecipeTemplate = {
  id: string
  title: string
  description: string
  expectedPeriodsPerWeek: number
  blocks: Array<{
    type: 'SINGLE' | 'DOUBLE' | 'TRIPLE'
    size: number
    quantity: number
    placementPriority: number
  }>
}

export function RecipeTemplateSelector(props: { onSelect: (template: RecipeTemplate) => void }) {
  const templates = useMemo<RecipeTemplate[]>(
    () => [
      {
        id: 'balanced-5',
        title: '5 Periods (Balanced)',
        description: '2 doubles + 1 single (good for core subjects).',
        expectedPeriodsPerWeek: 5,
        blocks: [
          { type: 'DOUBLE', size: 2, quantity: 2, placementPriority: 2 },
          { type: 'SINGLE', size: 1, quantity: 1, placementPriority: 5 },
        ],
      },
      {
        id: 'steady-6',
        title: '6 Periods (Steady)',
        description: '6 singles (max flexibility).',
        expectedPeriodsPerWeek: 6,
        blocks: [{ type: 'SINGLE', size: 1, quantity: 6, placementPriority: 6 }],
      },
      {
        id: 'double-heavy-6',
        title: '6 Periods (Double-heavy)',
        description: '3 doubles (labs/practicals).',
        expectedPeriodsPerWeek: 6,
        blocks: [{ type: 'DOUBLE', size: 2, quantity: 3, placementPriority: 2 }],
      },
      {
        id: 'mixed-7',
        title: '7 Periods (Mixed)',
        description: '2 doubles + 3 singles (balanced load).',
        expectedPeriodsPerWeek: 7,
        blocks: [
          { type: 'DOUBLE', size: 2, quantity: 2, placementPriority: 2 },
          { type: 'SINGLE', size: 1, quantity: 3, placementPriority: 5 },
        ],
      },
      {
        id: 'triple-8',
        title: '8 Periods (Advanced)',
        description: '1 triple + 1 double + 3 singles (high structure).',
        expectedPeriodsPerWeek: 8,
        blocks: [
          { type: 'TRIPLE', size: 3, quantity: 1, placementPriority: 1 },
          { type: 'DOUBLE', size: 2, quantity: 1, placementPriority: 2 },
          { type: 'SINGLE', size: 1, quantity: 3, placementPriority: 6 },
        ],
      },
    ],
    []
  )

  return (
    <div className="onboard-card p-5">
      <div className="text-royalPurple-text1 font-bold text-lg">Template Selector</div>
      <div className="text-royalPurple-text2 text-sm mt-1">
        Start from a proven recipe, then fine-tune blocks and constraints.
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card/60 p-4 flex flex-col gap-3"
          >
            <div>
              <div className="text-sm font-bold text-royalPurple-text1">{t.title}</div>
              <div className="text-xs text-royalPurple-text3 mt-1">{t.description}</div>
              <div className="text-xs text-royalPurple-text2 mt-2">
                Total periods: <span className="font-semibold">{t.expectedPeriodsPerWeek}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-royalPurple-text3">
                Blocks: {t.blocks.map((b) => `${b.quantity}×${b.size}`).join(' · ')}
              </div>
              <Button onClick={() => props.onSelect(t)} className="zsms-hover-raise">
                Use Template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
