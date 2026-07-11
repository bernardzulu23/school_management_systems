#!/usr/bin/env node
/**
 * Syllabus Ingestion Script
 * Converts PDF syllabi → JSON curriculum files (CBC-aligned).
 *
 * Usage:
 *   npm run ingest:syllabi -- ./Syllabus
 *
 * Output:
 *   data/curriculum/form1-4/{subject}-form1-4.json
 *
 * Uses lib/curriculum parsers (not a standalone pdf-parse script).
 * Preserves curated JSON (metadata.curated) and richer existing files.
 */

import fs from 'fs'
import path from 'path'
import {
  exportCurriculaAsJSON,
  parsedToCurriculumJSON,
  slugifySubject,
} from '@/lib/curriculum/syllabusParser'
import { isValidCurriculumSubject, parseSyllabusFromBuffer } from '@/lib/curriculum/syllabusParsing'
import type { CurriculumJSON } from '@/lib/curriculum/jsonCurriculumLoader'

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function main() {
  const inputDir = process.argv[2] || './Syllabus'
  const outputDir = process.argv[3] || './data/curriculum/form1-4'
  const absIn = path.resolve(inputDir)
  const absOut = path.resolve(outputDir)

  if (!fs.existsSync(absIn)) {
    console.error(`❌ Directory not found: ${absIn}`)
    console.error('   Example: npm run ingest:syllabi -- ./Syllabus')
    process.exit(1)
  }

  fs.mkdirSync(absOut, { recursive: true })

  const files = fs
    .readdirSync(absIn)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort()

  if (files.length === 0) {
    console.error(`❌ No PDF files found in ${absIn}`)
    process.exit(1)
  }

  console.log(`📂 Found ${files.length} PDF files`)
  console.log('🔄 Ingesting syllabi...\n')

  const bySubject = new Map<string, CurriculumJSON>()
  let successCount = 0
  let failureCount = 0

  for (const file of files) {
    const filePath = path.join(absIn, file)
    process.stdout.write(`⏳ ${file}... `)
    try {
      const buffer = fs.readFileSync(filePath)
      const parsed = await parseSyllabusFromBuffer(buffer, { filenameHint: file })
      if (!isValidCurriculumSubject(parsed.subject)) {
        console.log(`⚠️  Skipped (unknown subject: "${parsed.subject}")`)
        failureCount++
        continue
      }
      if (!parsed.units?.length) {
        console.log(`⚠️  Skipped (no units)`)
        failureCount++
        continue
      }

      const curriculum = parsedToCurriculumJSON(parsed, {
        source: file,
        fileSize: buffer.length,
      })
      const slug = slugifySubject(curriculum.subject)
      const prev = bySubject.get(slug)
      if (prev && (prev.units?.length || 0) >= (curriculum.units?.length || 0)) {
        console.log(`⚠️  Skipped (weaker than existing ${slug} parse)`)
        failureCount++
        continue
      }
      bySubject.set(slug, curriculum)
      console.log(`✅ ${curriculum.subject} (${curriculum.units.length} units)`)
      successCount++
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : err}`)
      failureCount++
    }
  }

  const written = await exportCurriculaAsJSON(bySubject, absOut, { overwrite: false })
  const curatedSkipped = bySubject.size - written.length

  console.log(`\n✨ Ingestion Complete!`)
  console.log(`✅ Success: ${successCount}`)
  console.log(`⚠️  Skipped/failed: ${failureCount}`)
  console.log(`💾 Wrote: ${written.length} (curated/richer preserved: ${curatedSkipped})`)
  console.log(`📂 Output: ${absOut}`)
  console.log('\n📋 Files in output folder:')

  for (const f of fs
    .readdirSync(absOut)
    .filter((n) => n.endsWith('.json'))
    .sort()) {
    const full = path.join(absOut, f)
    console.log(`   - ${f} (${formatKb(fs.statSync(full).size)})`)
  }

  console.log(
    `\n🎓 Ready — ${fs.readdirSync(absOut).filter((n) => n.endsWith('.json')).length} subject JSON file(s).`
  )
  console.log('\n💡 Next steps:')
  console.log('   1. Restart: npm run dev')
  console.log('   2. Visit: /dashboard/teacher/schemes')
  console.log('   3. Select subject → Generate scheme\n')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
