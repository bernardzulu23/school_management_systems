/**
 * Live: backfill + report teacher colours for a real school.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { assignUniqueColorsForSchool } from '@/lib/timetable/assignTeacherColor'
import { colorsTooClose, normalizeHex } from '@/lib/timetable/uniqueTeacherColors'
import { writeFileSync } from 'fs'
import { join } from 'path'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'

describe.skipIf(!url)('unique teacher colours — live school report', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('assigns unique colours and writes a swatch HTML report', async () => {
    const result = await assignUniqueColorsForSchool(prisma, SCHOOL, { force: true })
    const rows = await prisma.teacherColor.findMany({
      where: { schoolId: SCHOOL },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    })

    const list = rows.map((r) => ({
      name: r.teacher?.user?.name || 'Teacher',
      colorHex: normalizeHex(r.colorHex),
    }))

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        expect(colorsTooClose(list[i].colorHex!, list[j].colorHex!)).toBe(false)
      }
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Teacher colours</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{display:flex;gap:12px;align-items:center;background:#1e293b;border-radius:10px;padding:10px}
.swatch{width:40px;height:40px;border-radius:8px;border:1px solid #334155;flex-shrink:0}
.meta{font-size:13px}.hex{opacity:.7;font-family:ui-monospace,monospace;font-size:11px}
h1{font-size:18px;margin:0 0 8px}p{opacity:.75;margin:0 0 16px;font-size:13px}
</style></head><body>
<h1>Teacher colour uniqueness — live school</h1>
<p>${list.length} teachers · force reassigned ${result.assigned} · school ${SCHOOL}</p>
<div class="grid">
${list
  .map(
    (t) =>
      `<div class="card"><div class="swatch" style="background:${t.colorHex}"></div><div><div class="meta">${escapeHtml(t.name)}</div><div class="hex">${t.colorHex}</div></div></div>`
  )
  .join('\n')}
</div></body></html>`

    const outPath = join(process.cwd(), 'tmp-teacher-colors-report.html')
    writeFileSync(outPath, html, 'utf8')

    console.log(
      JSON.stringify(
        {
          teacherCount: list.length,
          assigned: result.assigned,
          report: outPath,
          sample: list.slice(0, 12),
        },
        null,
        2
      )
    )

    expect(list.length).toBeGreaterThan(0)
  }, 120_000)
})

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
