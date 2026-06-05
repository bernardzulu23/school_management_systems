import fs from 'fs'
import path from 'path'

const LOG_FILE = path.join(process.cwd(), 'debug-260cd5.log')
const ENDPOINT = 'http://127.0.0.1:7484/ingest/003eea8f-a8f1-47b7-bf4d-1dc7f1798af5'
const SESSION_ID = '260cd5'

/** Append NDJSON debug line (server) and best-effort HTTP ingest. */
export function agentLog(location, message, data = {}, hypothesisId = '') {
  const entry = {
    sessionId: SESSION_ID,
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  }
  try {
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`)
  } catch {
    /* ignore */
  }
  if (typeof fetch === 'function') {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
      body: JSON.stringify(entry),
    }).catch(() => {})
  }
}
