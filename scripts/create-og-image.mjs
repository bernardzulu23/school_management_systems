/**
 * Creates public/og-image.jpg (1200×630) from favicon.svg for Open Graph previews.
 * Run: node scripts/create-og-image.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'og-image.jpg')

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.warn('sharp not available — copy a 1200×630 branded JPEG to public/og-image.jpg manually')
    process.exit(0)
  }

  const svg = path.join(root, 'public', 'favicon.svg')
  if (!fs.existsSync(svg)) {
    console.warn('favicon.svg missing')
    process.exit(1)
  }

  await sharp(svg)
    .resize(400, 400)
    .extend({
      top: 115,
      bottom: 115,
      left: 400,
      right: 400,
      background: { r: 45, g: 27, b: 78, alpha: 1 },
    })
    .jpeg({ quality: 85 })
    .toFile(out)

  console.log('Wrote', out)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
