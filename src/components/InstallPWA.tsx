import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogoMark,
  PlusSquareIcon,
  ShareIcon,
  CloseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  BellIcon,
  FolderSyncIcon,
} from './icons'
import { OFFICIAL_RELEASES_URL } from '../constants'
import { isNativePlatform } from '../lib/sync'
import { isAndroid } from '../lib/platform'
import { useIsDesktop } from '../lib/useMediaQuery'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroidUser, setIsAndroidUser] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [showAndroidModal, setShowAndroidModal] = useState(false)

  useEffect(() => {
    if (isNativePlatform()) return

    // Check if already in standalone mode
    const isStandaloneMode =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    setIsStandalone(isStandaloneMode)

    // Check platform
    const ua = window.navigator.userAgent
    const iosDevice = /iphone|ipad|ipod/i.test(ua)
    setIsIOS(iosDevice)
    setIsAndroidUser(isAndroid())

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const promptInstall = async () => {
    if (isAndroidUser) {
      setShowAndroidModal(true)
    } else if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else if (isIOS) {
      setShowIOSModal(true)
    }
  }

  const promptPWA = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
  }

  return {
    canInstall: !!deferredPrompt || isIOS || isAndroidUser,
    isStandalone,
    isAndroid: isAndroidUser,
    showIOSModal,
    setShowIOSModal,
    showAndroidModal,
    setShowAndroidModal,
    promptInstall,
    promptPWA: deferredPrompt ? promptPWA : undefined,
  }
}

