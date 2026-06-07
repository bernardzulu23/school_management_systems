import * as SecureStore from 'expo-secure-store'

const KEYS = {
  accessToken: 'zsms.accessToken',
  refreshToken: 'zsms.refreshToken',
  subdomain: 'zsms.subdomain',
  schoolName: 'zsms.schoolName',
  schoolLogoUrl: 'zsms.schoolLogoUrl',
} as const

async function setItem(key: string, value: string | null) {
  if (value == null || value === '') {
    await SecureStore.deleteItemAsync(key).catch(() => {})
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(KEYS.accessToken)
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEYS.refreshToken)
}

export async function getSubdomain(): Promise<string | null> {
  return getItem(KEYS.subdomain)
}

export async function setTokens(accessToken: string, refreshToken?: string | null) {
  await setItem(KEYS.accessToken, accessToken)
  if (refreshToken !== undefined) {
    await setItem(KEYS.refreshToken, refreshToken)
  }
}

export async function setSchoolContext(
  subdomain: string,
  schoolName: string,
  logoUrl?: string | null
) {
  await setItem(KEYS.subdomain, subdomain.trim().toLowerCase())
  await setItem(KEYS.schoolName, schoolName)
  await setItem(KEYS.schoolLogoUrl, logoUrl ?? null)
}

export async function clearAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken).catch(() => {}),
    SecureStore.deleteItemAsync(KEYS.refreshToken).catch(() => {}),
  ])
}

export async function clearSubdomainOnly() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.subdomain).catch(() => {}),
    SecureStore.deleteItemAsync(KEYS.schoolName).catch(() => {}),
    SecureStore.deleteItemAsync(KEYS.schoolLogoUrl).catch(() => {}),
  ])
}
