# Phase 5 — National Scale

## Overview

Phase 5 targets district-level rollout and Ministry of Education integration. Phase 4 delivered security hardening, marketplace, mobile student features, and national mock examinations; Phase 5 scales operations and government reporting.

## P5.1 — Ministry of Education API Integration

- Automated MOE term-end reporting (aggregated, anonymised where required)
- National STEM monitoring pipeline
- Direct integration with MOE Management Information System (MIS) when API specs are available

## P5.2 — Multi-Province DEBS Dashboard

- Provincial Education Officer cross-district view
- National attendance heat map
- Cross-district SBA performance comparison
- Drill-down by province → district → school (role-gated)

## P5.3 — CompreFace Face Recognition Upgrade

- Replace custom face matching with CompreFace Docker service
- GPU-optional, higher accuracy
- Liveness detection (prevents photo spoofing)
- Batch enrollment for new school year

## P5.4 — Financial Sustainability

- **School subscriptions only** (Lipila) — platform billing for schools; not parent fee collection in-app
- Premium tier features: advanced analytics, white-label reports
- District licensing (DEBS pays one fee for all schools in a district)

## Revenue milestone before Phase 5

**Target:** 50 active schools × K800/month ≈ **K40,000/month**  
Covers infrastructure and a small engineering team.

## Technical prerequisites from Phase 4

- RLS on all tenant tables (including `MockExamAttempt`)
- JWT rotation runbook (`docs/SECRET_ROTATION.md`)
- Security checklist for new routes (`docs/SECURITY.md`)
- CI: `npm run audit:security` + Vitest security suite on every PR

## Suggested Phase 5 order

1. DEBS read-only analytics (lowest integration risk)
2. MOE export formats (CSV/API adapters)
3. CompreFace pilot at 2–3 schools
4. District licensing and billing automation
