import { getSchoolSubdomainFromHost, normalizeSchoolSubdomain } from '@/lib/utils/schoolSubdomain'

describe('schoolSubdomain', () => {
  const prev = { ...process.env }

  beforeEach(() => {
    process.env.APP_BASE_DOMAIN = 'bluepeacktechnologies.com'
    process.env.BASE_DOMAIN = 'bluepeacktechnologies.com'
    delete process.env.NEXT_PUBLIC_APP_BASE_DOMAIN
    delete process.env.NEXT_PUBLIC_BASE_DOMAIN
  })

  afterAll(() => {
    process.env = prev
  })

  test('treats apex and www as platform hosts', () => {
    expect(getSchoolSubdomainFromHost('bluepeacktechnologies.com')).toBeNull()
    expect(getSchoolSubdomainFromHost('www.bluepeacktechnologies.com')).toBeNull()
    expect(getSchoolSubdomainFromHost('WWW.BluePeakTechnologies.com')).toBeNull()
  })

  test('extracts school slug from tenant host', () => {
    expect(getSchoolSubdomainFromHost('dongordon.bluepeacktechnologies.com')).toBe('dongordon')
    expect(getSchoolSubdomainFromHost('www.dongordon.bluepeacktechnologies.com')).toBe('dongordon')
  })

  test('rejects reserved explicit slugs', () => {
    expect(normalizeSchoolSubdomain('www')).toBeNull()
    expect(normalizeSchoolSubdomain('api')).toBeNull()
    expect(normalizeSchoolSubdomain('stmarys')).toBe('stmarys')
  })
})
