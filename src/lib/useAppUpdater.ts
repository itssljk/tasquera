import { useCallback, useEffect, useRef, useState } from 'react'
import { isNativePlatform } from './sync'
import {
  checkForUpdates,
  checkInstallPermission,
  downloadUpdate,
  getCurrentVersion,
  getDismissedCode,
  installUpdate,
  openInstallPermission,
  setDismissedCode,
  shouldAutoCheck,
  markChecked,
  type UpdateManifest,
} from './updates'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error'

export interface AppUpdater {
  status: UpdateStatus
  currentVersion: string | null
  manifest: UpdateManifest | null
  progress: number
  error: string | null
  message: string | null
  needsPermission: boolean
  check: (opts?: { quiet?: boolean }) => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
  dismiss: () => void
}

/**
 * Drives the Android self-update flow. No-ops on the web/PWA, where updates
 * are delivered by the browser/service worker instead.
 */
export function useAppUpdater(): AppUpdater {
  const native = isNativePlatform()
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [manifest, setManifest] = useState<UpdateManifest | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)

  const manifestRef = useRef(manifest)
  manifestRef.current = manifest
  const statusRef = useRef(status)
  statusRef.current = status
  const downloadedPathRef = useRef<string | null>(null)

  const check = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!isNativePlatform()) return
    setStatus('checking')
    setError(null)
    setMessage(null)
    setNeedsPermission(false)
    try {
      const { current, manifest: m, available } = await checkForUpdates()
      setCurrentVersion(current.versionName)
      if (!available) {
        setManifest(null)
        setProgress(0)
        setStatus('upToDate')
        return
      }
      if (opts?.quiet && (await getDismissedCode()) === m.versionCode) {
        // Already dismissed this version — stay quiet on auto checks.
        setManifest(null)
        setStatus('upToDate')
        return
      }
      setManifest(m)
      setProgress(0)
      setStatus('available')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update check failed')
      setStatus('error')
    }
  }, [])

  // Load the installed version once for the Settings readout.
  useEffect(() => {
    if (!native) return
    getCurrentVersion()
      .then((info) => setCurrentVersion(info.versionName))
      .catch(() => {})
  }, [native])

  // Auto-check shortly after launch, throttled to once per day.
  useEffect(() => {
    if (!native) return
    let cancelled = false
    const run = async () => {
      if (await shouldAutoCheck()) {
        await markChecked()
        if (!cancelled) await check({ quiet: true })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [native, check])

  const download = useCallback(async () => {
    if (!isNativePlatform()) return
    const m = manifestRef.current
    if (!m) return
    setStatus('downloading')
    setProgress(0)
    setError(null)
    setMessage(null)
    setNeedsPermission(false)
    try {
      downloadedPathRef.current = await downloadUpdate(m, setProgress)
      setProgress(100)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
      setStatus('available')
    }
  }, [])

  const install = useCallback(async () => {
    if (!isNativePlatform()) return
    const path = downloadedPathRef.current
    if (!path) {
      // Shouldn't happen — the UI only offers Install once downloaded.
      await download()
      return
    }
    setError(null)
    setMessage(null)
    try {
      if (!(await checkInstallPermission())) {
        setNeedsPermission(true)
        await openInstallPermission()
        return
      }
      setNeedsPermission(false)
      setStatus('installing')
      await installUpdate(path)
      setMessage('Confirm the install in the Android prompt to finish updating.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed')
      setStatus('ready')
    }
  }, [download])

  // After the system installer prompt, detect whether the update took effect
  // when the app regains focus.
  useEffect(() => {
    if (!native) return
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return
      if (statusRef.current !== 'installing') return
      const m = manifestRef.current
      if (!m) return
      try {
        const info = await getCurrentVersion()
        setCurrentVersion(info.versionName)
        if (info.versionCode >= m.versionCode) {
          setStatus('upToDate')
          setManifest(null)
          setProgress(0)
          setMessage(`Updated to ${info.versionName}.`)
        } else {
          setStatus('ready')
        }
      } catch {
        // Leave the state alone — the user can retry manually.
      }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [native])

  const dismiss = useCallback(() => {
    const m = manifestRef.current
    if (m) void setDismissedCode(m.versionCode)
    downloadedPathRef.current = null
    setManifest(null)
    setProgress(0)
    setError(null)
    setMessage(null)
    setNeedsPermission(false)
    setStatus('idle')
  }, [])

  return {
    status,
    currentVersion,
    manifest,
    progress,
    error,
    message,
    needsPermission,
    check,
    download,
    install,
    dismiss,
  }
}
