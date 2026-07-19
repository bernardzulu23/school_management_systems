# Form 2–4 STEM coverage gap — audit & sourcing (2026-07-20)

Honest status only. **Do not claim all forms covered.**

**Deep Form 3–4 pass (same day):** Confirmed still **unavailable** as open-access teaching modules. No Form 3 / Form 4 STEM PDFs ingested; no empty `form-3/` / `form-4/` directories created. Chemistry CDC gold-standard corpus untouched.

## Gap matrix

Legend: **Syll** = CDC syllabus RAG (`data/curriculum/*-cdc-2024.json`, Forms 1–4 grounding). **TM** = teaching-module / static-fallback under `data/static-fallback/<slug>/form-N/`.

| Subject              | Form 1 Syll |             Form 1 TM             | Form 2 Syll |     Form 2 TM      | Form 3 Syll | Form 3 TM | Form 4 Syll | Form 4 TM |
| -------------------- | :---------: | :-------------------------------: | :---------: | :----------------: | :---------: | :-------: | :---------: | :-------: |
| Chemistry            |     yes     |                yes                |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |
| Physics              |     yes     |                yes                |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |
| Mathematics          |     yes     |                yes                |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |
| Biology              |     yes     | **no** (no Form 1 TM PDF locally) |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |
| Computer Science     |     yes     |   no (Computer Studies F1 only)   |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |
| Agricultural Science |     yes     |                no                 |     yes     | **yes (ingested)** |     yes     |  **no**   |     yes     |  **no**   |

### Form 3–4 TM ingest counts (this deep pass)

| Subject              |    Form 3 topics    |    Form 4 topics    |
| -------------------- | :-----------------: | :-----------------: |
| Chemistry            | **0** (unavailable) | **0** (unavailable) |
| Physics              |        **0**        |        **0**        |
| Mathematics          |        **0**        |        **0**        |
| Biology              |        **0**        |        **0**        |
| Computer Science     |        **0**        |        **0**        |
| Agricultural Science |        **0**        |        **0**        |

### Distinction (important)

- **Syllabus RAG grounding exists** for STEM Forms 1–4 via CDC JSON (already in repo).
- **Teaching-module / static-fallback** was Form-1-only and language-heavy before the Form 2 batch; Form 2 STEM TM is now ingested; Form 3–4 TM still missing.
- Wrong AI answers in Chem/Phys/Math/Bio hurt trust most — TM grounding for Form 2 STEM is the priority fix done; Form 3–4 TM awaits official publication.

### On-disk status

- `data/static-fallback/`: Form 1 (many subjects) + Form 2 STEM (chem, phys, math, bio, CS, ag). **No `form-3/` or `form-4/` dirs** (by design until real PDFs exist).
- `Teaching Module/`: Form 1 bank + `form2-4-stem/` Form 2 STEM PDFs only. **Zero** local filenames matching Form 3 / Form 4 / Grade 10–12 STEM TMs.
- `Syllabus/`: Form 1–4 STEM syllabi already present (Chem, Phys, Math, Bio, CS, Ag).

---

## Sourcing checklist (URLs / status)

### Primary portal — CDC Digital Library (Open Access)

- Home: https://library.cdcrepository.info/
- About / license: https://library.cdcrepository.info/about.php  
  (“All materials are freely available… freely downloaded and used in the classroom without restriction.”)
- MoE Directorate of Curriculum Development: https://www.edu.gov.zm/?page_id=1142
- Homepage secondary counts (2026-07-20): **Form 2 = 82 resources**; Form 1 / Form 3 / Form 4 / Form 5 / Form 6 show **no resource badge** (browse confirms empty for f3–f6; Form 1 TMs live on edu.gov.zm instead).

