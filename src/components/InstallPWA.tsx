import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoMark, PlusSquareIcon, ShareIcon, CloseIcon } from './icons'
import { isNativePlatform } from '../lib/sync'
import { useIsDesktop } from '../lib/useMediaQuery'

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
    if (isNativePlatform()) return

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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else if (isIOS) {
      setShowIOSModal(true)
    }
  }

  return {
    canInstall: !!deferredPrompt || isIOS,
    isStandalone,
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
