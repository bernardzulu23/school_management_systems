# Curriculum Studio Quick Reference

**Last updated:** 2026-07-11  
**Status:** Production-ready (v1)  
**Related:** [USER_GUIDE.md](./USER_GUIDE.md) · [AI_GUIDE.md](./AI_GUIDE.md) · [API_ROUTES.md](./API_ROUTES.md)

CBC-aligned schemes of work, record-of-work templates, and lesson plans from syllabus JSON (and optional PDF ingest).

---

## Setup / verify

Curriculum Studio is already in this repo. To confirm deps, folders, and key files:

```bash
npm run setup:curriculum-studio
# or: bash scripts/setup-curriculum-studio.sh
# or: powershell -File scripts/setup-curriculum-studio.ps1
```

Do **not** run scripts that overwrite `lib/curriculum/*` with placeholders — use the verify script above.

### Generate a scheme of work

1. Open **`/dashboard/teacher/schemes`** (requires plan feature `schemes-of-work`).
2. Select:
   - **Subject** — Chemistry, Physics, Biology, Mathematics, English, History, Geography, Civic Education, Computer Studies, Agricultural Science
   - **Grade / Form** — Form 1–6, Grade 8, Grade 9
   - **Term** — Term 1, 2, or 3
   - **Weeks / term** — default 12 (1–16)
3. Choose export: **Word**, **CSV**, or **JSON**
4. Click **Generate scheme of work** (or **Generate & mark submitted** for HOD progress)

### What you get

| Format           | Use for                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Word (.docx)** | Print, share with HOD, archive — week table with outcomes, activities, assessment, resources, notes |
| **CSV**          | Edit in Excel/Sheets, customise, share                                                              |
| **JSON**         | In-app preview + download; API / custom tools                                                       |

Also: **Record of work template** — blank weekly tracking Word file (weeks taught, remarks, signature).

### Lesson plans from syllabus

Use **`/dashboard/teacher/curriculum`** — pick subject/grade/topic, generate a CBC lesson plan Word file (AI; requires AI-enabled plan). Chemistry uses the full CDC 2024 dataset automatically.

---

## For headteachers / HODs

- Teachers can **mark schemes submitted**; that sets `TeacherTermProgress.schemeSubmitted` for the term.
- There is **no** dedicated “Schemes” tab on the headteacher timetable page in v1.
- Bulk school-wide ZIP generation is **Phase 2**.
- HOD lesson-plan review remains at `/dashboard/hod/lesson-plans`.

---

## Curriculum data

### Locations

```
data/curriculum/
├── chemistry-cdc-2024.json          # CDC Chemistry chunks (RAG / quiz)
└── form1-4/
    ├── chemistry-form1-4.json       # 9 units — preferred for Chemistry schemes
    ├── physics-form1-4.json
    └── biology-form1-4.json
```

School-uploaded syllabi are stored in Prisma (`Curriculum` / `CurriculumUnit`) via `POST /api/curriculum/ingest`.

### Unit JSON format

```json
{
  "subject": "Physics",
  "level": "Form 1-4",
  "gradesCovered": [7, 8, 9, 10],
  "units": [
    {
      "unitNumber": 1,
      "title": "Forces and Motion",
      "topics": ["Speed", "Acceleration"],
      "duration": "3 weeks",
      "learningOutcomes": ["..."],
      "suggestedActivities": ["..."],
      "assessmentMethods": ["Quiz"],
      "resources": ["..."]
    }
  ]
}
```

### Add more subjects

1. Place text-based syllabus PDFs in `./Syllabus/` (not scanned image-only PDFs).
2. Prefer filenames that include the subject (e.g. `CHEMISTRY-SYLLABUS.pdf`).
3. Run: `npm run ingest:syllabi` (or `npx ts-node --transpile-only scripts/ingest-syllabi.ts ./Syllabus`).
4. JSON files appear under `data/curriculum/form1-4/`.
5. Ingest **skips** unknown subjects (e.g. “Verb Agreement”) and **skips** curated/richer existing JSON.

Still useful to add when you have PDFs: Literature in English, Zambian Languages, Computer Studies, Religious Education, Art and Design, Music, Food and Nutrition, Travel and Tourism.

Do **not** scrape edu.gov.zm automatically; use teacher upload or local PDFs you are licensed to use.

---

## API (developers)

Auth: session cookie. Roles: `teacher`, `hod`, `admin`, `headteacher`. Feature: `schemes-of-work`.

### `POST /api/curriculum/scheme`

```bash
curl -X POST http://localhost:3000/api/curriculum/scheme \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "subject": "Chemistry",
    "grade": "Form 2",
    "term": 1,
    "academicYear": 2026,
    "weeksPerTerm": 12,
    "format": "json",
    "save": true,
    "submit": false
  }'
```

