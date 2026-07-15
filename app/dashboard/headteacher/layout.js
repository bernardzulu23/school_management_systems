import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'

export const dynamic = 'force-dynamic'

export default async function HeadteacherDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/headteacher')
  return children
}
