import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  FolderSyncIcon,
  InfoIcon,
  LayoutIcon,
  LogoMark,
  SunIcon,
  VolumeIcon,
} from './icons'
import { AppUpdateSection } from './AppUpdate'
import {
  APP_NAME,
  APP_VERSION_CODENAME,
  APP_VERSION_DISPLAY,
  LAST_LEGAL_UPDATE,
} from '../constants'
import { isNativePlatform, hasNativeWriteAccess } from '../lib/sync'
import { isMac, getSearchShortcut } from '../lib/platform'
import { playTaskCompleteSound } from '../lib/sound'
import {
  getNotificationStatus,
  requestNativePermission,
  requestWebPermission,
  type NotificationStatus,
} from '../lib/notifications'

import type { AppSettings, Collection, PriorityLevel } from '../types'
import type { AppUpdater } from '../lib/useAppUpdater'

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-body text-ink-700">{label}</span>
      <kbd className="rounded-lg bg-paper-200/90 px-2.5 py-1 font-mono text-caption font-medium text-ink-500 shadow-2xs">
        {keys}
      </kbd>
    </div>
  )
}

import Dropdown, { type DropdownOption } from './Dropdown'

const PRIORITY_OPTIONS: DropdownOption<PriorityLevel | 'none'>[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low', textClass: 'text-slateblue-600' },
  { value: 'medium', label: 'Medium', textClass: 'text-pine-500' },
  { value: 'high', label: 'High', textClass: 'text-amber-600' },
  { value: 'urgent', label: 'Urgent', textClass: 'text-terra-600' },
]

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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
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
}) {
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
            // Fall through to app storage below if Documents is not writable.
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
      setDataMsg(ok ? 'Data imported.' : 'Import failed: not a valid Tasquera backup.')
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
        <span className="shrink-0 rounded-lg bg-paper-200/80 px-2.5 py-1 text-caption font-mono font-medium text-ink-500 shadow-2xs">
          v{APP_VERSION_DISPLAY}
        </span>
      </div>

      {/* PWA section (web only) */}
      {!isNative && (
        <section className="space-y-2.5">
          <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
            Progressive Web App
          </h2>
          <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Desktop & Mobile App</p>
                <p className="mt-1 text-body text-ink-500 leading-relaxed">
                  {isStandalonePWA
                    ? 'Tasquera is running as an installed standalone app with offline support.'
                    : 'Download Tasquera to your desktop or phone home screen for instant offline access.'}
                </p>
              </div>
              {isStandalonePWA ? (
                <span className="inline-flex shrink-0 items-center self-start sm:self-center gap-1.5 rounded-xl bg-pine-500/15 px-3 py-1.5 text-body font-medium text-pine-300">
                  <CheckIcon className="size-4 text-pine-400" /> Installed
                </span>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onInstallPWA}
                  disabled={!canInstallPWA}
                  className="shrink-0 self-start sm:self-center rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800 disabled:opacity-50 cursor-pointer"
                >
                  Install App
                </motion.button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preferences & Interface */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          Preferences & Interface
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
                    ? 'Warm cream paper aesthetic for bright environments.'
                    : 'Warm editorial dark theme.'}
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-ink-400">
                <CalendarIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Start week on Monday</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  {(settings?.weekStartsOn ?? 'monday') === 'monday'
                    ? 'Weeks start on Monday in calendar & date pickers.'
                    : 'Weeks start on Sunday in calendar & date pickers.'}
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

          {/* Desktop Task Modal Layout */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-ink-400">
                <LayoutIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Desktop slide-out drawer</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  {settings?.taskModalLayout === 'drawer'
                    ? 'Task editor opens as a right-side drawer on desktop.'
                    : 'Task editor opens as a centered dialog on desktop.'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.taskModalLayout === 'drawer'}
              onChange={() =>
                onUpdateSettings?.({
                  taskModalLayout: settings?.taskModalLayout === 'drawer' ? 'centered' : 'drawer',
                })
              }
              ariaLabel="Desktop slide-out drawer"
            />
          </div>

          {/* Completion Sound Feedback */}
          <div className="flex items-center justify-between gap-4">
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
                  Play a quiet, gentle tone when checking off a task.
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.soundEnabled ?? false}
              onChange={handleToggleSound}
              ariaLabel="Completion chime"
            />
          </div>

          {/* Default Task Priority */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-ink-400">
                <FlagIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Default task priority</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  Initial priority assigned when quick-adding tasks.
                </p>
              </div>
            </div>
            <div className="self-start sm:self-center shrink-0">
              <Dropdown<PriorityLevel | 'none'>
                value={settings?.defaultTaskPriority ?? 'none'}
                options={PRIORITY_OPTIONS}
                onChange={(val) => onUpdateSettings?.({ defaultTaskPriority: val })}
                ariaLabel="Default task priority"
                align="right"
                valueTextClass={
                  settings?.defaultTaskPriority === 'low'
                    ? 'text-slateblue-600'
                    : settings?.defaultTaskPriority === 'medium'
                      ? 'text-pine-500'
                      : settings?.defaultTaskPriority === 'high'
                        ? 'text-amber-600'
                        : settings?.defaultTaskPriority === 'urgent'
                          ? 'text-terra-600'
                          : 'text-ink-900'
                }
                triggerClass="bg-paper-200 hover:bg-paper-300 rounded-xl px-3 py-1.5 min-w-[100px] justify-between shadow-2xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          Notifications & Reminders
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs">
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
                    ? 'Tasquera reminds you when tasks are due, even when the app is closed.'
                    : 'Tasquera reminds you when tasks are due while it’s open in this browser.'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.notificationsEnabled ?? false}
              onChange={handleToggleNotifications}
              ariaLabel="Due date reminders"
            />
          </div>

          {notifMsg && (
            <p className="mt-4 rounded-xl bg-terra-50 p-3.5 text-small font-medium text-terra-600">
              {notifMsg}
            </p>
          )}

          {settings?.notificationsEnabled && (
            <div className="mt-5 flex flex-col gap-3 border-t border-paper-200/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-medium text-ink-800">Remind on due date at</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  Date-only tasks trigger a reminder at this local time.
                </p>
              </div>
              <input
                type="time"
                value={settings?.notificationTime ?? '09:00'}
                onChange={(e) => onUpdateSettings?.({ notificationTime: e.target.value || '09:00' })}
                className="shrink-0 self-start sm:self-center rounded-xl bg-paper-50 px-3.5 py-2 text-body font-medium text-ink-700 shadow-2xs transition-colors hover:bg-paper-200/60 focus:ring-2 focus:ring-pine-500 focus:outline-none"
              />
            </div>
          )}

          {notifStatus === 'denied' && (
            <p className="mt-4 rounded-xl bg-amber-500/10 p-3.5 text-small text-amber-600 leading-snug">
              {isNative
                ? 'Notifications are blocked at the system level. Allow them for Tasquera in Android settings, then toggle reminders on.'
                : 'Notifications are blocked for this site. Allow them in your browser’s site permissions, then toggle reminders on.'}
            </p>
          )}
          {!isNative && notifStatus === 'unsupported' && (
            <p className="mt-4 rounded-xl bg-amber-500/10 p-3.5 text-small text-amber-600 leading-snug">
              Notifications aren’t supported in this browser. Reminders will appear in-app on the Today view instead.
            </p>
          )}
        </div>
      </section>

      {/* Syncthing & Storage Sync */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          {isNative ? 'Device Storage & Sync' : 'Syncthing & Local Sync'}
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-4">
          {/* Main Card Header */}
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
                    : 'Direct bidirectional file sync with your local filesystem'}
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
          <div className="flex flex-col gap-2 rounded-xl bg-paper-50 p-3.5 text-small sm:flex-row sm:items-center sm:justify-between shadow-2xs">
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
              Your current browser does not support local folder access. You can still use the <strong>Backup & restore</strong> feature below to export and import data manually.
            </div>
          )}

          {/* Storage access required (Android 11+) */}
          {syncNeedsPermission && (
            <div className="rounded-xl bg-amber-500/10 p-3.5 text-small text-amber-600 leading-snug">
              Android 11 and newer require <strong>All files access</strong> to read and write the <code className="font-mono text-caption">Documents/Tsqsync/</code> folder. Grant it once and Tasquera will reconnect automatically.
            </div>
          )}

          {/* Error Message */}
          {syncErrorMsg && (
            <div className="rounded-xl bg-terra-50 p-3.5 text-small font-medium text-terra-600">
              {syncErrorMsg}
            </div>
          )}

          {/* Auto-resolved conflict notice */}
          {syncResolveMsg && (
            <div className="rounded-xl bg-pine-50 p-3.5 text-small font-medium text-pine-400">
              {syncResolveMsg}
            </div>
          )}

          {/* Syncthing Guide Card */}
          <div className="flex items-start gap-2.5 rounded-xl bg-paper-200/50 p-3.5 text-small text-ink-600 leading-relaxed">
            <InfoIcon className="size-4 shrink-0 text-ink-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              {isNative ? (
                <>
                  <span className="font-semibold text-ink-800">Syncthing Setup:</span> In your Syncthing app on Android, add and share the folder <code className="font-mono text-caption text-pine-400 bg-paper-50 px-1.5 py-0.5 rounded">Documents/Tsqsync/</code>. Tasquera writes and reads state directly from this directory.
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-800">How it works:</span> Click <em>Select Folder</em> to bind a folder shared by Syncthing on your machine. Tasquera will read remote updates and write state automatically.
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts - Desktop web only, hidden on mobile screens & APK */}
      {!isNative && (
        <section className="space-y-2.5 hidden md:block">
          <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
            Keyboard Shortcuts
          </h2>
          <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-2">
            <Shortcut keys="/" label="Quick-add a task" />
            <Shortcut keys="Enter" label="Add / submit task" />
            <Shortcut keys="j / k" label="Navigate tasks (Vim / arrows)" />
            <Shortcut keys="x" label="Toggle completed" />
            <Shortcut keys="e" label="Edit task details" />
            <Shortcut keys="Shift + Click" label="Multi-select tasks" />
            <Shortcut keys={getSearchShortcut()} label="Search tasks & collections" />
            <Shortcut keys={isMac() ? '⌘Z / ⇧⌘Z' : 'Ctrl+Z / Ctrl+Y'} label="Undo / redo" />
            <Shortcut keys="Drag" label="Reorder tasks & columns" />
          </div>
        </section>
      )}

      {/* Data Management */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          Data Management
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-6">
          {dataMsg && (
            <p className="rounded-xl bg-pine-50 p-3.5 text-small font-medium text-pine-400">
              {dataMsg}
            </p>
          )}

          {/* Backup & Restore */}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-semibold text-ink-900 leading-snug">Backup & restore</p>
              <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                {isNative
                  ? 'Export a snapshot JSON backup to device storage, or restore previous tasks from one.'
                  : 'Data lives locally in this browser. Export a JSON backup, or restore from one.'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 self-start sm:self-center w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={exportData}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-4 py-2 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
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
                  className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-4 py-2 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
                >
                  Export MD
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200 px-4 py-2 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center cursor-pointer"
              >
                Import
              </motion.button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
            </div>
          </div>

          {/* Bulk Delete Lists */}
          {collections && collections.length > 0 && onOpenBulkDelete && (
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-semibold text-ink-900 leading-snug">Bulk delete lists</p>
                <p className="mt-0.5 text-small text-ink-500 leading-relaxed">
                  Select and delete multiple lists at once. Tasks inside them will be moved to Unsorted.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onOpenBulkDelete}
                className="shrink-0 self-start sm:self-center rounded-xl bg-paper-200 px-4 py-2 text-body font-medium text-ink-800 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs w-full sm:w-auto text-center cursor-pointer"
              >
                Delete lists…
              </motion.button>
            </div>
          )}

          {/* Clear All Tasks */}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-semibold text-ink-900 leading-snug">Clear all tasks</p>
              <p className="mt-0.5 text-small text-ink-500 leading-relaxed">Removes every task. Boards and lists stay intact.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={clear}
              className={`shrink-0 self-start sm:self-center rounded-xl px-4 py-2 text-body font-medium transition-colors duration-150 w-full sm:w-auto text-center cursor-pointer ${
                armed ? 'bg-terra-600 text-[#fbf9f5] shadow-xs' : 'text-terra-600 hover:bg-terra-50 bg-paper-200/80'
              }`}
            >
              {armed ? 'Tap to confirm' : 'Clear all'}
            </motion.button>
          </div>
        </div>
      </section>

      {/* Updates (Native Android APK) */}
      {isNative && updater && <AppUpdateSection updater={updater} />}

      {/* About & Legal */}
      <section className="space-y-2.5">
        <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 ml-1">
          About & Legal
        </h2>
        <div className="rounded-2xl bg-paper-100/70 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between text-body">
            <span className="text-ink-700">Application Version</span>
            <span className="font-mono text-small text-ink-900 font-medium">
              {APP_VERSION_DISPLAY} <span className="font-sans font-normal text-caption text-ink-400">({APP_VERSION_CODENAME})</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-body">
            <span className="text-ink-700">Storage Architecture</span>
            <span className="text-small text-pine-400 font-medium">100% Local-First</span>
          </div>
          <div className="flex items-center justify-between text-body">
            <span className="text-ink-700">Last Legal Update</span>
            <span className="text-small text-ink-500">{LAST_LEGAL_UPDATE}</span>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-2 text-small font-medium">
            <a
              href="#/tos"
              className="rounded-lg bg-paper-200 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-300 hover:text-pine-300 active:scale-95 cursor-pointer"
            >
              Terms of Service
            </a>
            <a
              href="#/privacy"
              className="rounded-lg bg-paper-200 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-300 hover:text-pine-300 active:scale-95 cursor-pointer"
            >
              Privacy Policy
            </a>
            <a
              href="#/licenses"
              className="rounded-lg bg-paper-200 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-300 hover:text-pine-300 active:scale-95 cursor-pointer"
            >
              Open Source Licenses
            </a>
            <a
              href="https://discord.gg/Kfn4V2nF3N"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-paper-200 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-300 hover:text-pine-300 active:scale-95 cursor-pointer"
            >
              Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
