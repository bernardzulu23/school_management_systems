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

1. **Mathematics I — code `2021`** (`mathematics-i-2021.json`)
   - 5 EoCs, all `resolutionMode: topic` (default)
   - Topic aliases aligned to CDC Maths syllabus wording
   - Final exam: Form 4, 6 items / 100 marks, min 3 parts per scenario
2. **Agricultural Science — code `4018`** (`agricultural-science-4018.json`)
   - 6 EoCs; EoC1/4/6 are `taskType`, EoC2/3/5 are `topic`
   - Final exam: Form 4, 5 items / 60 marks (EoC6 SBA-only), min 2 parts per scenario
   - Skill-lens EoCs use `taskTypeAliases` + provisional `unverifiedTopicAliases`
3. **Physics — code `4016`** (`physics-4016.json`) — 6 topic-mode EoCs; Final 6×80 marks / 2h30
4. **Chemistry — code `4014`** (`chemistry-4014.json`) — 6 EoCs (topic + taskType mix); Final 6×80 / 2h30
5. **Biology — code `4012`** (`biology-4012.json`) — 5 EoCs; Final EoC1–4 only (70 marks / 1h30)
6. **Geography — code `3014`** (`geography-3014.json`) — 5 EoCs; Final sections A–D on EoC1–4 (choose 4 of 8)

Chapter text extracts used for 3–6 live under `Validation_folder/extracted_chapters/`.

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
