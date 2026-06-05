import { fileNameForLanguage } from '@/lib/creative-teaching/playgroundLanguages'

const DEFAULT_PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

export function getPistonExecuteUrl() {
  return String(process.env.PISTON_API_URL || DEFAULT_PISTON_URL).trim()
}

/** Optional — only needed for a private/self-hosted Piston instance. Public emkc.org needs no key. */
export function getPistonAuthHeaders() {
  const key = String(process.env.PISTON_API_KEY || process.env.PISTON_API_TOKEN || '').trim()
  if (!key) return {}
  return { Authorization: key.startsWith('Bearer ') ? key : key }
}

/**
 * Execute code via Piston (Python, Java, C, etc.).
 * @returns {{ stdout: string, stderr: string, runtime: 'piston', ok: boolean, status?: number, message?: string }}
 */
export async function executeViaPiston({ languageId, version, code }) {
  const url = getPistonExecuteUrl()
  const headers = {
    'Content-Type': 'application/json',
    ...getPistonAuthHeaders(),
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language: languageId,
      version,
      files: [{ name: fileNameForLanguage(languageId), content: code }],
      stdin: '',
      args: [],
      compile_timeout: 10000,
      run_timeout: 5000,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      String(data?.message || data?.error || '').trim() || `Execution service error (${res.status})`
    return {
      ok: false,
      status: res.status,
      message,
      stdout: '',
      stderr: message,
      runtime: 'piston',
    }
  }

  const stdout = String(data?.run?.stdout || '')
  const stderr = String(data?.run?.stderr || data?.compile?.stderr || '')

  return {
    ok: true,
    stdout: stdout || '(No output)',
    stderr,
    runtime: 'piston',
  }
}
