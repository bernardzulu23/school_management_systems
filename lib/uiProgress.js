export function startTopLoading(label = 'Refreshing') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('top-loading:start', { detail: { label } }))
}

export function setTopLoading(percent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('top-loading:update', { detail: { percent } }))
}

export function stopTopLoading() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('top-loading:stop'))
}
