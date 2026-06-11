# ZSMS Documentation Index

Central documentation for the **Zambian School Management System** (Next.js 16, multi-tenant, Groq AI, ECZ compliance).

---

## Start here

| Document                                             | Who it's for    | Purpose                                                         |
| ---------------------------------------------------- | --------------- | --------------------------------------------------------------- |
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Everyone        | Authoritative system overview (architecture, modules, security) |
| [SETUP.md](./SETUP.md)                               | New developers  | Clone → env → DB → seed → `npm run dev` in ~15 minutes          |
| [ENVIRONMENT.md](./ENVIRONMENT.md)                   | DevOps / deploy | Every env variable, required vs optional                        |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)           | Contributors    | Architecture, add API/AI/SMS, migrations, deploy                |
| [../CHANGELOG.md](../CHANGELOG.md)                   | Everyone        | Release history and PRD task notes                              |

---

## Feature guides (PRD Tasks 1–7)

| Document                                 | Topic                                              |
| ---------------------------------------- | -------------------------------------------------- |
| [TESTING.md](./TESTING.md)               | Vitest, mocks, critical API tests                  |
| [AI_GUIDE.md](./AI_GUIDE.md)             | Groq + Vercel AI SDK, Zod schemas, add AI features |
| [ECZ_COMPLIANCE.md](./ECZ_COMPLIANCE.md) | SBA rules, competencies, scoring, deadlines        |
| [SMS_GUIDE.md](./SMS_GUIDE.md)           | Africa's Talking, templates, Zambia numbers        |
| [QR_ATTENDANCE.md](./QR_ATTENDANCE.md)   | QR session flow, security, APIs                    |
| [OFFLINE_GUIDE.md](./OFFLINE_GUIDE.md)   | Offline class attendance (Dexie, sync badge)       |

---

## Reference

| Document                                                               | Topic                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [API_ROUTES.md](./API_ROUTES.md)                                       | Auto-generated route list (`npm run docs:api-routes`) |
| [doc/VERCEL_DEPLOY.md](./doc/VERCEL_DEPLOY.md)                         | Vercel + Neon deployment                              |
| [doc/COMPLETE_FEATURES_OUTLINE.md](./doc/COMPLETE_FEATURES_OUTLINE.md) | Full product inventory by role                        |
| [doc/LEGACY_PHASE_ARCHIVE.md](./doc/LEGACY_PHASE_ARCHIVE.md)           | Archived phase prompts and legacy AI packs            |
| [doc/LEGACY_MISC_ARCHIVE.md](./doc/LEGACY_MISC_ARCHIVE.md)             | Archived legacy setup/deploy/misc docs                |
| [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)                               | What comes after Phase 1                              |
| [PHASE3_ROADMAP.md](./PHASE3_ROADMAP.md)                               | Phase 3 — analytics, RLS, USSD                        |

---

## Regenerate API docs

```bash
npm run docs:api-routes
```

---

## Phase 1 completion

See [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) before starting Phase 2 work.