| Title                                                    | Form | Type            | URL                                                                      | Status                                                     |
| -------------------------------------------------------- | ---- | --------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Chemistry - Form 2 Term 1 and 2                          | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=9                     | **Downloaded**                                             |
| Physics Form 2 Term 1 and 2                              | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=10                    | **Downloaded**                                             |
| Mathematics 1 Form 2 Term 1 and 2                        | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=19                    | **Downloaded**                                             |
| Mathematics 2 Form 2 Term 2                              | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=20                    | **Downloaded**                                             |
| Biology Form 2 Term 1 and 2                              | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=8                     | **Downloaded**                                             |
| Computer Science Module Form2 Term 1 and 2               | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=6                     | **Downloaded**                                             |
| Agricultural Science Form 2 Term1 & 2                    | 2    | Teaching module | https://library.cdcrepository.info/resource.php?id=7                     | **Downloaded**                                             |
| Adapted Chemistry/Physics/Biology/Math Form 2 Terms 1–3  | 2    | Adapted TM (VI) | Browse Form 2 (ids ~164–175+)                                            | Found (optional; not ingested — prefer mainstream modules) |
| Chemistry / Physics / Bio / Math / CS / Ag Sci Form 3 TM | 3    | Teaching module | Browse + search (see log below)                                          | **Not found — No Materials Found**                         |
| Chemistry / Physics / Bio / Math / CS / Ag Sci Form 4 TM | 4    | Teaching module | Browse + search (see log below)                                          | **Not found — No Materials Found**                         |
| CHEMISTRY SYLLABUS FORM 1–4                              | 1–4  | Syllabus        | https://www.edu.gov.zm/wp-content/uploads/2025/04/CHEMISTRY-SYLLABUS.pdf | Found (already in `Syllabus/`)                             |
| PHYSICS / BIOLOGY / MATH O-LEVEL FORM 1–4                | 1–4  | Syllabus        | edu.gov.zm CDC page + local `Syllabus/`                                  | Found (already ingested to CDC JSON)                       |
| Form 1 Chemistry TM                                      | 1    | Teaching module | edu.gov.zm uploads (Feb 2025)                                            | Found (already in bank)                                    |
| Scribd Form 1 Chemistry lesson plans / mirrors           | 1    | Unofficial      | scribd.com                                                               | **Do not use** (prefer CDC OA; not Form 3–4)               |

### Publication status (authoritative context)

ZNBC (ZEPH interview): Form 1–2 textbooks/teachers’ guides were due for distribution; **Form 3 and Form 4 textbooks “have already been written and are ready for proofreading before being submitted to the Curriculum Development Centre for evaluation”** — i.e. **not yet CDC-approved / not yet in schools or OA library**.  
Source: https://znbc.co.zm/?p=10653 (“Form One, Two Textbooks Due February”).

That matches empty Form 3–4 browse pages on library.cdcrepository.info.

### Files ingested (Form 2 batch — unchanged this pass)

Source folder: `Teaching Module/form2-4-stem/` (see `_sources.json`).

| File                                                         | CDC resource id | Size (approx) | Topics written                     |
| ------------------------------------------------------------ | --------------- | ------------- | ---------------------------------- |
| Chemistry-Teaching-Module-Form-2-Term-1-and-2.pdf            | 9               | 2.4 MB        | 8 → `chemistry/form-2`             |
| Physics-Teaching-Module-Form-2-Term-1-and-2.pdf              | 10              | 2.7 MB        | 4 → `physics/form-2`               |
| Mathematics-1-Teaching-Module-Form-2-Term-1-and-2.pdf        | 19              | 2.1 MB        | 8 → `mathematics/form-2`           |
| Mathematics-2-Teaching-Module-Form-2-Term-2.pdf              | 20              | 1.1 MB        | 6 → `mathematics/form-2`           |
| Biology-Teaching-Module-Form-2-Term-1-and-2.pdf              | 8               | 2.4 MB        | 2 → `biology/form-2`               |
| Computer-Science-Teaching-Module-Form-2-Term-1-and-2.pdf     | 6               | 2.7 MB        | 18 → `computer-science/form-2`     |
| Agricultural-Science-Teaching-Module-Form-2-Term-1-and-2.pdf | 7               | 2.2 MB        | 13 → `agricultural-science/form-2` |

Chemistry CDC syllabus gold-standard corpus (`data/curriculum/chemistry-cdc-2024.json`) was **not** overwritten.

### Test results

- `npx vitest run __tests__/unit/shift-detect-and-fallback.test.js` — **6/6 passed** (2026-07-20 deep pass re-run; Form 1 hit; Form 2 Chemistry hit; Form 3–4 known-gap null). No code/data change — no Form 3–4 PDFs to ingest.

---

## Form 3–4 deep search log (2026-07-20)

All paths below returned **zero downloadable Form 3 / Form 4 STEM teaching modules**.

### A. CDC Digital Library — browse

