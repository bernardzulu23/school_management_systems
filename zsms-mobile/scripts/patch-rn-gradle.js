/**
 * Windows / offline Gradle fixes for @react-native/gradle-plugin.
 * Re-run after npm install (android:setup).
 */
const fs = require('fs')
const path = require('path')

const pluginRoot = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin')

function patchFile(rel, replacers) {
  const file = path.join(pluginRoot, rel)
  if (!fs.existsSync(file)) return
  let text = fs.readFileSync(file, 'utf8')
  let changed = false
  for (const [from, to] of replacers) {
    if (text.includes(from)) {
      text = text.replace(from, to)
      changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(file, text)
    console.log('patched', rel)
  }
}

patchFile('settings.gradle.kts', [
  [
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }',
    '// patched: foojay skipped (Windows SSL)\n// plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }',
  ],
])

for (const rel of [
  'settings-plugin/build.gradle.kts',
  'shared/build.gradle.kts',
  'shared-testutil/build.gradle.kts',
  'react-native-gradle-plugin/build.gradle.kts',
]) {
  patchFile(rel, [['kotlin { jvmToolchain(17) }', 'kotlin { jvmToolchain(20) }']])
}
