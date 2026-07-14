// Generates docs/API_ROUTES.md from app/api route.js and route.ts files.
// Run: node scripts/generate-api-routes-doc.js
const fs = require('fs')
const path = require('path')

const API_ROOT = path.join(__dirname, '..', 'app', 'api')
const OUT = path.join(__dirname, '..', 'docs', 'API_ROUTES.md')

const HTTP_EXPORTS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else if (/^route\.(js|ts)$/.test(name)) files.push(full)
  }
  return files
}

function fileToRoute(filePath) {
  const rel = path.relative(API_ROOT, filePath).replace(/\\/g, '/')
  const parts = rel.split('/')
  parts.pop()
  const segments = parts.map((p) =>
    p.startsWith('[') && p.endsWith(']') ? `:${p.slice(1, -1)}` : p
  )
  return '/api/' + segments.join('/')
}

function detectMethods(content) {
  const methods = []
  for (const m of HTTP_EXPORTS) {
    const re = new RegExp(`export\\s+(?:const|async function)\\s+${m}\\b`)
    if (re.test(content)) methods.push(m)
  }
  return methods.length ? methods : ['—']
}

function extractComment(content) {
  const block = content.match(/\/\*\*([\s\S]*?)\*\//)
  if (!block) return ''
  return block[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@'))
    .slice(0, 3)
    .join(' ')
}

/** Markdown tables break on unescaped `|` in cell text. */
function sanitizeSummary(summary) {
  const text = String(summary || '').trim() || '—'
  return text.replace(/\|/g, '/').replace(/\r?\n/g, ' ')
}

function groupRoutes(routes) {
  const groups = new Map()
  for (const r of routes) {
    const seg = r.route.split('/').filter(Boolean)[1] || 'root'
    if (!groups.has(seg)) groups.set(seg, [])
    groups.get(seg).push(r)
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

function main() {
  const files = walk(API_ROOT).sort()
  const routes = files.map((file) => {
    const content = fs.readFileSync(file, 'utf8')
    return {
      route: fileToRoute(file),
      methods: detectMethods(content),
      summary: extractComment(content),
      file: path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'),
    }
  })

  const generatedAt = new Date().toISOString()
  const lines = [
    '# ZSMS API Routes Reference',
    '',
    '> Auto-generated — do not edit by hand. Regenerate with:',
    '>',
    '> ```bash',
    '> npm run docs:api-routes',
    '> ```',
    '',
    `Generated: ${generatedAt}`,
    '',
    `Total route files: **${routes.length}**`,
    '',
    '## Quick index',
    '',
    '| Prefix | Count |',
    '|--------|------:|',
  ]

  const grouped = groupRoutes(routes)
  for (const [prefix, items] of grouped) {
    lines.push(`| \`/api/${prefix}\` | ${items.length} |`)
  }

  lines.push('', '---', '')

  for (const [prefix, items] of grouped) {
    lines.push(`## /api/${prefix}`, '')
    lines.push('| Method | Route | Summary |', '|--------|-------|---------|')
    for (const r of items.sort((a, b) => a.route.localeCompare(b.route))) {
      const methods = r.methods.join(', ')
      const summary = sanitizeSummary(r.summary)
      lines.push(`| ${methods} | \`${r.route}\` | ${summary} |`)
    }
    lines.push('')
  }

  lines.push(
    '---',
    '',
    '## Conventions',
    '',
    '- Most routes require auth cookie + school tenant context.',
    '- Public: `/api/health`, `/api/auth/login`, `/api/attendance/qr-*`, `/api/public/*`.',
    '- Platform admin: `/api/platform/*`.',
    '- Mobile: `/api/mobile/*`.',
    ''
  )

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
  console.log(`Wrote ${routes.length} routes to ${OUT}`)
}

main()
