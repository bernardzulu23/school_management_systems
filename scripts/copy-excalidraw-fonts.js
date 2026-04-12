const fs = require('fs')
const path = require('path')

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true })
}

async function copyDir(src, dest) {
  await ensureDir(dest)
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  await Promise.all(
    entries.map(async (ent) => {
      const srcPath = path.join(src, ent.name)
      const destPath = path.join(dest, ent.name)
      if (ent.isDirectory()) {
        await copyDir(srcPath, destPath)
      } else if (ent.isFile()) {
        await fs.promises.copyFile(srcPath, destPath)
      }
    })
  )
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const src = path.join(
    projectRoot,
    'node_modules',
    '@excalidraw',
    'excalidraw',
    'dist',
    'prod',
    'fonts'
  )
  const dest = path.join(projectRoot, 'public', 'fonts')

  try {
    const stat = await fs.promises.stat(src)
    if (!stat.isDirectory()) return
  } catch {
    return
  }

  await copyDir(src, dest)
}

main().catch(() => process.exit(0))
