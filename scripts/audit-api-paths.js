#!/usr/bin/env node
/**
 * Compare /api paths referenced in client code against app/api route files.
 * Run: node scripts/audit-api-paths.js
 */
const fs = require('fs')
const path = require('path')

function walkRoutes(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkRoutes(p, acc)
    else if (/^route\.(js|ts)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const routeFiles = walkRoutes(path.join(process.cwd(), 'app', 'api'))
const routes = new Set()
for (const f of routeFiles) {
  const rel = f
    .replace(/\\/g, '/')
    .replace(/^.*\/app\/api\//, '')
    .replace(/\/route\.(js|ts)$/, '')
  routes.add(`/api/${rel}`)
}

function routeMatches(ref) {
  if (routes.has(ref)) return true
  for (const r of routes) {
    const pat = `^${r.replace(/\[[^\]]+\]/g, '[^/]+')}$`
    if (new RegExp(pat).test(ref)) return true
  }
  return false
}

const exts = ['.js', '.jsx', '.ts', '.tsx']
const refs = new Map()

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8')
  const re = /['"`](\/api\/[a-zA-Z0-9_\-/[\]${}.]+)['"`]/g
  let m
  while ((m = re.exec(content))) {
    let p = m[1].split('?')[0]
    if (p.includes('${')) continue
    if (!refs.has(p)) refs.set(p, new Set())
    refs.get(p).add(file.replace(/\\/g, '/'))
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', 'zsms-mobile'].includes(ent.name)) continue
      scanDir(p)
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      scanFile(p)
    }
  }
}

for (const root of ['app', 'components', 'lib', 'hooks']) {
  scanDir(path.join(process.cwd(), root))
}

// lib/api.js axios paths (relative to /api)
try {
  const apiJs = fs.readFileSync(path.join(process.cwd(), 'lib', 'api.js'), 'utf8')
  const reApi = /(?:get|post|put|patch|delete)\(\s*['"`]([^'"`?]+)/gi
  let m
  while ((m = reApi.exec(apiJs))) {
    const p = `/api/${m[1].replace(/^\//, '')}`
    if (!refs.has(p)) refs.set(p, new Set(['lib/api.js']))
  }
} catch {
  /* ignore */
}

const missing = []
for (const [ref, files] of [...refs.entries()].sort()) {
  if (!routeMatches(ref)) {
    missing.push({ ref, files: [...files].slice(0, 5) })
  }
}

console.log(`Routes on disk: ${routes.size}`)
console.log(`Unique /api refs in code: ${refs.size}`)
console.log(`Missing route handlers: ${missing.length}\n`)
for (const m of missing) {
  console.log(m.ref)
  for (const f of m.files) console.log(`  - ${f}`)
}

process.exit(missing.length > 0 ? 1 : 0)
