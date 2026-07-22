/**
 * Full Validation_folder checklist audit for every ECZ registry subject / syllabus.
 *
 * Usage:
 *   npm run validate:curriculum
 *   (or) npx ts-node … scripts/validate-curriculum-subjects.ts
 *
 * Writes: Validation_folder/FULL_SYLLABUS_VALIDATION_REPORT.json
 */
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { ECZ_SUBJECT_REGISTRY } from '@/lib/ecz/eoc/subjectRegistry'
import { getEocSpecDataDir, __clearEocSpecCache } from '@/lib/ecz/eoc/load-eoc-spec'
import {
  listCurriculumTopics,
  assertCurriculumTopicAllowed,
  __clearCurriculumContextCache,
} from '@/lib/ai/curriculum-context'
import { normalizeTopicKey } from '@/lib/ecz/eoc/crosswalkTopicAliases'

type CheckStatus = 'pass' | 'warn' | 'fail' | 'na'
type Check = { id: string; label: string; status: CheckStatus; detail: string }

type SubjectReport = {
  subjectName: string
  codes: string[]
  overall: 'PASS' | 'WARN' | 'FAIL'
  score: number
  maxScore: number
  checks: Check[]
  stats: {
    eocCount: number
    verifiedAliases: number
    unverifiedAliases: number
    curriculumTopics: number
    verifiedInCorpus: number
    components: number
    exemplars: number
  }
}

const ROOT = process.cwd()
const SYLLABUS_DIR = path.join(ROOT, 'Syllabus')
const INGEST_DIR = path.join(ROOT, 'ingest', 'extracted', 'syllabus')
const FORM14_DIR = path.join(ROOT, 'data', 'curriculum', 'form1-4')
const EOC_DIR = getEocSpecDataDir()
const CHAPTERS_DIR = path.join(ROOT, 'Validation_folder', 'extracted_chapters')
const OUT_PATH = path.join(ROOT, 'Validation_folder', 'FULL_SYLLABUS_VALIDATION_REPORT.json')

function exists(p: string) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

function scoreOf(status: CheckStatus): number {
  if (status === 'pass') return 1
  if (status === 'warn') return 0.5
  if (status === 'na') return 1 // not applicable doesn't penalize
  return 0
}

function overallFrom(checks: Check[]): 'PASS' | 'WARN' | 'FAIL' {
  if (checks.some((c) => c.status === 'fail')) return 'FAIL'
  if (checks.some((c) => c.status === 'warn')) return 'WARN'
  return 'PASS'
}

