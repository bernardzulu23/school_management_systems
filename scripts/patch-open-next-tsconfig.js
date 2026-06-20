/**
 * OpenNext copies tsconfig into .open-next/server-functions/default/ with paths
 * relative to that folder, so @types/node|react|react-dom fail to resolve in the IDE.
 * Re-run after regenerating .open-next (e.g. open-next build).
 */
const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '..',
  '.open-next',
  'server-functions',
  'default',
  'tsconfig.json'
)
if (!fs.existsSync(path.dirname(target))) {
  process.exit(0)
}

const patched = {
  extends: '../../../tsconfig.json',
  compilerOptions: {
    paths: {
      '@/*': ['./*'],
    },
    plugins: [{ name: 'next' }],
  },
  include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  exclude: ['node_modules'],
}

fs.writeFileSync(target, `${JSON.stringify(patched, null, 2)}\n`)
console.log(`Patched ${path.relative(process.cwd(), target)}`)
