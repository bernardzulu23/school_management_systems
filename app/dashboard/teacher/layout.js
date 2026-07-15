import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'

export const dynamic = 'force-dynamic'

export default async function TeacherDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/teacher')
  return children
}
