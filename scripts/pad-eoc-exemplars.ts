/**
 * Ensure every EoC has at least one exemplar (Validation_folder criterion-referenced scaffolding).
 * Does not invent new mark schemes — clones bloom/marks pattern from an existing exemplar
 * in the same spec, or a conservative 2-part 15-mark scenario template.
 */
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { getEocSpecDataDir } from '@/lib/ecz/eoc/load-eoc-spec'

const dir = getEocSpecDataDir()
let touched = 0

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const filePath = path.join(dir, file)
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const parsed = EczSubjectSpec.safeParse(raw)
  if (!parsed.success) continue
  const spec = parsed.data
  const byEoc = new Set(spec.exemplars.map((e) => e.eocId))
  const template =
    spec.exemplars[0] ||
    ({
      eocId: 'EoC1',
      scenarioTheme: 'Real-life Zambian secondary school / community scenario',
      parts: [
        { label: '(a)', marks: 7, bloomLevel: 'understanding' as const },
        { label: '(b)', marks: 8, bloomLevel: 'applying' as const },
      ],
      keyCompetences: ['analytical_thinking', 'problem_solving'],
    } as const)

  let changed = false
  for (const eoc of spec.elementsOfConstruct) {
    if (byEoc.has(eoc.id)) continue
    spec.exemplars.push({
      eocId: eoc.id,
      scenarioTheme: `${template.scenarioTheme} — ${eoc.description.slice(0, 80)}`,
      parts: template.parts.map((p) => ({ ...p })),
      keyCompetences: [...(template.keyCompetences || ['analytical_thinking'])],
    })
    byEoc.add(eoc.id)
    changed = true
  }

  if (changed) {
    const re = EczSubjectSpec.safeParse(spec)
    if (!re.success) {
      console.warn('skip invalid after pad', file, re.error.message)
      continue
    }
    fs.writeFileSync(filePath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8')
    touched += 1
    console.log('padded exemplars', file, '→', spec.exemplars.length)
  }
}

console.log('files updated', touched)
