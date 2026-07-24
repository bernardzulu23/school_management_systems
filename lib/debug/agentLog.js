/**
 * Debug-mode agent logger — ingest + local NDJSON file (session a471db).
 * Keep folded behind #region agent log at call sites; remove after verification.
 */
import fs from 'fs'
import path from 'path'

const SESSION_ID = 'a471db'
const INGEST = 'http://127.0.0.1:7916/ingest/6dcdb48d-b049-4be9-ba0f-aa3c684df7ce'

function logPaths() {
  const cwd = process.cwd()
  return [
    // Cursor debug ingest default for this workspace
    'f:\\Mobile Apps\\ZSMS\\.cursor\\debug-a471db.log',
    path.join(cwd, '.cursor', 'debug-a471db.log'),
    path.join(cwd, 'debug-a471db.log'),
    path.join(cwd, '..', '.cursor', 'debug-a471db.log'),
    path.join(cwd, '..', 'debug-a471db.log'),
    'f:\\Mobile Apps\\ZSMS\\school_management_systems\\.cursor\\debug-a471db.log',
    'f:\\Mobile Apps\\ZSMS\\school_management_systems\\debug-a471db.log',
  ]
}

export function agentDebugLog(payload = {}) {
  const body = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    runId: 'pre-fix',
    ...payload,
  }
  const line = `${JSON.stringify(body)}\n`

  try {
    fetch(INGEST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': SESSION_ID,
      },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    /* ignore */
  }

  for (const p of logPaths()) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.appendFileSync(p, line)
      break
    } catch {
      /* try next */
    }
  }
}
