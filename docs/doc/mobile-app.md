# ZSMS Mobile App (React Native) — Integration Specification

Companion **React Native** app for teachers: **mark attendance** and **record ECZ SBA scores**, synced to the same PostgreSQL database as the web app. Each school is isolated by **subdomain** (multi-tenant).

---

## 1. Goals

| Goal           | Detail                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| Shared data    | Same `DATABASE_URL` as Next.js — no duplicate student/attendance/score tables   |
| School context | Teacher picks or enters school **subdomain** at login (e.g. `stmaryschristian`) |
| Scope          | Attendance + ECZ SBA scores only (not full SMS, timetable, or admin)            |
| Offline-first  | Queue marks locally; sync when online                                           |
| Visual parity  | Brutalist theme: paper `#EFECE5`, ink `#111111`, accent `#FF3B00`               |

---

## 2. Architecture

```mermaid
flowchart LR
  subgraph mobile [React Native App]
    UI[Screens]
    Store[Zustand + SQLite/AsyncStorage]
    API[API Client]
    Queue[Offline Queue]
  end
  subgraph backend [Next.js API]
    Auth[/api/mobile/auth/*]
    Mobile[/api/mobile/*]
    Core[/api/attendance + /api/assessments/*]
  end
  DB[(PostgreSQL)]
  UI --> Store
  Store --> API
  API --> Queue
  Queue --> Auth
  API --> Mobile
  API --> Core
  Auth --> DB
  Mobile --> DB
  Core --> DB
```

---

## 3. Environment & base URL

