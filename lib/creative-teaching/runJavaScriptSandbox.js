import vm from 'vm'

const MAX_CODE_LENGTH = 32_000

const DANGEROUS_PATTERNS = [
  /require\s*\(/,
  /process\./,
  /child_process/,
  /__dirname/,
  /\bfs\./,
  /eval\s*\(/,
  /Function\s*\(/,
  /import\s*\(/,
  /import\.meta/,
  /fetch\s*\(/,
  /XMLHttpRequest/,
]

function assertSafeStudentCode(src) {
  if (DANGEROUS_PATTERNS.some((p) => p.test(src))) {
    const err = new Error('This code contains restricted operations.')
    err.code = 'DANGEROUS_CODE'
    throw err
  }
}

function formatArg(value) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Run student JavaScript safely on the server (console.log only, no require/fetch).
 */
export function runJavaScriptSandbox(code) {
  const src = String(code || '')
  if (!src.trim()) {
    return { stdout: '(No output)', stderr: '', runtime: 'sandbox' }
  }
  if (src.length > MAX_CODE_LENGTH) {
    return { stdout: '', stderr: 'Code is too long (max 32KB)', runtime: 'sandbox' }
  }

  try {
    assertSafeStudentCode(src)
  } catch (e) {
    return { stdout: '', stderr: e.message, runtime: 'sandbox', error: true }
  }

  const logs = []
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map(formatArg).join(' ')),
      warn: (...args) => logs.push('[warn] ' + args.map(formatArg).join(' ')),
      error: (...args) => logs.push('[error] ' + args.map(formatArg).join(' ')),
    },
  }

  try {
    vm.createContext(sandbox)
    vm.runInContext(src, sandbox, { timeout: 5000, filename: 'playground.js' })
    return {
      stdout: logs.join('\n') || '(No output)',
      stderr: '',
      runtime: 'sandbox',
    }
  } catch (e) {
    return {
      stdout: logs.join('\n'),
      stderr: String(e?.message || e),
      runtime: 'sandbox',
    }
  }
}
