import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadIcon, LogoMark, PlusSquareIcon, ShareIcon } from './icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const ua = window.navigator.userAgent
    const iosDevice = /iphone|ipad|ipod/i.test(ua)
    setIsIOS(iosDevice)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
        setIsStandalone(true)
      }
    } else if (isIOS && !isStandalone) {
      setShowIOSModal(true)
    }
  }

  const canInstall = !isStandalone && (!!deferredPrompt || isIOS)

  return {
    canInstall,
    isStandalone,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    promptInstall,
  }
}

export function IOSInstallModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-paper-200/80 bg-paper-50 p-6 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <LogoMark className="size-8 shrink-0" />
              <div>
                <h3 className="font-sans text-[17px] font-bold text-ink-900">Install Tasquera</h3>
                <p className="text-[12.5px] text-ink-500">Add to your iPhone / iPad home screen</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 text-[13.5px] text-ink-700">
              <div className="flex items-start gap-3 rounded-xl bg-paper-100/70 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-paper-200 text-[12px] font-semibold text-ink-600">
                  1
                </span>
                <p className="leading-snug">
                  Tap the <span className="font-medium text-ink-900">Share</span> button in Safari's toolbar below{' '}
                  <ShareIcon className="inline size-4 text-pine-600" />.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-paper-100/70 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-paper-200 text-[12px] font-semibold text-ink-600">
                  2
                </span>
                <p className="leading-snug">
                  Scroll down and tap <span className="font-medium text-ink-900">Add to Home Screen</span>{' '}
                  <PlusSquareIcon className="inline size-4 text-pine-600" />.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-paper-100/70 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-paper-200 text-[12px] font-semibold text-ink-600">
                  3
                </span>
                <p className="leading-snug">
                  Tap <span className="font-medium text-ink-900">Add</span> in the top-right corner to finish.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-pine-600 py-2.5 text-center text-[14px] font-semibold text-white transition-colors hover:bg-pine-700 active:scale-[0.99]"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function SidebarInstallButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-pine-700 transition-colors duration-150 bg-pine-500/10 hover:bg-pine-500/20 active:scale-[0.99]"
    >
      <span className="relative z-10 shrink-0 text-pine-600">
        <DownloadIcon className="size-[18px]" />
      </span>
      <span className="relative z-10 min-w-0 flex-1 truncate">Install App</span>
      <span className="relative z-10 shrink-0 rounded-md bg-pine-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        PWA
      </span>
    </button>
  )
}
