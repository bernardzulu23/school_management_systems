/**
 * Batch-ingest MoE Teaching Module PDFs into data/teaching-modules/{subject}/formN-termT.json
 *
 * Usage:
 *   npm run ingest:teaching-modules
 *   npm run ingest:teaching-modules -- "./Teaching Module" Chemistry Physics Mathematics
 *
 * Do NOT use npm run ingest:syllabi on Teaching Module folders.
 */

import path from 'path'
import {
  exportTeachingModulesAsJSON,
  processTeachingModulesFolder,
} from '@/lib/curriculum/teachingModuleParser'

async function main() {
  const args = process.argv.slice(2)
  const folder =
    args.find((a) => a.includes('Teaching') || a.includes('/') || a.includes('\\')) ||
    './Teaching Module'
  const subjects = args.filter(
    (a) => a !== folder && !a.startsWith('-') && !/[\\/]/.test(a) && !a.endsWith('.pdf')
  )

  // Default pilot: English-medium core subjects
  const pilotSubjects = subjects.length > 0 ? subjects : ['Chemistry', 'Physics', 'Mathematics']

  console.log(`Parsing teaching modules from ${path.resolve(folder)} ...`)
  console.log(`Subject filter: ${pilotSubjects.join(', ')}`)

  const modules = await processTeachingModulesFolder(folder, {
    subjects: pilotSubjects,
  })

  if (!modules.length) {
    console.warn('No teaching modules parsed. Check PDFs and subject filter.')
    process.exit(1)
  }

  const written = await exportTeachingModulesAsJSON(modules, './data/teaching-modules', {
    overwrite: args.includes('--overwrite'),
  })
  console.log(`✓ Wrote ${written.length} teaching-module JSON file(s):`)
  for (const f of written) console.log(`  - ${f}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
