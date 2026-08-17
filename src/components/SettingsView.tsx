import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { BellIcon, CheckIcon, FolderSyncIcon, InfoIcon, LogoMark } from './icons'
import AutoArchivePicker from './AutoArchivePicker'
import { AppUpdateSection } from './AppUpdate'
import { APP_NAME, APP_VERSION, LAST_LEGAL_UPDATE } from '../constants'
import { isNativePlatform, hasNativeWriteAccess } from '../lib/sync'
import {
  getNotificationStatus,
  requestNativePermission,
  requestWebPermission,
  type NotificationStatus,
} from '../lib/notifications'

import type { AppSettings } from '../types'
import type { AppUpdater } from '../lib/useAppUpdater'

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-[14.5px] text-ink-700">{label}</span>
      <kbd className="rounded-md bg-paper-200/90 border border-paper-300/40 px-2 py-0.5 font-sans text-[12px] font-medium text-ink-500 shadow-2xs">
        {keys}
      </kbd>
    </div>
  )
}

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClearAll,
  onArchiveOldCompleted,
  onExportData,
  onImportData,
  canInstallPWA,
  isStandalonePWA,
  onInstallPWA,
  isFileSystemSupported,
  isNative,
  isSyncActive,
  syncNeedsPermission,
  lastSyncFormatted,
  syncSizeBytes,
  syncErrorMsg,
  syncResolveMsg,
  onSelectSyncFolder,
  onDisconnectSyncFolder,
  updater,
}: {
  settings?: AppSettings
  onUpdateSettings?: (patch: Partial<AppSettings>) => void
  onClearAll: () => void
  onArchiveOldCompleted?: (days?: number) => void
  onExportData?: () => Promise<string>
  onImportData?: (json: string) => Promise<boolean>
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
}) {
  const [armed, setArmed] = useState(false)
  const [archivedCountMsg, setArchivedCountMsg] = useState<string | null>(null)
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

  const currentArchiveDays = settings?.autoArchiveDays ?? 7

  const handleArchiveOld = () => {
    const days = currentArchiveDays > 0 ? currentArchiveDays : 7
    onArchiveOldCompleted?.(days)
    setArchivedCountMsg(`Archived completed tasks older than ${days} ${days === 1 ? 'day' : 'days'}!`)
    setTimeout(() => setArchivedCountMsg(null), 3000)
  }

  return (
    <div className="pb-12 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <LogoMark className="size-8.5 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-sans text-[22px] sm:text-[24px] font-bold leading-none tracking-tight text-ink-900">
              {APP_NAME}<span className="text-pine-500">.</span>
            </h1>
            <p className="mt-1 text-[12.5px] text-ink-500 truncate">v{APP_VERSION} · calm by design</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-pine-500/15 px-2.5 py-1 text-[12px] font-mono font-semibold text-pine-300 border border-pine-500/30">
          v{APP_VERSION}
        </span>
      </div>

      {/* PWA section is only shown on web, completely hidden for native APK */}
      {!isNative && (
        <section className="mt-8 sm:mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
            Progressive Web App
          </h2>
          <div className="rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink-900 leading-snug">Desktop & Mobile App</p>
                <p className="mt-1 text-[13px] text-ink-500 leading-relaxed">
                  {isStandalonePWA
                    ? 'Tasquera is running as an installed standalone app with offline support.'
                    : 'Download Tasquera to your desktop or phone home screen for instant offline access.'}
                </p>
              </div>
              {isStandalonePWA ? (
                <span className="inline-flex shrink-0 items-center self-start sm:self-center gap-1.5 rounded-xl bg-pine-500/15 px-3 py-1.5 text-[13px] font-medium text-pine-300 border border-pine-500/30">
                  <CheckIcon className="size-4 text-pine-400" /> Installed
                </span>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onInstallPWA}
                  disabled={!canInstallPWA}
                  className="shrink-0 self-start sm:self-center rounded-xl bg-pine-600 px-4 py-2 text-[13.5px] font-medium text-white shadow-2xs transition-colors hover:bg-pine-700 disabled:opacity-50"
                >
                  Install App
                </motion.button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Task Automation */}
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          Task Automation
        </h2>
        <div className="divide-y divide-paper-200/60 rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink-900 leading-snug">Auto-archive completed tasks</p>
              <p className="mt-0.5 text-[13px] text-ink-500 leading-relaxed">
                Automatically moves done tasks to the Archive in the background.
              </p>
            </div>
            <div className="shrink-0 self-start sm:self-center">
              <AutoArchivePicker
                value={currentArchiveDays}
                onChange={(val) => onUpdateSettings?.({ autoArchiveDays: val })}
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium text-ink-800 leading-snug">Manual archive now</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500 leading-relaxed">
                Immediately archive completed tasks older than {currentArchiveDays > 0 ? `${currentArchiveDays} days` : '7 days'}.
              </p>
              {archivedCountMsg && <p className="mt-1.5 text-[12px] font-medium text-pine-400">{archivedCountMsg}</p>}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleArchiveOld}
              className="shrink-0 self-start sm:self-center rounded-xl bg-paper-200/90 px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs"
            >
              Archive older tasks
            </motion.button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          Notifications
        </h2>
        <div className="rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5">
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
                  <span className="text-[15px] font-semibold text-ink-900 leading-snug">
                    Due date & deadline reminders
                  </span>
                  {settings?.notificationsEnabled && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-500/15 px-2.5 py-0.5 text-[11.5px] font-medium text-pine-300 border border-pine-500/30">
                      <span className="size-1.5 rounded-full bg-pine-400 animate-pulse" />
                      On
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-ink-500 leading-relaxed">
                  {isNative
                    ? 'Tasquera reminds you when tasks are due, even when the app is closed.'
                    : 'Tasquera reminds you when tasks are due while it’s open in this browser.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings?.notificationsEnabled ?? false}
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings?.notificationsEnabled ? 'bg-pine-600' : 'bg-paper-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings?.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {notifMsg && (
            <p className="mt-3 rounded-xl border border-terra-500/20 bg-terra-500/10 p-3 text-[12.5px] font-medium text-terra-600">
              {notifMsg}
            </p>
          )}

          {settings?.notificationsEnabled && (
            <div className="mt-4 flex flex-col gap-3 border-t border-paper-200/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-medium text-ink-800">Remind on due date at</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500 leading-relaxed">
                  Date-only due dates remind at this time. Deadlines use their own time.
                </p>
              </div>
              <input
                type="time"
                value={settings?.notificationTime ?? '09:00'}
                onChange={(e) => onUpdateSettings?.({ notificationTime: e.target.value || '09:00' })}
                className="shrink-0 self-start sm:self-center rounded-xl border border-paper-200 bg-paper-50 px-3.5 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-paper-300 focus:border-pine-500 focus:outline-none"
              />
            </div>
          )}

          {notifStatus === 'denied' && (
            <p className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              {isNative
                ? 'Notifications are blocked at the system level. Allow them for Tasquera in Android settings, then toggle reminders on.'
                : 'Notifications are blocked for this site. Allow them in your browser’s site permissions, then toggle reminders on.'}
            </p>
          )}
          {!isNative && notifStatus === 'unsupported' && (
            <p className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              Notifications aren’t supported in this browser. Reminders will appear in-app on the Today view instead.
            </p>
          )}
          {!isNative && (
            <p className="mt-3 text-[12px] text-ink-500 leading-relaxed">
              Browsers can’t schedule notifications in the background without a push server, so reminders appear while
              Tasquera is open, including the installed PWA. Overdue reminders are caught up the next time you open the app.
            </p>
          )}
        </div>
      </section>

      {/* Syncthing & Storage Sync */}
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          {isNative ? 'Device Storage & Sync' : 'Syncthing & Local Sync'}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5">
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
                  <span className="text-[15px] font-semibold text-ink-900 leading-snug">
                    {isNative ? 'Native Syncthing Sync' : 'Folder Sync Binding'}
                  </span>
                  {isSyncActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-500/15 px-2.5 py-0.5 text-[11.5px] font-medium text-pine-300 border border-pine-500/30">
                      <span className="size-1.5 rounded-full bg-pine-400 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-paper-200 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-500">
                      {isNative ? 'Paused' : 'Not Connected'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-ink-500 leading-relaxed">
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
                  className="w-full sm:w-auto rounded-xl border border-paper-200 bg-paper-50 px-3.5 py-2 text-[13px] font-medium text-terra-600 shadow-2xs transition-colors hover:bg-terra-50 hover:border-terra-200 text-center"
                >
                  {isNative ? 'Pause Sync' : 'Disconnect'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSelectSyncFolder}
                  disabled={!isFileSystemSupported && !isNative}
                  className="w-full sm:w-auto rounded-xl bg-pine-600 px-4 py-2 text-[13px] font-medium text-white shadow-2xs transition-colors hover:bg-pine-700 disabled:opacity-50 text-center"
                >
                  {isNative ? (syncNeedsPermission ? 'Grant access' : 'Enable Sync') : 'Select Folder'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Sync Path & Status Info Bar */}
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-paper-200/60 bg-paper-50/70 p-3 text-[12px] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-medium text-ink-400">Path:</span>
              <span className="truncate font-mono text-[11.5px] text-ink-800 bg-paper-200/70 px-2 py-0.5 rounded-md">
                {isNative ? 'Documents/Tsqsync/tasquera-sync.json' : isSyncActive ? 'Linked Folder / tasquera-sync.json' : 'Not linked'}
              </span>
            </div>
            {isSyncActive && (
              <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-500">
                <span className="size-1.5 rounded-full bg-pine-500" />
                {lastSyncFormatted ? `Synced at ${lastSyncFormatted}` : 'Auto-syncing changes'}
              </span>
            )}
          </div>

          {/* Browser Unsupported Warning */}
          {!isFileSystemSupported && !isNative && (
            <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              Your current browser does not support local folder access. You can still use the <strong>Backup & restore</strong> feature below to export and import data manually.
            </div>
          )}

          {/* Storage access required (Android 11+) */}
          {syncNeedsPermission && (
            <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              Android 11 and newer require <strong>All files access</strong> to read and write the <code className="font-mono text-[11px]">Documents/Tsqsync/</code> folder. Grant it once and Tasquera will reconnect automatically.
            </div>
          )}

          {/* Error Message */}
          {syncErrorMsg && (
            <div className="mt-3.5 rounded-xl border border-terra-500/20 bg-terra-500/10 p-3 text-[12.5px] font-medium text-terra-700">
              {syncErrorMsg}
            </div>
          )}

          {/* Large sync file notice */}
          {typeof syncSizeBytes === 'number' && syncSizeBytes > 2_000_000 && (
            <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              Your sync file is currently {(syncSizeBytes / 1_000_000).toFixed(1)} MB. Image attachments are embedded in it as base64, so large photos make the file big and Syncthing re-syncs the whole file on every change.
            </div>
          )}

          {/* Auto-resolved conflict notice */}
          {syncResolveMsg && (
            <div className="mt-3.5 rounded-xl border border-pine-500/20 bg-pine-500/10 p-3 text-[12.5px] font-medium text-pine-700">
              {syncResolveMsg}
            </div>
          )}

          {/* Syncthing Guide Card */}
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-paper-200/40 p-3 text-[12px] text-ink-600 leading-relaxed">
            <InfoIcon className="size-4 shrink-0 text-ink-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              {isNative ? (
                <>
                  <span className="font-semibold text-ink-800">Syncthing Setup:</span> In your Syncthing app on Android, add and share the folder <code className="font-mono text-[11px] text-pine-400 bg-paper-50 px-1.5 py-0.5 rounded">Documents/Tsqsync/</code>. Tasquera writes and reads state directly from this directory.
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

      {/* Interface */}
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          Interface
        </h2>
        <div className="rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink-900 leading-snug">Show sidebar quick-add field</p>
            <p className="mt-0.5 text-[13px] text-ink-500 leading-relaxed">
              Displays a quick input box in the sidebar for rapid task creation.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.showQuickAdd ?? false}
            onClick={() => onUpdateSettings?.({ showQuickAdd: !settings?.showQuickAdd })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings?.showQuickAdd ? 'bg-pine-600' : 'bg-paper-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings?.showQuickAdd ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Keyboard Shortcuts - Desktop web only, hidden on mobile screens & APK */}
      {!isNative && (
        <section className="mt-8 sm:mt-10 hidden md:block">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
            Keyboard Shortcuts
          </h2>
          <div className="rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5 space-y-1.5">
            <Shortcut keys="/" label="Quick-add a task" />
            <Shortcut keys="Enter" label="Add / submit" />
            <Shortcut keys="Ctrl+K" label="Search tasks" />
            <Shortcut keys="Ctrl+Z / Ctrl+Y" label="Undo / redo" />
            <Shortcut keys="Drag" label="Reorder tasks" />
          </div>
        </section>
      )}

      {/* Data Management */}
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          Data Management
        </h2>
        <div className="divide-y divide-paper-200/60 rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5 space-y-4">
          {dataMsg && (
            <p className="rounded-xl border border-pine-500/20 bg-pine-500/10 p-3 text-[12.5px] font-medium text-pine-400">
              {dataMsg}
            </p>
          )}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink-900 leading-snug">Backup & restore</p>
              <p className="mt-0.5 text-[13px] text-ink-500 leading-relaxed">
                {isNative
                  ? 'Export a snapshot JSON backup to device storage, or restore previous tasks from one.'
                  : 'Data lives in this browser. Export a JSON backup, or restore from one.'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2.5 self-start sm:self-center w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={exportData}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200/90 px-4 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center"
              >
                Export
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial rounded-xl bg-paper-200/90 px-4 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-paper-300 active:bg-paper-400 shadow-2xs text-center"
              >
                Import
              </motion.button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink-900 leading-snug">Clear all tasks</p>
              <p className="mt-0.5 text-[13px] text-ink-500 leading-relaxed">Removes every task. Boards and lists stay.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={clear}
              className={`shrink-0 self-start sm:self-center rounded-xl px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 w-full sm:w-auto text-center ${
                armed ? 'bg-terra-600 text-white shadow-2xs' : 'text-terra-600 hover:bg-terra-50 border border-terra-500/20'
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
      <section className="mt-8 sm:mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">
          About & Legal
        </h2>
        <div className="divide-y divide-paper-200/60 rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Application Version</span>
            <span className="font-mono text-[13px] text-ink-900 font-medium">{APP_VERSION}</span>
          </div>
          <div className="pt-3 flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Storage Architecture</span>
            <span className="text-[13px] text-pine-400 font-medium">100% Local-First</span>
          </div>
          <div className="pt-3 flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Last Legal Update</span>
            <span className="text-[13px] text-ink-500">{LAST_LEGAL_UPDATE}</span>
          </div>
          <div className="pt-4 flex flex-wrap items-center gap-2 sm:gap-2.5 text-[12.5px] font-medium">
            <a
              href="#/tos"
              className="rounded-lg bg-paper-200/70 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-200 hover:text-pine-300 active:scale-95"
            >
              Terms of Service
            </a>
            <a
              href="#/privacy"
              className="rounded-lg bg-paper-200/70 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-200 hover:text-pine-300 active:scale-95"
            >
              Privacy Policy
            </a>
            <a
              href="#/licenses"
              className="rounded-lg bg-paper-200/70 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-200 hover:text-pine-300 active:scale-95"
            >
              Open Source Licenses
            </a>
            <a
              href="https://discord.gg/Kfn4V2nF3N"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-paper-200/70 px-3 py-1.5 text-pine-400 transition-colors hover:bg-paper-200 hover:text-pine-300 active:scale-95"
            >
              Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
