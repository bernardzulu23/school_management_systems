# Phase 5 — Minors’ data protection (ZDPA 2021)

Audit of ZSMS for children’s data (grades, attendance, parent SMS).  
**Status:** M1–M3 implemented; remaining M4–M14 proposed.

Relevant **Zambia Data Protection Act, 2021** themes:

| Theme                                      | Act focus (plain language)                                      | ZSMS relevance                                         |
| ------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------ |
| **Data minimization / purpose limitation** | Collect and disclose only what is needed for the stated purpose | Full Student rows on roster APIs; rich SMS bodies      |
| **Children’s personal data**               | Heightened care for minors                                      | K-12 pupils; biometrics; medical/guardian fields       |
| **Consent & data subject rights**          | Consent where required; ability to object / withdraw            | Facial consent strong; SMS opt-out weak                |
| **Security safeguards**                    | Appropriate technical/organisational measures                   | Neon disk encryption likely; field-level crypto unused |
| **Storage limitation**                     | Keep only as long as necessary                                  | Face hooks partial; no post-exit PII schedule          |
| **Accountability**                         | Demonstrate who accessed what                                   | Staff PII **reads** largely unlogged                   |

---

## Findings

### 1. Data minimization — SMS & API

**Critical**

| Finding                                                                                                                                                  | Refs                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Class / student **list** APIs return **full `Student`** (medical, guardian phones/addresses, `faceEmbedding`, `pinHash`) when roster needs id/name/class | `app/api/classes/[id]/students/route.js`; `lib/db/queries.js` (`findStudentsByClass*`); `app/api/students/route.js` |
| **Student detail** GET returns full row to staff roles without stripping biometrics/medical/PIN                                                          | `app/api/students/[id]/route.js`                                                                                    |
| Mobile / web class roster can expose **faceEmbedding**                                                                                                   | `app/api/mobile/class-roster/route.js`; `app/api/classes/students/route.js`                                         |

**High**

| Finding                                                                                                        | Refs                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Attendance / results / fee / USSD SMS include **full pupil name** + grades/scores/balances on carrier channels | `lib/attendance/parentNotifications.js`; `lib/sms.js` (results); `lib/fees/overdueCron.js`; `lib/ussd/parent-portal.js` |
| `sanitizeOutput` only strips password/hash/token keys — **not** child-sensitive fields; used on few routes     | `lib/middleware/inputValidation.js`                                                                                     |
| HOD list `include: { user: true }` can leak password hashes                                                    | `app/api/hods/route.js`                                                                                                 |

**Positive:** No NRC/passport on `Student` today; results SMS omits letter grades; `qr-info` maps to `{id,name}`; admin export uses narrow selects.

**ZDPA:** Minimization + children’s data — over-disclosure in APIs is the highest volume risk at 100k+ pupils.

---

### 2. Access logging (who / when / what)

**Critical / High**

| Finding                                                                                       | Refs                                                     |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Staff **READ** of student PII (medical, guardian contacts) is **not** logged                  | `GET /api/students/[id]` — no access log                 |
| `ChangeLogEntry` is **mutation-oriented** (no `view`/`read` action)                           | `lib/changelog/constants.js`; inventory docs             |
| Guidance cases **do** log VIEW                                                                | `CaseAccessLog` + `logCaseAccess` — good pattern to copy |
| Platform-admin cross-tenant reads/writes (schools, stats, school delete) largely **unlogged** | `app/api/platform/*`; `lib/platform/deleteSchool.js`     |
| Legacy `AuditLog` barely used (login + few ops)                                               | Prefer ChangeLog / dedicated PII access log              |

**ZDPA:** Accountability — cannot demonstrate who accessed children’s sensitive data.

---

### 3. Data retention

**High**

| Finding                                                                                       | Refs                                               |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Leave school clears **faceEmbedding** only                                                    | `lib/consent/facialAttendance.js` on status change |
| `purgeExpiredFaceEmbeddings` exists but **no dedicated cron** (opportunistic on consent list) | `consentService.js`; no `app/api/cron` face job    |
| GRADUATED / WITHDRAWN / TRANSFERRED: **grades, contacts, medical retained indefinitely**      | No archive/anonymize job                           |
| School churn: hard `delete` cascade — no export hold / delete audit                           | `lib/platform/deleteSchool.js`                     |
| No school-wide retention policy runbook for pupil records                                     | Docs cover facial more than general PII            |

**Positive:** `enrollmentStatus` enum; facial retention days; ECZ evidence has separate 2-year language.

**ZDPA:** Storage limitation — biometrics partially addressed; core children’s records are not.

---

### 4. Parent / guardian SMS opt-out

**Critical (rights / consent)**

