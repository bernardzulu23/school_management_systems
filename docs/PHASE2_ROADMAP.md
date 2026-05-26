# Phase 2 roadmap

Phase 1 (PRD Tasks 1–8) delivers a **production-ready foundation**: env validation, observability, tests, Groq AI, ECZ data model, SMS, QR attendance, and full documentation.

Phase 2 focuses on **advanced product features**, mobile depth, and operational polish — typically months 7–12 per [doc/COMPLETE_FEATURES_OUTLINE.md](./doc/COMPLETE_FEATURES_OUTLINE.md).

---

## Priority themes

### 1. Attendance expansion

- Mobile app: offline mark queue + sync ([doc/attendance-expansion.md](./doc/attendance-expansion.md))
- SMS on present/absent for mobile attendance path
- Headteacher **live attendance** dashboard (API exists; deepen UI)

### 2. Face recognition (optional pilot)

- Twin disambiguation flows already in schema
- Requires device lab — not default for rural MVP

### 3. Advanced analytics & MOE reporting

- Exam tracking, department analysis, export packs
- ECZ submission CSV/PDF hardening

### 4. Mobile app (Expo)

- Parity with web for teachers: attendance, results, materials
- Deep link to `/attend` QR flow

### 5. Platform & billing

- Invoice history, renewal reminders
- Plan downgrade / grace period automation

### 6. Quality & scale

- E2E Playwright suites for login, lesson plan, ECZ, billing
- Load testing on `/api/ai/*` and attendance peaks
- Redis rate limiting (optional)

---

## Suggested Phase 2 task order

| #   | Task                                 | Depends on        |
| --- | ------------------------------------ | ----------------- |
| 1   | Playwright E2E (login, ECZ, billing) | Phase 1 checklist |
| 2   | Mobile attendance offline sync       | QR + sessions API |
| 3   | Headteacher live attendance UI       | Live API          |
| 4   | ECZ export PDF + validation report   | ECZ models        |
| 5   | Parent SMS portal (read-only)        | SMS guide         |
| 6   | Face recognition pilot (1 school)    | Hardware          |

---

## Out of scope for Phase 2 (unless funded)

- Paid OpenAI/Anthropic models
- Twilio SMS (stay on Africa's Talking)
- Custom native iOS/Android stores (PWA + Expo first)

---

## How to start a Phase 2 ticket

1. Confirm [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) is complete.
2. Create a branch `phase2/<feature>`.
3. Follow [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for API/AI/SMS patterns.
4. Add tests + CHANGELOG `[Unreleased]` entry.
5. Update this roadmap when the item ships.
