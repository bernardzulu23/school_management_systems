# ECSEOL Alignment — Teacher Quick Reference

This guide maps **ECSEOL Assessment Schemes (2026)** to ZSMS features. For enforcement rules and APIs, see [ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md).

## Where to go in ZSMS

| Task                                  | Location                                                     |
| ------------------------------------- | ------------------------------------------------------------ |
| SBA tasks & scores                    | **ECZ SBA Hub** → `/dashboard/teacher/assessments/ecz`       |
| Clone official exemplars              | SBA Hub → Create assessment → **Clone from ECSEOL exemplar** |
| Exam scenario builder (no MCQ)        | SBA Hub → **Exam scenarios** tab                             |
| Command terms & Bloom targets         | SBA Hub → **ECSEOL reference** tab                           |
| Headteacher moderation                | SBA Hub → **Moderation** tab                                 |
| AI quiz (secondary = structured only) | **AI Quiz Maker**                                            |
| Promote quiz → 40-mark term test      | Quiz Maker → **Promote to SBA term test**                    |
| Primary CBC ratings                   | **CBC Assessment** → `/dashboard/teacher/assessments/cbc`    |
| EPSC MCQ practice (G4–7)              | Student **ECZ Practice** with Grade 4–7 levels               |
| Lesson plan + construct/EoC           | **AI Lesson Planner** → SBA task type & construct picker     |

## ECSEOL rules enforced in ZSMS

### Secondary (Forms 1–4)

- **No multiple choice** in AI quiz, ECZ practice, and exam scenario generator for secondary levels.
- Each exam item needs a **Zambian scenario** (2–4 sentences), **command terms**, and **element of construct**.
- **Bloom distribution** warnings when generated papers drift from ECSEOL targets (10–15% Remember … 5–10% Create).
- **SBA only Forms 1–3**; Form 4 is final exam only (70%).
- **Term weights**: T1 20%, T2 30%, T3 50%; end-of-term test = **40 marks**.

### Primary (ECE–Grade 7)

- **CBC competency ratings** (Excellent / Good / Fair / Needs improvement) — not ONE–FOUR grades.
- **EPSC external prep** (Grades 4–7): MCQ allowed in ECZ Practice and flashcards.
- **Annual CBC export** CSV by 31 January (`GET /api/cbc/export`).

## Shared reference layer

- `lib/ecz/ecz-reference-constants.js` — command terms, Bloom targets, SBA task types, Zambian contexts
- `lib/ecz/assessment-engine.js` — `resolveAssessmentMode`, validation helpers
- `GET /api/ecz/reference` — competencies, constructs, command terms
- `GET /api/ecz/exemplars` — seeded ECSEOL exemplar library

## Seeding

```bash
npx prisma migrate deploy   # or db push in dev
npm run seed:ecz
```

## Related docs

- [ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)
