import { requireDashboardRole } from '@/lib/security/verifyDashboardAccess'
import { ParentChildProvider } from '@/components/parent/ParentChildContext'

export const dynamic = 'force-dynamic'

export default async function ParentDashboardLayout({ children }) {
  await requireDashboardRole('/dashboard/parent')
  return <ParentChildProvider>{children}</ParentChildProvider>
}
