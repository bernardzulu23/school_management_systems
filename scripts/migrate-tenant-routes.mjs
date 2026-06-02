import fs from 'fs'
import path from 'path'

const files = [
  'app/api/student/flashcards/route.js',
  'app/api/student/materials/route.js',
  'app/api/student/mock-exam/start/route.js',
  'app/api/student/goals/route.js',
  'app/api/student/notices/route.js',
  'app/api/student/mock-exam/[id]/route.js',
  'app/api/student/results/route.js',
  'app/api/student/subjects/route.js',
  'app/api/student/mock-exam/route.js',
  'app/api/student/assessments/route.js',
  'app/api/student/mock-exam/[id]/submit/route.js',
  'app/api/assessments/route.js',
  'app/api/students/route.js',
]

const root = process.cwd()

for (const rel of files) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) {
    console.log('skip missing', rel)
    continue
  }
  let s = fs.readFileSync(p, 'utf8')
  if (s.includes('getTenantClient')) {
    console.log('already', rel)
    continue
  }

  s = s.replace(/import prisma from '@\/lib\/prisma'/g, "import { getTenantClient } from '@/lib/prisma/tenantClient'")
  s = s.replace(/import \{ prisma \} from '@\/lib\/prisma'/g, "import { getTenantClient } from '@/lib/prisma/tenantClient'")

  if (!s.includes('getTenantClient')) {
    console.log('no prisma import', rel)
    continue
  }

  s = s.replace(
    /(if \(!schoolId\) throw new ApiError\([^)]+\)\n)(?!\s*const db = getTenantClient)/g,
    '$1  const db = getTenantClient(schoolId)\n'
  )
  s = s.replace(
    /(if \(!schoolId\) return NextResponse\.json\([^)]+\)\n)(?!\s*const db = getTenantClient)/g,
    '$1  const db = getTenantClient(schoolId)\n'
  )

  s = s.replace(/\bprisma\./g, 'db.')
  fs.writeFileSync(p, s)
  console.log('patched', rel)
}