```env
# React Native (.env)
EXPO_PUBLIC_API_BASE_URL=https://bluepeacktechnologies.com
# Local dev (Android emulator → host machine)
# EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

Every authenticated request must send:

| Header               | Value                                           |
| -------------------- | ----------------------------------------------- |
| `Authorization`      | `Bearer <accessToken>`                          |
| `Content-Type`       | `application/json`                              |
| `x-school-subdomain` | School subdomain (backup if JWT has `schoolId`) |

---

## 4. Color system (match web)

Use these in React Native (`theme/colors.ts`):

```typescript
export const ZsmsTheme = {
  paper: '#EFECE5', // screen background
  ink: '#111111', // primary text, borders
  accent: '#FF3B00', // primary buttons, highlights
  accentHover: '#CC2F00',
  white: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F5F2EB',
  border: 'rgba(17, 17, 17, 0.12)',
  textSecondary: 'rgba(17, 17, 17, 0.72)',
  textMuted: 'rgba(17, 17, 17, 0.5)',
  success: '#1A6B6A',
  successBg: '#E6FAF0',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  warn: '#C99A2E',
  warnBg: '#FFFBEB',
  navBg: '#111111',
  navText: '#EFECE5',
  // Attendance chips
  present: '#1A6B6A',
  absent: '#FF3B00',
  late: '#C99A2E',
  excused: '#6B6A66',
} as const
```

**UI rules (same as web):**

- Primary button: `backgroundColor: accent`, `color: white`, border `2px solid ink`, shadow offset `4,4` ink (brutalist)
- Cards: white on paper, `borderRadius: 14`, light border
- Status chips use attendance colors above

---

## 5. Authentication flow

### 5.1 School selection (before login)

1. User enters **subdomain** (e.g. `stmaryschristian`) or searches school name.
2. Optional: `GET /api/public/schools?q=Mary` → pick school (metadata only).
3. Store `subdomain` in secure storage for subsequent logins.

### 5.2 Login (mobile-specific — returns tokens)

**`POST /api/mobile/auth/login`**

```json
{
  "email": "teacher@school.edu",
  "password": "***",
  "subdomain": "stmaryschristian"
}
```

**Response 200:**

```json
{
  "success": true,
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "expiresIn": 28800,
  "user": { "id": "...", "name": "...", "role": "teacher", "schoolId": "..." },
  "school": { "id": "...", "name": "...", "subdomain": "...", "logoUrl": "/Assets/..." }
}
```

Store `accessToken` and `refreshToken` in **expo-secure-store** (or react-native-keychain).

> Web login (`POST /api/auth/login`) sets HTTP-only cookies only — **do not use for React Native**.

### 5.3 Refresh token

**`POST /api/mobile/auth/refresh`**

```json
{ "refreshToken": "<jwt>" }
```

Returns new `accessToken` (+ optional rotated `refreshToken`).

### 5.4 Session bootstrap

**`GET /api/mobile/session-context`** (requires Bearer)

Returns user, school branding, and **teaching assignments** (class + subject list for pickers).

### 5.5 Logout

- Clear secure storage.
- Optional: `POST /api/auth/logout` with Bearer (revokes refresh if supported).

---

## 6. Role access

| Role                    | Mobile app                                               |
| ----------------------- | -------------------------------------------------------- |
| `teacher`               | Full attendance + scores                                 |
| `hod`                   | Same (department teachers’ classes if assignments allow) |
| `headteacher` / `admin` | Allowed but UI can warn “use web for admin tasks”        |
| `student`               | **Block** — show “Staff only”                            |
| Platform super admin    | **Block** — use `/platform/login` on web                 |

---

## 7. API reference (existing + mobile)

### 7.1 Mobile-only

| Method | Path                                   | Purpose                                  |
| ------ | -------------------------------------- | ---------------------------------------- |
| POST   | `/api/mobile/auth/login`               | Login + JWT in body                      |
| POST   | `/api/mobile/auth/refresh`             | Refresh access token                     |
| GET    | `/api/mobile/session-context`          | User, school, assignments                |
| GET    | `/api/mobile/class-roster`             | Students for class (+ optional subject)  |
| GET    | `/api/mobile/school/lookup?subdomain=` | Validate subdomain before login (public) |
| POST   | `/api/mobile/sync`                     | Batch upload queued attendance + scores  |

### 7.2 Attendance (shared with web)

| Method | Path              | Query / body                                           |
| ------ | ----------------- | ------------------------------------------------------ |
| GET    | `/api/attendance` | `classId`, `date` (ISO date) → existing marks          |
| POST   | `/api/attendance` | `{ date, records: [{ studentId, status, remarks? }] }` |

**`status` values:** `present` | `absent` | `late` | `excused` (lowercase)

**Notes:**

- One row per student per calendar day (`@@unique([studentId, date])`).
- SMS to parents runs server-side for `standard` / `premium` plans (mobile does not call SMS APIs).

### 7.3 ECZ assessments & scores (shared with web)

| Method | Path                          | Purpose                                                  |
| ------ | ----------------------------- | -------------------------------------------------------- |
| GET    | `/api/assessments/sba-tasks`  | List tasks; `?formLevel=1&subjectId=&component=SBA_TASK` |
| GET    | `/api/assessments/sba-scores` | Existing scores; `?subjectId=&formLevel=&academicYear=`  |
| POST   | `/api/assessments/sba-scores` | Record/update one student task score                     |
| GET    | `/api/assessments/[id]`       | Task detail + rubric criteria                            |

**POST `/api/assessments/sba-scores` body (rubric mode):**

```json
{
  "assessmentId": "uuid",
  "studentId": "uuid",
  "formLevel": 1,
  "academicYear": 2026,
  "taskNumber": 1,
  "excellentCount": 2,
  "goodCount": 1,
  "fairCount": 0,
  "poorCount": 0,
  "rubricBreakdown": {}
}
```

**Or direct score:**

```json
{
  "assessmentId": "uuid",
  "studentId": "uuid",
  "formLevel": 1,
  "academicYear": 2026,
  "taskNumber": 1,
  "score": 18
}
```

**Task numbers:** `1`–`3` = SBA tasks (max 20 each), `4` = term test (max 40). Server computes `totalSBAScore` /100.

---

## 8. React Native app structure

```
zsms-mobile/
├── app/                          # Expo Router (recommended)
│   ├── (auth)/
│   │   ├── school-select.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home / today
│   │   ├── attendance.tsx
│   │   ├── scores.tsx
│   │   └── profile.tsx
│   ├── attendance/
│   │   ├── [classId].tsx         # Mark register
│   │   └── history.tsx
│   └── scores/
│       ├── index.tsx             # Pick assessment
│       ├── [assessmentId].tsx    # Class grid
│       └── student/[studentId].tsx
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── attendance.ts
│   │   ├── assessments.ts
│   │   └── sync.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── attendanceStore.ts
│   │   └── offlineQueue.ts
│   ├── theme/colors.ts
│   └── types/index.ts
└── app.json
```

---

## 9. Every screen & function (complete inventory)

### 9.1 Auth module

| Screen / function      | Description                                |
| ---------------------- | ------------------------------------------ |
| `SchoolSelectScreen`   | Subdomain input, validate, save to storage |
| `searchSchools(query)` | `GET /api/public/schools?q=`               |
| `LoginScreen`          | Email + password + subdomain               |
| `login(credentials)`   | `POST /api/mobile/auth/login`              |
| `refreshSession()`     | `POST /api/mobile/auth/refresh`            |
| `logout()`             | Clear tokens + subdomain optional          |
| `AuthGuard`            | Redirect if no token                       |

### 9.2 Home

| Function                 | Description                             |
| ------------------------ | --------------------------------------- |
| `loadSessionContext()`   | Assignments + school logo               |
| `getTodaySummary()`      | Count classes with attendance not taken |
| `navigateToAttendance()` |                                         |
| `navigateToScores()`     |                                         |

### 9.3 Attendance module

| Screen / function                       | Description                         |
| --------------------------------------- | ----------------------------------- |
| `AttendanceClassPickerScreen`           | List assignments as class cards     |
| `AttendanceRegisterScreen`              | Student list + status toggles       |
| `loadRoster(classId, subjectId?)`       | `GET /api/mobile/class-roster`      |
| `loadExistingAttendance(classId, date)` | `GET /api/attendance`               |
| `setStudentStatus(studentId, status)`   | Local state                         |
| `markAllPresent()`                      | Bulk local                          |
| `saveAttendance()`                      | `POST /api/attendance` or queue     |
| `filterStudents(query)`                 | Local search by name                |
| `getAttendanceStats(records)`           | present/absent/late counts          |
| `AttendanceHistoryScreen`               | Past dates (from local cache + API) |

### 9.4 Scores module

| Screen / function                         | Description                                |
| ----------------------------------------- | ------------------------------------------ |
| `ScoresHomeScreen`                        | Filter form level, subject; list SBA tasks |
| `loadSbaTasks(filters)`                   | `GET /api/assessments/sba-tasks`           |
| `ScoreClassGridScreen`                    | Students × task columns                    |
| `loadRosterForScores(classId, subjectId)` | Roster API                                 |
| `loadScoresForAssessment(assessmentId)`   | Filter `sba-scores` GET raw                |
| `openStudentScore(student, taskNumber)`   | Navigate to detail                         |
| `StudentScoreScreen`                      | Rubric counters or numeric score           |
| `computeRubricScoreLocal(counts)`         | Mirror `lib/ecz/ecz-compliance`            |
| `submitScore(payload)`                    | `POST /api/assessments/sba-scores`         |
| `getCompletionPercent(students, scores)`  | UI progress bar                            |

### 9.5 Profile & settings

| Function              | Description                |
| --------------------- | -------------------------- |
| `ProfileScreen`       | Name, email, school, role  |
| `changeSchool()`      | Clear subdomain, re-auth   |
| `checkAppVersion()`   | Optional `GET /api/health` |
| `clearOfflineQueue()` | Dev/support                |

### 9.6 Offline sync

| Function                     | Description                 |
| ---------------------------- | --------------------------- |
| `enqueueAttendance(payload)` | SQLite / AsyncStorage queue |
| `enqueueScore(payload)`      | Queue                       |
| `flushOfflineQueue()`        | `POST /api/mobile/sync`     |
| `getPendingCount()`          | Badge on tab                |
| `retryFailedItems()`         | Exponential backoff         |

**Queue item shape:**

```typescript
type OfflineQueueItem =
  | { type: 'attendance'; id: string; createdAt: string; payload: AttendanceBatch }
  | { type: 'score'; id: string; createdAt: string; payload: SbaScorePayload }
