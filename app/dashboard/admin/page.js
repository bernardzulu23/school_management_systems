/**
 * REDIRECT ROUTE — DO NOT DELETE
 * Reason: Legacy `/dashboard/admin` path in bookmarks and old docs.
 * Review date: Term 1 2027.
 */
import { redirect } from 'next/navigation'

export default function AdminDashboardAlias() {
  redirect('/dashboard/headteacher')
}
