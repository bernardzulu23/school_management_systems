# Validation folder (ECZ / ECSEOL)

Authoritative references for how ZSMS validates AI-generated quizzes, tests, exercises, flashcards, and assessments.

| File                                                        | Role                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ECSEOL Assessment Schemes_22_4_2026.pdf`                   | Official **Elements of Construct (EoC)**, test design, scoring, and exemplars per subject |
| `ECZ ASSESSMENT GUIDELINES AND BLUEPRINT … (Forms 1-4).pdf` | Competence-based assessment framework (scanned image PDF)                                 |

## Rules applied in the app

From the Assessment Schemes definitions and Component 2 test-item features:

1. **Topic must come from the syllabus** for the selected form + subject (CDC / curriculum JSON dropdown — not free invention when topics exist).
2. **Construct / Element of Construct** — secondary scenarios should map to an EoC (see `lib/ecz/eoc/` + `data/curriculum/ecz-eoc/`).
3. **Authenticity** — items reflect real-life situations (scenario-based for secondary ECSEOL).
4. **Competence-focused** — apply knowledge/skills/values/attitudes to solve a challenge.
5. **Contextualised** — familiar Zambian contexts where appropriate.
6. **Criterion-referenced** — assessed against pre-defined criteria (marks, command terms, Bloom levels).

## Code path

- Topic lists: `listCurriculumTopics` / `GET /api/curriculum-topics` / `CurriculumTopicSelect`
- Topic enforcement: `assertCurriculumTopicAllowed` (+ `requireIfListed`) on quiz-maker, topic-test, ecz-practice, ecz-exam-questions, flashcards, mock-exam
- UI: form + subject → syllabus topic **dropdown** (`CurriculumTopicSelect`) for quizzes, tests, exercises, flashcards, assessments, lesson plans
- Structural + semantic EoC checks: `lib/ecz/eoc/question-validator.ts`

## Full syllabus validation

Run:

```bash
npm run validate:curriculum
```

Report: `Validation_folder/FULL_SYLLABUS_VALIDATION_REPORT.json`

Checks per subject (registry): EoC JSON + schema, Assessment Scheme chapter extract, Syllabus PDF, ingest JSON, form1-4 JSON, usable topic dropdown corpus, topic assert accept/reject, construct, SBA+FE, scenarioRequired, Bloom ranges, scoring rules, exemplars, verified-alias↔corpus grounding.
