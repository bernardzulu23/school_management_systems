# PWA offline-first architecture

**Status:** Phase 1 in progress  
**Goal:** Entire ZSMS product (web PWA, parent portal, Expo mobile) is usable for **core school ops** without live internet; AI, payments, SMS, and USSD stay network-bound.

## Product decisions (locked)

| Decision        | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Surfaces        | Web PWA, parent portal, Expo mobile; USSD documented as online-only                   |
| Depth           | Read + write for core ops offline; AI/payments/SMS online-only                        |
| Cold start      | Role-scoped **encrypted `.zsmsseed` file** any staff can download when briefly online |
| Conflicts       | Manual resolve UI (marks/results)                                                     |
| Data per device | Only what the logged-in user needs (assigned classes / children)                      |
| AI offline      | Disabled with clear message                                                           |
| Payments/SMS    | Online-only (optional local fee drafts later)                                         |
| Devices         | Mixed incl. low-end Android, Windows labs, iOS Safari                                 |

## Principles

1. **Offline-first writes** — mutate IndexedDB (or AsyncStorage on mobile) first; sync is eventual.
2. **Cache-on-read** — every successful online GET that matters for offline work is stored.
3. **Seed for cold start** — devices that never visited online import a seed pack.
4. **Conflict honesty** — never silently clobber another user’s marks; show resolver.
5. **Small payloads** — assigned-only datasets; batch sync; gzip where already supported.
6. **Honest gates** — AI / payments / SMS refuse offline with one clear message.

## Stack

| Layer             | Web                              | Mobile                        |
| ----------------- | -------------------------------- | ----------------------------- |
| Installable shell | `manifest.json` + `public/sw.js` | Expo                          |
| Local DB          | Dexie `zsms_offline`             | AsyncStorage / SQLite (later) |
| Sync              | `lib/offline/sync/engine.js`     | `POST /api/mobile/sync`       |
| Seed              | `.zsmsseed` AES-GCM              | Same file import              |

## Dexie schema (web)

Database: `zsms_offline`

| Store             | Purpose                                 |
| ----------------- | --------------------------------------- |
| `attendanceQueue` | Attendance marks                        |
| `classRosters`    | Cached class lists                      |
| `sbaScoreQueue`   | ECZ SBA score posts                     |
| `gradebookQueue`  | Secondary result batches                |
| `resultsCache`    | Assignments / pupils / JSON caches      |
| `mutationQueue`   | Generic future ops (lesson plans, etc.) |
| `conflictQueue`   | Items needing manual resolve            |
| `seedMeta`        | Last seed import/export metadata        |
| `syncLog`         | Debug / last sync                       |

## Sync engine

- Single-flight flush (concurrency = 1).
- Channels: `attendance` → `results` (SBA + gradebook) → `mutations`.
- On reconnect + every 30s while online.
- Permanent 4xx: drop / conflict queue; 5xx/network: retry with backoff.

## Seed pack (`.zsmsseed`)

1. Staff (any authenticated school user) opens **Offline & sync** while online.
2. Downloads encrypted role-scoped pack (their assignments / children only).
3. Transfers via USB / ShareIt / WhatsApp.
4. On rural device: Import → enter passphrase → IndexedDB hydrated → open PWA.

Format version `1`:

```json
{
  "format": "zsmsseed",
  "version": 1,
  "schoolId": "...",
  "userId": "...",
  "role": "TEACHER",
  "exportedAt": "...",
  "expiresAt": "...",
  "cipher": { "iv": "...", "salt": "...", "algo": "AES-GCM" },
  "ciphertext": "..."
}
```

## Service worker

- Precache offline page + icons.
- Cache-first static assets.
- Network-first navigations for role shells; offline fallback to last cached document, else `/offline.html`.
- Never cache authenticated API POSTs; writes always go through IndexedDB queues.

## Phased roadmap

### Phase 1 — Platform (this slice)

- Sync engine + schema v3
- Seed export/import UI + API
- Global offline banner on all authenticated routes
- AI offline gate
- Manifest / SW role shells
- Docs

### Phase 2 — Teachers complete

- Lesson plans, materials, assessment create offline
- Hardened conflict UI for SBA + gradebook
- Scheme/timetable read-cache

### Phase 3 — Students

- Flashcards / materials / goals read-cache + submit queues
- Games complete queue

### Phase 4 — Admins / HT / HOD

- Timetable draft sync, announcements drafts, read-only reports cache

### Phase 5 — Parents + mobile parity

- Parent read-cache (children, fees view, results)
- Expo seed import + shared sync contracts
- School LAN hub (optional later)

### Out of scope for offline

- Live Lipila / SMS send / USSD
- Live AI generation
- Bulk Excel uploads of whole school
- Platform (Blue Peak) operator console

## Security

- Seeds never include passwords, refresh tokens, or SMS API keys.
- Seed TTL default 14 days; schoolId must match session on import.
- Session cookies still required for sync flush (brief online window).