| URL                                                                    | Result                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| https://library.cdcrepository.info/browse.php?level=secondary&grade=f3 | **No Materials Found** (subject filters present; 0 `resource.php` ids)  |
| …`grade=f4`                                                            | **No Materials Found**                                                  |
| …`grade=f5`, `f6`                                                      | **No Materials Found**                                                  |
| …`grade=f1`                                                            | **No Materials Found** (Form 1 TMs are on edu.gov.zm, not this library) |
| …`grade=f2`                                                            | Populated (~82 resources; STEM TMs ids 6–10, 19–20 + adapted packs)     |

Subject-filtered STEM (all **EMPTY**):

- `grade=f3|f4` × subject ids: Chemistry **19**, Physics **37**, Mathematics **34**, Biology **17**, Computer Science **22**, Agricultural Science **15**

Related-resources on Form 2 Physics (`resource.php?id=10`): only Adapted Form 2 Term 1–3 Physics — **no Form 3/4 series links**.

### B. CDC Digital Library — keyword search (`search.php?q=…`)

Each query: **No Results Found** / 0 resource ids (spot-checked HTML):

- `Form 3`, `Form 4`, `Chemistry Form 3`, `Chemistry Form 4`, `Physics Form 3`, `Physics Form 4`
- `Mathematics Form 3`, `Mathematics Form 4`, `Biology Form 3`, `Biology Form 4`
- `Computer Science Form 3`, `Agricultural Science Form 3`
- `Teaching Module Form 3`, `Teaching Module Form 4`
- `Learner's Book`, `Learners Book`, `Teacher's Guide`, `Teachers Guide`
- `Grade 10`, `Grade 11`, `Grade 12`, `Grade 10 Chemistry`, `Grade 11 Physics`, `Grade 12 Mathematics`
- `Senior Secondary`, `Senior Secondary Chemistry`, `Ordinary Level`, `O Level Chemistry`
- `Form III`, `Form IV`, `F3 Chemistry`, `F4 Physics`

Ordinary Level search may surface Form 1–4 **syllabus/framework** general resources only (e.g. Geography Fieldwork Guidelines) — **not** Form 3–4 STEM TMs.

### C. Resource-id probe (beyond Form 2)

Spot-checked ids including 176, 177, 180, 190, 200 (exist but are **primary / adapted / Grade** materials, not Form 3–4 STEM TMs); 250, 300 → 404. Known Form 2 STEM ids 6, 9, 10 still Form 2.

### D. MoE Directorate downloads (`edu.gov.zm/?page_id=1142`)

- 168 PDF links parsed from the page.
- Teaching-module uploads are **ECE / Grade 1 / Form 1** (+ Form 1–4 **syllabi**).
- **No** Form 2–4 STEM TM links on that page (Form 2 STEM is on CDC library only).
- Guessed Form 3 TM upload URLs all **404**, including:
  - `…/2025/02/Chemistry-Teaching-Module-Form-3.pdf`
  - `…/2025/02/Chemistry-Teaching-Module-Form-3-Term-1.pdf`
  - `…/2026/02|04/Chemistry-Teaching-Module-Form-3.pdf`
  - `…/2025/04/Chemistry-Teaching-Module-Form-3.pdf`
  - Parallel Physics / Biology / Mathematics Form-3 guesses → **404**

### E. ECZ

- Official site: https://www.exams-council.org.zm/ (mandate: examinations, assessment schemes, specimen papers — **not** CDC teaching modules).
- Alternate hostnames (`examinationscouncil.org.zm`, `ecz.org.zm`, etc.) did not resolve from this environment.
- **No OA Form 3–4 teaching-module corpus** expected or found on ECZ; do not treat exam papers as TMs.

### F. Local repo

- `Teaching Module/` + `form2-4-stem/`: Form 1 + Form 2 STEM only; **0** Form 3/4 filename matches.
- `data/static-fallback/`: **0** `form-3` / `form-4` directories.
- No project ZIPs of Form 3–4 CBC TMs under `school_management_systems`.

### G. Unofficial / unclear-license (do not download or ingest)

| Item                                                                         | Note                                                                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Scribd “Form 1 Chemistry Term 3 Lesson Plans” and similar                    | Unofficial mirrors / teacher notes — **do not use**; not Form 3–4 OA CDC modules                                                         |
| Marketplace / social posts claiming “CBC Form 3–4 Teaching Module ZIP” packs | **Do not buy / do not ingest** unless seller is MoE, CDC, or ZEPH with clear OA license; verify against library.cdcrepository.info first |
| Third-party syllabus mirrors (e.g. educom360 Physics O-level PDF)            | Syllabus-like content only; **not** a substitute for CDC Teaching Modules; prefer edu.gov.zm / CDC                                       |

