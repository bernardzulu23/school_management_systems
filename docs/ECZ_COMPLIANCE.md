# ECZ Compliance — ZSMS Implementation

This document describes how ZSMS enforces **ECZ Assessment Guidelines (2023 ZECF)** for School-Based Assessment (SBA).

## Data model mapping

The PRD names `SBATask` / `SBAScore` / `ECZSubmission`; this codebase uses existing models that already implement the same rules:

| PRD concept                      | ZSMS Prisma model                        | API routes                         |
| -------------------------------- | ---------------------------------------- | ---------------------------------- |
| SBA task (5-part structure)      | `EczAssessment` (`component = SBA_TASK`) | `POST /api/assessments/sba-tasks`  |
| Learner SBA scores (20+20+20+40) | `EczAssessmentScore`                     | `POST /api/assessments/sba-scores` |
| Annual ECZ submission            | `EczSubmission`                          | `POST /api/ecz/submissions`        |
| Per-school construct elements    | `SubjectConstructElement`                | Linked to school `Subject`         |
| **System reference data**        | `EczCompetency`, `EczSubjectConstruct`   | `GET /api/ecz/reference`           |

New in Task 5:

- **`EczCompetency`** — 12 ZECF key competencies (global seed)
- **`EczSubjectConstruct`** — 16 CBC subjects with construct, elements, SBA/exam weights
- **`EczAssessmentCompetency`** — links tasks to competencies
- **`EczAssessment`** — optional `term`, `academicYear`, `termWeight`, `generatedByAI`, `aiModel`, `instructions`, `demonstration`
- **`EczSubmission.deadline`** — 31 January of year after academic year

## Rules enforced

| Rule                                          | Enforcement                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| No SBA in Form 4                              | `canCreateSBATask()` in `lib/middleware/ecz-validation.js` — used by sba-tasks, sba-scores, ecz/submissions |
| SBA only Forms 1–3                            | Same                                                                                                        |
| Zambian context on tasks                      | `validateZambianContext()` — sba-tasks POST                                                                 |
| Task scores 0–20, term test 0–40, total ≤ 100 | `validateSBAScore()` — sba-scores POST                                                                      |
| Submission by 31 Jan (year+1)                 | `validateSubmissionDeadline()` — ecz/submissions POST                                                       |
| PE SBA weight 40%, others 30%                 | `getSBAWeight()` / `EczSubjectConstruct.sbaWeight`                                                          |
| Term weights 20% / 30% / 50%                  | `getTermWeight()` — stored on `EczAssessment.termWeight`                                                    |

### Source files

- **`lib/middleware/ecz-validation.js`** — API-level gate (import this in routes)
- **`lib/ecz/ecz-compliance.js`** — Shared calculations, deadlines, rubric scoring
- **`lib/ecz/ecz-rubric-builder.js`** — 4-level ECZ rubric templates
- **`lib/ecz/ecz-csv.js`** — ECZ CSV export format

## Seeding reference data

```bash
npm run seed:ecz
```

Upserts:

- 12 competencies → `EczCompetency`
- 16 CBC subjects → `EczSubjectConstruct`

Data source: `prisma/seeds/ecz-seed-data.js` (ECZ Assessment Guidelines 2023, §1.1.1 and §2.3).

After schema changes:

```bash
npx prisma db push
npm run seed:ecz
```

## 12 ECZ competencies

| Name                         | Category  |
| ---------------------------- | --------- |
| Analytical Thinking          | Cognitive |
| Citizenship                  | Social    |
| Collaboration                | Social    |
| Communication                | Social    |
| Creativity and Innovation    | Cognitive |
| Critical Thinking            | Cognitive |
| Emotional Intelligence       | Social    |
| Environmental Sustainability | Applied   |
| Problem Solving              | Cognitive |
| Digital Literacy             | Applied   |
| Entrepreneurship             | Applied   |
| Financial Literacy           | Applied   |

## 16 CBC subjects (constructs)

| Subject                          | SBA %  | Exam % |
| -------------------------------- | ------ | ------ |
| Mathematics I                    | 30     | 70     |
| Mathematics II                   | 30     | 70     |
| English Language                 | 30     | 70     |
| Biology                          | 30     | 70     |
| Chemistry                        | 30     | 70     |
| Physics                          | 30     | 70     |
| Civic Education                  | 30     | 70     |
| History                          | 30     | 70     |
| Geography                        | 30     | 70     |
| Religious Education              | 30     | 70     |
| Zambian Languages                | 30     | 70     |
| Literature in English            | 30     | 70     |
| Computer Studies / ICT           | 30     | 70     |
| **Physical Education and Sport** | **40** | **60** |
| Art and Design                   | 30     | 70     |
| Agricultural Science             | 30     | 70     |

Full construct statements and elements: run `npm run seed:ecz` or `GET /api/ecz/reference`.

## SBA scoring structure

Per learner, per subject, per academic year:

| Component        | Max marks |
| ---------------- | --------- |
| Task 1           | 20        |
| Task 2           | 20        |
| Task 3           | 20        |
| End-of-term test | 40        |
| **Total**        | **100**   |

Annual weighting by term (ECZ):

| Term | Weight |
| ---- | ------ |
| 1    | 20%    |
| 2    | 30%    |
| 3    | 50%    |

**Deadline:** 31 January of the calendar year after the academic year (e.g. 2025 academic year → 2026-01-31).

## Adding a new ECZ rule

1. Add the function to `lib/middleware/ecz-validation.js` (or `lib/ecz/ecz-compliance.js` if pure logic).
2. Call it from the relevant route under `app/api/assessments/` or `app/api/ecz/`.
3. Add a test in `__tests__/api/sba.test.js` or `ecz.test.js`.
4. Update this document.

## Related docs

- [AI_GUIDE.md](./AI_GUIDE.md) — `RubricSchema`, `SBATaskSchema` for AI-generated tasks
- [TESTING.md](./TESTING.md) — critical path ECZ tests
