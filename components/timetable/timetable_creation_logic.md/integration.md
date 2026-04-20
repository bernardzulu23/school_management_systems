# Timetable System — Integration Guide

## File Placement

| Output file                            | → Destination in your project                                 |
| -------------------------------------- | ------------------------------------------------------------- |
| schema-additions.prisma                | Add contents to prisma/schema.prisma                          |
| api/allocations-route.js               | app/api/timetable/allocations/route.js                        |
| api/push-route.js                      | app/api/timetable/allocations/push/route.js                   |
| api/notifications-route.js             | app/api/timetable/notifications/route.js                      |
| api/generate-route.js                  | app/api/timetable/generate/route.js                           |
| api/config-publish-entries-route.js    | Split into 3 files:                                           |
|                                        | → app/api/timetable/config/route.js (POST function)           |
|                                        | → app/api/timetable/publish/route.js (publishHandler as POST) |
|                                        | → app/api/timetable/entries/route.js (entriesHandler as GET)  |
| components/HODAllocationPage.js        | components/timetable/HODAllocationPage.js                     |
| components/MasterTimetableGenerator.js | components/timetable/MasterTimetableGenerator.js              |

## Step 1 — Database migration

```bash
# Add schema additions to prisma/schema.prisma, then:
npx prisma migrate dev --name timetable_system
npx prisma generate
```

## Step 2 — Create the pages

```javascript
// app/dashboard/hod/allocation/page.js
import HODAllocationPage from '@/components/timetable/HODAllocationPage'
export default function Page() { return <HODAllocationPage /> }

// app/dashboard/headteacher/timetable/page.js
import MasterTimetableGenerator from '@/components/timetable/MasterTimetableGenerator'
export default function Page() { return <MasterTimetableGenerator /> }
```

## Step 3 — Add notification bell to headteacher header

In your DashboardLayout.js, import and add the bell:

```javascript
import { TimetableNotificationBell } from '@/components/timetable/MasterTimetableGenerator'

// Inside your header nav:
{
  role === 'headteacher' && <TimetableNotificationBell />
}
```

## Step 4 — Add sidebar link for HOD

In your HOD sidebar/nav:

```javascript
{ href: '/dashboard/hod/allocation', label: 'Class Allocation', icon: 'BookOpen' }
```

## Step 5 — Single period delete allocation API

Create: app/api/timetable/allocations/[id]/route.js

```javascript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'

export async function DELETE(req, { params }) {
  const schoolId = await getSchoolIdFromRequest(req)
  const user = await getAuthUser(req)
  if (!user || !schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.teacherAllocation.delete({ where: { id, schoolId } })
  return NextResponse.json({ success: true })
}
```

## Complete user flow

### HOD flow:

1. Go to /dashboard/hod/allocation
2. Select Term + Year
3. Click "Add Allocation"
4. Pick: Teacher → Subject → Class → Periods per week → Block type
5. For MIXED: specify how many singles + doubles + triples
6. Save → repeat for all teachers in department
7. Click "Push X to Headteacher" when done
8. Headteacher gets toast notification instantly (via 30s poll)

### Headteacher flow:

1. Sees notification bell with red badge
2. Clicks bell → reads "Mathematics Dept allocations ready"
3. Clicks "Open Timetable →" in notification
4. Goes to /dashboard/headteacher/timetable
5. Clicks "Configure Breaks & Times" → sets 07:00–17:00, adds breaks
6. Saves configuration
7. Selects departments to include
8. Clicks "Generate Master Timetable"
9. Algorithm runs, respects all HOD period/block rules
10. Views grid → if no conflicts, clicks "Publish Timetable"
11. All teachers get notified automatically

## Period/time rules enforced by the algorithm

- 1 single = exactly 40 minutes (1 slot)
- 1 double = exactly 80 minutes (2 consecutive slots, NEVER split across breaks)
- 1 triple = exactly 120 minutes (3 consecutive slots)
- Doubles are placed first (harder to fit), then triples, then singles
- No teacher can be in two places at once
- No class can have two subjects at the same time
- Breaks are hard boundaries — no period runs across a break
- School operates 07:00–18:00 (configurable by admin)
