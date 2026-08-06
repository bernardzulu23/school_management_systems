# Multi-tenant audit fixes (2026-08-05)

Remediation for Critical/High findings from the Prisma tenancy audit.

## Critical

| Finding                                     | Fix                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| USSD unscoped `Student.findMany` by phone   | Removed fallback; require `ussd_candidate_school_ids` or `USSD_SERVICE_CODE_SCHOOL_MAP` (`lib/ussd/parent-portal.js`) |
| National percentile cross-tenant raw scores | Bucket-only SQL aggregate + `computePercentileFromBuckets` (`lib/mock-exam`, `national-percentile` route)             |

## High

| Finding                                                  | Fix                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Refresh JWT used `decoded.schoolId` in token key         | Lookup by unique token; verify DB `schoolId` vs claim (`auth/refresh`, `mobile/auth/refresh`) |
| `findUserById` without school                            | Requires `schoolId` (`lib/db/queries.js`)                                                     |
| Profile / teacher / student / deployment ID-only updates | `updateMany` / `findFirst` with `{ id, schoolId }`                                            |
| Expo push user by id                                     | Optional `schoolId` on `sendExpoPushToUser`; dispatcher passes it                             |
| SMS broadcast/queue ID-only mutations                    | Scoped with `schoolId` (`lib/sms/broadcast.js`)                                               |
| RAG `$queryRawUnsafe`                                    | Tagged `$queryRaw` + `Prisma.sql` (`lib/rag/retrieve.js`)                                     |
| Plan payment updates by id only                          | `updateMany` with payment `schoolId` (`activate-plan-payment.js`)                             |

## Still by design / deferred

- Shared SMS gateway queues remain multi-tenant when using a shared device token (prefer dedicated registration).
- `scripts/check-tenant-scoping.ts` still flags global `prisma` usage even when `schoolId` is in `where` — do not blindly update the baseline.
