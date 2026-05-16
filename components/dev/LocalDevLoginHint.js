'use client'

const SHOW =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SHOW_DEV_LOGIN_HINT === 'true'

const ACCOUNTS = [
  ['Headteacher', 'headteacher@zsms.local'],
  ['HOD', 'hod@zsms.local'],
  ['Teacher', 'teacher@zsms.local'],
  ['Student', 'student@zsms.local'],
]

export default function LocalDevLoginHint() {
  if (!SHOW) return null

  return (
    <aside
      className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-950"
      aria-label="Local development login hint"
    >
      <p className="font-semibold mb-2">Local test accounts (npm run seed:local)</p>
      <p className="mb-2 text-amber-900">
        Password: <code className="font-mono">ZsmsLocal@Test2026</code> or your{' '}
        <code className="font-mono">LOCAL_DEV_PASSWORD</code> in .env
      </p>
      <ul className="space-y-1 font-mono">
        {ACCOUNTS.map(([role, email]) => (
          <li key={email}>
            {role}: {email}
          </li>
        ))}
      </ul>
    </aside>
  )
}
