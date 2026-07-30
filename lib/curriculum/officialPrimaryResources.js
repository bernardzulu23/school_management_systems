import fs from 'fs'
import path from 'path'

/**
 * Official CDC / MoE primary + ECE resources for Teaching Studio.
 * Sourced from ingested JSON (not tenant Study Materials uploads).
 */

function titleFromSlug(slug) {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json') && !f.includes('validation'))
    .sort()
}

function readMeta(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return {
      subject: raw.subject || raw.meta?.subject || null,
      level: raw.level || raw.meta?.level || null,
      gradesCovered: raw.gradesCovered || raw.meta?.gradesCovered || null,
      source: raw.metadata?.source || raw.meta?.source || raw.source || raw.sourceFile || null,
      unitCount: Array.isArray(raw.units) ? raw.units.length : null,
      lessonCount: Array.isArray(raw.lessons) ? raw.lessons.length : null,
      recordCount: Number.isFinite(Number(raw.recordCount))
        ? Number(raw.recordCount)
        : Array.isArray(raw.records)
          ? raw.records.length
          : Array.isArray(raw.curriculum)
            ? raw.curriculum.length
            : null,
      educationLevel: raw.metadata?.educationLevel || raw.meta?.level || raw.level || null,
      sourceFile: raw.sourceFile || null,
    }
  } catch {
    return {}
  }
}

export function listOfficialPrimarySyllabi() {
  const dir = path.join(process.cwd(), 'data', 'curriculum', 'primary')
  const out = []
  for (const entry of listJsonFiles(dir)) {
    if (entry.includes('-cdc-2024')) continue // prefer unit corpus for browsing
    const full = path.join(dir, entry)
    const validationFile = entry
      .replace(/-grade\d+-\d+\.json$/i, '-validation.json')
      .replace(/-primary\.json$/i, '-validation.json')
    const validationPath = path.join(dir, validationFile)
    // Validation reports are tiny and contain the same subject/count metadata.
    // Avoid parsing multi-megabyte curriculum payloads just to render this list.
    const meta = readMeta(fs.existsSync(validationPath) ? validationPath : full)
    const gradeMatch = entry.match(/grade(\d+)-(\d+)/i)
    const grades =
      meta.gradesCovered || (gradeMatch ? [Number(gradeMatch[1]), Number(gradeMatch[2])] : null)
    const subject =
      meta.subject ||
      titleFromSlug(
        entry
          .replace(/\.json$/i, '')
          .replace(/-grade\d+-\d+$/i, '')
          .replace(/-cdc-2024$/i, '')
      )
    out.push({
      id: `syllabus:${entry}`,
      kind: 'syllabus',
      section: 'syllabi',
      title: subject,
      subject,
      grades,
      gradeLabel: grades?.length
        ? grades[0] === grades[grades.length - 1]
          ? `Grade ${grades[0]}`
          : `Grades ${Math.min(...grades)}–${Math.max(...grades)}`
        : 'Primary',
      source: meta.source || 'CDC primary syllabus',
      unitCount: meta.unitCount,
      recordCount: meta.recordCount,
      path: path.relative(process.cwd(), full).replace(/\\/g, '/'),
    })
  }
  return out
}

