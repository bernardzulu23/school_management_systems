import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'
import HodSchoolLevelGate from './HodSchoolLevelGate'

export const dynamic = 'force-dynamic'

export default async function HodDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/hod')
  return <HodSchoolLevelGate>{children}</HodSchoolLevelGate>
}
