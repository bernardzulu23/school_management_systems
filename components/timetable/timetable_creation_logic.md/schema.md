// ADD ALL OF THESE TO prisma/schema.prisma
// Then run: npx prisma migrate dev --name timetable_system
// npx prisma generate

// ── Teacher Class Allocation (HOD creates these) ─────────────────
model TeacherAllocation {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

hodId String // HOD who created this
hod User @relation("HODAllocations", fields: [hodId], references: [id])

teacherId String
teacher User @relation("TeacherAllocations", fields: [teacherId], references: [id])

subjectId String
subject Subject @relation(fields: [subjectId], references: [id])

classId String
class Class @relation(fields: [classId], references: [id])

// Period configuration
periodsPerWeek Int // total periods e.g. 6
blockType String // "SINGLE" | "DOUBLE" | "TRIPLE" | "MIXED"
// MIXED means the breakdown below applies
singlePeriods Int @default(0) // how many 40-min singles
doublePeriods Int @default(0) // how many 80-min doubles
triplePeriods Int @default(0) // how many 120-min triples

term String @default("Term 1") // "Term 1" | "Term 2" | "Term 3"
academicYear String @default("2025")

notes String?
status String @default("draft") // "draft" | "pushed" | "scheduled"
pushedAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([schoolId, teacherId, subjectId, classId, term, academicYear])
@@index([schoolId, hodId])
@@index([schoolId, teacherId])
@@index([schoolId, status])
}

// ── Timetable Notifications (HOD → Headteacher) ──────────────────
model TimetableNotification {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

fromUserId String
fromUser User @relation("NotificationSender", fields: [fromUserId], references: [id])

toUserId String
toUser User @relation("NotificationReceiver", fields: [toUserId], references: [id])

type String // "HOD_ALLOCATION_PUSHED" | "TIMETABLE_PUBLISHED" | "CONFLICT_ALERT"
title String
message String
department String? // which department pushed
term String?
read Boolean @default(false)
readAt DateTime?

// Metadata (JSON)
meta Json? // { allocationIds: [], teacherCount: 0, totalPeriods: 0 }

createdAt DateTime @default(now())

@@index([schoolId, toUserId, read])
@@index([schoolId, toUserId])
}

// ── Timetable Configuration (Admin sets breaks) ───────────────────
model TimetableConfig {
id String @id @default(cuid())
schoolId String @unique
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

startTime String @default("07:00") // school day start
endTime String @default("18:00") // school day end
singleDuration Int @default(40) // minutes per single period
term String @default("Term 1")
academicYear String @default("2025")
workingDays String[] @default(["Monday","Tuesday","Wednesday","Thursday","Friday"])

// Break slots stored as JSON array
// e.g. [{"label":"Short Break","start":"10:20","end":"10:40","isLunch":false},
// {"label":"Lunch","start":"12:40","end":"13:20","isLunch":true}]
breakSlots Json @default("[]")

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// ── Generated Timetable Slots ────────────────────────────────────
model TimetableEntry {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

allocationId String
allocation TeacherAllocation @relation(fields: [allocationId], references: [id])

teacherId String
subjectId String
classId String

dayOfWeek String // "Monday" | "Tuesday" etc
startTime String // "07:00"
endTime String // "08:20" (double=80min from 07:00)
durationMin Int // 40, 80, or 120
periodType String // "SINGLE" | "DOUBLE" | "TRIPLE"
periodNumber Int // 1, 2, 3... (period slot within the day)

term String
academicYear String
status String @default("draft") // "draft" | "published"
publishedAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId, dayOfWeek])
@@index([schoolId, teacherId, dayOfWeek])
@@index([schoolId, classId, dayOfWeek])
@@index([schoolId, status])
}

// ADD TO SCHOOL MODEL:
// allocations TeacherAllocation[]
// timetableNotifications TimetableNotification[]
// timetableConfig TimetableConfig?
// timetableEntries TimetableEntry[]

// ADD TO USER MODEL:
// hodAllocations TeacherAllocation[] @relation("HODAllocations")
// teacherAllocations TeacherAllocation[] @relation("TeacherAllocations")
// sentNotifications TimetableNotification[] @relation("NotificationSender")
// receivedNotifications TimetableNotification[] @relation("NotificationReceiver")

// ADD TO TeacherAllocation:
// timetableEntries TimetableEntry[]
