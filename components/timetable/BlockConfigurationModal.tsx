'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { RecipeValidationDisplay } from '@/components/timetable/RecipeValidationDisplay'

type BlockType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD'

export type RecipeBlockDraft = {
  type: BlockType
  size: number
  quantity: number
  placementPriority: number
}

export function BlockConfigurationModal(props: {
  isOpen: boolean
  onClose: () => void
  expectedPeriodsPerWeek: number
  initialBlocks: RecipeBlockDraft[]
  onSave: (next: { expectedPeriodsPerWeek: number; blocks: RecipeBlockDraft[] }) => void
}) {
  const [expected, setExpected] = useState(props.expectedPeriodsPerWeek)
  const [blocks, setBlocks] = useState<RecipeBlockDraft[]>(props.initialBlocks)

  useEffect(() => {
    if (!props.isOpen) return
    setExpected(props.expectedPeriodsPerWeek)
    setBlocks(props.initialBlocks)
  }, [props.isOpen, props.expectedPeriodsPerWeek, props.initialBlocks])

  const total = useMemo(() => {
    return blocks.reduce((acc, b) => acc + Math.max(0, b.size) * Math.max(0, b.quantity), 0)
  }, [blocks])

  const validation = useMemo(() => {
    const errors: Array<{ message: string; suggestion?: string }> = []
    const warnings: Array<{ message: string; suggestion?: string }> = []

    for (const b of blocks) {
      if (b.size <= 0) errors.push({ message: 'Block size must be >= 1' })
      if (b.quantity <= 0) errors.push({ message: 'Block quantity must be >= 1' })
    }

    if (total !== expected) {
      errors.push({
        message: `Sum of blocks = ${total} (expected ${expected})`,
        suggestion: 'Adjust block sizes/quantities so totals match.',
      })
    }

    if (blocks.some((b) => b.size >= 3)) {
      warnings.push({
        message:
          'Triple/quad blocks can be hard to place if your day has breaks or uneven slot counts.',
        suggestion: 'Prefer doubles unless a subject truly needs a long block.',
      })
    }

    return { errors, warnings, totalPeriods: total }
  }, [blocks, expected, total])

  const canSave = validation.errors.length === 0

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Block Configuration" size="lg">
      <div className="space-y-4">
        <div className="onboard-card p-4">
          <div className="text-xs text-royalPurple-text3">Expected periods per week</div>
          <input
            type="number"
            value={expected}
            onChange={(e) => setExpected(Number(e.target.value) || 0)}
            className="form-input w-full mt-2"
            min={0}
          />
        </div>

        <div className="onboard-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-royalPurple-text1">Blocks</div>
            <Button
              variant="outline"
              onClick={() =>
                setBlocks((prev) => [
                  ...prev,
                  { type: 'SINGLE', size: 1, quantity: 1, placementPriority: 5 },
                ])
              }
            >
              Add Block
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {blocks.map((b, idx) => (
              <div
                key={`${b.type}-${idx}`}
                className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/40 p-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
              >
                <div>
                  <div className="text-xs text-royalPurple-text3">Type</div>
                  <select
                    className="zsms-select w-full mt-2"
                    value={b.type}
                    onChange={(e) => {
                      const t = e.target.value as BlockType
                      setBlocks((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                type: t,
                                size:
                                  t === 'SINGLE' ? 1 : t === 'DOUBLE' ? 2 : t === 'TRIPLE' ? 3 : 4,
                              }
                            : x
                        )
                      )
                    }}
                  >
                    <option value="SINGLE">Single</option>
                    <option value="DOUBLE">Double</option>
                    <option value="TRIPLE">Triple</option>
                    <option value="QUAD">Quad</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-royalPurple-text3">Quantity</div>
                  <input
                    type="number"
                    className="form-input w-full mt-2"
                    min={1}
                    value={b.quantity}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      setBlocks((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x))
                      )
                    }}
                  />
                </div>

                <div>
                  <div className="text-xs text-royalPurple-text3">Priority (1–10)</div>
                  <input
                    type="number"
                    className="form-input w-full mt-2"
                    min={1}
                    max={10}
                    value={b.placementPriority}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 5
                      setBlocks((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, placementPriority: v } : x))
                      )
                    }}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <RecipeValidationDisplay validation={validation} />

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => props.onSave({ expectedPeriodsPerWeek: expected, blocks })}
            disabled={!canSave}
            className="zsms-hover-raise"
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
