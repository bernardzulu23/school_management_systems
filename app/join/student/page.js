import { redirect } from 'next/navigation'

/** Independent student signup removed — schools and solo teachers only. */
export default function JoinStudentRedirectPage() {
  redirect('/join')
}
