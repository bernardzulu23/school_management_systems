# Zambian School Management System - PRD

## Original Problem Statement

The subjects are not displaying in the Teaching Assignments section of the teacher registration form.

## Architecture

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based authentication with cookies
- **Multi-tenancy**: School-based data isolation via schoolId

## What's Been Implemented (March 28, 2026)

### Bug Fixes

1. **Fixed Subject Seeding** (`/app/app/api/subjects/route.js`)
   - Subjects API now seeds subjects for schools with 0 subjects
   - Handles duplicate subject codes (CHI for Chinese and Cinyanja)
   - Only seeds when no subjects exist to avoid conflicts

2. **Fixed Login Dev Fallback** (`/app/app/api/auth/login/route.js`)
   - Dev fallback now always infers school from email
   - Previously only triggered when schoolId was null

3. **Rate Limiter Adjustment** (`/app/lib/middleware/rateLimiter.js`)
   - Increased limit to 1000 for development
   - Production remains at 100 requests per 15 minutes

4. **Created server.js** (`/app/server.js`)
   - Custom server for production deployment
   - Listens on 0.0.0.0:3000 (or PORT env var)

## Deployment Status

### CRITICAL BLOCKERS

1. **PostgreSQL Database**
   - Application uses PostgreSQL (not MongoDB)
   - Emergent only provides managed MongoDB
   - **Options**:
     - Use external PostgreSQL (Neon — see `DATABASE_URL` in `.env.example`)
     - Migrate to MongoDB (major refactor)

2. **Supervisor Configuration**
   - Current config expects FastAPI + React structure
   - This is a Next.js fullstack app
   - Needs custom supervisor config for Next.js

## Test Credentials

- `headteacher@school.com` / `password123` - Demo International School
- `admin@kalambakuwadaysecondaryschool.edu` / `password123` - Kalambakuwa School

## Prioritized Backlog

### P0 (Critical)

- [ ] Resolve PostgreSQL deployment strategy
- [ ] Update supervisor configuration for Next.js

### P1 (High)

- [ ] End-to-end test teacher registration flow
- [ ] Verify subjects dropdown in UI

### P2 (Medium)

- [ ] Add "Refresh Subjects" button in registration form
- [ ] Improve error handling for subject loading failures

## Next Tasks

1. Decide on database deployment strategy
2. Configure proper deployment environment
3. Full integration testing of registration flow
