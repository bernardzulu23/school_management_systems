# Phase 3 — Intelligence and Analytics

## Overview

Phase 3 turns the data ZSMS collects into actionable insights and advanced automation.

## Prerequisites

Complete [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) and Phase 2 tasks (see [CHANGELOG.md](../CHANGELOG.md) § Phase 2).

## Tasks (status)

| ID   | Task                                 | Status                                      |
| ---- | ------------------------------------ | ------------------------------------------- |
| P3.1 | PostgreSQL RLS + `withSchoolContext` | Done — see [RLS.md](./RLS.md)               |
| P3.2 | Learning analytics dashboards        | Done — API + panels                         |
| P3.3 | OR-Tools timetable solver            | Done — optional service + greedy fallback   |
| P3.4 | AI term reports + HOD approval       | Done — API + `/dashboard/*/term-reports`    |
| P3.5 | Parent USSD portal                   | Done — see [USSD_GUIDE.md](./USSD_GUIDE.md) |
| P3.6 | RAG study assistant                  | Done — `/api/ai/study-assistant`            |

## Deploy notes

1. `npx prisma generate` and apply migrations (including RLS) on Neon staging first.
2. Set `ORTOOLS_SOLVER_URL` only when the Python service is running.
3. Register Africa's Talking USSD callback to `/api/ussd`.

## Out of scope unless funded

- Paid OpenAI/Anthropic models
- Twilio SMS (stay on Africa's Talking)
- WebSockets for live dashboards (polling is sufficient)