| `format`         | Response                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `json`           | `{ success, schemeId?, scheme }`                                  |
| `csv`            | File download (`text/csv`, `Content-Disposition`)                 |
| `word` (default) | `{ success, scheme, downloadUrl? }` or `wordBase64` if Blob unset |

Aliases: `POST /api/curriculum/generate-scheme` (same handler).

### `GET /api/curriculum/scheme`

Lists the current teacher’s recent saved schemes (not generation via query string).

### Other curriculum routes

| Method | Path                                   | Purpose                      |
| ------ | -------------------------------------- | ---------------------------- |
| GET    | `/api/curriculum?subject=&grade=`      | Resolve units/topics         |
| POST   | `/api/curriculum/ingest`               | PDF URL or multipart → DB    |
| POST   | `/api/curriculum/generate-lesson-plan` | AI lesson + Word             |
| POST   | `/api/curriculum/templates`            | Record-of-work Word template |

---

## Troubleshooting

| Issue                     | Fix                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Empty / placeholder weeks | Ensure JSON exists for the subject, or ingest/upload a syllabus; Chemistry should use CDC data |
| Word export fails         | `npm install docx` (already in package.json)                                                   |
| 403 Forbidden             | Role + `schemes-of-work` feature on the school plan                                            |
| PDF won’t parse           | Needs a text layer (`pdftotext file.pdf -`)                                                    |
| Migration errors          | `npx prisma migrate deploy` (`AiCache`, `Curriculum`, `SchemeOfWork`)                          |

---

## Privacy & storage (v1)

- Generated schemes are **saved to the school database** when `save` is true (default).
- Word files may be uploaded to **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set; otherwise returned as base64 for download.
- No student PII in scheme generation.
- Access is role- and tenant-scoped (`schoolId`).

---

## Integration (current)

```
Syllabus JSON / CDC / DB
        ↓
Scheme of work (Word / CSV / JSON)
        ↓
Curriculum Studio lesson page → AI lesson plan Word
```

Timetable alignment and assessment auto-linking are planned for later phases.

---

## Key code paths

| Area                    | Path                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| UI                      | `components/curriculum/CurriculumStudio.jsx`, `app/dashboard/teacher/schemes/page.js`                     |
| Scheme API              | `lib/curriculum/schemeRequestHandler.ts`, `app/api/curriculum/scheme/route.ts`                            |
| Generator               | `lib/curriculum/schemeOfWorkGenerator.ts`                                                                 |
| Export                  | `lib/curriculum/schemeOfWorkExport.ts`                                                                    |
| JSON loader             | `lib/curriculum/jsonCurriculumLoader.ts`                                                                  |
| Batch ingest (syllabus) | `scripts/ingest-syllabi.ts`                                                                               |
| Teaching modules        | `lib/curriculum/teachingModuleParser.ts`, `teachingModuleLoader.ts`, `scripts/ingest-teaching-modules.ts` |

---

## Teaching Modules vs Syllabus

|         | Syllabus (`./Syllabus/`)                         | Teaching Module (`./Teaching Module/`)                        |
| ------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Purpose | What to cover (units, outcomes)                  | How to teach (lessons, activities, resources)                 |
| Ingest  | `npm run ingest:syllabi -- ./Syllabus`           | `npm run ingest:teaching-modules -- --all`                    |
| Output  | `data/curriculum/form1-4/{subject}-form1-4.json` | `data/teaching-modules/{subject}/form{N}-term{T}.json`        |
| Used by | Scheme topic/outcome backbone                    | Enriches scheme activities/resources + lesson-planner prompts |

**Do not** run `ingest:syllabi` on the Teaching Module folder.  
**Do not** write modules to `data/curriculum/form1-6/` — that path is unused; use `data/teaching-modules/`.

### Full ingest

```bash
npm run ingest:syllabi -- ./Syllabus
npm run ingest:teaching-modules -- --all

# Or filter teaching-module subjects
npm run ingest:teaching-modules -- "./Teaching Module" Chemistry Physics Mathematics
```

Default filter: Chemistry, Physics, Mathematics. Expand the subject list once parsers look good.

### Scheme enrichment

When a matching module JSON exists for subject/form/term, `generateSchemeOfWork` merges MoE activities/resources into each week (topic similarity). Lesson plans append the same context into the AI prompt.

---

## Phase 2 (remaining)

- Auto AI lessons for every scheme week
- Bulk ZIP for whole school
- Headteacher coverage dashboard
- Analytics (adherence, downloads)
- Batch remaining Teaching Module PDFs (Zambian languages, Lit-in-X, etc.)
