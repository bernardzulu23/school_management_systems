/** @typedef {'gemini' | 'jina' | 'openrouter' | 'openai' | 'voyage' | 'huggingface'} EmbedProviderId */

/** Preferred order when multiple keys are configured (first available wins as primary). */
export const EMBED_PROVIDER_PRIORITY = /** @type {const} */ ([
  'gemini',
  'jina',
  'openrouter',
  'openai',
  'voyage',
  'huggingface',
])

/** @type {Record<EmbedProviderId, string>} */
const PROVIDER_ENV_KEYS = {
  gemini: 'GEMINI_API_KEY',
  jina: 'JINA_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  voyage: 'VOYAGE_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
}

/**
 * @param {string} provider
 * @returns {boolean}
 */
export function isEmbedProviderConfigured(provider) {
  const key = PROVIDER_ENV_KEYS[/** @type {EmbedProviderId} */ (provider)]
  if (!key) return false
  return Boolean(String(process.env[key] || '').trim())
}

/**
 * @returns {EmbedProviderId[]}
 */
export function getConfiguredEmbedProviders() {
  return EMBED_PROVIDER_PRIORITY.filter((p) => isEmbedProviderConfigured(p))
}

/**
 * @returns {boolean}
 */
export function hasAnyEmbedProvider() {
  return getConfiguredEmbedProviders().length > 0
}

/**
 * First configured provider in priority order, or huggingface when none configured.
 * Pin with RAG_EMBED_PROVIDER when set (must match the provider used at ingest time for search quality).
 * @returns {EmbedProviderId}
 */
export function resolveDefaultEmbedProvider() {
  const pinned = String(process.env.RAG_EMBED_PROVIDER || '')
    .trim()
    .toLowerCase()
  if (pinned && isEmbedProviderConfigured(pinned)) {
    return /** @type {EmbedProviderId} */ (pinned)
  }
  const configured = getConfiguredEmbedProviders()
  return configured[0] || 'huggingface'
}

/**
 * Build a de-duplicated chain: primary first, then explicit fallbacks, then any remaining configured providers.
 * @param {string | undefined | null} primary
 * @param {string[] | undefined} [explicitFallbacks]
 * @returns {EmbedProviderId[]}
 */
export function buildEmbedProviderChain(primary, explicitFallbacks) {
  const configured = getConfiguredEmbedProviders()
  /** @type {EmbedProviderId[]} */
  const chain = []

  const add = (provider) => {
    const id = String(provider || '').trim()
    if (!id || !configured.includes(/** @type {EmbedProviderId} */ (id))) return
    if (!chain.includes(/** @type {EmbedProviderId} */ (id))) {
      chain.push(/** @type {EmbedProviderId} */ (id))
    }
  }

  add(primary || configured[0])
  if (Array.isArray(explicitFallbacks)) {
    for (const p of explicitFallbacks) add(p)
  }
  for (const p of configured) add(p)

  return chain
}
