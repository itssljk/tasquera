import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, FolderSyncIcon, InfoIcon, LogoMark } from './icons'
import AutoArchivePicker from './AutoArchivePicker'
import { APP_NAME, APP_VERSION, LAST_LEGAL_UPDATE } from '../constants'

import type { AppSettings } from '../types'

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[15px] text-ink-700">{label}</span>
      <kbd className="rounded-md bg-paper-200 px-2 py-0.5 font-sans text-[12px] font-medium text-ink-500">{keys}</kbd>
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
  lastSyncFormatted,
  syncErrorMsg,
  onSelectSyncFolder,
  onDisconnectSyncFolder,
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
  lastSyncFormatted?: string | null
  syncErrorMsg?: string | null
  onSelectSyncFolder?: () => void
  onDisconnectSyncFolder?: () => void
}) {
  const [armed, setArmed] = useState(false)
  const [archivedCountMsg, setArchivedCountMsg] = useState<string | null>(null)
  const [dataMsg, setDataMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportData = async () => {
    if (!onExportData) return
    const json = await onExportData()
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
      setDataMsg(ok ? 'Data imported.' : 'Import failed — not a valid Tasquera backup.')
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
    <div className="pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="size-8" />
          <div>
            <p className="font-sans text-[22px] font-bold leading-none tracking-tight text-ink-900">
              {APP_NAME}<span className="text-pine-500">.</span>
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-500">{APP_VERSION} · calm by design</p>
          </div>
        </div>
        <span className="rounded-lg bg-pine-500/15 px-2.5 py-1 text-[12px] font-mono font-semibold text-pine-300 border border-pine-500/30">
          Version {APP_VERSION}
        </span>
      </div>

      {/* PWA section is only shown on web, completely hidden for native APK */}
      {!isNative && (
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Progressive Web App</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink-900">Desktop & Mobile App</p>
              <p className="mt-0.5 text-[13px] text-ink-500">
                {isStandalonePWA
                  ? 'Tasquera is installed and running as a native standalone app with offline support.'
                  : 'Download Tasquera to your desktop or phone home screen for instant offline access.'}
              </p>
            </div>
            {isStandalonePWA ? (
              <span className="inline-flex shrink-0 items-center self-start sm:self-center gap-1.5 rounded-xl bg-pine-500/15 px-3 py-1.5 text-[13px] font-medium text-pine-300 border border-pine-500/30">
                <CheckIcon className="size-4 text-pine-400" /> Installed
              </span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={onInstallPWA}
                disabled={!canInstallPWA && !onInstallPWA}
                className="shrink-0 self-start sm:self-center rounded-xl bg-pine-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
              >
                Install App
              </motion.button>
            )}
          </div>
        </section>
      )}

      {/* Task Automation */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Task Automation</h2>
        <div className="mt-3 divide-y divide-paper-200/80 rounded-2xl border border-paper-200/80 bg-paper-100/40 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink-900">Auto-archive completed tasks</p>
              <p className="mt-0.5 text-[13px] text-ink-500">
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
              <p className="text-[14.5px] font-medium text-ink-800">Manual archive now</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                Immediately archive completed tasks older than {currentArchiveDays > 0 ? `${currentArchiveDays} days` : '7 days'}.
              </p>
              {archivedCountMsg && <p className="mt-1 text-[12px] font-medium text-pine-400">{archivedCountMsg}</p>}
            </div>
            <button
              type="button"
              onClick={handleArchiveOld}
              className="shrink-0 self-start sm:self-center rounded-xl bg-paper-200 px-4 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-paper-300 active:bg-paper-400"
            >
              Archive older tasks
            </button>
          </div>
        </div>
      </section>

      {/* Syncthing & Storage Sync */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {isNative ? 'Device Storage & Sync' : 'Syncthing & Local Sync'}
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-paper-200/80 bg-paper-100/40 p-4 sm:p-5">
          {/* Main Card Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
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
                <p className="mt-0.5 text-[12.5px] text-ink-500 leading-normal">
                  {isNative
                    ? 'Continuous local sync with your device storage for Syncthing'
                    : 'Direct bidirectional file sync with your local filesystem'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="shrink-0 pt-1 sm:pt-0">
              {isSyncActive ? (
                <button
                  type="button"
                  onClick={onDisconnectSyncFolder}
                  className="w-full sm:w-auto rounded-xl border border-paper-200 bg-paper-50 px-3.5 py-1.5 text-[13px] font-medium text-terra-600 shadow-2xs transition-colors hover:bg-terra-50 hover:border-terra-200 active:scale-[0.98]"
                >
                  {isNative ? 'Pause Sync' : 'Disconnect'}
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSelectSyncFolder}
                  disabled={!isFileSystemSupported && !isNative}
                  className="w-full sm:w-auto rounded-xl bg-pine-600 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-2xs transition-colors hover:bg-pine-700 disabled:opacity-50"
                >
                  {isNative ? 'Enable Sync' : 'Select Folder'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Sync Path & Status Info Bar */}
          <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-paper-200/60 bg-paper-50/70 px-3 py-2.5 text-[12px] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-medium text-ink-400">Path:</span>
              <span className="truncate font-mono text-[11.5px] text-ink-800 bg-paper-200/60 px-1.5 py-0.5 rounded">
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
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12.5px] text-amber-900 leading-snug">
              Your current browser does not support local folder access. You can still use the <strong>Backup & restore</strong> feature below to export and import data manually.
            </div>
          )}

          {/* Error Message */}
          {syncErrorMsg && (
            <div className="mt-3 rounded-xl border border-terra-500/20 bg-terra-500/10 p-3 text-[12.5px] font-medium text-terra-700">
              {syncErrorMsg}
            </div>
          )}

          {/* Syncthing Guide Card */}
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-paper-200/40 p-3 text-[12px] text-ink-600 leading-relaxed">
            <InfoIcon className="size-4 shrink-0 text-ink-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              {isNative ? (
                <>
                  <span className="font-semibold text-ink-800">Syncthing Setup:</span> In your Syncthing app on Android, add and share the folder <code className="font-mono text-[11px] text-pine-400 bg-paper-50 px-1 py-0.5 rounded">Documents/Tsqsync/</code>. Tasquera writes and reads state directly from this directory.
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
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Interface</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-ink-900">Show sidebar quick-add field</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
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

      {/* Keyboard */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Keyboard</h2>
        <div className="mt-3 space-y-2.5">
          <Shortcut keys="/" label="Quick-add a task" />
          <Shortcut keys="Enter" label="Add / submit" />
          <Shortcut keys="Drag" label="Reorder tasks" />
        </div>
      </section>

      {/* Data */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Data</h2>
        {dataMsg && <p className="mt-2 text-[12px] font-medium text-pine-400">{dataMsg}</p>}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink-900 font-medium">Backup & restore</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {isNative
                ? 'Export a snapshot JSON backup, or restore previous tasks from one.'
                : 'Data lives in this browser. Export a JSON backup, or restore from one.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2 self-start sm:self-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={exportData}
              className="rounded-xl bg-paper-200 px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper-300"
            >
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-paper-200 px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper-300"
            >
              Import
            </motion.button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink-900 font-medium">Clear all tasks</p>
            <p className="mt-0.5 text-[13px] text-ink-500">Removes every task. Boards and lists stay.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={clear}
            className={`shrink-0 self-start sm:self-center rounded-xl px-4 py-2 text-[14px] font-medium transition-colors duration-150 ${
              armed ? 'bg-terra-600 text-[#fbf9f5]' : 'text-terra-600 hover:bg-terra-50'
            }`}
          >
            {armed ? 'Tap to confirm' : 'Clear'}
          </motion.button>
        </div>
      </section>

      {/* About & Legal */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">About & Legal</h2>
        <div className="mt-3 space-y-3 rounded-2xl border border-paper-200/60 bg-paper-100/40 p-4">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Application Version</span>
            <span className="font-mono text-[13px] text-ink-900 font-medium">{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Storage Architecture</span>
            <span className="text-[13px] text-pine-500 font-medium">100% Local-First</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-700">Last Legal Update</span>
            <span className="text-[13px] text-ink-500">{LAST_LEGAL_UPDATE}</span>
          </div>
          <div className="pt-3 border-t border-paper-200/60 flex items-center gap-4 text-[13.5px] font-medium">
            <a
              href="#/tos"
              className="text-pine-500 transition-colors hover:text-pine-400 hover:underline"
            >
              Terms of Service
            </a>
            <span className="text-paper-300">·</span>
            <a
              href="#/privacy"
              className="text-pine-500 transition-colors hover:text-pine-400 hover:underline"
            >
              Privacy Policy
            </a>
            <span className="text-paper-300">·</span>
            <a
              href="#/licenses"
              className="text-pine-500 transition-colors hover:text-pine-400 hover:underline"
            >
              Open Source Licenses
            </a>
            <span className="text-paper-300">·</span>
            <a
              href="https://discord.gg/Kfn4V2nF3N"
              target="_blank"
              rel="noreferrer"
              className="text-pine-500 transition-colors hover:text-pine-400 hover:underline"
            >
              Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
