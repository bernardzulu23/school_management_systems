docker compose down
docker compose up

# Check if anything is listening on port 3000

netstat -tlnp 2>/dev/null || ss -tlnp

# Check running processes

ps aux

# Check if the app files exist

ls .next/standalone/

# Check web logs for the actual error:

docker compose logs web

# Check if env vars are loaded:

docker exec school_management_systems-web-1 env | findstr JWT

# The problem is the seed inside the container is using a baked-in URL from build time. Run it using a fresh node container on the same Docker network instead:

docker run --rm `  --network school_management_systems_default`
-e DATABASE_URL="postgresql://postgres:postgres@db:5432/zsms" `  -v "${PWD}:/app"`
-w /app `  node:20-slim`
sh -c "npm install --legacy-peer-deps && node prisma/seed.js"

# restarting only website

docker compose restart webDATABASE MODELS NEEDED
Add these to your Prisma schema:
prisma// Track HOD allocations awaiting admin approval
model DepartmentAllocation {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id])

departmentId String
department Department @relation(fields: [departmentId], references: [id])

// Status: DRAFT, SUBMITTED, APPROVED, REJECTED
status AllocationStatus @default(DRAFT)

// JSON storing allocation details (submitted by HOD)
allocationData Json // { teacherId, classes[], periodConfig: {...} }

// HOD who created it
createdByUserId String
createdBy User @relation("CreatedAllocations", fields: [createdByUserId], references: [id])

// Admin who approved/rejected
approvedByUserId String?
approvedBy User? @relation("ApprovedAllocations", fields: [approvedByUserId], references: [id])

submittedAt DateTime?
approvedAt DateTime?
rejectionReason String?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId, departmentId, status])
@@index([createdByUserId])
@@index([approvedByUserId])
}

enum AllocationStatus {
DRAFT
SUBMITTED
APPROVED
REJECTED
}

// Master timetable entry (each approved allocation becomes an entry here)
model MasterTimetableEntry {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id])

departmentId String
department Department @relation(fields: [departmentId], references: [id])

allocationId String // References the approved DepartmentAllocation

teacherId String
teacher User @relation(fields: [teacherId], references: [id])

classes String[] // e.g., ["Form 1B", "Grade 10"]
subject String // e.g., "Mathematics"
periodConfiguration String // e.g., "3 doubles = 6 periods"

insertedAt DateTime @default(now())

@@index([schoolId, departmentId])
@@index([teacherId])
}

// Notification for admin
model AllocationNotification {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id])

allocationId String
adminUserId String // Admin who receives notification
admin User @relation(fields: [adminUserId], references: [id])

read Boolean @default(false)
readAt DateTime?

createdAt DateTime @default(now())

@@index([schoolId, adminUserId, read])
}

API ENDPOINTS NEEDED
HOD Endpoints:
POST /api/allocations/create - Create draft allocation for a department - Body: { departmentId, teacherId, classes, subject, periodConfig } - Return: { allocationId, status: "DRAFT" }

POST /api/allocations/:allocationId/submit - Send allocation to admin - Body: {} (empty, just state change) - Return: { status: "SUBMITTED", submittedAt } - Triggers: Create notification for all admins in school

GET /api/allocations/my-department - Get all allocations for HOD's department(s) - Return: [...allocations with status]

GET /api/allocations/:allocationId - Get allocation details - Return: full allocation with feedback (if rejected)

PUT /api/allocations/:allocationId/update - Update DRAFT allocation only - Body: { classes, subject, periodConfig } - Return: updated allocation

DELETE /api/allocations/:allocationId - Delete DRAFT allocation only - Return: { success }
Admin Endpoints:
GET /api/admin/allocations/pending - Get all SUBMITTED allocations waiting for approval - Query: ?departmentId=xyz (optional filter) - Return: [{ id, departmentId, department, createdBy, submittedAt }]

GET /api/admin/allocations/:allocationId/review - Get full details for review - Return: { id, departmentId, teacherId, classes, subject, periodConfig, createdBy, feedback }

POST /api/admin/allocations/:allocationId/approve - Approve allocation + insert into master timetable - Body: {} (empty) - Side effect: Create MasterTimetableEntry - Return: { status: "APPROVED", insertedAt, masterEntryId }

POST /api/admin/allocations/:allocationId/reject - Reject with feedback - Body: { rejectionReason: "..." } - Return: { status: "REJECTED", rejectionReason }

GET /api/admin/master-timetable - Get current master timetable (all approved entries) - Return: [{ departmentId, teacherId, classes, subject, periodConfig }]

GET /api/admin/notifications - Get admin's allocation notifications - Return: [{ id, departmentId, read, createdAt }]

POST /api/admin/notifications/:notificationId/read - Mark notification as read - Return: { read: true, readAt }
