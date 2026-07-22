/**
 * Subject registry — maps every CDC/ECZ syllabus in the corpus to assessment codes
 * and (when available) an EoC spec file under data/curriculum/ecz-eoc/.
 *
 * Reusable for: loaders, UI subject pickers, batch extraction scripts,
 * and curriculum grounding across ALL syllabi in ingest/extracted/syllabus.
 */
export type EczSubjectRegistryEntry = {
  /** Canonical display name */
  subjectName: string
  /** ECZ subject code(s) from Assessment Schemes TOC */
  subjectCodes: string[]
  /** Friendly slugs accepted by loadEocSpec */
  aliases: string[]
  /** Filename under data/curriculum/ecz-eoc/ without .json (null if not yet extracted) */
  eocSpecFile: string | null
  /** Matching ingest/extracted/syllabus filename (null if unknown) */
  syllabusIngestFile: string | null
  /** Matching data/curriculum/form1-4 slug (null if none) */
  form14Slug: string | null
}

/**
 * Master registry for all ECSEOL subjects in the Assessment Schemes PDF.
 * Extend eocSpecFile as chapters are extracted into EczSubjectSpec JSON.
 */
export const ECZ_SUBJECT_REGISTRY: EczSubjectRegistryEntry[] = [
  {
    subjectName: 'English Language',
    subjectCodes: ['1021'],
    aliases: ['english', 'english-language', '1021'],
    eocSpecFile: 'english-language-1021',
    syllabusIngestFile: 'ENGLISH-SYLABUS-FORM-1-4-O-LEVELCAMERA-READY.json',
    form14Slug: 'english',
  },
  {
    subjectName: 'Literature in English',
    subjectCodes: ['1025'],
    aliases: ['literature-in-english', 'literature', '1025'],
    eocSpecFile: 'literature-in-english-1025',
    syllabusIngestFile: 'LITERATURE-IN-ENGLISH-SYLABUS-O-LEVEL-FORM-1-4.json',
    form14Slug: 'literature-in-english',
  },
  {
    subjectName: 'Civic Education',
    subjectCodes: ['3011'],
    aliases: ['civic-education', 'civic', '3011'],
    eocSpecFile: 'civic-education-3011',
    syllabusIngestFile: 'CIVIC-EDUCATION-SYLLABUS-SCIENCE-O-LEVEL-SYLLABUS-FORM-1-4.json',
    form14Slug: 'civic-education',
  },
  {
    subjectName: 'Religious Education',
    subjectCodes: ['3012'],
    aliases: ['religious-education', 're', '3012'],
    eocSpecFile: 'religious-education-3012',
    syllabusIngestFile: 'RELIGIOUS-EDUCATION-SYLLABUS.json',
    form14Slug: 'religious-education',
  },
  {
    subjectName: 'History',
    subjectCodes: ['3013'],
    aliases: ['history', '3013'],
    eocSpecFile: 'history-3013',
    syllabusIngestFile: 'HISTORY-SYLLABUS-FORMS-1-4.json',
    form14Slug: 'history',
  },
  {
    subjectName: 'Geography',
    subjectCodes: ['3014'],
    aliases: ['geography', '3014'],
    eocSpecFile: 'geography-3014',
    syllabusIngestFile: 'GEOGRAPHY-SYLLABUS.json',
    form14Slug: 'geography',
  },
  {
    subjectName: 'French Language',
    subjectCodes: ['1120'],
    aliases: ['french', 'french-language', '1120'],
    eocSpecFile: 'french-language-1120',
    syllabusIngestFile: 'FRENCH-LANGUAGE.json',
    form14Slug: 'french',
  },
  {
    subjectName: 'Chinese Language',
    subjectCodes: ['1125'],
    aliases: ['chinese', 'chinese-language', '1125'],
    eocSpecFile: 'chinese-language-1125',
    syllabusIngestFile: null,
    form14Slug: null,
  },
  {
    subjectName: 'Zambian Languages',
    subjectCodes: ['1211', '1212', '1213', '1214', '1215', '1216', '1217'],
    aliases: ['zambian-languages', '1211', '1212', '1213', '1214', '1215', '1216', '1217'],
    eocSpecFile: 'zambian-languages-1211',
    syllabusIngestFile: 'ZAMBIAN-LANGUAGES-ORDINARY-LEVEL-SYLLABUS-FORM-1-4-FINAL.json',
    form14Slug: 'zambian-languages',
  },
  {
    subjectName: 'Mathematics I',
    subjectCodes: ['2021'],
    aliases: ['mathematics', 'mathematics-i', 'math', '2021'],
    eocSpecFile: 'mathematics-i-2021',
    syllabusIngestFile: 'MATHEMATICS-O-LEVEL-FORMS-1-4.json',
    form14Slug: 'mathematics',
  },
  {
    subjectName: 'Mathematics II',
    subjectCodes: ['2025'],
    aliases: ['mathematics-ii', 'math-ii', '2025'],
    eocSpecFile: 'mathematics-ii-2025',
    syllabusIngestFile: 'MATHEMATICS-II-SYLLABUS.json',
    form14Slug: 'mathematics',
  },
  {
    subjectName: 'Agricultural Science',
    subjectCodes: ['4018'],
    aliases: ['agricultural-science', 'agriculture', '4018'],
    eocSpecFile: 'agricultural-science-4018',
    syllabusIngestFile: 'AGRICULTURAL-SCIENCE-O-LEVEL-SYLLABUS-FORM-1-4.json',
    form14Slug: 'agricultural-science',
  },
  {
    subjectName: 'Physics',
    subjectCodes: ['4016'],
    aliases: ['physics', '4016'],
    eocSpecFile: 'physics-4016',
    syllabusIngestFile: 'PHYSICS-SYLLABUS-O-LEVEL-FORM-1-4.json',
    form14Slug: 'physics',
  },
  {
    subjectName: 'Chemistry',
    subjectCodes: ['4014'],
    aliases: ['chemistry', '4014'],
    eocSpecFile: 'chemistry-4014',
    syllabusIngestFile: 'CHEMISTRY-SYLLABUS.json',
    form14Slug: 'chemistry',
  },
  {
    subjectName: 'Biology',
    subjectCodes: ['4012'],
    aliases: ['biology', '4012'],
    eocSpecFile: 'biology-4012',
    syllabusIngestFile: 'BIOLOGY-SYLABUS-O-LEVEL-FORM-1-4.json',
    form14Slug: 'biology',
  },
  {
    subjectName: 'Art and Design',
    subjectCodes: ['5012'],
    aliases: ['art-and-design', 'art', '5012'],
    eocSpecFile: 'art-and-design-5012',
    syllabusIngestFile: 'ART-AND-DESIGN-SYLLABUS-FINAL.json',
    form14Slug: 'art-and-design',
  },
  {
    subjectName: 'Musical Arts',
    subjectCodes: ['5014'],
    aliases: ['musical-arts', 'music', '5014'],
    eocSpecFile: 'musical-arts-5014',
    syllabusIngestFile: 'MUSIC-ARTS-O-LEVEL-SYLLABUS-FORM-1-4-CAMERA-READY-1.json',
    form14Slug: 'music',
  },
  {
    subjectName: 'Design and Technology',
    subjectCodes: ['8015'],
    aliases: ['design-and-technology', '8015'],
    eocSpecFile: 'design-and-technology-8015',
    syllabusIngestFile: 'DESIGN-AND-TECHNOLOGY-STUDIES.json',
    form14Slug: 'design-and-technology',
  },
  {
    subjectName: 'Fashion and Fabrics',
    subjectCodes: ['6012'],
    aliases: ['fashion-and-fabrics', '6012'],
    eocSpecFile: 'fashion-and-fabrics-6012',
    syllabusIngestFile: 'FASHION-AND-FABRICS-SYLABUS-O-LEVEL-FORM-1-4.json',
    form14Slug: 'fashion-and-fabrics',
  },
  {
    subjectName: 'Food and Nutrition',
    subjectCodes: ['6014'],
    aliases: ['food-and-nutrition', '6014'],
    eocSpecFile: 'food-and-nutrition-6014',
    syllabusIngestFile: 'FOOD-AND-NUTRITION-SYLLABUS-FINAL-07-02-2024.json',
    form14Slug: 'food-and-nutrition',
  },
  {
    subjectName: 'Hospitality Management',
    subjectCodes: ['6015'],
    aliases: ['hospitality-management', 'hospitality', '6015'],
    eocSpecFile: 'hospitality-management-6015',
    syllabusIngestFile: 'HOSPITALITY-MANAGEMENT.json',
    form14Slug: 'hospitality-management',
  },
  {
    subjectName: 'Travel and Tourism',
    subjectCodes: ['6016'],
    aliases: ['travel-and-tourism', '6016'],
    eocSpecFile: 'travel-and-tourism-6016',
    syllabusIngestFile: 'TRAVEL-AND-TOURISM-SYLLABUS.json',
    form14Slug: 'travel-and-tourism',
  },
  {
    subjectName: 'Physical Education and Sport',
    subjectCodes: ['9010'],
    aliases: ['physical-education', 'pe', '9010'],
    eocSpecFile: 'physical-education-9010',
    syllabusIngestFile: 'PHYSICAL-EDUCATION-SYLLABUS-FORM-1-4.json',
    form14Slug: 'physical-education',
  },
  {
    subjectName: 'Computer Science',
    subjectCodes: ['8010'],
    aliases: ['computer-science', '8010'],
    eocSpecFile: 'computer-science-8010',
    syllabusIngestFile: 'COMPUTER_-SCIENCE-ORDINARY-SYLLABI-FORM-1-4.json',
    form14Slug: 'computer-science',
  },
  {
    subjectName: 'Information and Communications Technology',
    subjectCodes: ['8011'],
    aliases: ['ict', 'information-and-communications-technology', '8011'],
    eocSpecFile: 'ict-8011',
    syllabusIngestFile: 'ICT_ORDINARY-LEVEL-SYLLABUS-FORMS-1-4.json',
    form14Slug: 'computer-studies',
  },
  {
    subjectName: 'Commerce',
    subjectCodes: ['7015'],
    aliases: ['commerce', '7015'],
    eocSpecFile: 'commerce-7015',
    syllabusIngestFile:
      'COMMERCE-AND-PRINCIPLES-OF-ACCOUNTS-SYLABUS-CAMERA-READY-O-LEVEL-FORM-1-4.json',
    form14Slug: 'commerce',
  },
  {
    subjectName: 'Principles of Accounts',
    subjectCodes: ['7020'],
    aliases: ['principles-of-accounts', 'accounts', '7020'],
    eocSpecFile: 'principles-of-accounts-7020',
    syllabusIngestFile:
      'COMMERCE-AND-PRINCIPLES-OF-ACCOUNTS-SYLABUS-CAMERA-READY-O-LEVEL-FORM-1-4.json',
    form14Slug: 'commerce',
  },
]

function normalizeKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Look up registry entry by name, slug, or subject code. */
export function findSubjectRegistryEntry(subjectOrCode: string): EczSubjectRegistryEntry | null {
  const key = normalizeKey(subjectOrCode)
  if (!key) return null
  for (const entry of ECZ_SUBJECT_REGISTRY) {
    if (normalizeKey(entry.subjectName) === key) return entry
    if (entry.subjectCodes.some((c) => normalizeKey(c) === key)) return entry
    if (entry.aliases.some((a) => normalizeKey(a) === key)) return entry
    if (entry.eocSpecFile && normalizeKey(entry.eocSpecFile) === key) return entry
    if (entry.form14Slug && normalizeKey(entry.form14Slug) === key) return entry
  }
  return null
}

/** Subjects that already have a shipped EczSubjectSpec JSON. */
export function listSubjectsWithEocSpec(): EczSubjectRegistryEntry[] {
  return ECZ_SUBJECT_REGISTRY.filter((e) => Boolean(e.eocSpecFile))
}

/** Subjects still needing Assessment Scheme extraction into EczSubjectSpec. */
export function listSubjectsMissingEocSpec(): EczSubjectRegistryEntry[] {
  return ECZ_SUBJECT_REGISTRY.filter((e) => !e.eocSpecFile)
}

/** Build SPEC_FILES-style map from the registry (code/alias → eocSpecFile). */
export function buildSpecFileAliasMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of ECZ_SUBJECT_REGISTRY) {
    if (!entry.eocSpecFile) continue
    for (const code of entry.subjectCodes) map[normalizeKey(code)] = entry.eocSpecFile
    for (const alias of entry.aliases) map[normalizeKey(alias)] = entry.eocSpecFile
    map[normalizeKey(entry.subjectName)] = entry.eocSpecFile
    map[normalizeKey(entry.eocSpecFile)] = entry.eocSpecFile
  }
  return map
}
