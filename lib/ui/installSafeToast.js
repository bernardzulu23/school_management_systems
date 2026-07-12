/**
 * Patch react-hot-toast so toast.error never shows technical/raw errors to end users.
 * Safe to call multiple times (idempotent).
 */

import toast from 'react-hot-toast'
import { ERROR_MESSAGES, toUserFacingMessage } from '@/lib/utils/errorMessages'

export function installSafeToastPatch() {
  if (typeof window === 'undefined') return
  if (window.__zsmsSafeToastPatched) return
  window.__zsmsSafeToastPatched = true

  const originalError = toast.error.bind(toast)

  toast.error = (message, options) => {
    try {
      if (typeof message === 'function') {
        return originalError((t) => {
          try {
            const node = message(t)
            if (typeof node === 'string' || typeof node === 'number') {
              return toUserFacingMessage(node)
            }
            return node
          } catch {
            return ERROR_MESSAGES.GENERIC
          }
        }, options)
      }
      return originalError(toUserFacingMessage(message), options)
    } catch (err) {
      console.warn('[toast] sanitize failed', err)
      return originalError(ERROR_MESSAGES.GENERIC, options)
    }
  }
}
