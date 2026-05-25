const fs = require('fs')
const path = require('path')

const files = [
  'app/api/recipes/route.ts',
  'app/api/recipes/create/route.ts',
  'app/api/recipes/validate/route.ts',
  'app/api/recipes/[id]/route.ts',
  'app/api/recipes/[id]/validate/route.ts',
]

const root = path.join(__dirname, '..')

for (const rel of files) {
  const p = path.join(root, rel)
  let src = fs.readFileSync(p, 'utf8')
  if (!src.includes('getSchoolIdFromRequest')) continue
  src = src.replace(
    "import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'",
    "import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'"
  )
  src = src.replace(
    /const schoolId = await getSchoolIdFromRequest\(req as any\)/g,
    `const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId`
  )
  fs.writeFileSync(p, src)
  console.log('patched', rel)
}
