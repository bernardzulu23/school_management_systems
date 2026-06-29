import { redirect } from 'next/navigation'
import { assertGuidancePortalServerAccess } from '@/lib/guidance/requireGuidancePortal'

export const dynamic = 'force-dynamic'

export default async function GuidanceDashboardLayout({ children }) {
  const access = await assertGuidancePortalServerAccess()
  if (!access.ok) redirect(access.redirectTo)
  return children
}
