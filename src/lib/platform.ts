import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Platform and OS detection utilities for keyboard shortcuts, touch ergonomics, and native behaviors.
 */

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const userAgentData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData
  if (userAgentData?.platform) {
    return /^mac/i.test(userAgentData.platform)
  }
  const platform = navigator.platform || navigator.userAgent || ''
  return /Mac|iPhone|iPod|iPad/i.test(platform)
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isNativePlatform(): boolean {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
}

/**
 * Returns the primary search / command palette shortcut: '⌘K' on Mac / iOS, 'Ctrl+K' on Windows / Linux.
 */
export function getSearchShortcut(): string {
  return isMac() ? '⌘K' : 'Ctrl+K'
}

export type HapticVariant = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

/**
 * Delivers sensory tactile feedback via @capacitor/haptics when on native APK/iOS,
 * gracefully falling back to navigator.vibrate on modern mobile browsers.
 */
export function triggerHaptic(variant: HapticVariant = 'light'): void {
  try {
    if (isNativePlatform()) {
      switch (variant) {
        case 'light':
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
          break
        case 'medium':
          Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
          break
        case 'heavy':
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
          break
        case 'selection':
          Haptics.selectionStart().catch(() => {})
          break
        case 'success':
          Haptics.notification({ type: NotificationType.Success }).catch(() => {})
          break
        case 'warning':
          Haptics.notification({ type: NotificationType.Warning }).catch(() => {})
          break
        case 'error':
          Haptics.notification({ type: NotificationType.Error }).catch(() => {})
          break
      }
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      switch (variant) {
        case 'light':
        case 'selection':
          navigator.vibrate(8)
          break
        case 'medium':
          navigator.vibrate(15)
          break
        case 'heavy':
          navigator.vibrate(24)
          break
        case 'success':
          navigator.vibrate([10, 30, 15])
          break
        case 'warning':
        case 'error':
          navigator.vibrate([20, 40, 20])
          break
      }
    }
  } catch {
    // Graceful no-op in environments without vibration support
  }
}
