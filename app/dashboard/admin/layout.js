import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/admin')
  return children
}
