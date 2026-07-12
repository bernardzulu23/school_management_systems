import { redirect } from 'next/navigation'
import { assertSicAssignAdminServerAccess } from '@/lib/sic/requireSicPortal'

export const dynamic = 'force-dynamic'

export default async function SicTeachersAdminLayout({ children }) {
  const access = await assertSicAssignAdminServerAccess()
  if (!access.ok) redirect(access.redirectTo)
  return children
}
