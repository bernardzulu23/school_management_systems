# Phase 1 security sign-off report

**Date:** 2026-07-15  
**Project:** ZSMS `school_management_systems` v2.0.3

---

## Summary

| Check                    | Status                            | Notes                                                  |
| ------------------------ | --------------------------------- | ------------------------------------------------------ |
| `npm test`               | ✅ 643/643 (after xlsx migration) | Re-run after `npm install`                             |
| `npm run audit:security` | ✅ **0 vulnerabilities**          | `xlsx` removed; `joi` overridden via `africastalking`  |
| `npm run audit:tenant`   | ⚠️ 188 flagged                    | Grouped below — many are ID-after-auth false positives |

**Phase 1 hard blocker resolved:** `xlsx` HIGH CVE eliminated by migrating to **ExcelJS** (already in project).

---

## Issue 1 — xlsx HIGH (fixed)

**Action taken:** Removed `xlsx` from `package.json`. All usage migrated to `lib/excel/workbook.js` (ExcelJS).

**Files migrated:**

- `lib/uploads/parseStudentExcel.js`, `parseTeacherExcel.js`, `workbookDbMapping.js`
- `lib/government/emisExport.js`
- Bulk upload template API routes + upload routes
- `components/admin/StudentBulkUpload.jsx`, `TeacherBulkUpload.jsx`
- Unit tests

**Verify:**

```powershell
npm run audit:security
# expected: found 0 vulnerabilities
```

---

## Issue 2 — joi MODERATE (fixed)

**Action taken:** `package.json` overrides:

```json
"africastalking": {
  "joi": ">=18.2.1"
}
```

**Verify:**

```powershell
npm audit --omit=dev
# expected: found 0 vulnerabilities
```

---

## Issue 3 — Tenant audit (188 findings)

**Full JSON:** `scripts/tenant-audit-results.json`  
**Scanned:** 2026-07-15 — 425 routes, 630 safe, 188 flagged

### Grouped by API folder (highest count first)

| Folder        | Count | Risk context                                               |
| ------------- | ----: | ---------------------------------------------------------- |
| dashboard     |    27 | Mostly role-gated aggregates — verify `schoolId` in query  |
| timetable     |    19 | **High priority** — schedule data                          |
| assessments   |    14 | **High priority** — grades/SBA                             |
| ecz           |    12 | **High priority** — assessment rows                        |
| marketplace   |    11 | Cross-school browse — IDOR review                          |
| lesson-plans  |     8 | Medium                                                     |
| auth          |     7 | Pre-session — often false positive                         |
| admin         |     7 | Role-gated — lower if `resolveAuthenticatedSchoolId` first |
| payments      |     6 | **High priority** — fees                                   |
| teacher       |     5 | Medium                                                     |
| notifications |     5 | Medium                                                     |
| mobile        |     5 | Medium                                                     |
| students      |     3 | **High priority** — PII                                    |

**Real risk focus:** Routes returning student PII, grades, fees, or timetables without `schoolId` in the Prisma `where` clause. Routes that load by ID only after `assertSameTenant` / `resolveAuthenticatedSchoolId` are often false positives.

**Re-run audit:**

```powershell
npm run audit:tenant
```

---

## Teacher colour live report (not truncated)

Full visual report (23 teachers): **`tmp-teacher-colors-report.html`**  
Open in browser — includes all teachers from Bernard Zulu through MWALE LAUNDANI.

Console test output only shows `sample` (first 12 names); the HTML file is the complete report.

---

## Commands for full terminal log

```powershell
Set-Location "f:\Mobile Apps\ZSMS\school_management_systems"
npm test *>&1 | Tee-Object -FilePath "tmp-phase1-npm-test-full.log"
npm run audit:security *>&1 | Tee-Object -FilePath "tmp-audit-security.log"
npm run audit:tenant *>&1 | Tee-Object -FilePath "tmp-audit-tenant.log"
```

---

## Next: Phase 2–6

See `docs/ONBOARDING_SECURITY_CHECKLIST.md` for platform Health, live header proof, ZAP, onboarding smoke test, and Neon checks.
