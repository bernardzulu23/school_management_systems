import { isEnabled } from '@/lib/featureFlags'
import { ComingSoon } from '@/components/ui/ComingSoon'

const HOD_GATES = {
  budget: { flag: 'HOD_BUDGET', name: 'Department Budget', term: 'Term 3, 2026' },
  correspondence: { flag: 'HOD_CORRESPONDENCE', name: 'Correspondence', term: 'Term 3, 2026' },
  meetings: { flag: 'HOD_MEETINGS', name: 'Department Meetings', term: 'Term 3, 2026' },
  minutes: { flag: 'HOD_MINUTES', name: 'Meeting Minutes', term: 'Term 3, 2026' },
  'stock-book': { flag: 'HOD_STOCK_BOOK', name: 'Stock Book', term: 'Term 3, 2026' },
  'staff-meetings': { flag: 'HOD_STAFF_MEETINGS', name: 'Staff Meetings', term: 'Term 3, 2026' },
  'daily-routine': { flag: 'HOD_DAILY_ROUTINE', name: 'Daily Routine', term: 'Term 3, 2026' },
}

/**
 * @param {'budget'|'correspondence'|'meetings'|'minutes'|'stock-book'|'staff-meetings'|'daily-routine'} key
 * @returns {import('react').ReactNode|null}
 */
export function hodFeatureGate(key) {
  const cfg = HOD_GATES[key]
  if (!cfg || isEnabled(cfg.flag)) return null
  return <ComingSoon featureName={cfg.name} expectedTerm={cfg.term} />
}
