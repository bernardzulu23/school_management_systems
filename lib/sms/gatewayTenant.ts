/**
 * Tenant filters for Android gateway queue/status mutations.
 * Dedicated gateway → only that school’s logs; shared → all schools on the device.
 */
export function smsLogTenantWhere(gateway: {
  id: string
  schoolId: string | null
  isShared: boolean
}) {
  if (gateway.isShared) {
    return { gatewayId: gateway.id }
  }
  if (gateway.schoolId) {
    return { gatewayId: gateway.id, schoolId: gateway.schoolId }
  }
  // Unscoped dedicated gateway without schoolId — refuse to leak cross-tenant rows
  return { gatewayId: gateway.id, schoolId: '__no_school__' }
}

/**
 * Dedicated gateways may only touch logs for their bound school.
 * Shared gateways may touch any school’s log that was queued to this gatewayId.
 */
export function gatewayMayAccessLog(
  gateway: { id: string; schoolId: string | null; isShared: boolean },
  log: { gatewayId: string | null; schoolId: string | null }
) {
  if (String(log.gatewayId || '') !== gateway.id) return false
  if (gateway.isShared) return true
  if (!gateway.schoolId) return false
  return String(log.schoolId || '') === gateway.schoolId
}