```

---

## 10. TypeScript types (copy into mobile repo)

```typescript
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface TeachingAssignment {
  id: string
  classId: string
  className: string | null
  subjectId: string
  subjectName: string | null
}

export interface RosterStudent {
  id: string
  name: string
  class: string | null
  qrCode: string | null
}

export interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
  remarks?: string | null
}

export interface SbaTask {
  id: string
  title: string
  formLevel: number
  component: string
  subject: { id: string; name: string }
  rubric?: { criteria: Array<{ id: string; description: string; maxMarks: number }> }
}

export interface SbaScoreSubmit {
  assessmentId: string
  studentId: string
  formLevel: number
  academicYear: number
  taskNumber: 1 | 2 | 3 | 4
  score?: number
  excellentCount?: number
  goodCount?: number
  fairCount?: number
  poorCount?: number
}
```

---

## 11. API client skeleton (React Native)

```typescript
// src/api/client.ts
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL!

export async function api<T>(
  path: string,
  options: RequestInit & { subdomain?: string } = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken')
  const subdomain = options.subdomain ?? (await SecureStore.getItemAsync('subdomain'))
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (subdomain) headers['x-school-subdomain'] = subdomain

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    // try refreshSession() once, then retry
  }
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data as T
}
```

---

## 12. Sync endpoint (batch)

**`POST /api/mobile/sync`**

```json
{
  "attendance": [
    { "date": "2026-05-18", "records": [{ "studentId": "...", "status": "present" }] }
  ],
  "scores": [
    { "assessmentId": "...", "studentId": "...", "formLevel": 1, "taskNumber": 1, "score": 17 }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "attendance": { "synced": 2, "failed": [] },
  "scores": { "synced": 5, "failed": [{ "index": 1, "error": "Student not found" }] }
}
```

---

## 13. Error handling

| Code    | Mobile UX                            |
| ------- | ------------------------------------ |
| 400     | Show validation message from `error` |
| 401     | Refresh token or redirect to login   |
| 403     | “You don’t have permission”          |
| 404     | “Class or assessment not found”      |
| 409     | Rare; show server message            |
| Network | Queue for offline sync               |

---

## 14. Security checklist

- [ ] Tokens only in secure storage (never AsyncStorage plain text for production)
- [ ] Certificate pinning (optional, production)
- [ ] Subdomain validated before login (prevent typos → wrong tenant)
- [ ] No student PII exported to analytics
- [ ] Lock app with PIN/biometric (optional layer)

---

## 15. Testing checklist

1. Login with St. Mary’s subdomain + teacher account.
2. Load session → see assignments.
3. Mark attendance for one class → verify on web `/dashboard/teacher/attendance`.
4. Record SBA score → verify on web ECZ hub.
5. Airplane mode → queue 3 marks → online → `POST /api/mobile/sync`.
6. Wrong subdomain → clear error.

---

## 16. Web routes that show the same data

| Data        | Web path                             |
| ----------- | ------------------------------------ |
| Attendance  | `/dashboard/teacher/attendance`      |
| ECZ scores  | `/dashboard/teacher/assessments/ecz` |
| Class lists | `/dashboard/classes`                 |

---

## 17. Implementation order (recommended)

1. Expo app + theme + secure storage
2. School select + mobile login
3. Session context + home
4. Attendance register (online only)
5. SBA score entry (online only)
6. Offline queue + sync
7. Polish: logos, pull-to-refresh, haptics

---

## 18. Related backend files

| File                                      | Purpose                            |
| ----------------------------------------- | ---------------------------------- |
| `app/api/mobile/auth/login/route.js`      | Mobile JWT login                   |
| `app/api/mobile/auth/refresh/route.js`    | Token refresh                      |
| `app/api/mobile/session-context/route.js` | Bootstrap                          |
| `app/api/mobile/class-roster/route.js`    | Students                           |
| `app/api/mobile/sync/route.js`            | Offline batch                      |
| `app/api/mobile/school/lookup/route.js`   | Subdomain validation (public)      |
| `zsms-mobile/`                            | React Native (Expo) app source     |
| `lib/mobile/theme.js`                     | Shared color tokens (web + mobile) |
| `app/api/attendance/route.js`             | Attendance CRUD                    |
| `app/api/assessments/sba-scores/route.js` | Scores                             |
| `lib/utils/getSchoolId.js`                | Subdomain → schoolId               |
| `lib/middleware/auth.js`                  | Bearer + cookies                   |

---

_Last updated: integration spec for React Native companion app (attendance + ECZ SBA scores)._
