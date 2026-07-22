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

## Reference subjects already shipped

1. **Mathematics I — `2021`** — topic-mode
2. **Mathematics II — `2025`** — topic-mode
3. **English Language — `1021`**, **Literature in English — `1025`**
4. **Civic Education — `3011`**, **Religious Education — `3012`**, **History — `3013`**, **Geography — `3014`**
5. **Agricultural Science — `4018`** — topic + taskType skill-lens
6. **Physics — `4016`**, **Chemistry — `4014`**, **Biology — `4012`**
7. **Art and Design — `5012`**

Still missing (registry `eocSpecFile: null`): French, Zambian Languages, Music, Design & Technology, Fashion & Fabrics, Food & Nutrition, Hospitality, Travel & Tourism, PE, Computer Science, ICT, Commerce, Accounts, Chinese (if in PDF).

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
