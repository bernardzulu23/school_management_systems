/**
 * Generate ZSMS app icons (PNG) from the master SVG mark.
 *
 * Usage: node scripts/generate-app-icons.mjs
 * Requires: sharp (already a project dependency)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
const iconsDir = path.join(publicDir, 'icons')
const masterSvgPath = path.join(iconsDir, 'zsms-mark.svg')

async function renderPng(svgBuffer, size, outPath, { padded = false } = {}) {
  if (!padded) {
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath)
    return
  }

  // Maskable: keep art in ~80% safe zone with solid brand background.
  const inner = Math.round(size * 0.8)
  const pad = Math.round((size - inner) / 2)
  const art = await sharp(svgBuffer).resize(inner, inner).png().toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 }, // #1A1A1A
    },
  })
    .composite([{ input: art, left: pad, top: pad }])
    .png()
    .toFile(outPath)
}

async function main() {
  await mkdir(iconsDir, { recursive: true })
  const svg = await readFile(masterSvgPath)

  const outputs = [
    { file: path.join(publicDir, 'favicon-32.png'), size: 32 },
    { file: path.join(publicDir, 'apple-touch-icon.png'), size: 180 },
    { file: path.join(iconsDir, 'icon-192x192.png'), size: 192 },
    { file: path.join(iconsDir, 'icon-512x512.png'), size: 512 },
    { file: path.join(iconsDir, 'icon-512x512-maskable.png'), size: 512, padded: true },
    { file: path.join(iconsDir, 'badge-72x72.png'), size: 72 },
  ]

  for (const item of outputs) {
    await renderPng(svg, item.size, item.file, { padded: item.padded })
    console.log(`Wrote ${path.relative(root, item.file)}`)
  }

  // Keep favicon.ico as a simple 32px PNG renamed is not ideal; write multi-size ICO via sharp PNG copy note.
  // Browsers accept favicon-32; also overwrite favicon.ico with 32px PNG bytes for basic support.
  const icoPng = await sharp(svg).resize(32, 32).png().toBuffer()
  await writeFile(path.join(publicDir, 'favicon.ico'), icoPng)
  console.log('Wrote public/favicon.ico (32px PNG payload)')

  console.log('App icons generated from public/icons/zsms-mark.svg')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
