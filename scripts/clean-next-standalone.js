const fs = require('fs')
const path = require('path')

const standalonePath = path.join(process.cwd(), '.next', 'standalone')

try {
  fs.rmSync(standalonePath, { recursive: true, force: true })
} catch {}
