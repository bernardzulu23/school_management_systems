# ECZ EoC Syllabus Spec — memory for every subject

This is the durable contract for Zambia ECZ competence-based assessment schemes used by ZSMS AI question generation and validation.

## Where things live

| Piece                    | Path                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Schema (Zod)             | `lib/ecz/eoc/ecz-eoc-spec.schema.ts` → `EczSubjectSpec`                                              |
| Loader (in-memory cache) | `lib/ecz/eoc/load-eoc-spec.ts` → `loadEocSpec()`                                                     |
| Question validator       | `lib/ecz/eoc/question-validator.ts` → `validateQuestion` / `validateStructure` / `resolveTopicToEoc` |
| Spec JSON files          | `data/curriculum/ecz-eoc/*.json`                                                                     |
| Official source PDFs     | `Validation_folder/ECSEOL Assessment Schemes_22_4_2026.pdf`                                          |
| Text extract             | `Validation_folder/ECSEOL_Assessment_Schemes_22_4_2026_extract.txt`                                  |
| Blueprint PDF            | `Validation_folder/ECZ ASSESSMENT GUIDELINES AND BLUEPRINT…pdf`                                      |

## Reference subjects already shipped (27)

All ECSEOL Assessment Scheme subjects are registered (`listSubjectsMissingEocSpec()` → `[]`).

| Group                | Codes                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Languages            | English `1021`, Literature `1025`, French `1120`, Chinese `1125`, Zambian Languages `1211`–`1217` (one scheme file)     |
| Maths                | Mathematics I `2021`, Mathematics II `2025`                                                                             |
| Sciences             | Agri `4018` (topic + taskType), Physics `4016`, Chemistry `4014`, Biology `4012`                                        |
| Humanities           | Civic `3011`, RE `3012`, History `3013`, Geography `3014`                                                               |
| Creative / practical | Art `5012`, Musical Arts `5014`, D&T `8015`, Fashion `6012`, Food `6014`, Hospitality `6015`, Tourism `6016`, PE `9010` |
| Tech / business      | Computer Science `8010`, ICT `8011`, Commerce `7015`, Accounts `7020`                                                   |

Provisional notes: some topic aliases remain unverified where form1-4 OCR is sparse/noisy (esp. Zambian Languages, Chinese has no form1-4 yet); Maths II final marks use body text **100** (not TOC 200); English paper codes use chapter **1021** (vs TOC 1012); French SBA:FE weighting **40:60**.

## Topic alias cross-walk

- Module: `lib/ecz/eoc/crosswalkTopicAliases.ts` (`crosswalkSpec`)
- Corpus: `loadSyllabusTopics()` — form1-4 preferred; ingest `pages` dumps are not structured topics
- Script: `npm run crosswalk:eoc-aliases` (or `:dry` for report-only)
- Rules: exact unverified→verified promote on **topic-mode** EoCs only; skill-lens (`taskType`) keeps syllabus topics provisional; unmapped corpus topics scored onto best subSkill with quality filters (rejects truncated/OCR stubs)

## Reusable modules (use these for EVERY syllabus)

| Module                                  | Responsibility                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `lib/ecz/eoc/ecz-eoc-spec.schema.ts`    | Subject-agnostic Zod shape (`EczSubjectSpec`, `GeneratedQuestion` + optional `taskType`) |
| `lib/ecz/eoc/question-validator.ts`     | `resolveEoc` / `requiresTaskType` / `validateQuestion`                                   |
| `lib/ecz/eoc/ecz-question-generator.ts` | EoC-anchored generate + one repair pass via `generateAIObject`                           |
| `lib/ecz/eoc/load-eoc-spec.ts`          | Auto-discovers all `data/curriculum/ecz-eoc/*.json`                                      |
| `lib/ecz/eoc/subjectRegistry.ts`        | Maps all Assessment Scheme subjects ↔ codes ↔ ingest syllabus files                      |
| `lib/ecz/eoc/syllabusTopicIndex.ts`     | Loads topic lists from form1-4 + `ingest/extracted/syllabus`                             |

