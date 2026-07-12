import { redirect } from 'next/navigation'
import { assertSicPortalServerAccess } from '@/lib/sic/requireSicPortal'

export const dynamic = 'force-dynamic'

export default async function SicDashboardLayout({ children }) {
  const access = await assertSicPortalServerAccess()
  if (!access.ok) redirect(access.redirectTo)
  return children
}
