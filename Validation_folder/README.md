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
- Topic enforcement: `assertCurriculumTopicAllowed` on quiz-maker, ecz-practice, ecz-exam-questions, flashcards, mock-exam
- Structural + semantic EoC checks: `lib/ecz/eoc/question-validator.ts`
- Side-by-side logging after generation: `runValidationSideBySide` → `EczValidationLog` (wired on quiz-maker, ecz-practice, ecz-exam-questions)
