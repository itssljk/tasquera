/**
 * Semantic version — used for tooling, the Android versionCode math, and the
 * update manifest.
 */
export const APP_VERSION = '1.5.0'

/**
 * The user-facing release name for this update.
 */
export const APP_VERSION_NAME = 'ZenGarden'

export const APP_VERSION_DISPLAY = `1.5.0 (${APP_VERSION_NAME})`

/**
 * Render a raw version string (semver, a manifest versionName, …) as the
 * friendly release label when it's a semver version, else show it as-is so
 * unknown formats stay visible.
 */
export function versionLabel(raw?: string | null): string {
  if (!raw) return APP_VERSION_NAME
  if (/^v?\d+(\.\d+){0,2}$/.test(raw.replace(/^v/, ''))) return APP_VERSION_NAME
  return raw.replace(/^v/, '')
}
export const APP_NAME = 'Tasquera'
export const LAST_LEGAL_UPDATE = 'August 21, 2026'
export const OFFICIAL_RELEASES_URL = 'https://github.com/itssljk/tasquera/releases'