async function auditSubject(entry: (typeof ECZ_SUBJECT_REGISTRY)[number]): Promise<SubjectReport> {
  const checks: Check[] = []
  const stats = {
    eocCount: 0,
    verifiedAliases: 0,
    unverifiedAliases: 0,
    curriculumTopics: 0,
    verifiedInCorpus: 0,
    components: 0,
    exemplars: 0,
  }

  // 1. EoC spec present + schema
  const eocFile = entry.eocSpecFile
  const eocPath = eocFile ? path.join(EOC_DIR, `${eocFile}.json`) : null
  let spec: ReturnType<typeof EczSubjectSpec.parse> | null = null
  if (!eocFile || !eocPath || !exists(eocPath)) {
    checks.push({
      id: 'eoc-file',
      label: 'EoC Assessment Scheme JSON present',
      status: 'fail',
      detail: eocFile ? `Missing file ${eocFile}.json` : 'eocSpecFile is null',
    })
  } else {
    const raw = JSON.parse(fs.readFileSync(eocPath, 'utf8'))
    const parsed = EczSubjectSpec.safeParse(raw)
    if (!parsed.success) {
      checks.push({
        id: 'eoc-schema',
        label: 'EoC JSON validates against EczSubjectSpec',
        status: 'fail',
        detail: parsed.error.message.slice(0, 200),
      })
    } else {
      spec = parsed.data
      stats.eocCount = spec.elementsOfConstruct.length
      stats.components = spec.testDesign.components.length
      stats.exemplars = spec.exemplars.length
      checks.push({
        id: 'eoc-file',
        label: 'EoC Assessment Scheme JSON present',
        status: 'pass',
        detail: `${eocFile}.json`,
      })
      checks.push({
        id: 'eoc-schema',
        label: 'EoC JSON validates against EczSubjectSpec',
        status: 'pass',
        detail: `${stats.eocCount} EoCs, ${stats.components} components, ${stats.exemplars} exemplars`,
      })
    }
  }

  // 2. Chapter extract from Validation_folder Assessment Schemes
  const chapterCandidates = [
    eocFile ? path.join(CHAPTERS_DIR, `${eocFile}.txt`) : '',
    ...(entry.subjectCodes || []).map((c) =>
      path.join(CHAPTERS_DIR, `${String(eocFile || '').replace(/-\d+$/, '')}-${c}.txt`)
    ),
  ].filter(Boolean)
  const chapterHit = chapterCandidates.find((p) => exists(p))
  // Also scan chapters dir for code in filename
  let chapterFound = Boolean(chapterHit)
  if (!chapterFound && exists(CHAPTERS_DIR)) {
    const files = fs.readdirSync(CHAPTERS_DIR)
    chapterFound = files.some((f) =>
      entry.subjectCodes.some((c) => f.includes(`-${c}.txt`) || f.includes(`${c}.txt`))
    )
  }
  checks.push({
    id: 'eoc-chapter',
    label: 'Assessment Scheme chapter extract present',
    status: chapterFound ? 'pass' : 'warn',
    detail: chapterFound
      ? 'Found under Validation_folder/extracted_chapters'
      : 'No chapter extract matched — re-run chapter extractor if needed',
  })

  // 3. Syllabus PDF in Syllabus/
  const pdfName = entry.syllabusIngestFile
    ? entry.syllabusIngestFile.replace(/\.json$/i, '.pdf')
    : null
  const pdfPath = pdfName ? path.join(SYLLABUS_DIR, pdfName) : null
  if (!pdfName) {
    checks.push({
      id: 'syllabus-pdf',
      label: 'CDC syllabus PDF in Syllabus/',
      status: 'fail',
      detail: 'No syllabusIngestFile mapped (e.g. Chinese)',
    })
  } else {
    checks.push({
      id: 'syllabus-pdf',
      label: 'CDC syllabus PDF in Syllabus/',
      status: pdfPath && exists(pdfPath) ? 'pass' : 'fail',
      detail: pdfPath && exists(pdfPath) ? pdfName : `Missing ${pdfName}`,
    })
  }

  // 4. Ingest OCR JSON
  const ingestPath = entry.syllabusIngestFile
    ? path.join(INGEST_DIR, entry.syllabusIngestFile)
    : null
  if (!ingestPath) {
    checks.push({
      id: 'ingest-json',
      label: 'Ingest extracted syllabus JSON',
      status: 'fail',
      detail: 'No syllabusIngestFile',
    })
  } else {
    checks.push({
      id: 'ingest-json',
      label: 'Ingest extracted syllabus JSON',
      status: exists(ingestPath) ? 'pass' : 'fail',
      detail: exists(ingestPath)
        ? entry.syllabusIngestFile!
        : `Missing ${entry.syllabusIngestFile}`,
    })
  }

  // 5. form1-4 structured JSON
  const form14Path = entry.form14Slug
    ? path.join(FORM14_DIR, `${entry.form14Slug}-form1-4.json`)
    : null
  if (!form14Path) {
    checks.push({
      id: 'form14',
      label: 'Structured form1-4 curriculum JSON',
      status: 'fail',
      detail: 'form14Slug is null',
    })
  } else {
    checks.push({
      id: 'form14',
      label: 'Structured form1-4 curriculum JSON',
      status: exists(form14Path) ? 'pass' : 'fail',
      detail: exists(form14Path)
        ? `${entry.form14Slug}-form1-4.json`
        : `Missing ${entry.form14Slug}-form1-4.json`,
    })
  }

  // 6. Usable curriculum topics for dropdown (Validation rule #1)
  const gradeProbe = 'Form 2'
  let topics: string[] = []
  try {
    topics = await listCurriculumTopics(entry.subjectName, gradeProbe)
    // Also try Form 1 / Form 4 if empty
    if (!topics.length) topics = await listCurriculumTopics(entry.subjectName, 'Form 1')
    if (!topics.length) topics = await listCurriculumTopics(entry.subjectName, 'Form 4')
  } catch (e) {
    topics = []
  }
  stats.curriculumTopics = topics.length

  if (topics.length >= 15) {
    checks.push({
      id: 'topic-dropdown',
      label: 'Syllabus topic dropdown has usable topics',
      status: 'pass',
      detail: `${topics.length} topics resolvable for Form 1–4 probe`,
    })
  } else if (topics.length >= 5) {
    checks.push({
      id: 'topic-dropdown',
      label: 'Syllabus topic dropdown has usable topics',
      status: 'warn',
      detail: `Only ${topics.length} topics — dropdown works but coverage is thin`,
    })
  } else if (topics.length > 0) {
    checks.push({
      id: 'topic-dropdown',
      label: 'Syllabus topic dropdown has usable topics',
      status: 'warn',
      detail: `Only ${topics.length} topics — insufficient for reliable formulation`,
    })
  } else {
    checks.push({
      id: 'topic-dropdown',
      label: 'Syllabus topic dropdown has usable topics',
      status: 'fail',
      detail: 'Zero usable topics — free-form would be blocked; formulation broken',
    })
  }

  // 7. assertCurriculumTopicAllowed round-trip
  if (topics.length) {
    try {
      const sample = topics[0]
      const allowed = await assertCurriculumTopicAllowed(entry.subjectName, gradeProbe, sample, {
        required: true,
      })
      checks.push({
        id: 'topic-assert',
        label: 'assertCurriculumTopicAllowed accepts syllabus topic',
        status: allowed ? 'pass' : 'fail',
        detail: `Sample: "${sample}"`,
      })
      try {
        await assertCurriculumTopicAllowed(
          entry.subjectName,
          gradeProbe,
          'Totally Fake Topic XYZ 999',
          { required: true }
        )
        checks.push({
          id: 'topic-reject',
          label: 'assertCurriculumTopicAllowed rejects invented topics',
          status: 'fail',
          detail: 'Invented topic was accepted',
        })
      } catch {
        checks.push({
          id: 'topic-reject',
          label: 'assertCurriculumTopicAllowed rejects invented topics',
          status: 'pass',
          detail: 'Invented topic correctly rejected',
        })
      }
    } catch (e) {
      checks.push({
        id: 'topic-assert',
        label: 'assertCurriculumTopicAllowed accepts syllabus topic',
        status: 'fail',
        detail: e instanceof Error ? e.message : 'assert failed',
      })
    }
  } else {
    checks.push({
      id: 'topic-assert',
      label: 'assertCurriculumTopicAllowed accepts syllabus topic',
      status: 'na',
      detail: 'Skipped — no topics',
    })
    checks.push({
      id: 'topic-reject',
      label: 'assertCurriculumTopicAllowed rejects invented topics',
      status: 'na',
      detail: 'Skipped — no topics',
    })
  }

  // 8–10. EoC construct quality (Validation rules 2–6 scaffolding)
  if (spec) {
    const corpusNorm = new Set(topics.map((t) => normalizeTopicKey(t)))
    let verified = 0
    let unverified = 0
    let verifiedInCorpus = 0
    let hasConstruct = Boolean(String(spec.construct || '').trim().length > 20)
    let hasSba = spec.testDesign.components.some((c) => c.type === 'SBA')
    let hasFe = spec.testDesign.components.some((c) => c.type === 'FINAL_EXAM')
    let scenarioRequired = Boolean(spec.testDesign.scenarioRequired)
    let bloomOk = spec.testDesign.components.every(
      (c) => Array.isArray(c.bloomRange) && c.bloomRange.length > 0
    )
    let scoringOk =
      Array.isArray(spec.scoringCriteria?.rules) && spec.scoringCriteria.rules.length > 0
    let exemplarsOk = spec.exemplars.length >= Math.min(2, spec.elementsOfConstruct.length)

    for (const eoc of spec.elementsOfConstruct) {
      for (const sk of eoc.subSkills) {
        for (const a of sk.topicAliases || []) {
          verified += 1
          if (corpusNorm.has(normalizeTopicKey(a))) verifiedInCorpus += 1
        }
        unverified += (sk.unverifiedTopicAliases || []).length
      }
    }
    stats.verifiedAliases = verified
    stats.unverifiedAliases = unverified
    stats.verifiedInCorpus = verifiedInCorpus

    checks.push({
      id: 'construct',
      label: 'Subject construct statement present',
      status: hasConstruct ? 'pass' : 'fail',
      detail: hasConstruct ? 'Construct defined' : 'Missing/short construct',
    })
    checks.push({
      id: 'components',
      label: 'SBA + Final Exam components defined',
      status: hasSba && hasFe ? 'pass' : hasFe || hasSba ? 'warn' : 'fail',
      detail: `SBA=${hasSba} FE=${hasFe}`,
    })
    checks.push({
      id: 'scenario',
      label: 'Scenario-based items required (authenticity)',
      status: scenarioRequired ? 'pass' : 'warn',
      detail: scenarioRequired
        ? 'testDesign.scenarioRequired=true'
        : 'scenarioRequired false — check Assessment Scheme',
    })
    checks.push({
      id: 'bloom',
      label: 'Bloom ranges on components (criterion-referenced)',
      status: bloomOk ? 'pass' : 'fail',
      detail: bloomOk ? 'All components have bloomRange' : 'Missing bloomRange',
    })
    checks.push({
      id: 'scoring',
      label: 'Scoring criteria rules present',
      status: scoringOk ? 'pass' : 'warn',
      detail: scoringOk
        ? `${spec.scoringCriteria.rules.length} rules`
        : 'No scoring rules extracted',
    })
    checks.push({
      id: 'exemplars',
      label: 'EoC exemplars present',
      status: exemplarsOk ? 'pass' : 'warn',
      detail: `${spec.exemplars.length} exemplars for ${spec.elementsOfConstruct.length} EoCs`,
    })

    const aliasRatio = verified ? verifiedInCorpus / verified : 0
    if (verified === 0) {
      checks.push({
        id: 'alias-corpus',
        label: 'Verified topic aliases grounded in syllabus corpus',
        status: 'fail',
        detail: 'No verified topicAliases',
      })
    } else if (aliasRatio >= 0.4 || verifiedInCorpus >= 8) {
      checks.push({
        id: 'alias-corpus',
        label: 'Verified topic aliases grounded in syllabus corpus',
        status: 'pass',
        detail: `${verifiedInCorpus}/${verified} verified aliases match form1-4/corpus (${Math.round(aliasRatio * 100)}%)`,
      })
    } else if (aliasRatio >= 0.15 || verifiedInCorpus >= 3) {
      checks.push({
        id: 'alias-corpus',
        label: 'Verified topic aliases grounded in syllabus corpus',
        status: 'warn',
        detail: `${verifiedInCorpus}/${verified} verified aliases match corpus (${Math.round(aliasRatio * 100)}%) — cross-walk incomplete`,
      })
    } else {
      checks.push({
        id: 'alias-corpus',
        label: 'Verified topic aliases grounded in syllabus corpus',
        status: 'warn',
        detail: `${verifiedInCorpus}/${verified} verified aliases match corpus — mostly skill-lens or provisional`,
      })
    }

    const unverifiedShare = verified + unverified ? unverified / (verified + unverified) : 1
    checks.push({
      id: 'alias-provisional',
      label: 'Provisional (unverified) alias share acceptable',
      status: unverifiedShare <= 0.55 ? 'pass' : unverifiedShare <= 0.75 ? 'warn' : 'warn',
      detail: `${unverified} unverified / ${verified} verified (${Math.round(unverifiedShare * 100)}% provisional)`,
    })
  } else {
    for (const id of [
      'construct',
      'components',
      'scenario',
      'bloom',
      'scoring',
      'exemplars',
      'alias-corpus',
      'alias-provisional',
    ]) {
      checks.push({
        id,
        label: id,
        status: 'fail',
        detail: 'Skipped — no valid EoC spec',
      })
    }
  }

  const maxScore = checks.length
  const score = checks.reduce((s, c) => s + scoreOf(c.status), 0)

  return {
    subjectName: entry.subjectName,
    codes: entry.subjectCodes,
    overall: overallFrom(checks),
    score: Math.round(score * 10) / 10,
    maxScore,
    checks,
    stats,
  }
}

