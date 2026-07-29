import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'
import SeniorTeacherSchoolLevelGate from './SeniorTeacherSchoolLevelGate'

export const dynamic = 'force-dynamic'

export default async function SeniorTeacherDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/senior-teacher')
  return <SeniorTeacherSchoolLevelGate>{children}</SeniorTeacherSchoolLevelGate>
}
