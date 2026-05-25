const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'app', 'api')
const patterns = [
  {
    old: /const schoolId = user\.schoolId \|\| \(await getSchoolIdFromRequest\(([^)]+)\)\)/g,
    new: `const tenant = await resolveAuthenticatedSchoolId($1, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId`,
  },
  {
    old: /const schoolId = auth\.user\?\.schoolId \|\| \(await getSchoolIdFromRequest\(([^)]+)\)\)/g,
    new: `const tenant = await resolveAuthenticatedSchoolId($1, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId`,
  },
]

let changed = 0

function ensureImport(src) {
  if (src.includes('resolveAuthenticatedSchoolId')) return src
  const line = "import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'\n"
  return (
    line +
    src.replace(/import \{ getSchoolIdFromRequest \} from '@\/lib\/utils\/getSchoolId'\n/g, '')
  )
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/\.(js|ts)$/.test(name)) {
      let src = fs.readFileSync(p, 'utf8')
      let next = src
      for (const { old, new: rep } of patterns) {
        old.lastIndex = 0
        if (old.test(next)) {
          old.lastIndex = 0
          next = next.replace(old, rep)
        }
      }
      if (next !== src) {
        next = ensureImport(next)
        fs.writeFileSync(p, next)
        changed++
        console.log('patched', path.relative(path.join(__dirname, '..'), p))
      }
    }
  }
}

walk(root)
console.log(`Variant patch done. ${changed} file(s).`)
