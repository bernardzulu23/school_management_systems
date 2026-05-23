/**
 * Ensures expo-template-bare-minimum tarball exists locally (avoids npm registry fetch during prebuild).
 * Run automatically via npm run prebuild:android
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const templateDir = path.join(__dirname, '../node_modules/expo-template-bare-minimum')
const tgz = path.join(templateDir, 'expo-template-bare-minimum-52.0.79.tgz')

if (!fs.existsSync(templateDir)) {
  console.error('Missing expo-template-bare-minimum. Run: npm install')
  process.exit(1)
}

if (!fs.existsSync(tgz)) {
  console.log('Packing local Expo template (offline prebuild)...')
  execSync('npm pack', { cwd: templateDir, stdio: 'inherit' })
}

if (!fs.existsSync(tgz)) {
  console.error('Template tarball not found after npm pack:', tgz)
  process.exit(1)
}

console.log('Expo template ready:', tgz)
