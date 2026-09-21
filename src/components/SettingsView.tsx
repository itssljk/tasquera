import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import {
  BellIcon,
  CalendarIcon,
  FolderSyncIcon,
  LogoMark,
  SunIcon,
  VolumeIcon,
} from './icons'
import { AppUpdateSection } from './AppUpdate'
import { APP_NAME, APP_VERSION, APP_VERSION_NAME, OFFICIAL_RELEASES_URL } from '../constants'
import { isNativePlatform, hasNativeWriteAccess } from '../lib/sync'
import { isAndroid, triggerHaptic } from '../lib/platform'
import { playTaskCompleteSound } from '../lib/sound'
import {
  getNotificationStatus,
  requestNativePermission,
  requestWebPermission,
  type NotificationStatus,
} from '../lib/notifications'

import type { AppSettings, Collection } from '../types'
import type { AppUpdater } from '../lib/useAppUpdater'
import { useIsDesktop } from '../lib/useMediaQuery'

/**
 * The version badge in the Settings header. Shows the friendly release name
 * (ZenGarden); hovering reveals a tooltip with the semantic version (v1.5.0) and
 * long-pressing (or right-clicking on desktop) swaps the label to it briefly
 * for debugging.
 */
function VersionBadge() {
  const [reveal, setReveal] = useState(false)
  const pressTimer = useRef<number | null>(null)
  const revertTimer = useRef<number | null>(null)

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const startPress = () => {
    clearPressTimer()
    pressTimer.current = window.setTimeout(() => {
      setReveal(true)
      if (revertTimer.current !== null) clearTimeout(revertTimer.current)
      revertTimer.current = window.setTimeout(() => setReveal(false), 2500)
    }, 500)
  }

  useEffect(
    () => () => {
      if (pressTimer.current !== null) clearTimeout(pressTimer.current)
      if (revertTimer.current !== null) clearTimeout(revertTimer.current)
    },
    [],
  )

  return (
    <span
      title={`v${APP_VERSION}`}
      onPointerDown={startPress}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onContextMenu={(e) => {
        e.preventDefault()
        setReveal(true)
        if (revertTimer.current !== null) clearTimeout(revertTimer.current)
        revertTimer.current = window.setTimeout(() => setReveal(false), 2500)
      }}
      className={`shrink-0 select-none rounded-lg bg-paper-200/80 px-2.5 py-1 text-caption font-mono font-medium text-ink-500 shadow-2xs transition-colors ${
        reveal ? 'bg-paper-300 text-ink-700' : ''
      }`}
    >
      {reveal ? `v${APP_VERSION}` : APP_VERSION_NAME}
    </span>
  )
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel?: string
}) {
  return (
    <div className="flex min-h-[44px] min-w-[44px] items-center justify-end">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => {
          triggerHaptic('selection')
          onChange()
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/60 ${
          checked
            ? 'bg-pine-600'
            : 'bg-paper-300 hover:bg-paper-400/80'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-paper-50 shadow-xs ring-1 ring-black/5 transition-transform duration-200 ease-out-expo ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClearAll,
  onExportData,
  onImportData,
  onExportMarkdown,
  canInstallPWA,
  isStandalonePWA,
  onInstallPWA,
  isFileSystemSupported,
  isNative,
  isSyncActive,
  syncNeedsPermission,
  lastSyncFormatted,
  syncErrorMsg,
  syncResolveMsg,
  onSelectSyncFolder,
  onDisconnectSyncFolder,
  updater,
  collections,
  onOpenBulkDelete,
  onOpenShortcuts,
}: {
  settings?: AppSettings
  onUpdateSettings?: (patch: Partial<AppSettings>) => void
  onClearAll: () => void
  onExportData?: () => Promise<string>
  onImportData?: (json: string) => Promise<boolean>
  onExportMarkdown?: (listId?: string | null) => string
  canInstallPWA?: boolean
  isStandalonePWA?: boolean
  onInstallPWA?: () => void
  isFileSystemSupported?: boolean
  isNative?: boolean
  isSyncActive?: boolean
  syncNeedsPermission?: boolean
  lastSyncFormatted?: string | null
  syncSizeBytes?: number | null
  syncErrorMsg?: string | null
  syncResolveMsg?: string | null
  onSelectSyncFolder?: () => void
  onDisconnectSyncFolder?: () => void
  updater?: AppUpdater
  collections?: Collection[]
  onOpenBulkDelete?: () => void
  onOpenShortcuts?: () => void
}) {
  const isDesktop = useIsDesktop()
  const [armed, setArmed] = useState(false)
  const [dataMsg, setDataMsg] = useState<string | null>(null)
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>('unknown')
  const [notifMsg, setNotifMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getNotificationStatus().then(setNotifStatus)
  }, [])

  const handleToggleNotifications = async () => {
    const enable = !(settings?.notificationsEnabled ?? false)
    if (enable) {
      const granted = isNative ? await requestNativePermission() : await requestWebPermission()
      setNotifStatus(await getNotificationStatus())
      if (!granted) {
        setNotifMsg(
          isNative
            ? 'Notifications are blocked. Allow notifications for Tasquera in Android system settings, then try again.'
            : 'Notifications are blocked in this browser. Allow them in the site permissions settings, then try again.',
        )
        return
      }
    }
    onUpdateSettings?.({ notificationsEnabled: enable })
    setNotifMsg(null)
  }

  const handleToggleSound = () => {
    const enable = !(settings?.soundEnabled ?? false)
    onUpdateSettings?.({ soundEnabled: enable })
    if (enable) {
      playTaskCompleteSound()
    }
  }

  const exportData = async () => {
    if (!onExportData) return
    const json = await onExportData()
    if (isNativePlatform()) {
      try {
        const canWriteDocuments = await hasNativeWriteAccess()
        const fileName = `tasquera-backup-${new Date().toISOString().slice(0, 10)}.json`
        if (canWriteDocuments) {
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: json,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
              recursive: true,
            })
            setDataMsg(`Backup saved to Documents/${fileName}`)
            setTimeout(() => setDataMsg(null), 4000)
            return
          } catch (docErr) {
            // Fall through to app storage below
          }
        }
        await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.External,
          encoding: Encoding.UTF8,
          recursive: true,
        })
        setDataMsg(`Backup saved to ${fileName}`)
        setTimeout(() => setDataMsg(null), 4000)
        return
      } catch (err) {
        console.error('Failed native backup export:', err)
      }
    }
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasquera-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDataMsg('Backup downloaded.')
    setTimeout(() => setDataMsg(null), 3000)
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !onImportData) return
    const reader = new FileReader()
    reader.onload = async () => {
      const ok = await onImportData(String(reader.result ?? ''))
      setDataMsg(ok ? 'Data imported successfully.' : 'Import failed: not a valid Tasquera backup.')
      setTimeout(() => setDataMsg(null), 4000)
    }
    reader.readAsText(file)
  }

  const clear = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    onClearAll()
    setArmed(false)
  }

  return (
    <div className="pb-16 max-w-xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3.5 min-w-0">
          <LogoMark className="size-9 shrink-0 shadow-xs" />
          <div className="min-w-0">
            <h1 className="font-sans text-display font-bold leading-none tracking-tight text-ink-900 sm:text-display-md">
              {APP_NAME}<span className="text-pine-500">.</span>
            </h1>
            <p className="mt-1 text-small text-ink-500 truncate">calm by design · warm editorial</p>
          </div>
        </div>
        <VersionBadge />
      </div>

      {/* PWA / Native APK download section */}
      {!isNative && ((canInstallPWA && !isStandalonePWA) || isAndroid()) && (
        <section className="space-y-2.5">
          <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
            Install App
          </h2>
          <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">
                  {isAndroid() ? 'Android App (Official APK)' : isDesktop ? 'Desktop & Mobile App' : 'Mobile App'}
                </p>
                <p className="mt-1 text-body text-ink-500 leading-relaxed">
                  {isAndroid()
                    ? 'Download the official APK from GitHub Releases for native background alarms and Syncthing local folder sync.'
                    : isDesktop
                      ? 'Download Tasquera to your home screen or desktop for instant, distraction-free offline access.'
                      : 'Add Tasquera to your home screen for instant, distraction-free offline access.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                {isAndroid() ? (
                  <>
                    <a
                      href={OFFICIAL_RELEASES_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800 cursor-pointer"
                    >
                      Download APK
                    </a>
                    {onInstallPWA && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={onInstallPWA}
                        className="shrink-0 rounded-xl bg-paper-200 px-3.5 py-2 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs cursor-pointer"
                      >
                        Guide
                      </motion.button>
                    )}
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={onInstallPWA}
                    className="shrink-0 rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800 cursor-pointer"
                  >
                    Install App
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Preferences & Rhythm */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          Preferences & Rhythm
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-6">
          {/* Appearance Theme */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-ink-400">
                <SunIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Daylight theme (Warm Light)</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  {(settings?.theme ?? 'dark') === 'light'
                    ? 'Warm cream paper aesthetic for bright daylight environments.'
                    : 'Warm roasted chicory dark theme.'}
                </p>
              </div>
            </div>
            <Switch
              checked={(settings?.theme ?? 'dark') === 'light'}
              onChange={() =>
                onUpdateSettings?.({
                  theme: (settings?.theme ?? 'dark') === 'light' ? 'dark' : 'light',
                })
              }
              ariaLabel="Daylight theme"
            />
          </div>

          {/* Week Start Day */}
          <div className="flex items-center justify-between gap-4 border-t border-paper-200/40 pt-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-ink-400">
                <CalendarIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Start week on Monday</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  {(settings?.weekStartsOn ?? 'monday') === 'monday'
                    ? 'Weeks start on Monday in calendar and date pickers.'
                    : 'Weeks start on Sunday in calendar and date pickers.'}
                </p>
              </div>
            </div>
            <Switch
              checked={(settings?.weekStartsOn ?? 'monday') === 'monday'}
              onChange={() =>
                onUpdateSettings?.({
                  weekStartsOn: (settings?.weekStartsOn ?? 'monday') === 'monday' ? 'sunday' : 'monday',
                })
              }
              ariaLabel="Start week on Monday"
            />
          </div>

          {/* Completion Chime */}
          <div className="flex items-center justify-between gap-4 border-t border-paper-200/40 pt-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  settings?.soundEnabled ? 'bg-pine-500/15 text-pine-400' : 'bg-paper-200 text-ink-400'
                }`}
              >
                <VolumeIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body-lg font-semibold text-ink-900 leading-snug">Completion chime</p>
                  {settings?.soundEnabled && (
                    <button
                      type="button"
                      onClick={() => playTaskCompleteSound()}
                      className="rounded-md bg-paper-200 px-2 py-0.5 text-caption font-medium text-ink-600 hover:bg-paper-300 hover:text-ink-900 transition-colors cursor-pointer"
                    >
                      Test
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  Play a quiet, gentle acoustic tone when checking off a task.
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.soundEnabled ?? false}
              onChange={handleToggleSound}
              ariaLabel="Completion chime"
            />
          </div>

          {/* Due Date Reminders */}
          <div className="border-t border-paper-200/40 pt-5">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    settings?.notificationsEnabled ? 'bg-pine-500/15 text-pine-400' : 'bg-paper-200 text-ink-400'
                  }`}
                >
                  <BellIcon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-lg font-semibold text-ink-900 leading-snug">
                      Due date reminders
                    </span>
                    {settings?.notificationsEnabled && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-500/15 px-2.5 py-0.5 text-caption font-medium text-pine-300">
                        <span className="size-1.5 rounded-full bg-pine-400 animate-pulse" />
                        On
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-small text-ink-500 leading-relaxed">
                    {isNative
                      ? 'Tasquera reminds you when tasks are due, even when closed.'
                      : 'Reminds you when tasks are due while the app is open in this browser.'}
                  </p>
                  {!isNative && isAndroid() && (
                    <p className="mt-1.5 text-caption text-pine-600 dark:text-pine-400">
                      Want reminders when the app is closed?{' '}
                      <a
                        href={OFFICIAL_RELEASES_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-semibold hover:text-pine-700 dark:hover:text-pine-300"
                      >
                        Download the official Android APK
                      </a>.
                    </p>
                  )}
                </div>
              </div>
              <Switch
                checked={settings?.notificationsEnabled ?? false}
                onChange={handleToggleNotifications}
                ariaLabel="Due date reminders"
              />
            </div>

            {notifMsg && (
              <p className="mt-3 rounded-xl bg-terra-50 p-3.5 text-small font-medium text-terra-600">
                {notifMsg}
              </p>
            )}

            {settings?.notificationsEnabled && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-paper-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-small font-medium text-ink-800">Remind on due date at</p>
                  <p className="text-caption text-ink-400">Date-only tasks trigger a reminder at this time.</p>
                </div>
                <input
                  type="time"
                  value={settings?.notificationTime ?? '09:00'}
                  onChange={(e) => onUpdateSettings?.({ notificationTime: e.target.value || '09:00' })}
                  className="shrink-0 rounded-xl bg-paper-200/80 px-3 py-1.5 text-small font-medium text-ink-800 focus:ring-2 focus:ring-pine-500 focus:outline-none"
                />
              </div>
            )}

            {notifStatus === 'denied' && (
              <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-small text-amber-600 leading-snug">
                Notifications are blocked at the system or browser level. Allow them in settings to receive reminders.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Storage & Data Sovereignty */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          {isNative ? 'Device Storage & Sync' : 'Storage & Data Sovereignty'}
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-5">
          {dataMsg && (
            <p className="rounded-xl bg-pine-50 p-3.5 text-small font-medium text-pine-400">
              {dataMsg}
            </p>
          )}

          {/* Folder Sync / Syncthing Header */}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isSyncActive ? 'bg-pine-500/15 text-pine-400' : 'bg-paper-200 text-ink-400'
                }`}
              >
                <FolderSyncIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-lg font-semibold text-ink-900 leading-snug">
                    {isNative ? 'Native Syncthing Sync' : 'Folder Sync Binding'}
                  </span>
                  {isSyncActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-500/15 px-2.5 py-0.5 text-caption font-medium text-pine-300">
                      <span className="size-1.5 rounded-full bg-pine-400 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-paper-200 px-2.5 py-0.5 text-caption font-medium text-ink-500">
                      {isNative ? 'Paused' : 'Not Connected'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-small text-ink-500 leading-relaxed">
                  {isNative
                    ? 'Continuous local sync with your device storage for Syncthing'
                    : 'Direct bidirectional file sync with your local filesystem folder'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="shrink-0 self-start sm:self-center w-full sm:w-auto">
              {isSyncActive ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={onDisconnectSyncFolder}
                  className="w-full sm:w-auto rounded-xl bg-paper-200 px-3.5 py-2 text-body font-medium text-terra-600 shadow-2xs transition-colors hover:bg-terra-50 text-center cursor-pointer"
                >
                  {isNative ? 'Pause Sync' : 'Disconnect'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSelectSyncFolder}
                  disabled={!isFileSystemSupported && !isNative}
                  className="w-full sm:w-auto rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800 disabled:opacity-50 text-center cursor-pointer"
                >
                  {isNative ? (syncNeedsPermission ? 'Grant access' : 'Enable Sync') : 'Select Folder'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Sync Path & Status Info Bar */}
          <div className="flex flex-col gap-2 rounded-xl bg-paper-50 p-3 text-small sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-medium text-ink-400">Path:</span>
              <span className="truncate font-mono text-caption text-ink-800 bg-paper-200/80 px-2 py-0.5 rounded-md">
                {isNative ? 'Documents/Tsqsync/tasquera-sync.json' : isSyncActive ? 'Linked Folder / tasquera-sync.json' : 'Not linked'}
              </span>
            </div>
            {isSyncActive && (
              <span className="flex shrink-0 items-center gap-1.5 text-caption text-ink-500">
                <span className="size-1.5 rounded-full bg-pine-500" />
                {lastSyncFormatted ? `Synced at ${lastSyncFormatted}` : 'Auto-syncing changes'}
              </span>
            )}
          </div>

          {/* Browser Unsupported Warning */}
          {!isFileSystemSupported && !isNative && (
            <div className="rounded-xl bg-amber-500/10 p-3.5 text-small text-amber-600 leading-snug">
              {isAndroid() ? (
                <span>
                  Mobile browsers do not support local folder binding. For automatic Syncthing sync,{' '}
                  <a
                    href={OFFICIAL_RELEASES_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-semibold hover:text-amber-700"
                  >
                    download the official Android APK
                  </a>.
                </span>
              ) : (
                'Your browser does not support local folder binding. Use manual JSON/Markdown backups below.'
              )}
            </div>
          )}

          {/* Android Permission Warning */}
          {syncNeedsPermission && (
            <div className="rounded-xl bg-amber-500/10 p-3.5 text-small text-amber-600 leading-snug">
              Android 11+ requires <strong>All files access</strong> to read and write the <code className="font-mono text-caption">Documents/Tsqsync/</code> folder.
            </div>
          )}

          {syncErrorMsg && (
            <div className="rounded-xl bg-terra-50 p-3.5 text-small font-medium text-terra-600">
              {syncErrorMsg}
            </div>
          )}

          {syncResolveMsg && (
            <div className="rounded-xl bg-pine-50 p-3.5 text-small font-medium text-pine-400">
              {syncResolveMsg}
            </div>
          )}

          {/* Snapshots & Backups */}
          <div className="pt-4 border-t border-paper-200/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-ink-900 leading-snug">Snapshots & Backups</p>
              <p className="mt-0.5 text-small text-ink-500">Export a portable backup or restore previously saved data.</p>
            </div>
            <div className="flex shrink-0 gap-2 self-start sm:self-center w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={exportData}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-3.5 py-1.5 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
              >
                Export JSON
              </motion.button>
              {onExportMarkdown && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const md = onExportMarkdown()
                    const blob = new Blob([md], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `tasquera-tasks-${new Date().toISOString().slice(0, 10)}.md`
                    a.click()
                    URL.revokeObjectURL(url)
                    setDataMsg('Markdown checklist downloaded.')
                    setTimeout(() => setDataMsg(null), 3000)
                  }}
                  className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-3.5 py-1.5 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
                >
                  Export MD
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-3.5 py-1.5 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
              >
                Import
              </motion.button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-paper-200/40 space-y-3">
            {collections && collections.length > 0 && onOpenBulkDelete && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-ink-800">Bulk delete lists</p>
                  <p className="text-small text-ink-500">Remove multiple lists at once; tasks are kept in Unsorted.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={onOpenBulkDelete}
                  className="shrink-0 rounded-xl bg-paper-200 px-3.5 py-1.5 text-small font-medium text-ink-800 hover:bg-paper-300 shadow-2xs cursor-pointer"
                >
                  Delete lists…
                </motion.button>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-terra-600">Clear all tasks</p>
                <p className="text-small text-ink-500">Removes all tasks while preserving lists and boards.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={clear}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-small font-medium transition-colors duration-150 cursor-pointer ${
                  armed ? 'bg-terra-600 text-[#fbf9f5] shadow-xs' : 'text-terra-600 hover:bg-terra-50 bg-paper-200/80'
                }`}
              >
                {armed ? 'Tap to confirm' : 'Clear all'}
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Reference */}
      {isDesktop && onOpenShortcuts && (
        <section className="hidden md:block space-y-2.5">
          <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
            Quick Reference
          </h2>
          <div className="rounded-2xl bg-paper-100/70 p-5 shadow-2xs flex items-center justify-between gap-4">
            <div>
              <p className="text-body-lg font-semibold text-ink-900 leading-snug">Keyboard Shortcuts</p>
              <p className="mt-0.5 text-small text-ink-500">
                Press <kbd className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-caption text-ink-700">?</kbd> anywhere to open the cheat sheet.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="shrink-0 rounded-xl bg-paper-200 px-3.5 py-2 text-body font-medium text-ink-800 hover:bg-paper-300 transition-colors shadow-2xs cursor-pointer"
            >
              View shortcuts
            </button>
          </div>
        </section>
      )}

      {/* Updates (Native Android APK) */}
      {isNative && updater && <AppUpdateSection updater={updater} />}

      {/* Editorial Colophon */}
      <footer className="pt-4 pb-2 text-center space-y-3 border-t border-paper-200/40">
        <p className="text-small text-ink-500">
          <span className="font-semibold text-ink-700">{APP_NAME}</span> · Version {APP_VERSION} ({APP_VERSION_NAME}) · 100% Local-First
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-caption text-pine-400 font-medium">
          <a href="#/tos" className="hover:underline">Terms of Service</a>
          <span className="text-paper-300">·</span>
          <a href="#/privacy" className="hover:underline">Privacy Policy</a>
          <span className="text-paper-300">·</span>
          <a href="#/licenses" className="hover:underline">Open Source</a>
          <span className="text-paper-300">·</span>
          <a href={OFFICIAL_RELEASES_URL} target="_blank" rel="noreferrer" className="hover:underline">Android APK</a>
          <span className="text-paper-300">·</span>
          <a href="https://discord.gg/Kfn4V2nF3N" target="_blank" rel="noreferrer" className="hover:underline">Discord</a>
        </div>
      </footer>
    </div>
  )
}
