import { motion } from 'framer-motion'
import { FolderSyncIcon, LogoMark, ShieldCheckIcon } from './icons'
import { APP_NAME } from '../constants'

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-paper-200/60 bg-paper-100/40 p-3.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-small leading-snug text-ink-500">{body}</p>
      </div>
    </div>
  )
}

/**
 * First-run gate shown on Android when the app hasn't been granted
 * "All files access" yet. Explains what the permission is for (writing to
 * Documents/Tsqsync so Syncthing can pick it up) and sends the user to the
 * system settings screen. It dismisses itself once access is granted.
 */
export default function StoragePermissionOnboarding({
  isOpen,
  onGrant,
  onNotNow,
}: {
  isOpen: boolean
  onGrant: () => void
  onNotNow: () => void
}) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label="Allow storage access"
      className="fixed inset-0 z-[70] overflow-y-auto bg-paper-50"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-12 pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="font-sans text-title-lg font-bold leading-none tracking-tight text-ink-900">
              {APP_NAME}<span className="text-pine-500">.</span>
            </p>
            <p className="mt-1.5 text-small text-ink-500">One quick step to keep your tasks in sync</p>
          </div>
        </div>

        <div className="mt-9">
          <h1 className="font-sans text-display font-bold leading-tight tracking-tight text-ink-900">
            Allow folder access to enable sync
          </h1>
          <p className="mt-3 text-body-lg leading-relaxed text-ink-600">
            Tasquera saves your tasks to a local folder ({' '}
            <code className="rounded bg-paper-200/70 px-1.5 py-0.5 font-mono text-small text-pine-600">
              Documents/Tsqsync/
            </code>{' '}
            ) that you share with Syncthing. Android 11 and newer need one extra permission before
            Tasquera can read and write that folder.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Step
            n={1}
            title="It stays on your device"
            body="The sync file lives only in Documents/Tsqsync/. Tasquera never uploads your tasks anywhere."
          />
          <Step
            n={2}
            title="Tap Grant access"
            body="Android opens a settings screen. Enable “Allow access to manage all files.”"
          />
          <Step
            n={3}
            title="Come back"
            body="Return to Tasquera and syncing starts automatically."
          />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onGrant}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pine-600 px-4 py-3 text-body-lg font-semibold text-white shadow-xs transition-colors hover:bg-pine-700 active:scale-[0.99]"
          >
            <FolderSyncIcon className="size-4.5" />
            Grant access
          </button>
          <button
            type="button"
            onClick={onNotNow}
            className="w-full rounded-xl px-4 py-2.5 text-body font-medium text-ink-500 transition-colors hover:bg-paper-100 hover:text-ink-700"
          >
            Not now
          </button>
        </div>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-caption text-ink-400">
          <ShieldCheckIcon className="size-3.5 shrink-0" />
          100% local-first: your data never leaves your device
        </p>
      </div>
    </motion.div>
  )
}
