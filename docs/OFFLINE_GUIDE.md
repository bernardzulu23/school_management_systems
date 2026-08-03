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
| Cached class lists & parent children (read)   |                           |
| Seed import / queue flush when briefly online |                           |

## Cold start (zero prior visit)

1. At an office or hotspot, open **Offline & sync** (`/dashboard/offline`).
2. Set a passphrase → **Download `.zsmsseed`** (role-scoped: only your classes/children).
3. Copy the file (USB / ShareIt / WhatsApp) to the rural device.
4. On that device: log in when possible **or** open a previously installed PWA → **Import seed** with the same passphrase.
5. Enter attendance / marks offline → **Sync** when connected.

Seeds expire after **14 days**. They never include passwords or API keys.

## What exists today (Phase 1–2)

| Piece                               | Location                                                        |
| ----------------------------------- | --------------------------------------------------------------- |
| Sync engine                         | `lib/offline/sync/engine.js`                                    |
| Dexie DB `zsms_offline`             | `lib/offline/db.js` (v3)                                        |
| Attendance / SBA / gradebook queues | `attendance-store.js`, `results-store.js`                       |
| CBC / lesson plans / materials      | `lib/offline/teacher-ops.js` → `mutationQueue`                  |
| Seed export API                     | `POST /api/offline/seed`                                        |
| Seed UI                             | `/dashboard/offline`                                            |
| Service worker shells               | `public/sw.js`                                                  |
| Global offline banner               | all authenticated routes                                        |
| AI/payments/SMS gate                | `lib/auth/installApiFetch.js` when `navigator.onLine === false` |

### CBC ratings

1. Open **CBC Continuous Assessment** online once (caches learners + competencies).
2. Save ratings offline — queued and synced via `POST /api/cbc/ratings`.
3. CSV export requires internet.

### Lesson plans

1. Generate AI plans **online** (AI needs internet).
2. **Save draft** / **Submit to HOD** works offline (queued).
3. Existing plan detail page save/submit also queues when offline.

### Materials

1. **File upload** requires internet.
2. Create/update with a **File URL** (metadata only) works offline and syncs later.
3. Materials list is cached after an online visit.

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

| Store                              | Purpose                             |
| ---------------------------------- | ----------------------------------- |
| `attendanceQueue`                  | Attendance                          |
| `classRosters`                     | Rosters                             |
| `sbaScoreQueue` / `gradebookQueue` | Marks                               |
| `mutationQueue`                    | CBC, lesson plans, materials, other |
| `conflictQueue`                    | Manual resolve                      |
| `resultsCache` / `seedMeta`        | Caches + seed audit                 |
| `syncLog`                          | Debug                               |

## Roadmap (later phases)

- Phase 3: student flashcards/materials/goals queues
- Phase 4: admin timetable drafts / announcements
- Phase 5: parent read-cache + Expo seed parity

## For developers

```javascript
import { flushOfflineQueues, enqueueMutation } from '@/lib/offline'
await flushOfflineQueues({ userId })
```

Tests: `offline-attendance`, `offline-results`, `offline-seed-crypto`.
