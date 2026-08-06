/**
 * Shared beforeinstallprompt capture — one listener for InstallAppPrompt + legacy PWAInstaller.
 */

const DISMISS_KEY = 'zsms-pwa-install-dismissed'
const listeners = new Set()

/** @type {Event | null} */
let deferredPrompt = null
let capturing = false

function emit(state) {
  for (const fn of listeners) {
    try {
      fn(state)
    } catch {
      /* ignore subscriber errors */
    }
  }
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true
  if (window.navigator?.standalone === true) return true
  return false
}

/** iPhone/iPad Safari (not Chrome iOS standalone); used for A2HS tip only. */
export function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return Boolean(iOS && webkit && notOther)
}

export function initPwaInstallCapture() {
  if (typeof window === 'undefined' || capturing) return
  capturing = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit({ installable: true, installed: false })
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    localStorage.removeItem(DISMISS_KEY)
    emit({ installable: false, installed: true })
  })
}

/**
 * @param {(state: { installable: boolean, installed: boolean }) => void} fn
 * @returns {() => void}
 */
export function subscribePwaInstall(fn) {
  initPwaInstallCapture()
  listeners.add(fn)
  fn({
    installable: Boolean(deferredPrompt),
    installed: isStandaloneDisplay(),
  })
  return () => listeners.delete(fn)
}

export function getDeferredInstallPrompt() {
  return deferredPrompt
}

export async function promptPwaInstall() {
  const promptEvent = deferredPrompt
  if (!promptEvent || typeof promptEvent.prompt !== 'function') return false
  try {
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    deferredPrompt = null
    emit({ installable: false, installed: outcome === 'accepted' || isStandaloneDisplay() })
    return outcome === 'accepted'
  } catch {
    return false
  }
}

export function isInstallDismissed() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(DISMISS_KEY) === '1'
}

export function dismissInstallPrompt() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DISMISS_KEY, '1')
}
