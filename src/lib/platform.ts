/**
 * Platform and OS detection utilities for keyboard shortcuts and platform-specific behaviors.
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

/**
 * Returns the primary search / command palette shortcut: '⌘K' on Mac / iOS, 'Ctrl+K' on Windows / Linux.
 */
export function getSearchShortcut(): string {
  return isMac() ? '⌘K' : 'Ctrl+K'
}
