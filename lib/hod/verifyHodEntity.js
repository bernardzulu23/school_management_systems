/**
 * Ensure an HOD record exists in the caller's department scope before attaching files.
 * @param {import('@prisma/client').PrismaClient} db
 * @param {string} entityType
 * @param {string} entityId
 * @param {{ departmentId: string | null }} scope
 */
export async function verifyHodEntityAccess(db, entityType, entityId, scope) {
  const deptWhere =
    scope.departmentId != null ? { departmentId: scope.departmentId } : { departmentId: null }

  switch (entityType) {
    case 'meeting':
      return db.hodMeeting.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'correspondence':
      return db.hodCorrespondence.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'daily_routine':
      return db.hodDailyRoutineTask.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'budget':
      return db.hodBudgetTransaction.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'stock':
      return db.hodStockItem.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'weekly_routine':
      return db.hodWeeklyRoutinePlan.findFirst({ where: { id: entityId, ...deptWhere } })
    case 'exam_analysis':
    case 'monitoring': {
      // Document cabinet: entityId must match the HOD department (or "school" when unscoped).
      const expected = scope.departmentId != null ? String(scope.departmentId) : 'school'
      if (String(entityId) !== expected) return null
      return { id: entityId, departmentId: scope.departmentId ?? null, cabinet: entityType }
    }
    default:
      return null
  }
}