**Resolution order (`resolveEoc`):** verified `topicAliases` → `taskTypeAliases` (when `taskType` supplied) → `unverifiedTopicAliases`.

**Do not** call the model with a bare topic string. Always `resolveEoc` first, stamp `eocId` (+ `taskType` when needed), then generate, then `validateQuestion`.

Chapter text extracts: `Validation_folder/extracted_chapters/`.
Ingested CDC syllabi (topic source): `ingest/extracted/syllabus/` (25 subjects). The empty `Syllabus/` folder is a placeholder — use the ingest corpus.

## Required JSON shape (every new syllabus)

```json
{
  "subjectCode": "<ECZ code>",
  "subjectName": "<Official name>",
  "syllabusYear": 2024,
  "construct": "<Subject construct statement>",
  "elementsOfConstruct": [
    {
      "id": "EoC1",
      "description": "…",
      "resolutionMode": "topic",
      "subSkills": [
        {
          "id": "eoc1-…",
          "label": "…",
          "topicAliases": [],
          "unverifiedTopicAliases": [],
          "taskTypeAliases": [],
          "note": "optional extraction note"
        }
      ]
    }
  ],
  "testDesign": {
    "components": [
      {
        "type": "SBA",
        "code": "<code>/1",
        "formLevel": "Form 2",
        "numItems": 6,
        "totalMarks": 100,
        "structureNotes": "…",
        "bloomRange": ["understanding", "creating"]
      },
      {
        "type": "FINAL_EXAM",
        "code": "<code>/2",
        "formLevel": "Form 4",
        "numItems": 5,
        "totalMarks": 60,
        "structureNotes": "…",
        "bloomRange": ["understanding", "evaluating"]
      }
    ],
    "scenarioRequired": true,
    "minPartsPerScenarioItem": 2
  },
  "scoringCriteria": { "rules": ["…"] },
  "exemplars": [
    {
      "eocId": "EoC1",
      "scenarioTheme": "…",
      "parts": [{ "label": "(a)", "marks": 7, "bloomLevel": "understanding" }],
      "keyCompetences": ["analytical_thinking", "problem_solving"]
    }
  ]
}
```

## Resolution rules (do not invent)

- **`topic` mode** — match `topicAliases` first (verified), then `unverifiedTopicAliases`.
- **`taskType` mode** — skill-lens EoCs; match `taskTypeAliases` (investigation, analysis, …). Syllabus topics may sit only in `unverifiedTopicAliases` as provisional content anchors with a `note`.
- Validator order in `resolveTopicToEoc`: verified topics → unverified topics → task types.
- Never invent EoCs, bloom ranges, mark totals, or component structures that are not in the Assessment Schemes PDF / extract.
- After adding a new JSON file, register aliases in `SPEC_FILES` inside `load-eoc-spec.ts`.

## How to add the next subject

1. Open the chapter in `Validation_folder/ECSEOL_Assessment_Schemes_22_4_2026_extract.txt`.
2. Extract construct, EoCs, SBA + Final Exam components, scoring rules, exemplars.
3. Cross-check topic names against `data/curriculum/form1-4/<subject>-form1-4.json` (and unit syllabus JSON).
4. Mark only CDC-confirmed names as `topicAliases`; put uncertain ones in `unverifiedTopicAliases` with a `note`.
5. Write `data/curriculum/ecz-eoc/<slug>-<code>.json`, validate with `EczSubjectSpec.safeParse`.
6. Add `SPEC_FILES` entries; extend `__tests__/unit/ecz-eoc/eoc-modules.test.js`.
7. Route AI generation through `validateQuestion` before persisting.

## Related unit syllabus JSON

Topic/unit grounding for RAG still lives under `data/curriculum/form1-4/`. EoC specs are the **assessment** layer (what a valid exam item must look like); form1-4 JSON is the **content** layer (what topics exist). Both are required for full CDC/ECZ alignment.