---

## Resolver / logging

- `lib/ai/fallback-resolver.ts` resolves `form-N` when the directory exists.
- Missing form dirs (Form 3–4 STEM, unsourced subjects) → `known-gap` (not anomaly).
- Form 2 STEM with a hit → **no** known-gap; Form 1 miss logging unchanged for Form 1 banks.

---

## Acquisition plan (human) — ready-to-send request

### Contacts

- MoE information: **Edu.information@edu.gov.zm**
- Directorate of Curriculum Development: https://www.edu.gov.zm/?page_id=1142  
  Physical: Curriculum Development Centre, Ministry of Education, Lusaka (P.O. Box 50092 / related MoE boxes as listed on official pages)
- CDC Digital Library watch: https://library.cdcrepository.info/browse.php?level=secondary&grade=f3 (and `f4`)
- ZEPH (textbook printing / distribution status): follow MoE / ZNBC announcements; TMs often appear on CDC library after evaluation

### Suggested email body

```
Subject: Request for OA CBC Teaching Modules — Form 3 & Form 4 STEM (Chemistry priority)

Dear Curriculum Development Centre / Directorate of Curriculum Development,

We are building an open classroom support tool aligned to the 2023/2024 Competence-Based Curriculum. We already use your open-access Form 1 (edu.gov.zm) and Form 2 (library.cdcrepository.info) Teaching Modules for STEM.

We cannot find Form 3 or Form 4 Teaching Modules on:
- https://library.cdcrepository.info/browse.php?level=secondary&grade=f3
- https://library.cdcrepository.info/browse.php?level=secondary&grade=f4
- https://www.edu.gov.zm/?page_id=1142

Please advise whether Form 3 / Form 4 Teaching Modules (or Teachers’ Guides / Learner’s Books) for the subjects below are available for open download, or the expected publication date after CDC evaluation.

Priority order (STEM):
1. Chemistry — Form 3, Form 4 (all terms if split)
2. Physics — Form 3, Form 4
3. Mathematics (Mathematics 1 / 2 if split) — Form 3, Form 4
4. Biology — Form 3, Form 4
5. Computer Science — Form 3, Form 4
6. Agricultural Science — Form 3, Form 4

Preferred delivery: PDF via library.cdcrepository.info or edu.gov.zm (same OA classroom license as existing CDC Digital Library materials).

If materials exist only in print / ZEPH distribution, please share how schools or approved edtech partners may obtain digital copies.

Thank you for your work on CBC materials.

Kind regards,
[Name]
[Organisation / school / project]
[Contact]
```

### File naming when PDFs arrive

Save under `Teaching Module/form2-4-stem/` (or `form3-4-stem/`) using CDC-style names, then update `_sources.json`:

```
Chemistry-Teaching-Module-Form-3-Term-1-and-2.pdf
Chemistry-Teaching-Module-Form-4-Term-1-and-2.pdf
Physics-Teaching-Module-Form-3-….pdf
… (same pattern for Mathematics-1/2, Biology, Computer-Science, Agricultural-Science)
```

Then: `npm run ingest:pipeline` (or documented `ingest:structure-modules`) → verify `data/static-fallback/<subject>/form-3|form-4/` →  
`npx vitest run __tests__/unit/shift-detect-and-fallback.test.js`

---

## Next human actions

1. **Send the email above** to Edu.information@edu.gov.zm (and CDC contacts if known); watch Form 3 / Form 4 browse counts on library.cdcrepository.info.
2. **Do not fabricate** Form 3–4 static-fallback content; keep resolver `known-gap` until real PDFs exist.
3. **Do not buy unofficial ZIPs** claiming Form 3–4 CBC TMs unless vendor is MoE/CDC/ZEPH with clear license.
4. **Optional Term 3 Form 2** — CDC lists Adapted Form 2 Term 3 STEM; check for non-adapted Term 3 mainstream TMs and ingest if they appear.
5. **Biology Form 1 TM** — still absent from local Teaching Module bank; request Form 1 Biology TM from CDC if needed for Form 1 parity.
6. **Re-run ingest + vitest** after new PDFs land (commands above).
