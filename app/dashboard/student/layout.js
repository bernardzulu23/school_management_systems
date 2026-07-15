import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'

export const dynamic = 'force-dynamic'

export default async function StudentDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/student')
  return children
}
