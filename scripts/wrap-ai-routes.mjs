import fs from 'fs'
import path from 'path'

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (ent.name === 'route.js' || ent.name === 'route.ts') out.push(p)
  }
  return out
}

const aiRoot = path.join(process.cwd(), 'app/api/ai')

for (const file of walk(aiRoot)) {
  let s = fs.readFileSync(file, 'utf8')
  if (!s.includes('export async function POST')) {
    console.log('no POST', path.relative(process.cwd(), file))
    continue
  }
  if (s.includes('withAILimits')) {
    console.log('skip', path.relative(process.cwd(), file))
    continue
  }

  if (!s.includes("from '@/lib/middleware/withAILimits'")) {
    const lines = s.split('\n')
    const insertAt = lines.findIndex((l) => l.startsWith('import '))
    lines.splice(insertAt >= 0 ? insertAt : 0, 0, "import { withAILimits } from '@/lib/middleware/withAILimits'")
    s = lines.join('\n')
  }

  s = s.replace(/export async function POST\(/, 'export const POST = withAILimits(async function POST(')

  const lastBrace = s.lastIndexOf('\n}')
  if (lastBrace === -1) {
    console.log('no closing brace', file)
    continue
  }
  s = `${s.slice(0, lastBrace)}\n})\n`

  fs.writeFileSync(file, s)
  console.log('wrapped', path.relative(process.cwd(), file))
}
