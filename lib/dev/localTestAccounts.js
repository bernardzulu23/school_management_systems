/**
 * Canonical local-only test accounts. Safe to commit (no production secrets).
 * Password comes from LOCAL_DEV_PASSWORD in .env (gitignored).
 */

const DEFAULT_LOCAL_DEV_PASSWORD = 'ZsmsLocal@Test2026'

const LOCAL_DEV_SCHOOL = {
  subdomain: process.env.LOCAL_DEV_SCHOOL_SUBDOMAIN || 'local-dev',
  name: 'ZSMS Local Dev School',
  email: 'dev-school@zsms.local',
}

const LOCAL_DEV_ACCOUNTS = [
  {
    key: 'headteacher',
    email: 'headteacher@zsms.local',
    role: 'headteacher',
    name: 'Local Headteacher',
    dashboard: '/dashboard/admin',
  },
  {
    key: 'hod',
    email: 'hod@zsms.local',
    role: 'hod',
    name: 'Local HOD',
    department: 'Mathematics',
    dashboard: '/dashboard/hod',
  },
  {
    key: 'teacher',
    email: 'teacher@zsms.local',
    role: 'teacher',
    name: 'Local Teacher',
    dashboard: '/dashboard/teacher',
  },
  {
    key: 'student',
    email: 'student@zsms.local',
    role: 'student',
    name: 'Local Student',
    studentClass: 'Form 1A',
    dashboard: '/dashboard/student',
  },
]

function getLocalDevPassword() {
  const fromEnv = String(process.env.LOCAL_DEV_PASSWORD || '').trim()
  return fromEnv || DEFAULT_LOCAL_DEV_PASSWORD
}

function printLocalDevCredentials() {
  const password = getLocalDevPassword()
  const sub = LOCAL_DEV_SCHOOL.subdomain
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ZSMS — local test credentials (use every time)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Login URL:  http://localhost:3000/login`)
  console.log(`  School:     ${LOCAL_DEV_SCHOOL.name}`)
  console.log(`  Subdomain:  ${sub} (optional on localhost if emails are unique)`)
  console.log(`  Password:   ${password}  ← set LOCAL_DEV_PASSWORD in .env to override`)
  console.log('')
  for (const a of LOCAL_DEV_ACCOUNTS) {
    console.log(`  ${a.role.padEnd(12)} ${a.email}`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Re-apply anytime:  npm run seed:local')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

module.exports = {
  LOCAL_DEV_SCHOOL,
  LOCAL_DEV_ACCOUNTS,
  DEFAULT_LOCAL_DEV_PASSWORD,
  getLocalDevPassword,
  printLocalDevCredentials,
}
