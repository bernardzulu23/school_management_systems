'use client'

import { useMemo } from 'react'
import { ZAMBIA_PROVINCES } from '@/lib/platform/zambiaProvinces'
import { getDistrictsForProvince } from '@/lib/platform/zambiaDistricts'

/**
 * Province + district selectors for school onboarding (required for reporting streams).
 */
export function ProvinceDistrictFields({
  province,
  district,
  onProvinceChange,
  onDistrictChange,
  provinceClassName = 'w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1',
  districtClassName = provinceClassName,
  labelClassName = 'text-sm font-medium text-royalPurple-text2',
  required = true,
}) {
  const districts = useMemo(() => getDistrictsForProvince(province), [province])

  return (
    <>
      <div className="space-y-2">
        <label className={labelClassName}>Province{required ? ' *' : ''}</label>
        <select
          className={provinceClassName}
          value={province}
          onChange={(e) => {
            onProvinceChange(e.target.value)
            onDistrictChange('')
          }}
          required={required}
        >
          <option value="">Select province</option>
          {ZAMBIA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className={labelClassName}>District{required ? ' *' : ''}</label>
        <select
          className={districtClassName}
          value={district}
          onChange={(e) => onDistrictChange(e.target.value)}
          required={required}
          disabled={!province}
        >
          <option value="">{province ? 'Select district' : 'Select province first'}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="text-xs text-royalPurple-text3">
          Schools in the same province and district share one reporting stream for monitoring.
        </p>
      </div>
    </>
  )
}