async function main() {
  __clearEocSpecCache()
  __clearCurriculumContextCache()

  const subjects: SubjectReport[] = []
  for (const entry of ECZ_SUBJECT_REGISTRY) {
    subjects.push(await auditSubject(entry))
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    source: 'Validation_folder README + ECSEOL Assessment Schemes + CDC Syllabus/',
    totals: {
      subjects: subjects.length,
      pass: subjects.filter((s) => s.overall === 'PASS').length,
      warn: subjects.filter((s) => s.overall === 'WARN').length,
      fail: subjects.filter((s) => s.overall === 'FAIL').length,
    },
    checklist: [
      'Topic from syllabus (dropdown corpus)',
      'EoC Assessment Scheme JSON (construct/components/exemplars)',
      'Authenticity scaffold (scenarioRequired)',
      'Criterion-referenced (Bloom + scoring rules)',
      'Syllabus PDF + ingest + form1-4 present',
      'Topic assert accepts syllabus / rejects invented',
      'Verified aliases grounded in corpus',
    ],
    subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2), 'utf8')

  console.log(
    `subjects=${summary.totals.subjects} PASS=${summary.totals.pass} WARN=${summary.totals.warn} FAIL=${summary.totals.fail}`
  )
  console.log(`${'subject'.padEnd(42)} ${'status'.padEnd(6)} score topics eocs`)
  for (const s of summary.subjects) {
    console.log(
      `${s.subjectName.slice(0, 42).padEnd(42)} ${s.overall.padEnd(6)} ${String(s.score).padStart(4)}/${s.maxScore} ${String(s.stats.curriculumTopics).padStart(5)} ${String(s.stats.eocCount).padStart(4)}`
    )
  }
  console.log('report:', OUT_PATH)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
