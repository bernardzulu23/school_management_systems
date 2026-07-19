# CDC / Teaching-module ingestion pipeline

Empirically validated against Syllabus.zip (25 PDFs) and Teaching_Module.zip (67 / 61 unique).

## Commands

```bash
# Step 1 — MD5 dedupe + per-file shift auto-detect + extract
pip install pymupdf
python ingest/01_extract_and_fix.py
# Node fallback (no pymupdf): node ingest/01_extract_and_fix.mjs

# Step 2 — Deterministic syllabus → two-tier curriculum JSON
npm run ingest:structure-syllabus

# Step 3 — Teaching modules → static-fallback (form-N only where PDFs exist)
npm run ingest:structure-modules

# Or all three:
npm run ingest:pipeline
```

## Outputs

| Path                                          | Role                                         |
| --------------------------------------------- | -------------------------------------------- |
| `ingest/extracted/syllabus/*.json`            | Shift-corrected page text                    |
| `ingest/extracted/teaching-modules/*.json`    | Native extracts (shift 0)                    |
| `data/curriculum/<slug>-cdc-2024.json`        | Tier-1 RAG corpus                            |
| `data/curriculum/form1-4/<slug>-form1-4.json` | Tier-2 unit corpus                           |
| `data/static-fallback/<slug>/form-N/...`      | Teaching-module fallback (N only if sourced) |

## Hard rules

- Auto-detect shift per file (`-40..+40`); never hardcode a single offset
- Detect from a contentful middle-third page; selective line decode for mixed pages
- Chemistry gold-standard corpora are not overwritten unless `--force-chemistry`
- No empty `form-2`/`form-3`/`form-4` directories in static-fallback
- Do not claim all forms covered — missing form dirs are known-gaps
- Form 2–4 STEM sources: prefer CDC Digital Library open-access TMs (`Teaching Module/form2-4-stem/`)
- Gap audit / sourcing checklist: `docs/form2-4-stem-gap-audit.md`
- Re-extract only Form 2 STEM folder: `python ingest/_extract_form2_stem.py` then `npm run ingest:structure-modules`

## Mapping decisions

- **Zambian Languages** — aggregate CDC corpus; per-language detail in static-fallback
- **Mathematics II** — folded into Mathematics slug
