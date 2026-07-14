/**
 * Force-reassign live school under CIEDE2000 chip-scale uniqueness + write dual HTML report
 * (labeled cards + actual-size chips with 2-letter codes).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'
import { assignUniqueColorsForSchool } from '../lib/timetable/assignTeacherColor.js'
import {
  colorsTooClose,
  ciede2000,
  measureTeacherColorCapacity,
  normalizeHex,
  MIN_CIEDE2000,
  textOnTeacherColor,
} from '../lib/timetable/uniqueTeacherColors.ts'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'
const prisma = new PrismaClient()

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const capacity = measureTeacherColorCapacity(80)
const result = await assignUniqueColorsForSchool(prisma, SCHOOL, { force: true })

const rows = await prisma.teacherColor.findMany({
  where: { schoolId: SCHOOL },
  include: { teacher: { include: { user: { select: { name: true } } } } },
  orderBy: { createdAt: 'asc' },
})

const list = rows.map((r) => ({
  name: r.teacher?.user?.name || 'Teacher',
  colorHex: normalizeHex(r.colorHex),
  code: initials(r.teacher?.user?.name || 'Teacher'),
}))

let collisions = 0
let minDelta = Infinity
for (let i = 0; i < list.length; i++) {
  for (let j = i + 1; j < list.length; j++) {
    const d = ciede2000(list[i].colorHex, list[j].colorHex)
    if (d < minDelta) minDelta = d
    if (colorsTooClose(list[i].colorHex, list[j].colorHex)) collisions++
  }
}

const chipRow = list
  .map((t) => {
    const text = textOnTeacherColor(t.colorHex)
    return `<div class="chip" title="${escapeHtml(t.name)} ${t.colorHex}" style="background:${t.colorHex};color:${text}">${escapeHtml(t.code)}</div>`
  })
  .join('')

const wallMock = (() => {
  // Mimic class-wall cell height (~22px) and width for double codes
  return list
    .map((t) => {
      const text = textOnTeacherColor(t.colorHex)
      return `<div class="wall-cell" title="${escapeHtml(t.name)}" style="background:${t.colorHex};color:${text}">${escapeHtml(t.code)}</div>`
    })
    .join('')
})()

const cards = list
  .map(
    (t) =>
      `<div class="card"><div class="swatch" style="background:${t.colorHex}"></div><div><div class="meta">${escapeHtml(t.name)}</div><div class="hex">${t.colorHex} · ΔEₘᵢₙ peers checked</div></div></div>`
  )
  .join('\n')

const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Teacher colours — chip scale</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#f1f5f9;color:#0f172a;padding:24px;max-width:1100px;margin:0 auto}
h1{font-size:20px;margin:0 0 6px}
h2{font-size:15px;margin:28px 0 10px;color:#334155}
p,li{font-size:13px;color:#475569;line-height:1.45}
.meta-bar{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:14px 0 22px}
.chip-strip{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px}
.chip{width:28px;height:22px;border-radius:3px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:-0.02em;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(28px,1fr));gap:1px;background:#9ca3af;padding:1px;border:1px solid #9ca3af;max-width:420px}
.wall-cell{height:22px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:-0.02em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:8px}
.card{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px}
.swatch{width:44px;height:44px;border-radius:8px;border:1px solid #cbd5e1;flex-shrink:0}
.meta{font-size:14px;font-weight:600}.hex{opacity:.65;font-family:ui-monospace,monospace;font-size:11px;margin-top:2px}
.note{font-size:12px;color:#64748b;margin-top:6px}
</style></head><body>
<h1>Teacher colours — chip-scale uniqueness (CIEDE2000)</h1>
<div class="meta-bar">
  <strong>${list.length} teachers</strong> force-reassigned · near-collisions <strong>${collisions}</strong>
  · min pairwise ΔE <strong>${minDelta === Infinity ? '—' : minDelta.toFixed(1)}</strong> (threshold ${MIN_CIEDE2000})
  · measured packing capacity <strong>${capacity}</strong> teachers from a clean school
  · school ${SCHOOL}
</div>

<h2>1. Actual UI size — chips with 2-letter codes only (judge this first)</h2>
<p>Same scale as Class wall / By period cells: ~28×22px, bold abbreviation, no name labels.</p>
<div class="chip-strip">${chipRow}</div>
<p class="note">Hover a chip to see the teacher name + hex.</p>

<h2>2. Class-wall strip mock (tight packing)</h2>
<div class="wall">${wallMock}</div>

<h2>3. Named legend (lookup only — not how the grid is read)</h2>
<div class="grid">${cards}</div>

<ul>
  <li>Uniqueness gate: CIEDE2000 ≥ ${MIN_CIEDE2000}, plus hue/lightness floors and a stricter green-band margin.</li>
  <li>Realistic max capacity under this gate (clean school, sequential assign): <strong>${capacity}</strong> teachers.</li>
  <li>A full secondary (~25–40) fits; beyond ~${capacity} you need admin curation or slight threshold relaxation.</li>
</ul>
</body></html>`

const outPath = join(process.cwd(), 'tmp-teacher-colors-report.html')
writeFileSync(outPath, html, 'utf8')

console.log(
  JSON.stringify(
    {
      teacherCount: list.length,
      reassigned: result.assigned,
      collisions,
      minPairwiseDeltaE: Number.isFinite(minDelta) ? Number(minDelta.toFixed(2)) : null,
      threshold: MIN_CIEDE2000,
      capacity,
      report: outPath,
      colors: list,
    },
    null,
    2
  )
)

await prisma.$disconnect()
