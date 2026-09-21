import { App } from '@capacitor/app'
import { isNativePlatform } from './platform'

export type BackHandler = () => boolean

const backHandlers: BackHandler[] = []
let isInitialized = false

/**
 * Registers a dismiss/close callback on the LIFO Android back button stack.
 * Returns an unregister function to call on unmount.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler)
  return () => {
    const idx = backHandlers.lastIndexOf(handler)
    if (idx !== -1) {
      backHandlers.splice(idx, 1)
    }
  }
}

/**
 * Initializes the native hardware/gesture back button listener.
 * Idempotent.
 */
export function initBackButtonListener(): void {
  if (isInitialized || !isNativePlatform()) return
  isInitialized = true

  App.addListener('backButton', () => {
    // 1. Pop from top of registered handlers (modals, sheets, pickers)
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      const handled = backHandlers[i]()
      if (handled) {
        return
      }
    }

    // 2. If no overlays are open, navigate back to root/inbox if elsewhere
    const currentHash = typeof window !== 'undefined' ? window.location.hash : ''
    if (currentHash && currentHash !== '#/' && currentHash !== '#/inbox' && currentHash !== '') {
      window.location.hash = '#/inbox'
      return
    }

    // 3. Already at root inbox with no active sheets: minimize the APK cleanly
    App.minimizeApp().catch(() => {})
  }).catch(() => {})
}