export function IOSInstallModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const isDesktop = useIsDesktop()
  if (isNativePlatform()) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="install-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#0c0b0a]/70 backdrop-blur-sm"
          />
          <motion.div
            key="install-panel"
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label="Install Tasquera"
            className={`fixed z-50 flex flex-col bg-paper-100 text-ink-900 overflow-hidden ${
              isDesktop
                ? 'inset-y-0 right-0 w-full max-w-md border-l border-paper-200/80 shadow-[-24px_0_60px_rgba(0,0,0,0.6)]'
                : 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-[28px] border-t border-paper-200/80 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Mobile grab handle */}
            <div className="flex w-full justify-center pt-2.5 pb-1 md:hidden">
              <div className="h-1 w-10 rounded-full bg-ink-300/50" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-200/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <LogoMark className="size-7 shrink-0" />
                <div>
                  <h3 className="font-sans text-title font-bold text-ink-900 leading-tight">Install Tasquera</h3>
                  <p className="text-small text-ink-500">Add to iPhone / iPad home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900"
              >
                <CloseIcon className="size-[18px]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-3.5 text-body text-ink-700">
                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    1
                  </span>
                  <p className="leading-snug">
                    Tap the <span className="font-semibold text-ink-900">Share</span> button in Safari's toolbar below{' '}
                    <ShareIcon className="inline size-4 text-pine-600" />.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    2
                  </span>
                  <p className="leading-snug">
                    Scroll down and tap <span className="font-semibold text-ink-900">Add to Home Screen</span>{' '}
                    <PlusSquareIcon className="inline size-4 text-pine-600" />.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    3
                  </span>
                  <p className="leading-snug">
                    Tap <span className="font-semibold text-ink-900">Add</span> in the top-right corner to finish.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="border-t border-paper-200/70 bg-paper-100/95 px-6 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:py-3.5 backdrop-blur-xs">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-pine-600 py-2.5 text-center text-body-lg font-semibold text-white shadow-xs transition-colors hover:bg-pine-700 active:scale-[0.99]"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function AndroidInstallModal({
  isOpen,
  onClose,
  onInstallPWA,
}: {
  isOpen: boolean
  onClose: () => void
  onInstallPWA?: () => void
}) {
  const isDesktop = useIsDesktop()
  if (isNativePlatform()) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="android-install-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#0c0b0a]/70 backdrop-blur-sm"
          />
          <motion.div
            key="android-install-panel"
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label="Get Tasquera for Android"
            className={`fixed z-50 flex flex-col bg-paper-100 text-ink-900 overflow-hidden ${
              isDesktop
                ? 'inset-y-0 right-0 w-full max-w-md border-l border-paper-200/80 shadow-[-24px_0_60px_rgba(0,0,0,0.6)]'
                : 'inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-[28px] border-t border-paper-200/80 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Mobile grab handle */}
            <div className="flex w-full justify-center pt-2.5 pb-1 md:hidden">
              <div className="h-1 w-10 rounded-full bg-ink-300/50" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-200/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <LogoMark className="size-7 shrink-0" />
                <div>
                  <h3 className="font-sans text-title font-bold text-ink-900 leading-tight">
                    Get Tasquera for Android
                  </h3>
                  <p className="text-small text-ink-500">Official APK from GitHub Releases</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900"
              >
                <CloseIcon className="size-[18px]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Native benefits card */}
              <div className="rounded-xl bg-pine-500/10 border border-pine-500/20 p-4 space-y-2.5">
                <p className="text-small font-semibold text-pine-800 dark:text-pine-300">
                  Why use the official APK?
                </p>
                <ul className="space-y-2 text-caption text-ink-700 leading-snug">
                  <li className="flex items-start gap-2">
                    <BellIcon className="size-4 shrink-0 text-pine-600 mt-0.5" />
                    <span>
                      <strong>Background reminders:</strong> Receive exact due-date alerts even when Tasquera is closed.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FolderSyncIcon className="size-4 shrink-0 text-pine-600 mt-0.5" />
                    <span>
                      <strong>Syncthing folder sync:</strong> Real bidirectional sync via <code className="font-mono bg-paper-200/80 px-1 py-0.5 rounded">Documents/Tsqsync/</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DownloadIcon className="size-4 shrink-0 text-pine-600 mt-0.5" />
                    <span>
                      <strong>In-app updates:</strong> Automatically checks for and installs new releases directly.
                    </span>
                  </li>
                </ul>
              </div>

              {/* How to install steps */}
              <div className="space-y-3 text-body text-ink-700">
                <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Installation Steps
                </p>

                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    1
                  </span>
                  <div className="leading-snug">
                    <p className="font-semibold text-ink-900">Download the APK</p>
                    <p className="text-small text-ink-500 mt-0.5">
                      Visit GitHub Releases and download <span className="font-mono text-ink-800">app-release.apk</span> from the latest release.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    2
                  </span>
                  <div className="leading-snug">
                    <p className="font-semibold text-ink-900">Open the download</p>
                    <p className="text-small text-ink-500 mt-0.5">
                      Tap the completed download alert in your notification shade, or locate it in your Files app.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-paper-200/50 p-3.5 border border-paper-200/60">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-pine-600 text-small font-bold text-white">
                    3
                  </span>
                  <div className="leading-snug">
                    <p className="font-semibold text-ink-900">Confirm install</p>
                    <p className="text-small text-ink-500 mt-0.5">
                      Tap Install. If prompted by Android, allow “Install unknown apps” for your browser.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="border-t border-paper-200/70 bg-paper-100/95 px-6 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:py-3.5 backdrop-blur-xs space-y-2.5">
              <a
                href={OFFICIAL_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-pine-600 py-3 text-center text-body-lg font-semibold text-white shadow-xs transition-colors hover:bg-pine-700 active:scale-[0.99]"
              >
                <DownloadIcon className="size-5" />
                <span>Download Official APK</span>
                <ExternalLinkIcon className="size-4 opacity-80" />
              </a>

              <div className="flex items-center justify-between gap-2 pt-1">
                {onInstallPWA && (
                  <button
                    type="button"
                    onClick={() => {
                      onInstallPWA()
                      onClose()
                    }}
                    className="text-caption text-ink-500 hover:text-ink-800 underline transition-colors cursor-pointer"
                  >
                    Install web shortcut instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto text-caption font-medium text-ink-500 hover:text-ink-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function AndroidDownloadBanner({
  onOpenModal,
}: {
  onOpenModal: () => void
}) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (isNativePlatform()) return
    if (!isAndroid()) return

    try {
      const isDismissed = localStorage.getItem('tasquera_android_apk_banner_dismissed') === '1'
      if (!isDismissed) {
        setDismissed(false)
      }
    } catch {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('tasquera_android_apk_banner_dismissed', '1')
    } catch {
      // Ignore storage errors
    }
  }

  if (dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        key="android-download-banner"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-6 left-1/2 z-40 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-paper-200/90 bg-paper-100/95 p-3.5 text-ink-900 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pine-500/15 text-pine-400">
            <DownloadIcon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink-900 leading-snug">Tasquera for Android</p>
            <p className="mt-0.5 text-small text-ink-500 leading-snug">
              Download the official APK for background reminders and Syncthing sync.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={OFFICIAL_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl bg-pine-600 px-3 py-1.5 text-small font-semibold text-white shadow-2xs transition-colors hover:bg-pine-700 active:scale-[0.98]"
              >
                <span>Download APK</span>
                <ExternalLinkIcon className="size-3.5" />
              </a>
              <button
                type="button"
                onClick={onOpenModal}
                className="rounded-xl bg-paper-200 px-3 py-1.5 text-small font-medium text-ink-700 transition-colors hover:bg-paper-300 cursor-pointer"
              >
                Guide
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss Android banner"
            className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-900 cursor-pointer"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