| Finding                                                            | Refs                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Opt-out is **school-wide** toggles only (`parentSmsAbsent/Late/…`) | `SchoolSmsSettings`; SMS dashboard; `parentNotifications.js` |
| **No per-parent** “stop attendance/fee SMS, keep account”          | `ParentProfile` has no SMS flags                             |
| Attendance SMS **ignores** `NotificationPreference.smsEnabled`     | Preferences used for in-app dispatcher only                  |
| `ConsentRecord` is **facial only**                                 | `ConsentType.FACIAL_RECOGNITION`                             |
| Fee overdue SMS also lacks personal opt-out                        | `lib/fees/overdueCron.js`                                    |

**ZDPA:** Data subject rights / objection to messaging — individual parents cannot refuse SMS without school changing global settings or removing phone numbers.

---

### 5. Encryption at rest

**Medium / High (safeguards)**

| Finding                                                                                                                                  | Refs                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Neon volume encryption (vendor default) is the real at-rest layer — **sufficient for many fields** if access control + minimization hold | Not documented as compliance baseline in SECURITY docs |
| App helpers `encryptStudentData` / `encryptAssessmentData` are **dead code** (never called on write)                                     | `lib/encryption.js`                                    |
| Results, fees, medical, guardian phones, **faceEmbedding** stored **plaintext** in Postgres                                              | Schema + enroll paths                                  |
| `pinHash` = bcrypt — appropriate                                                                                                         | Twin PIN routes                                        |
| SMS gateway pairing tokens = real AES-GCM — good precedent                                                                               | `lib/sms/encryption.ts`                                |
| National ID: **not collected** on Student (helpers mention fields that aren’t stored)                                                    | Schema vs `encryption.js`                              |

**ZDPA:** Appropriate safeguards — disk encryption + RLS/tenant controls matter most; **field-level encryption warranted** primarily for biometrics and any future national ID / highly sensitive medical notes — not necessarily every grade float if APIs are minimized and access is logged.

---

## Proposed fixes (priority order)

### P0 — Do first

| ID     | Fix                                                                                                                                                                                           | Why                           | Status                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **M1** | **Allowlist selects** on student list/detail/mobile roster: never return `faceEmbedding`, `pinHash`, medical, guardian address by default; expand `sanitizeOutput` or replace with pupil DTOs | Stops mass over-disclosure    | `done` — `lib/privacy/pupilDto.js`; class/mobile roster; `students/[id]`; queries; `sanitizeOutput`           |
| **M2** | **Per-parent SMS opt-out** (ParentProfile / parent User flags) respected in attendance + fee SMS; keep school toggles as defaults                                                             | ZDPA rights; account retained | `done` — `ParentProfile` flags + `SmsContactOptOut`; `filterPhonesNotOptedOut`; `/api/parent/sms-preferences` |
| **M3** | **PII access log** for `GET /api/students/[id]`, exports, roster-with-face; platform-admin school view/delete                                                                                 | Accountability                | `done` — `PiiAccessLog` + `logPiiAccess` on student detail, face rosters, results export, SMS metrics         |

### P1 — Next

| ID     | Fix                                                                                                                                 | Why                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **M4** | Cron: `purgeExpiredFaceEmbeddings` + without-consent purge per school                                                               | Storage limitation for biometrics |
| **M5** | Minimize SMS/USSD copy for minors (“your child” / portal link; avoid full score dumps)                                              | Carrier channel risk              |
| **M6** | Post-exit retention policy + job (anonymize/archive GRADUATED\|WITHDRAWN after N years; document school churn export-before-delete) | Storage limitation                |
| **M7** | Platform deleteSchool + sensitive platform GETs → immutable audit                                                                   | Cross-tenant accountability       |

### P2 — Then

| ID      | Fix                                                                                                   | Why                        |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| **M8**  | Encrypt `faceEmbedding` at rest (AES-GCM); document Neon disk encryption vs app crypto in SECURITY.md | Special-category biometric |
| **M9**  | Wire or **delete** dead `encryptStudentData`; if national ID added later, encrypt from day one        | Avoid false compliance     |
| **M10** | Extend ChangeLog mutation coverage (results, student update, SMS settings)                            | Completeness               |
| **M11** | Optional `ConsentType` for SMS if counsel requires recorded consent beyond opt-out                    | Consent hygiene            |

### P3 — Lower

| ID      | Fix                                                        |
| ------- | ---------------------------------------------------------- |
| **M12** | STOP keyword handling for inbound SMS → set parent opt-out |
| **M13** | HOD/`user: true` → select without password                 |
| **M14** | Parent data-export / erasure request workflow (DSAR)       |

---

## Suggested execution order

```
M1 → M2 → M3 → M4 → M5 → M7 → M6 → M8 → M9 → M10 → M11…
```

Do **not** promise field-level encryption of all grades/fees as a substitute for M1–M3; minimization + access control + logging reduce blast radius more than encrypting every float.

---

## Progress log

| Date       | Note                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-08-05 | Phase 5 audit written; tickets M1–M14 proposed.                                                                  |
| 2026-08-05 | Implemented M1–M3 (pupil DTOs, SMS opt-out, PiiAccessLog). Migration `20260805120000_phase5_sms_optout_pii_log`. |
