import { describe, expect, it } from 'vitest'
import { gatewayMayAccessLog, smsLogTenantWhere } from '@/lib/sms/gatewayTenant'

describe('smsLogTenantWhere', () => {
  it('scopes dedicated gateway to its school', () => {
    expect(smsLogTenantWhere({ id: 'g1', schoolId: 'schA', isShared: false })).toEqual({
      gatewayId: 'g1',
      schoolId: 'schA',
    })
  })

  it('allows shared gateway to see all schools on the device', () => {
    expect(smsLogTenantWhere({ id: 'g1', schoolId: null, isShared: true })).toEqual({
      gatewayId: 'g1',
    })
  })

  it('refuses unscoped dedicated gateway', () => {
    expect(smsLogTenantWhere({ id: 'g1', schoolId: null, isShared: false })).toEqual({
      gatewayId: 'g1',
      schoolId: '__no_school__',
    })
  })
})

describe('gatewayMayAccessLog', () => {
  it('blocks dedicated gateway from another school’s log', () => {
    const gateway = { id: 'g1', schoolId: 'schA', isShared: false }
    expect(gatewayMayAccessLog(gateway, { gatewayId: 'g1', schoolId: 'schB' })).toBe(false)
    expect(gatewayMayAccessLog(gateway, { gatewayId: 'g1', schoolId: 'schA' })).toBe(true)
  })

  it('blocks wrong gatewayId even when shared', () => {
    expect(
      gatewayMayAccessLog(
        { id: 'g1', schoolId: null, isShared: true },
        { gatewayId: 'g2', schoolId: 'schA' }
      )
    ).toBe(false)
  })
})
