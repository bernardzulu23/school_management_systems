/**
 * Cross-walk every shipped EoC JSON against form1-4 (+ ingest when structured).
 *
 * Usage:
 *   npx ts-node --transpile-only -r tsconfig-paths/register \
 *     --compiler-options "{\"module\":\"CommonJS\",\"moduleResolution\":\"node\"}" \
 *     scripts/crosswalk-eoc-aliases.ts [--dry-run]
 */
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { crosswalkSpec, type CrosswalkChange } from '@/lib/ecz/eoc/crosswalkTopicAliases'
import { loadSyllabusTopics } from '@/lib/ecz/eoc/syllabusTopicIndex'
import { ECZ_SUBJECT_REGISTRY } from '@/lib/ecz/eoc/subjectRegistry'
import { getEocSpecDataDir, __clearEocSpecCache } from '@/lib/ecz/eoc/load-eoc-spec'

const dryRun = process.argv.includes('--dry-run')

type SummaryRow = {
  subject: string
  file: string
  corpus: number
  promote: number
  addVerified: number
  addUnverified: number
  totalChanges: number
}

function countBy(changes: CrosswalkChange[], action: CrosswalkChange['action']) {
  return changes.filter((c) => c.action === action).length
}

function main() {
  __clearEocSpecCache()
  const dir = getEocSpecDataDir()
  const report: SummaryRow[] = []
  const allChanges: CrosswalkChange[] = []

  for (const entry of ECZ_SUBJECT_REGISTRY) {
    if (!entry.eocSpecFile) continue
    const filePath = path.join(dir, `${entry.eocSpecFile}.json`)
    if (!fs.existsSync(filePath)) {
      console.warn('missing file', filePath)
      continue
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const parsed = EczSubjectSpec.safeParse(raw)
    if (!parsed.success) {
      console.warn('invalid spec', entry.eocSpecFile, parsed.error.message)
      continue
    }

    const index = loadSyllabusTopics(entry.subjectName)
    const corpus = index?.topics ?? []
    const { spec, changes } = crosswalkSpec(parsed.data, corpus)
    const recheck = EczSubjectSpec.safeParse(spec)
    if (!recheck.success) {
      console.warn('crosswalk broke schema', entry.eocSpecFile, recheck.error.message)
      continue
    }

    report.push({
      subject: entry.subjectName,
      file: entry.eocSpecFile,
      corpus: corpus.length,
      promote: countBy(changes, 'promote'),
      addVerified: countBy(changes, 'add-verified'),
      addUnverified: countBy(changes, 'add-unverified'),
      totalChanges: changes.length,
    })
    allChanges.push(...changes)

    if (!dryRun && changes.length > 0) {
      fs.writeFileSync(filePath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8')
    }
  }

  const reportPath = path.join(
    process.cwd(),
    'Validation_folder',
    dryRun ? '_alias_crosswalk_dryrun.json' : '_alias_crosswalk_applied.json'
  )
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { dryRun, generatedAt: new Date().toISOString(), report, changes: allChanges },
      null,
      2
    ),
    'utf8'
  )

  console.log(
    `${'subject'.padEnd(42)} ${'cor'.padStart(4)} ${'prm'.padStart(4)} ${'av'.padStart(4)} ${'au'.padStart(4)} ${'tot'.padStart(4)}`
  )
  for (const r of report) {
    console.log(
      `${r.subject.slice(0, 42).padEnd(42)} ${String(r.corpus).padStart(4)} ${String(r.promote).padStart(4)} ${String(r.addVerified).padStart(4)} ${String(r.addUnverified).padStart(4)} ${String(r.totalChanges).padStart(4)}`
    )
  }
  const totals = report.reduce(
    (acc, r) => {
      acc.promote += r.promote
      acc.addVerified += r.addVerified
      acc.addUnverified += r.addUnverified
      acc.totalChanges += r.totalChanges
      return acc
    },
    { promote: 0, addVerified: 0, addUnverified: 0, totalChanges: 0 }
  )
  console.log(
    `\n${dryRun ? 'DRY RUN' : 'APPLIED'} — promote=${totals.promote} add-verified=${totals.addVerified} add-unverified=${totals.addUnverified} total=${totals.totalChanges}`
  )
  console.log('report:', reportPath)
}

main()
