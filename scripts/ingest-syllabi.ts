/**
 * Batch-ingest syllabus PDFs into data/curriculum/form1-4 JSON files.
 *
 * Usage:
 *   npm run ingest:syllabi -- ./Syllabus
 *
 * Place Ministry syllabus PDFs (text layer, not scanned images) in the folder.
 */

import path from 'path'
import { exportCurriculaAsJSON, processSyllabiFolder } from '@/lib/curriculum/syllabusParser'

async function main() {
  const folder = process.argv[2] || './Syllabus'
  const outDir = process.argv[3] || './data/curriculum/form1-4'

  console.log(`Parsing PDFs from ${path.resolve(folder)} ...`)
  const curricula = await processSyllabiFolder(folder)
  if (curricula.size === 0) {
    console.warn('No PDF syllabi found. Add files to the folder and retry.')
    process.exit(1)
  }

  const written = await exportCurriculaAsJSON(curricula, outDir, { overwrite: false })
  console.log(`✓ Wrote ${written.length} curriculum JSON file(s):`)
  for (const f of written) console.log(`  - ${f}`)
  if (written.length < curricula.size) {
    console.log(
      '(Skipped some files that already had curated/richer JSON — pass overwrite via code if needed)'
    )
  }
}
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
