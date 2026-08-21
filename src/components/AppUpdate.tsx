import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircleIcon, CloseIcon, DownloadIcon, InfoIcon } from './icons'
import type { AppUpdater } from '../lib/useAppUpdater'

function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, percent))
  return (
    <div className="mt-2.5 h-[4px] w-full overflow-hidden rounded-full bg-paper-200">
      <motion.div
        className="h-full rounded-full bg-pine-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
    </div>
  )
}

/**
 * Floating update prompt shown on native Android when a newer version is
 * available, downloading, downloaded, or mid-install. Dismissing an update
 * records the versionCode so the same update isn't re-prompted automatically.
 */
export function AppUpdateBanner({ updater }: { updater: AppUpdater }) {
  const { status, manifest } = updater
  const visible =
    (status === 'available' || status === 'downloading' || status === 'ready' || status === 'installing') && !!manifest

  if (!visible || !manifest) return null

  const title =
    status === 'available'
      ? `Update ${manifest.versionName} is available`
      : status === 'downloading'
        ? 'Downloading update…'
        : status === 'ready'
          ? 'Update ready to install'
          : 'Confirm the install'

  const subtitle =
    status === 'available'
      ? `You're on ${updater.currentVersion ?? 'an older version'}.`
      : status === 'downloading'
        ? `${Math.round(updater.progress)}%`
        : status === 'ready'
          ? `${manifest.versionName} downloaded and verified.`
          : 'Finish the Android prompt to update.'

  const canDismiss = status === 'available' || status === 'ready'

  return (
    <AnimatePresence>
      <motion.div
        key="update-banner"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="fixed bottom-5 left-1/2 z-40 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-paper-200 bg-paper-100 p-4 text-ink-900 shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pine-500/15 text-pine-400">
            <DownloadIcon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-lg font-semibold leading-snug">{title}</p>
            <p className="mt-0.5 text-small text-ink-500">{subtitle}</p>

            {status === 'downloading' && <ProgressBar percent={updater.progress} />}

            {status === 'available' && manifest.releaseNotes && (
              <p className="mt-2 rounded-xl bg-paper-200/50 px-3 py-2 text-small leading-relaxed text-ink-600">
                {manifest.releaseNotes}
              </p>
            )}

            {updater.needsPermission && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-small leading-snug text-amber-600">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                Allow “Install unknown apps” for Tasquera, then return and tap Install.
              </p>
            )}

            {(status === 'available' || status === 'ready') && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={status === 'available' ? updater.download : updater.install}
                  className="rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-white shadow-xs transition-colors hover:bg-pine-700 active:scale-[0.98]"
                >
                  {status === 'available' ? 'Download update' : 'Install'}
                </button>
                {canDismiss && (
                  <button
                    type="button"
                    onClick={updater.dismiss}
                    className="rounded-xl px-3 py-2 text-body font-medium text-ink-500 transition-colors hover:bg-paper-200"
                  >
                    Later
                  </button>
                )}
              </div>
            )}
          </div>

          {canDismiss && (
            <button
              type="button"
              onClick={updater.dismiss}
              aria-label="Dismiss update"
              className="shrink-0 rounded-lg p-1 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-900"
            >
              <CloseIcon className="size-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * The Updates card shown in Settings (native Android only). Owns the manual
 * "Check for updates" flow plus download/install actions and status readout.
 */
export function AppUpdateSection({ updater }: { updater: AppUpdater }) {
  const { status, manifest } = updater

  const button = () => {
    if (status === 'checking') {
      return (
        <button
          type="button"
          disabled
          className="shrink-0 self-start sm:self-center w-full sm:w-auto rounded-xl bg-paper-200/80 px-4 py-2 text-body font-medium text-ink-400 text-center"
        >
          Checking…
        </button>
      )
    }
    if (status === 'downloading') {
      return null
    }
    if (status === 'available') {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={updater.download}
          className="shrink-0 self-start sm:self-center w-full sm:w-auto rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-white shadow-2xs transition-colors hover:bg-pine-700 active:scale-[0.98] text-center"
        >
          Download
        </motion.button>
      )
    }
    if (status === 'ready') {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={updater.install}
          className="shrink-0 self-start sm:self-center w-full sm:w-auto rounded-xl bg-pine-600 px-4 py-2 text-body font-medium text-white shadow-2xs transition-colors hover:bg-pine-700 active:scale-[0.98] text-center"
        >
          Install
        </motion.button>
      )
    }
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => updater.check()}
        className="shrink-0 self-start sm:self-center w-full sm:w-auto rounded-xl bg-paper-200/90 px-4 py-2 text-body font-medium text-ink-700 shadow-2xs transition-colors hover:bg-paper-300 active:bg-paper-400 text-center"
      >
        Check for updates
      </motion.button>
    )
  }

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5 ml-1">Updates</h2>
      <div className="rounded-2xl border border-paper-200/70 bg-paper-100/50 p-4 sm:p-5">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                status === 'upToDate' ? 'bg-pine-500/15 text-pine-400' : 'bg-paper-200 text-ink-400'
              }`}
            >
              {status === 'upToDate' ? (
                <CheckCircleIcon className="size-4.5" />
              ) : (
                <DownloadIcon className="size-4.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-semibold text-ink-900 leading-snug">
                {status === 'upToDate'
                  ? 'You’re up to date'
                  : manifest
                    ? `${manifest.versionName} available`
                    : 'App updates'}
              </p>
              <p className="mt-1 text-small text-ink-500 leading-relaxed">
                {status === 'upToDate'
                  ? `Tasquera ${updater.currentVersion ? `v${updater.currentVersion.replace(/^v/, '')}` : ''} is the latest version.`
                  : status === 'available'
                    ? `A newer version is ready to download.`
                    : status === 'downloading'
                      ? 'Downloading the update…'
                      : status === 'ready'
                        ? 'The update is downloaded and ready to install.'
                        : status === 'installing'
                          ? 'Finish the Android prompt to complete the update.'
                          : 'Tasquera checks GitHub Releases for new versions.'}
              </p>
            </div>
          </div>
          {button()}
        </div>

        {status === 'downloading' && (
          <div className="mt-3.5">
            <ProgressBar percent={updater.progress} />
            <p className="mt-1.5 text-small font-medium text-ink-500">{Math.round(updater.progress)}%</p>
          </div>
        )}

        {manifest?.releaseNotes && (status === 'available' || status === 'ready') && (
          <div className="mt-3.5 rounded-xl bg-paper-200/50 p-3 text-small leading-relaxed text-ink-600">
            <span className="font-semibold text-ink-800">What’s new:</span> {manifest.releaseNotes}
          </div>
        )}

        {updater.needsPermission && (
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-small leading-snug text-amber-600">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Allow “Install unknown apps” for Tasquera in the system settings that just opened, then return and tap
            Install.
          </div>
        )}

        {updater.message && status !== 'downloading' && (
          <p className="mt-3.5 rounded-xl border border-pine-500/20 bg-pine-500/10 p-3 text-small font-medium text-pine-700">
            {updater.message}
          </p>
        )}

        {updater.error && (
          <div className="mt-3.5 rounded-xl border border-terra-500/20 bg-terra-500/10 p-3 text-small font-medium text-terra-700">
            {updater.error}
          </div>
        )}
      </div>
    </section>
  )
}
