/**
 * Bundle Monaco locally instead of loading from jsDelivr (CSP / offline friendly).
 */

let initPromise = null

export function configureMonacoLoader() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (initPromise) return initPromise

  window.MonacoEnvironment = {
    getWorker() {
      const code = 'self.onmessage = function () {}'
      const blob = new Blob([code], { type: 'text/javascript' })
      return new Worker(URL.createObjectURL(blob))
    },
  }

  initPromise = import('@monaco-editor/react')
    .then(({ loader }) => {
      loader.config({
        monaco: () => import('monaco-editor'),
      })
      return loader.init()
    })
    .catch((err) => {
      initPromise = null
      throw err
    })

  return initPromise
}