export function listOfficialEceResources() {
  const root = path.join(process.cwd(), 'data', 'curriculum')
  const dirs = [path.join(root, 'ece'), path.join(root, 'primary', 'ece')]
  const out = []
  const seen = new Set()

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir).sort()) {
      if (!entry.toLowerCase().endsWith('.json')) continue
      if (
        entry.includes('-cdc-2024') &&
        fs
          .readdirSync(dir)
          .some(
            (candidate) =>
              candidate !== entry &&
              candidate.toLowerCase().endsWith('.json') &&
              !candidate.includes('validation') &&
              !candidate.includes('-cdc-2024') &&
              candidate.startsWith(entry.replace(/-cdc-2024\.json$/i, ''))
          )
      ) {
        continue
      }
      const full = path.join(dir, entry)
      const isValidation = entry.includes('validation')
      const meta = readMeta(full)
      let validation = null
      if (isValidation) {
        try {
          validation = JSON.parse(fs.readFileSync(full, 'utf8'))
        } catch {
          validation = null
        }
      }
      const subject =
        meta.subject ||
        validation?.subject ||
        titleFromSlug(
          entry
            .replace(/\.json$/i, '')
            .replace(/-validation$/i, '')
            .replace(/-cdc-2024$/i, '')
        )
      if (!validation) {
        const validationEntry = fs.readdirSync(dir).find((candidate) => {
          if (!candidate.includes('validation') || !candidate.endsWith('.json')) return false
          try {
            const report = JSON.parse(fs.readFileSync(path.join(dir, candidate), 'utf8'))
            return (
              String(report?.subject || '')
                .trim()
                .toLowerCase() === String(subject).trim().toLowerCase()
            )
          } catch {
            return false
          }
        })
        if (validationEntry) {
          try {
            validation = JSON.parse(fs.readFileSync(path.join(dir, validationEntry), 'utf8'))
          } catch {
            validation = null
          }
        }
      }
      const key = String(subject).toLowerCase()
      if (seen.has(key) && isValidation) continue
      if (!isValidation) seen.add(key)

      out.push({
        id: `ece:${entry}`,
        kind: isValidation ? 'ece-validation' : 'ece',
        section: 'ece',
        title: subject,
        subject,
        grades: ['ECE', 'Reception'],
        gradeLabel: validation?.band || 'ECE / Reception',
        source: meta.source || validation?.sourceFile || 'Early Childhood Education syllabus',
        unitCount: meta.unitCount,
        recordCount: meta.recordCount ?? validation?.recordCount ?? null,
        extractionLimited: Boolean(isValidation && (!validation?.recordCount || !validation?.ok)),
        notes: isValidation
          ? 'Source PDF ingested; structured topic extraction was limited — see validation report.'
          : null,
        path: path.relative(process.cwd(), full).replace(/\\/g, '/'),
      })
      if (!isValidation) seen.add(key)
    }
  }

  // Surface ECE teaching modules if present
  const tmRoot = path.join(process.cwd(), 'data', 'teaching-modules')
  if (fs.existsSync(tmRoot)) {
    for (const subjectDir of fs.readdirSync(tmRoot)) {
      const abs = path.join(tmRoot, subjectDir)
      if (!fs.statSync(abs).isDirectory()) continue
      for (const entry of listJsonFiles(abs)) {
        if (!/ece|reception|early/i.test(entry) && !/ece|early/i.test(subjectDir)) {
          continue
        }
        const full = path.join(abs, entry)
        const meta = readMeta(full)
        out.push({
          id: `ece-module:${subjectDir}/${entry}`,
          kind: 'ece-module',
          section: 'ece',
          title: meta.subject || titleFromSlug(subjectDir),
          subject: meta.subject || titleFromSlug(subjectDir),
          grades: ['ECE'],
          gradeLabel: 'ECE',
          source: meta.sourceFile || meta.source || 'ECE teaching module',
          lessonCount: meta.lessonCount,
          path: path.relative(process.cwd(), full).replace(/\\/g, '/'),
        })
      }
    }
  }

  return out
}

