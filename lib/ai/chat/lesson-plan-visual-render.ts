/**
 * Deterministic lesson-plan visual rendering.
 * Converts validated visualAid specs → SVG → PNG via sharp.
 * Never executes AI-generated code — only bounded numeric geometry.
 */
import sharp from 'sharp'
import type { LessonPlanVisualAid } from '@/lib/ai/chat/lesson-plan-schema'
import { renderMermaidToPng } from '@/lib/ai/chat/mermaid-render'
import { logger } from '@/lib/utils/logger'

const log = logger({ route: 'AI:lesson-plan-visual-render' })

export type RenderedLessonPlanVisual = {
  title: string
  caption?: string
  png: Buffer
  kind: LessonPlanVisualAid['type']
}

const WIDTH = 720
const HEIGHT = 420
const PAD = { top: 48, right: 36, bottom: 56, left: 64 }
const COLORS = ['#1F4788', '#C2410C', '#0B8A38', '#7C3AED']

function escapeXml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function clampAxis(min: number, max: number): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: -10, max: 10 }
  if (min === max) return { min: min - 1, max: max + 1 }
  if (min > max) return { min: max, max: min }
  return { min, max }
}

function niceStep(span: number, targetTicks = 8): number {
  if (!Number.isFinite(span) || span <= 0) return 1
  const rough = span / targetTicks
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / pow
  let nice = 1
  if (normalized > 5) nice = 10
  else if (normalized > 2) nice = 5
  else if (normalized > 1) nice = 2
  return nice * pow
}

