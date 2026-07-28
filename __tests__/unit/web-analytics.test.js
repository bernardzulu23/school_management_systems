import { describe, it, expect } from 'vitest'
import { extractVisitTotals, extractDailySeries } from '@/lib/platform/webAnalytics'

describe('webAnalytics parsers', () => {
  it('extracts totals from object payload', () => {
    expect(
      extractVisitTotals({
        data: { visitors: 12, pageviews: 40 },
      })
    ).toEqual({ visitors: 12, pageviews: 40 })
  })

  it('extracts totals from array payload', () => {
    expect(
      extractVisitTotals({
        data: [
          { visitors: 3, pageViews: 5 },
          { visitors: 2, pageviews: 7 },
        ],
      })
    ).toEqual({ visitors: 5, pageviews: 12 })
  })

  it('builds sorted daily series labels', () => {
    const series = extractDailySeries({
      data: [
        { timestamp: '2026-07-28T00:00:00.000Z', visitors: 4, pageviews: 9 },
        { timestamp: '2026-07-27T00:00:00.000Z', visitors: 2, pageviews: 3 },
      ],
    })
    expect(series).toHaveLength(2)
    expect(series[0].visitors).toBe(2)
    expect(series[1].visitors).toBe(4)
    expect(series[0].label).toBeTruthy()
  })
})