export function listOfficialPrimaryTeachingModules() {
  const tmRoot = path.join(process.cwd(), 'data', 'teaching-modules')
  const out = []
  if (!fs.existsSync(tmRoot)) return out

  for (const subjectDir of fs.readdirSync(tmRoot)) {
    const abs = path.join(tmRoot, subjectDir)
    if (!fs.statSync(abs).isDirectory()) continue
    for (const entry of listJsonFiles(abs)) {
      const full = path.join(abs, entry)
      const meta = readMeta(full)
      const isPrimary =
        /grade\d+/i.test(entry) ||
        /grade-unknown/i.test(entry) ||
        /ece|reception/i.test(entry) ||
        /grade\d+/i.test(subjectDir) ||
        /primary/i.test(String(meta.educationLevel || ''))
      const isSecondaryForm = /form\d+/i.test(entry) && !/grade\d+/i.test(entry)
      if (!isPrimary && isSecondaryForm) continue
      if (!isPrimary && !isSecondaryForm) {
        // Include unknown-grade modules only when subject folder looks primary
        if (!/literacy|cts|icibemba|kikaonde|english|mathematics|oral/i.test(subjectDir)) {
          continue
        }
      }
      if (/ece|reception|early/i.test(entry)) continue // listed under ECE

      const gradeMatch = entry.match(/grade(\d+|unknown)/i)
      const termMatch = entry.match(/term(\d+|unknown)/i)
      const gradeLabel = gradeMatch
        ? gradeMatch[1] === 'unknown'
          ? 'Grade (unspecified)'
          : `Grade ${gradeMatch[1]}`
        : 'Primary'
      const termLabel = termMatch && termMatch[1] !== 'unknown' ? `Term ${termMatch[1]}` : null

      out.push({
        id: `module:${subjectDir}/${entry}`,
        kind: 'teaching-module',
        section: 'teachingModules',
        title: [meta.subject || titleFromSlug(subjectDir), gradeLabel, termLabel]
          .filter(Boolean)
          .join(' · '),
        subject: meta.subject || titleFromSlug(subjectDir),
        grades: gradeMatch && gradeMatch[1] !== 'unknown' ? [Number(gradeMatch[1])] : null,
        gradeLabel,
        term: termLabel,
        source: meta.sourceFile || 'Primary teaching module',
        lessonCount: meta.lessonCount,
        path: path.relative(process.cwd(), full).replace(/\\/g, '/'),
      })
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Secondary MoE teaching modules under data/teaching-modules (form*-term*.json).
 * Used for Official Resources browsing in secondary/combined schools.
 */
export function listOfficialSecondaryTeachingModules() {
  const tmRoot = path.join(process.cwd(), 'data', 'teaching-modules')
  const out = []
  if (!fs.existsSync(tmRoot)) return out

  for (const subjectDir of fs.readdirSync(tmRoot)) {
    const abs = path.join(tmRoot, subjectDir)
    if (!fs.statSync(abs).isDirectory()) continue
    for (const entry of listJsonFiles(abs)) {
      const full = path.join(abs, entry)
      const meta = readMeta(full)
      const isSecondaryForm =
        (/form\d+/i.test(entry) || /form-unknown/i.test(entry)) && !/grade\d+/i.test(entry)
      if (!isSecondaryForm) continue
      if (/grade\d+|ece|reception/i.test(entry)) continue
      // Keep primary Adapted CTS / local-language unknowns out of the secondary browser
      if (
        /form-unknown/i.test(entry) &&
        /literacy|oral-english|creative-and-technology|early-childhood|special-needs/i.test(
          subjectDir
        )
      ) {
        continue
      }

      const formMatch = entry.match(/form-?(\d+|unknown)/i)
      const termMatch = entry.match(/term-?(\d+|unknown)/i)
      const formLabel = formMatch
        ? formMatch[1] === 'unknown'
          ? 'Form (unspecified)'
          : `Form ${formMatch[1]}`
        : 'Secondary'
      const termLabel = termMatch && termMatch[1] !== 'unknown' ? `Term ${termMatch[1]}` : null

      out.push({
        id: `secondary-module:${subjectDir}/${entry}`,
        kind: 'teaching-module',
        section: 'teachingModules',
        title: [meta.subject || titleFromSlug(subjectDir), formLabel, termLabel]
          .filter(Boolean)
          .join(' · '),
        subject: meta.subject || titleFromSlug(subjectDir),
        grades: formMatch && formMatch[1] !== 'unknown' ? [`Form ${formMatch[1]}`] : null,
        gradeLabel: formLabel,
        term: termLabel,
        source: meta.sourceFile || 'Secondary teaching module',
        lessonCount: meta.lessonCount,
        path: path.relative(process.cwd(), full).replace(/\\/g, '/'),
      })
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title))
}

export function listOfficialSecondaryResources() {
  const teachingModules = listOfficialSecondaryTeachingModules()
  return {
    teachingModules,
    counts: {
      teachingModules: teachingModules.length,
      total: teachingModules.length,
    },
  }
}

/**
 * Bundle official resources for a primary (or combined primary-facing) school.
 * ECE is always included for every primary school per product policy.
 */
export function listOfficialPrimaryResources({ includeEce = true } = {}) {
  const syllabi = listOfficialPrimarySyllabi()
  const teachingModules = listOfficialPrimaryTeachingModules()
  const ece = includeEce ? listOfficialEceResources() : []
  return {
    syllabi,
    teachingModules,
    ece,
    counts: {
      syllabi: syllabi.length,
      teachingModules: teachingModules.length,
      ece: ece.length,
      total: syllabi.length + teachingModules.length + ece.length,
    },
  }
}
