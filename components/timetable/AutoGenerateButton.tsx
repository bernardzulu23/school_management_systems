'use client'

import { useMemo, useState } from 'react'
import { Wand2, X, CheckCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  automationService,
  type AutomationQuality,
  type TimetableSchoolData,
} from '@/lib/timetable/automationService'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import type { Assignment } from '@/lib/timetable/types'
import toast from 'react-hot-toast'

export interface AutoGenerateButtonProps {
  schoolData: TimetableSchoolData | null
  disabledReason?: string
  onDone?: (assignments: Assignment[]) => void
}

type Step = 'idle' | 'validating' | 'generating' | 'optimizing' | 'done' | 'error'

function qualityConfig(q: AutomationQuality) {
  if (q === 'perfect') return { generations: 180, label: 'Perfect (120s)', timeoutHint: 120_000 }
  if (q === 'balanced') return { generations: 120, label: 'Balanced (60s)', timeoutHint: 60_000 }
  return { generations: 60, label: 'Fast (30s)', timeoutHint: 30_000 }
}

export function AutoGenerateButton(props: AutoGenerateButtonProps) {
  const { schoolData, disabledReason, onDone } = props
  const replaceAssignments = useTimetableStore((s) => s.replaceAssignments)

  const [open, setOpen] = useState(false)
  const [quality, setQuality] = useState<AutomationQuality>('balanced')
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    conflictCount: number
    generationsTaken: number
    bestQualityScore: number
    timeMs: number
  } | null>(null)

  const [seed, setSeed] = useState(() => Math.floor(Date.now() % 1_000_000))
  const cfg = useMemo(() => qualityConfig(quality), [quality])

  const canRun = Boolean(schoolData) && !disabledReason

  const start = async () => {
    if (!schoolData) return
    setError(null)
    setStats(null)
    setProgress(0)
    setStep('validating')

    const timeout = cfg.timeoutHint
    const startAt = Date.now()

    try {
      setStep('generating')
      const result = await automationService.generateInWorker(schoolData, {
        quality,
        timeout,
        seed,
        stopOnBestFound: true,
        onProgress: (p) => {
          const clamped = Math.max(0, Math.min(100, Math.round(p)))
          setProgress(clamped)
          if (clamped >= 30 && clamped < 70) setStep('generating')
          if (clamped >= 70 && clamped < 100) setStep('optimizing')
        },
      })

      const timeMs = Date.now() - startAt
      setStats({
        conflictCount: result.statistics.conflictCount,
        generationsTaken: result.statistics.generationsTaken,
        bestQualityScore: result.statistics.qualityScore,
        timeMs,
      })

      replaceAssignments(result.assignments, { source: 'generate' })
      onDone?.(result.assignments)
      setStep('done')
      setProgress(100)

      if (result.statistics.conflictCount === 0) toast.success('✅ Perfect timetable generated!')
      else toast.success('Timetable generated. Review conflicts before publishing.')
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to generate timetable'
      setError(msg)
      setStep('error')
      toast.error(msg)
    }
  }

  const cancel = () => {
    automationService.cancelGeneration()
    setStep('idle')
    setProgress(0)
    setError(null)
    toast('Generation cancelled')
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={!canRun}
        className="zsms-hover-raise"
        size="lg"
        title={disabledReason || 'Generate a conflict-free timetable'}
      >
        <Wand2 size={20} />
        <div className="flex flex-col items-start leading-tight">
          <span>Generate Perfect Timetable</span>
          <span className="text-xs opacity-90">Creates conflict-free schedule in seconds</span>
        </div>
      </Button>

      <Modal
        isOpen={open}
        onClose={() => {
          if (step === 'generating' || step === 'optimizing') return
          setOpen(false)
        }}
        title="Generate Perfect Timetable"
        size="lg"
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-royalPurple-text2 text-sm">
                Choose a quality level, then generate. You can cancel at any time.
              </div>
              {disabledReason ? (
                <div className="text-red-400 text-sm mt-2">{disabledReason}</div>
              ) : null}
            </div>
            {(step === 'generating' || step === 'optimizing') && (
              <Button variant="outline" onClick={cancel} className="zsms-hover-raise">
                <X size={16} />
                Cancel
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['fast', 'balanced', 'perfect'] as AutomationQuality[]).map((q) => {
              const qCfg = qualityConfig(q)
              const active = quality === q
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  disabled={step === 'generating' || step === 'optimizing'}
                  className={`plan-tile text-left zsms-hover-raise ${active ? 'plan-tile-active' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="plan-name">{q.toUpperCase()}</div>
                    {q === 'balanced' ? <span className="plan-badge">Recommended</span> : null}
                  </div>
                  <div className="plan-desc">{qCfg.label}</div>
                  <div className="text-xs text-royalPurple-text3">
                    Generations: {qCfg.generations}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-royalPurple-text1">Seed</div>
              <input
                className="form-input"
                value={String(seed)}
                onChange={(e) => setSeed(Number(e.target.value) || 0)}
                disabled={step === 'generating' || step === 'optimizing'}
              />
              <div className="text-xs text-royalPurple-text3">
                Use the same seed to reproduce results.
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-royalPurple-text1">Status</div>
              <div className="onboard-summary">
                <span className="onboard-summary-title">
                  {step === 'idle'
                    ? 'Ready'
                    : step === 'validating'
                      ? 'Understanding constraints...'
                      : step === 'generating'
                        ? 'Generating initial...'
                        : step === 'optimizing'
                          ? 'Optimizing...'
                          : step === 'done'
                            ? 'Done'
                            : 'Error'}
                </span>
                <span className="onboard-summary-meta">{progress}%</span>
              </div>
              <div className="progress-track overflow-hidden">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {stats ? (
            <div className="payment-panel">
              <div className="flex items-center gap-2 text-royalPurple-text1 font-semibold">
                <CheckCircle className="w-5 h-5 kpi-pass" />
                Result summary
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-royalPurple-text2">
                <div>
                  <div className="text-royalPurple-text3 text-xs">Conflicts found</div>
                  <div
                    className={
                      stats.conflictCount === 0 ? 'kpi-pass font-bold' : 'kpi-warn font-bold'
                    }
                  >
                    {stats.conflictCount}
                  </div>
                </div>
                <div>
                  <div className="text-royalPurple-text3 text-xs">Generations</div>
                  <div className="font-bold">{stats.generationsTaken}</div>
                </div>
                <div>
                  <div className="text-royalPurple-text3 text-xs">Quality score</div>
                  <div className="font-bold">{stats.bestQualityScore}/100</div>
                </div>
                <div>
                  <div className="text-royalPurple-text3 text-xs">Time</div>
                  <div className="font-bold">{Math.round(stats.timeMs / 1000)}s</div>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="text-red-400 text-sm">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={start}
              disabled={!schoolData || step === 'generating' || step === 'optimizing'}
              className="zsms-hover-raise"
            >
              <Wand2 size={18} />
              Start generation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'generating' || step === 'optimizing') return
                setOpen(false)
              }}
              className="zsms-hover-raise"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
