import { fileNameForLanguage } from '@/lib/creative-teaching/playgroundLanguages'

const DEFAULT_PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

export function getPistonExecuteUrl() {
  return String(process.env.PISTON_API_URL || DEFAULT_PISTON_URL).trim()
}

/**
 * Auth for Piston. Public emkc.org execute requires a key as of 2026-02-15.
 * Set PISTON_API_KEY / PISTON_API_TOKEN, or point PISTON_API_URL at a self-hosted instance.
 */
export function getPistonAuthHeaders() {
  const key = String(process.env.PISTON_API_KEY || process.env.PISTON_API_TOKEN || '').trim()
  if (!key) return {}
  if (/^(Bearer|Token)\s+/i.test(key)) return { Authorization: key }
  return { Authorization: `Bearer ${key}` }
}

/**
 * Execute code via Piston (Java, C, C++, C#, Bash, optional Python).
 * @returns {{ stdout: string, stderr: string, runtime: 'piston', ok: boolean, status?: number, message?: string }}
 */
export async function executeViaPiston({ languageId, version, code }) {
  const url = getPistonExecuteUrl()
  const headers = {
    'Content-Type': 'application/json',
    ...getPistonAuthHeaders(),
  }

  let res
  try {
    res = await fetch(url, {
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
  } catch (e) {
    const message = `Could not reach code execution service (${e?.message || 'network error'})`
    return { ok: false, status: 503, message, stdout: '', stderr: message, runtime: 'piston' }
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    let message =
      String(data?.message || data?.error || '').trim() || `Execution service error (${res.status})`
    if (res.status === 401 || res.status === 403) {
      message =
        'Code execution service requires authentication. Set PISTON_API_KEY or point PISTON_API_URL at a self-hosted Piston instance.'
    }
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
