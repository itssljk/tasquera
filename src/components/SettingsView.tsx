import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, LogoMark } from './icons'
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

  const handleArchiveOld = () => {
    onArchiveOldCompleted?.(7)
    setArchivedCountMsg('Archived tasks older than 7 days!')
    setTimeout(() => setArchivedCountMsg(null), 3000)
  }

  return (
    <div>
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
        <span className="rounded-lg bg-pine-500/10 px-2.5 py-1 text-[12px] font-mono font-medium text-pine-500 border border-pine-500/20">
          Version {APP_VERSION}
        </span>
      </div>

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Progressive Web App</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-ink-900">Desktop & Mobile App</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {isStandalonePWA
                ? 'Tasquera is installed and running as a native standalone app with offline support.'
                : 'Download Tasquera to your desktop or phone home screen for instant offline access.'}
            </p>
          </div>
          {isStandalonePWA ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-pine-500/10 px-3 py-1.5 text-[13px] font-medium text-pine-600 border border-pine-500/20">
              <CheckIcon className="size-4" /> Installed
            </span>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={onInstallPWA}
              disabled={!canInstallPWA && !onInstallPWA}
              className="shrink-0 rounded-xl bg-pine-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
            >
              Install App
            </motion.button>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Task Automation</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] text-ink-900">Archive old completed tasks</p>
            <p className="mt-0.5 text-[13px] text-ink-500">Moves tasks completed over 7 days ago to the Archive.</p>
            {archivedCountMsg && <p className="mt-1 text-[12px] font-medium text-pine-600">{archivedCountMsg}</p>}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleArchiveOld}
            className="shrink-0 rounded-xl bg-paper-200 px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper-300"
          >
            Archive (&gt;7d)
          </motion.button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Syncthing & Local Sync</h2>
        <div className="mt-3 rounded-2xl border border-paper-200/60 bg-paper-100/40 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[15px] font-medium text-ink-900">Syncthing Folder Binding</p>
              <p className="mt-0.5 text-[13px] text-ink-500 max-w-md">
                Select a local folder shared via Syncthing. Tasquera automatically writes & syncs its state file directly inside that folder.
              </p>
            </div>
            {isSyncActive ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-pine-500/10 px-3 py-1.5 text-[13px] font-medium text-pine-600 border border-pine-500/20">
                <CheckIcon className="size-4" /> Active Folder Sync
              </span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSelectSyncFolder}
                disabled={!isFileSystemSupported}
                className="shrink-0 rounded-xl bg-pine-600 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
              >
                Select Sync Folder
              </motion.button>
            )}
          </div>

          {!isFileSystemSupported && (
            <div className="mt-3 rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-[13px] text-amber-800">
              Your current browser does not support native folder pickers. You can still use the <strong>Backup & restore (Export/Import)</strong> buttons below to sync data manually!
            </div>
          )}

          {isSyncActive && (
            <div className="mt-4 pt-3 border-t border-paper-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] text-ink-600">
                <span className="inline-block size-2 rounded-full bg-pine-500 animate-pulse" />
                <span>Auto-syncing folder. Last check: {lastSyncFormatted || 'Just now'}</span>
              </div>
              <button
                type="button"
                onClick={onDisconnectSyncFolder}
                className="text-[12.5px] font-medium text-terra-600 hover:underline"
              >
                Disconnect Folder
              </button>
            </div>
          )}

          {syncErrorMsg && (
            <p className="mt-2 text-[12.5px] font-medium text-terra-600">{syncErrorMsg}</p>
          )}

          <div className="mt-3 text-[12.5px] text-ink-400">
            💡 <strong>How it works:</strong> Click <em>Select Sync Folder</em> and pick your Syncthing shared directory. Tasquera creates and maintains <code className="font-mono">tasquera-sync.json</code> automatically!
          </div>
        </div>
      </section>

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

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Keyboard</h2>
        <div className="mt-3 space-y-2.5">
          <Shortcut keys="/" label="Quick-add a task" />
          <Shortcut keys="Enter" label="Add / submit" />
          <Shortcut keys="Drag" label="Reorder tasks" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Data</h2>
        {dataMsg && <p className="mt-2 text-[12px] font-medium text-pine-600">{dataMsg}</p>}
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] text-ink-900">Backup & restore</p>
            <p className="mt-0.5 text-[13px] text-ink-500">Data lives only in this browser. Export a JSON backup, or restore from one.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportData}
              className="rounded-xl bg-paper-200 px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper-300"
            >
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-paper-200 px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper-300"
            >
              Import
            </motion.button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] text-ink-900">Clear all tasks</p>
            <p className="mt-0.5 text-[13px] text-ink-500">Removes every task. Boards and lists stay.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={clear}
            className={`shrink-0 rounded-xl px-4 py-2 text-[14px] font-medium transition-colors duration-150 ${
              armed ? 'bg-terra-600 text-[#fbf9f5]' : 'text-terra-600 hover:bg-terra-50'
            }`}
          >
            {armed ? 'Tap to confirm' : 'Clear'}
          </motion.button>
        </div>
      </section>

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
