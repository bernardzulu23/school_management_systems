# Offline guide (system-wide PWA)

Rural schools often have **2G, intermittent, or no connectivity**. ZSMS is built **offline-first** for core school ops: install as a PWA, seed the device once, enter marks/attendance offline, and sync when signal returns.

**Architecture:** [PWA_OFFLINE_ARCHITECTURE.md](./PWA_OFFLINE_ARCHITECTURE.md)

## Product rules

| Works offline (write + sync)                  | Needs internet            |
| --------------------------------------------- | ------------------------- |
| Attendance                                    | AI chat / generation      |
| Secondary Result Entry                        | Payments / Lipila         |
| ECZ SBA score entry                           | SMS send                  |
| CBC competency ratings                        | Materials file upload     |
| Lesson plan draft / submit to HOD             | Bulk Excel school uploads |
| Materials metadata (URL)                      | USSD                      |
| Student flashcard complete                    | AI flashcard generate     |
| Student goals CRUD                            | AI mock-exam start        |
| Student materials bookmark / download track   | Live percentile lookup    |
| Games complete / mock-exam submit             |                           |
| Cached class lists & parent children (read)   |                           |
| Seed import / queue flush when briefly online |                           |

## Cold start (zero prior visit)

1. At an office or hotspot, open **Offline & sync** (`/dashboard/offline`).
2. Set a passphrase → **Download `.zsmsseed`** (role-scoped: only your classes/children).
3. Copy the file (USB / ShareIt / WhatsApp) to the rural device.
4. On that device: log in when possible **or** open a previously installed PWA → **Import seed** with the same passphrase.
5. Enter attendance / marks offline → **Sync** when connected.

Seeds expire after **14 days**. They never include passwords or API keys.

## What exists today (Phase 1–3)

| Piece                               | Location                                                            |
| ----------------------------------- | ------------------------------------------------------------------- |
| Sync engine                         | `lib/offline/sync/engine.js`                                        |
| Dexie DB `zsms_offline`             | `lib/offline/db.js` (v3)                                            |
| Attendance / SBA / gradebook queues | `attendance-store.js`, `results-store.js`                           |
| CBC / lesson plans / materials      | `lib/offline/teacher-ops.js` → `mutationQueue`                      |
| Student flashcards / goals / games  | `lib/offline/student-ops.js` → `mutationQueue`                      |
| HT timetable drafts / notice drafts | `lib/offline/admin-ops.js` → `mutationQueue` / `announcementDrafts` |
| Parent portal read-cache            | `lib/offline/parent-ops.js` → `resultsCache`                        |
| Shared sync contracts               | `lib/offline/sync-contracts.js` (+ Expo mirror)                     |
| Seed export API                     | `POST /api/offline/seed`                                            |
| Seed UI                             | `/dashboard/offline`                                                |
| Service worker shells               | `public/sw.js`                                                      |
| Global offline banner               | all authenticated routes                                            |
| AI/payments/SMS gate                | `lib/auth/installApiFetch.js` when `navigator.onLine === false`     |

### Student (Phase 3)

1. **Flashcards:** open/cache decks online; finish a deck offline (score shows locally; sync mastery later). Generate new AI decks needs internet.
2. **Materials:** bookmark and download-tracking queue offline; opening the file still needs network unless already cached by the browser.
3. **Goals:** create/update/delete offline.
4. **Mock exam:** submit offline if the attempt was started online; starting a new paper needs AI/internet.
5. **Games:** complete events queue offline and sync XP later.

### Headteacher / admin (Phase 4)

1. **Timetable drafts:** drag/swap/delete periods and **Save draft to DB** work offline (queue syncs when online). Publish, generate, clone, and SMS still need internet.
2. **Notice drafts:** `/dashboard/headteacher/notices` — write local drafts on the device (IndexedDB). Copy into SMS when online; there is no server announcement model yet.
3. **Reports:** Results, MOE reports, exam tracking, STEM monitoring, and HOD monitoring show the last cached snapshot when offline (open them once online first).

### Parents (Phase 5)

1. Open the parent portal once online (or import a `.zsmsseed` downloaded while online).
2. Children list, fees summary, attendance, results, and published reports use the last cached snapshot offline.
3. Paying fees / Lipila stays online-only.

### Expo teacher app (Phase 5)

1. On web: **Offline & sync** → download `.zsmsseed` with a passphrase.
2. On phone **Profile** → paste the JSON + passphrase → **Import seed**.
3. Assignments, class rosters, and SBA task lists fall back to the seed when the API is unreachable. Attendance/scores still queue and flush when online.

## Teacher workflows

See sections below and the Result Entry / ECZ SBA notes in [USER_GUIDE.md](./USER_GUIDE.md).

### Attendance

1. Open **Attendance** (online once helps cache the roster; seed also loads rosters).
2. Mark Present / Absent / Late — queued in IndexedDB.
3. Sync badge / reconnect flushes to `POST /api/attendance`.

### Result Entry (secondary)

1. Open `/dashboard/teacher/results` (or import seed first).
2. **Save** offline or on timeout → `gradebookQueue`.
3. Resolve 409 conflicts in the UI when syncing.

### ECZ SBA

1. Seed or open hub online once for tasks/learners.
2. Record score / tracking sheet queues to `sbaScoreQueue`.

## PWA install

1. Chrome Android / desktop: browser menu → **Install app** / **Add to Home Screen**.
2. iOS Safari: Share → **Add to Home Screen** (limited background sync; open the app to flush queues).
3. Prefer low-data mode: open needed pages once on Wi‑Fi before travelling.

## Local schema (Dexie)

| Store                              | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `attendanceQueue`                  | Attendance                                                  |
| `classRosters`                     | Rosters                                                     |
| `sbaScoreQueue` / `gradebookQueue` | Marks                                                       |
| `mutationQueue`                    | CBC, lesson plans, materials, student ops, timetable drafts |
| `conflictQueue`                    | Manual resolve                                              |
| `resultsCache` / `seedMeta`        | Caches + seed audit                                         |
| `announcementDrafts`               | Local HT notice drafts (device-only)                        |
| `syncLog`                          | Debug                                                       |

## Roadmap (later phases)

- Optional School LAN hub for campus-local sync
- Server-backed announcements sync from notice drafts

## For developers

Cross-platform constants: `SYNC_CONTRACT_VERSION`, `CACHE_KEYS`, `MUTATION_CHANNELS`, `MOBILE_QUEUE_TYPES` in `lib/offline/sync-contracts.js` (Expo: `zsms-mobile/src/offline/syncContracts.ts`).

```javascript
import { flushOfflineQueues, enqueueMutation } from '@/lib/offline'
await flushOfflineQueues({ userId })
```

Tests: `offline-attendance`, `offline-results`, `offline-seed-crypto`, `offline-student-ops`, `offline-admin-ops`, `lazy-prisma`.
