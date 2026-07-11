#!/usr/bin/env node
/**
 * Teaching Module Ingestion Script
 * Converts MoE Teaching Module PDFs → JSON enrichment files (how to teach).
 *
 * Usage:
 *   npm run ingest:teaching-modules -- --all
 *   npm run ingest:teaching-modules -- "./Teaching Module" --all
 *   npm run ingest:teaching-modules -- "./Teaching Module" Chemistry Physics
 *
 * Output:
 *   data/teaching-modules/{subject}/form{N}-term{T}.json
 *
 * Do NOT use ingest:syllabi on Teaching Module folders.
 * Do NOT write teaching modules into data/curriculum/form1-4 (syllabus-only).
 */

import fs from 'fs'
import path from 'path'
import {
  exportTeachingModulesAsJSON,
  parseTeachingModuleFromBuffer,
  resolveTeachingModuleSubject,
  teachingModuleOutputPath,
  type TeachingModuleJSON,
} from '@/lib/curriculum/teachingModuleParser'

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function main() {
  const args = process.argv.slice(2)
  const wantAll = args.includes('--all')
  const overwrite = args.includes('--overwrite')
  const folder =
    args.find(
      (a) =>
        !a.startsWith('-') &&
        (a.includes('Teaching') || a.includes('/') || a.includes('\\') || a === '.')
    ) || './Teaching Module'
  const subjects = args.filter(
    (a) =>
      a !== folder &&
      !a.startsWith('-') &&
      !/[\\/]/.test(a) &&
      !a.endsWith('.pdf') &&
      a.toLowerCase() !== 'all'
  )

  const absIn = path.resolve(folder)
  if (!fs.existsSync(absIn)) {
    console.error(`❌ Directory not found: ${absIn}`)
    console.error('   Example: npm run ingest:teaching-modules -- "./Teaching Module" --all')
    process.exit(1)
  }

  const allow = wantAll || subjects.length === 0 ? null : subjects.map((s) => s.toLowerCase())

  let files = fs
    .readdirSync(absIn)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort()

  if (allow) {
    files = files.filter((f) => {
      const subj = resolveTeachingModuleSubject(f)
      return subj && allow.includes(subj.toLowerCase())
    })
  }

  if (files.length === 0) {
    console.error(`❌ No matching PDF files in ${absIn}`)
    process.exit(1)
  }

  console.log(`📂 Found ${files.length} teaching module PDF(s)`)
  console.log(
    allow
      ? `🔎 Subject filter: ${subjects.join(', ')}`
      : '🔎 Subject filter: ALL known CBC subjects'
  )
  console.log('🔄 Ingesting teaching modules...\n')

  const modules: TeachingModuleJSON[] = []
  let successCount = 0
  let failureCount = 0

  for (const file of files) {
    const short = file.length > 52 ? `${file.slice(0, 49)}...` : file
    process.stdout.write(`⏳ ${short} `)
    try {
      const full = path.join(absIn, file)
      const buffer = fs.readFileSync(full)
      const parsed = await parseTeachingModuleFromBuffer(buffer, file)
      if (!parsed) {
        console.log(`⚠️  Skipped (unknown subject)`)
        failureCount++
        continue
      }
      if (!parsed.lessons.length) {
        console.log(`⚠️  Skipped (no lessons)`)
        failureCount++
        continue
      }
      modules.push(parsed)
      const outRel = teachingModuleOutputPath(parsed)
      console.log(`✅ → ${parsed.lessons.length} lessons (${path.basename(outRel)})`)
      successCount++
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : err}`)
      failureCount++
    }
  }

  if (!modules.length) {
    console.error('\n❌ No teaching modules parsed successfully.')
    process.exit(1)
  }

  const written = await exportTeachingModulesAsJSON(modules, './data/teaching-modules', {
    overwrite,
  })

  console.log(`\n✨ Teaching Module Ingestion Complete!`)
  console.log(`✅ Success: ${successCount}`)
  console.log(`⚠️  Skipped/failed: ${failureCount}`)
  console.log(`💾 Wrote: ${written.length}`)
  console.log(`📂 Output: ${path.resolve('data/teaching-modules')}`)
  console.log('\n📋 Generated / updated files:')

  for (const f of written) {
    try {
      console.log(`   - ${path.relative(process.cwd(), f)} (${formatKb(fs.statSync(f).size)})`)
    } catch {
      console.log(`   - ${f}`)
    }
  }

  console.log(`\n🎓 Teaching modules ready for scheme/lesson enrichment.`)
  console.log('\n💡 Next steps:')
  console.log('   1. Restart: npm run dev')
  console.log('   2. Generate a scheme — activities merge from matching modules')
  console.log('   3. Curriculum Studio lesson plans include module context\n')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
