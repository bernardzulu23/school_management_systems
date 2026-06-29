import { redirect } from 'next/navigation'
import { assertGuidanceAssignmentAdminServerAccess } from '@/lib/guidance/requireGuidancePortal'

export const dynamic = 'force-dynamic'

export default async function GuidanceTeachersAdminLayout({ children }) {
  const access = await assertGuidanceAssignmentAdminServerAccess()
  if (!access.ok) redirect(access.redirectTo)
  return children
}
