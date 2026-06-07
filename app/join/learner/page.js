import { redirect } from 'next/navigation'

/** Students cannot self-register — they are added by the teacher with a one-time code. */
export default function JoinLearnerRedirectPage() {
  redirect('/login')
}
