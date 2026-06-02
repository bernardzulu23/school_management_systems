/**
 * Default Prisma export — same as basePrisma (unscoped).
 * Prefer getTenantClient(schoolId) for school-scoped API routes.
 */
export { basePrisma as prisma, basePrisma, default } from './prisma/client'
