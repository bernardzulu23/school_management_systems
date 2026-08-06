/**
 * Browser stub for requestContext — AsyncLocalStorage / node:crypto are Node-only.
 * Client bundles must never import the server module (UnhandledSchemeError on node:).
 */

/** @returns {undefined} */
export function getRequestContext() {
  return undefined
}

/**
 * @param {Request | { headers?: Headers }} _request
 * @returns {string}
 */
export function resolveRequestId(_request) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * @template T
 * @param {unknown} _store
 * @param {() => T | Promise<T>} fn
 */
export async function runWithRequestContext(_store, fn) {
  return fn()
}

/** @param {Record<string, unknown>} [_patch] */
export function bindRequestIdentity(_patch = {}) {}

/**
 * @param {Response} response
 * @param {string} [_requestId]
 */
export function attachRequestIdHeader(response, _requestId) {
  return response
}

export const REQUEST_ID_HEADER = 'x-request-id'