function plotArea() {
  const left = PAD.left
  const top = PAD.top
  const right = WIDTH - PAD.right
  const bottom = HEIGHT - PAD.bottom
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function mapX(x: number, xMin: number, xMax: number, area: ReturnType<typeof plotArea>) {
  return area.left + ((x - xMin) / (xMax - xMin)) * area.width
}

function mapY(y: number, yMin: number, yMax: number, area: ReturnType<typeof plotArea>) {
  return area.bottom - ((y - yMin) / (yMax - yMin)) * area.height
}

function axisTicks(min: number, max: number, step?: number): number[] {
  const s = step && step > 0 ? step : niceStep(max - min)
  const ticks: number[] = []
  const start = Math.ceil(min / s) * s
  for (let v = start; v <= max + s * 1e-9; v += s) {
    ticks.push(Number(v.toFixed(6)))
    if (ticks.length > 24) break
  }
  if (!ticks.includes(0) && min < 0 && max > 0) ticks.push(0)
  return ticks.sort((a, b) => a - b)
}

function legendSvg(series: Array<{ name: string }>, area: ReturnType<typeof plotArea>): string {
  if (series.length <= 1) return ''
  return series
    .map((s, i) => {
      const x = area.left + i * 140
      const y = 22
      const color = COLORS[i % COLORS.length]
      return `<rect x="${x}" y="${y - 8}" width="12" height="12" fill="${color}"/>
        <text x="${x + 18}" y="${y + 2}" font-size="12" fill="#111">${escapeXml(s.name)}</text>`
    })
    .join('\n')
}

function cartesianOrLineSvg(
  visual: Extract<LessonPlanVisualAid, { type: 'cartesian' | 'line' }>
): string {
  const xAxis = clampAxis(visual.xAxis.min, visual.xAxis.max)
  const yAxis = clampAxis(visual.yAxis.min, visual.yAxis.max)
  const area = plotArea()
  const xTicks = axisTicks(xAxis.min, xAxis.max, visual.xAxis.step)
  const yTicks = axisTicks(yAxis.min, yAxis.max, visual.yAxis.step)
  const showGrid = visual.showGrid !== false

  const grid = showGrid
    ? [
        ...xTicks.map((t) => {
          const x = mapX(t, xAxis.min, xAxis.max, area)
          return `<line x1="${x}" y1="${area.top}" x2="${x}" y2="${area.bottom}" stroke="#E5E7EB" stroke-width="1"/>`
        }),
        ...yTicks.map((t) => {
          const y = mapY(t, yAxis.min, yAxis.max, area)
          return `<line x1="${area.left}" y1="${y}" x2="${area.right}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`
        }),
      ].join('\n')
    : ''

  const axes = `
    <line x1="${area.left}" y1="${area.bottom}" x2="${area.right}" y2="${area.bottom}" stroke="#111" stroke-width="2"/>
    <line x1="${area.left}" y1="${area.top}" x2="${area.left}" y2="${area.bottom}" stroke="#111" stroke-width="2"/>
  `

  // Origin cross when ranges include zero
  const origin =
    xAxis.min < 0 && xAxis.max > 0
      ? `<line x1="${mapX(0, xAxis.min, xAxis.max, area)}" y1="${area.top}" x2="${mapX(0, xAxis.min, xAxis.max, area)}" y2="${area.bottom}" stroke="#9CA3AF" stroke-width="1.5"/>`
      : ''
  const originY =
    yAxis.min < 0 && yAxis.max > 0
      ? `<line x1="${area.left}" y1="${mapY(0, yAxis.min, yAxis.max, area)}" x2="${area.right}" y2="${mapY(0, yAxis.min, yAxis.max, area)}" stroke="#9CA3AF" stroke-width="1.5"/>`
      : ''

  const tickLabels = [
    ...xTicks.map((t) => {
      const x = mapX(t, xAxis.min, xAxis.max, area)
      return `<text x="${x}" y="${area.bottom + 18}" text-anchor="middle" font-size="11" fill="#374151">${t}</text>`
    }),
    ...yTicks.map((t) => {
      const y = mapY(t, yAxis.min, yAxis.max, area)
      return `<text x="${area.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#374151">${t}</text>`
    }),
  ].join('\n')

  const seriesSvg = visual.series
    .map((series, i) => {
      const color = COLORS[i % COLORS.length]
      const pts = series.points
        .filter(
          (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= xAxis.min &&
            p.x <= xAxis.max &&
            p.y >= yAxis.min &&
            p.y <= yAxis.max
        )
        .map((p) => ({
          x: mapX(p.x, xAxis.min, xAxis.max, area),
          y: mapY(p.y, yAxis.min, yAxis.max, area),
          label: p.label,
        }))
      if (pts.length < 2) return ''
      const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
      const dots = pts
        .map(
          (p) =>
            `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}"/>${
              p.label
                ? `<text x="${p.x + 6}" y="${p.y - 6}" font-size="10" fill="#111">${escapeXml(p.label)}</text>`
                : ''
            }`
        )
        .join('\n')
      return `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${polyline}"/>\n${dots}`
    })
    .join('\n')

  const xLabel = escapeXml(visual.xAxis.label || 'x')
  const yLabel = escapeXml(visual.yAxis.label || 'y')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="${WIDTH / 2}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="#1F4788">${escapeXml(visual.title)}</text>
  ${legendSvg(visual.series, area)}
  ${grid}
  ${origin}
  ${originY}
  ${axes}
  ${tickLabels}
  ${seriesSvg}
  <text x="${(area.left + area.right) / 2}" y="${HEIGHT - 12}" text-anchor="middle" font-size="12" fill="#111">${xLabel}</text>
  <text x="18" y="${(area.top + area.bottom) / 2}" text-anchor="middle" font-size="12" fill="#111" transform="rotate(-90 18 ${(area.top + area.bottom) / 2})">${yLabel}</text>
</svg>`
}

function barChartSvg(visual: Extract<LessonPlanVisualAid, { type: 'bar' }>): string {
  const area = plotArea()
  const items = visual.items.slice(0, 12)
  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1)
  const barWidth = area.width / Math.max(items.length, 1)
  const gap = barWidth * 0.2
  const bars = items
    .map((item, i) => {
      const h = (Math.abs(item.value) / maxVal) * (area.height * 0.9)
      const x = area.left + i * barWidth + gap / 2
      const y = area.bottom - h
      const color = COLORS[i % COLORS.length]
      return `
        <rect x="${x}" y="${y}" width="${barWidth - gap}" height="${h}" fill="${color}"/>
        <text x="${x + (barWidth - gap) / 2}" y="${area.bottom + 16}" text-anchor="middle" font-size="11" fill="#374151">${escapeXml(item.label)}</text>
        <text x="${x + (barWidth - gap) / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#111">${item.value}</text>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="${WIDTH / 2}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="#1F4788">${escapeXml(visual.title)}</text>
  <line x1="${area.left}" y1="${area.bottom}" x2="${area.right}" y2="${area.bottom}" stroke="#111" stroke-width="2"/>
  <line x1="${area.left}" y1="${area.top}" x2="${area.left}" y2="${area.bottom}" stroke="#111" stroke-width="2"/>
  ${bars}
  <text x="18" y="${(area.top + area.bottom) / 2}" text-anchor="middle" font-size="12" fill="#111" transform="rotate(-90 18 ${(area.top + area.bottom) / 2})">${escapeXml(visual.yLabel || 'Value')}</text>
</svg>`
}

async function svgToPng(svg: string): Promise<Buffer | null> {
  try {
    return await sharp(Buffer.from(svg, 'utf8')).png().toBuffer()
  } catch (err) {
    log.warn('SVG→PNG conversion failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Render a single validated visual aid. Returns null on any failure.
 */
export async function renderLessonPlanVisual(
  visual: LessonPlanVisualAid
): Promise<RenderedLessonPlanVisual | null> {
  try {
    if (visual.type === 'conceptual') {
      const png = await renderMermaidToPng(visual.mermaid)
      if (!png) return null
      return {
        title: visual.title,
        caption: visual.caption,
        png,
        kind: 'conceptual',
      }
    }

    const svg = visual.type === 'bar' ? barChartSvg(visual) : cartesianOrLineSvg(visual)
    const png = await svgToPng(svg)
    if (!png) return null
    return {
      title: visual.title,
      caption: visual.caption,
      png,
      kind: visual.type,
    }
  } catch (err) {
    log.warn('Visual render failed', {
      type: visual?.type,
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Render all visualAids (+ legacy mermaidDiagram). Failures are skipped.
 */
export async function renderLessonPlanVisuals(params: {
  visualAids?: LessonPlanVisualAid[] | null
  mermaidDiagram?: string | null
}): Promise<{ visuals: RenderedLessonPlanVisual[]; diagramFailed: boolean }> {
  const visuals: RenderedLessonPlanVisual[] = []
  let anyFailed = false

  const aids = Array.isArray(params.visualAids) ? params.visualAids.slice(0, 4) : []
  for (const aid of aids) {
    const rendered = await renderLessonPlanVisual(aid)
    if (rendered) visuals.push(rendered)
    else anyFailed = true
  }

  // Legacy single Mermaid when no conceptual visualAid already covered it
  const legacy = String(params.mermaidDiagram || '').trim()
  const hasConceptual = visuals.some((v) => v.kind === 'conceptual')
  if (legacy && !hasConceptual) {
    const png = await renderMermaidToPng(legacy)
    if (png) {
      visuals.push({
        title: 'Diagram',
        png,
        kind: 'conceptual',
      })
    } else {
      anyFailed = true
    }
  }

  return { visuals, diagramFailed: anyFailed && visuals.length === 0 ? true : anyFailed }
}
