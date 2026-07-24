/**
 * In-browser code runners for the student Code Playground.
 * Used when server-side Piston is unavailable (public API now requires a key).
 */

/**
 * Run JavaScript in a sandboxed iframe (console.log capture).
 * @param {string} code
 * @returns {Promise<{ stdout: string, stderr: string, runtime: string }>}
 */
export function runJavaScriptInBrowser(code) {
  const src = String(code || '')
  if (!src.trim()) {
    return Promise.resolve({ stdout: '(No output)', stderr: '', runtime: 'browser-js' })
  }

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.style.cssText = 'position:fixed;left:-9999px;width:0;height:0;border:0;opacity:0'
    const channel = `zsms_pg_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const timer = setTimeout(() => {
      cleanup()
      resolve({
        stdout: '',
        stderr: 'Execution timed out (5s)',
        runtime: 'browser-js',
      })
    }, 5000)

    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      iframe.remove()
    }

    function onMessage(event) {
      const data = event?.data
      if (!data || data.channel !== channel) return
      cleanup()
      const logs = Array.isArray(data.logs) ? data.logs : []
      resolve({
        stdout: logs.join('\n') || (data.ok ? '(No output)' : ''),
        stderr: data.ok ? '' : String(data.error || 'Runtime error'),
        runtime: 'browser-js',
      })
    }

    window.addEventListener('message', onMessage)
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      cleanup()
      resolve({ stdout: '', stderr: 'Could not create sandbox', runtime: 'browser-js' })
      return
    }

    // Encode student code as JSON so it cannot break out of the script literal.
    const payload = JSON.stringify(src)
    doc.open()
    doc.write(`<!DOCTYPE html><html><body><script>
(function(){
  var channel = ${JSON.stringify(channel)};
  var logs = [];
  var console = {
    log: function(){ logs.push(Array.prototype.slice.call(arguments).map(String).join(' ')); },
    warn: function(){ logs.push('[warn] ' + Array.prototype.slice.call(arguments).map(String).join(' ')); },
    error: function(){ logs.push('[error] ' + Array.prototype.slice.call(arguments).map(String).join(' ')); }
  };
  try {
    var code = ${payload};
    (0, eval)(code);
    parent.postMessage({ channel: channel, ok: true, logs: logs }, '*');
  } catch (e) {
    parent.postMessage({ channel: channel, ok: false, error: String(e && e.message ? e.message : e), logs: logs }, '*');
  }
})();
<\/script></body></html>`)
    doc.close()
  })
}

let pyodideLoader = null

async function loadPyodideRuntime() {
  if (typeof window === 'undefined') {
    throw new Error('Python browser runtime is only available in the browser')
  }
  if (window.__zsmsPyodide) return window.__zsmsPyodide
  if (pyodideLoader) return pyodideLoader

  pyodideLoader = (async () => {
    const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
    const mod = await import(/* webpackIgnore: true */ `${indexURL}pyodide.mjs`)
    const pyodide = await mod.loadPyodide({ indexURL })
    window.__zsmsPyodide = pyodide
    return pyodide
  })()

  try {
    return await pyodideLoader
  } catch (e) {
    pyodideLoader = null
    throw e
  }
}

/**
 * Run Python via Pyodide in the browser.
 * @param {string} code
 * @returns {Promise<{ stdout: string, stderr: string, runtime: string }>}
 */
export async function runPythonInBrowser(code) {
  const src = String(code || '')
  if (!src.trim()) {
    return { stdout: '(No output)', stderr: '', runtime: 'pyodide' }
  }

  try {
    const pyodide = await loadPyodideRuntime()
    pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`)
    try {
      await pyodide.runPythonAsync(src)
    } catch (e) {
      const stderr = String(e?.message || e)
      const stdout = String(pyodide.runPython('sys.stdout.getvalue()') || '')
      return { stdout, stderr, runtime: 'pyodide' }
    }
    const stdout = String(pyodide.runPython('sys.stdout.getvalue()') || '')
    const stderr = String(pyodide.runPython('sys.stderr.getvalue()') || '')
    return {
      stdout: stdout || (stderr ? '' : '(No output)'),
      stderr,
      runtime: 'pyodide',
    }
  } catch (e) {
    return {
      stdout: '',
      stderr:
        String(e?.message || e) ||
        'Could not load in-browser Python. Check your network connection.',
      runtime: 'pyodide',
    }
  }
}
