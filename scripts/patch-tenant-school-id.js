/**
 * Replace unsafe tenant resolution in API routes.
 * Run: node scripts/patch-tenant-school-id.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'app', 'api')
const OLD =
  /const schoolId = auth\.user\?\.schoolId \|\| \(await getSchoolIdFromRequest\(request\)\)/g
const NEW = `const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId`

let changed = 0
let files = 0

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.(js|ts)$/.test(name)) {
      let src = fs.readFileSync(p, 'utf8')
      if (!OLD.test(src)) continue
      OLD.lastIndex = 0
      if (!src.includes('resolveAuthenticatedSchoolId')) {
        if (src.includes("from '@/lib/utils/getSchoolId'")) {
          src = src.replace(
            /import \{ getSchoolIdFromRequest \} from '@\/lib\/utils\/getSchoolId'/,
            "import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'"
          )
        } else if (src.includes('getSchoolIdFromRequest')) {
          const importLine =
            "import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'\n"
          src = importLine + src
        }
      }
      const next = src.replace(OLD, NEW)
      if (next !== src) {
        fs.writeFileSync(p, next)
        changed++
        console.log('patched', path.relative(path.join(__dirname, '..'), p))
      }
      files++
    }
  }
}

walk(root)
console.log(`Done. ${changed} file(s) updated.`)
