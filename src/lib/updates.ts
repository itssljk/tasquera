import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { idbKeyval } from './idb'

/**
 * Self-update support for the sideloaded Android APK.
 *
 * Flow: fetch a small `update.json` manifest (published on GitHub Releases),
 * compare its `versionCode` with the installed build via the native AppUpdate
 * plugin, download the new APK (SHA-256 verified), then hand it to the system
 * installer. Android always requires the user to confirm the final install.
 */

export interface UpdateInfo {
  versionName: string
  versionCode: number
}

export interface UpdateManifest {
  versionCode: number
  versionName: string
  sha256?: string
  releaseNotes?: string
  apkUrl?: string
}

interface UpdateProgress {
  received: number
  total: number
  percent?: number
}

interface AppUpdatePlugin {
  getInfo(): Promise<UpdateInfo>
  getUpdateUrl(): Promise<{ url: string }>
  checkInstallPermission(): Promise<{ granted: boolean }>
  openInstallPermission(): Promise<void>
  download(options: { url: string; sha256?: string }): Promise<{ path: string }>
  install(options: { path: string }): Promise<void>
  addListener(
    eventName: 'updateProgress',
    listener: (data: UpdateProgress) => void,
  ): Promise<PluginListenerHandle>
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate')

const DEFAULT_UPDATE_URL = 'https://github.com/itssljk/tasquera/releases/latest/download/update.json'

/** The manifest URL, read from the native plugin config (AppUpdate.updateUrl). */
async function resolveUpdateUrl(): Promise<string> {
  try {
    const res = await AppUpdate.getUpdateUrl()
    if (res && typeof res.url === 'string' && res.url) return res.url
  } catch {
    // Plugin unavailable — fall back to the default.
  }
  return DEFAULT_UPDATE_URL
}

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested)                                          */
/* ------------------------------------------------------------------ */

/** Validate and normalize a raw `update.json` payload; null if unusable. */
export function parseManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  const code = typeof m.versionCode === 'number' ? m.versionCode : Number(m.versionCode)
  if (!Number.isFinite(code) || code < 0) return null
  return {
    versionCode: Math.floor(code),
    versionName: typeof m.versionName === 'string' && m.versionName ? m.versionName : `v${code}`,
    sha256: typeof m.sha256 === 'string' && m.sha256 ? m.sha256 : undefined,
    releaseNotes: typeof m.releaseNotes === 'string' && m.releaseNotes ? m.releaseNotes : undefined,
    apkUrl: typeof m.apkUrl === 'string' && m.apkUrl ? m.apkUrl : undefined,
  }
}

/** A manifest is an update when its versionCode is newer than the installed one. */
export function isUpdateAvailable(current: UpdateInfo, manifest: UpdateManifest): boolean {
  return manifest.versionCode > current.versionCode
}

/** Resolve the APK download URL (explicit apkUrl wins, else sibling of the manifest). */
export function resolveApkUrl(manifest: UpdateManifest, manifestUrl: string): string {
  if (manifest.apkUrl) return manifest.apkUrl
  return new URL('app-release.apk', manifestUrl).toString()
}

/* ------------------------------------------------------------------ */
/* Check / download / install                                          */
/* ------------------------------------------------------------------ */

export async function fetchUpdateManifest(manifestUrl?: string): Promise<UpdateManifest> {
  const url = manifestUrl ?? (await resolveUpdateUrl())
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Update check failed (HTTP ${res.status})`)
  const manifest = parseManifest(await res.json())
  if (!manifest) throw new Error('Update manifest is missing or invalid')
  return manifest
}

export async function getCurrentVersion(): Promise<UpdateInfo> {
  return AppUpdate.getInfo()
}

export async function checkForUpdates(): Promise<{
  current: UpdateInfo
  manifest: UpdateManifest
  available: boolean
}> {
  const current = await getCurrentVersion()
  const manifest = await fetchUpdateManifest()
  return { current, manifest, available: isUpdateAvailable(current, manifest) }
}

export async function checkInstallPermission(): Promise<boolean> {
  try {
    const res = await AppUpdate.checkInstallPermission()
    return !!res.granted
  } catch {
    return true
  }
}

export async function openInstallPermission(): Promise<void> {
  await AppUpdate.openInstallPermission()
}

/** Download the update APK, reporting progress 0-100 via `onProgress`. */
export async function downloadUpdate(
  manifest: UpdateManifest,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const url = resolveApkUrl(manifest, await resolveUpdateUrl())
  let handle: PluginListenerHandle | undefined
  if (onProgress) {
    handle = await AppUpdate.addListener('updateProgress', (data) => {
      const pct =
        typeof data.percent === 'number'
          ? data.percent
          : data.total > 0
            ? (data.received / data.total) * 100
            : 0
      onProgress(Math.min(100, Math.max(0, pct)))
    })
  }
  try {
    const res = await AppUpdate.download({ url, sha256: manifest.sha256 })
    return res.path
  } finally {
    if (handle) {
      try {
        await handle.remove()
      } catch {
        // Listener already detached — nothing to clean up.
      }
    }
  }
}

/** Launch the system installer for the downloaded APK. */
export async function installUpdate(path: string): Promise<void> {
  await AppUpdate.install({ path })
}

/* ------------------------------------------------------------------ */
/* Throttling / dismissal (IndexedDB)                                  */
/* ------------------------------------------------------------------ */

const LAST_CHECK_KEY = 'tasquera_update_last_check'
const DISMISSED_CODE_KEY = 'tasquera_update_dismissed_code'
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export async function shouldAutoCheck(now: number = Date.now()): Promise<boolean> {
  try {
    const last = await idbKeyval.get<number>(LAST_CHECK_KEY)
    return typeof last !== 'number' || now - last > UPDATE_CHECK_INTERVAL_MS
  } catch {
    return true
  }
}

export async function markChecked(now: number = Date.now()): Promise<void> {
  try {
    await idbKeyval.set(LAST_CHECK_KEY, now)
  } catch {
    // Best effort — failing only means we check again sooner.
  }
}

/** The versionCode the user dismissed, so we don't re-nag for the same update. */
export async function getDismissedCode(): Promise<number | undefined> {
  try {
    return await idbKeyval.get<number>(DISMISSED_CODE_KEY)
  } catch {
    return undefined
  }
}

export async function setDismissedCode(code: number): Promise<void> {
  try {
    await idbKeyval.set(DISMISSED_CODE_KEY, code)
  } catch {
    // Best effort.
  }
}
