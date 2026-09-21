import { describe, it, expect, afterEach } from 'vitest'
import { isMac, isAndroid, getSearchShortcut } from './platform'

describe('platform utilities', () => {
  const originalNavigator = window.navigator

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('detects Windows platform correctly', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Win32',
      },
      writable: true,
      configurable: true,
    })

    expect(isMac()).toBe(false)
    expect(getSearchShortcut()).toBe('Ctrl+K')
  })

  it('detects Mac platform correctly from platform string', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
      },
      writable: true,
      configurable: true,
    })

    expect(isMac()).toBe(true)
    expect(getSearchShortcut()).toBe('⌘K')
  })

  it('detects Mac platform from modern userAgentData', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgentData: { platform: 'macOS' },
        userAgent: 'Mozilla/5.0',
        platform: '',
      },
      writable: true,
      configurable: true,
    })

    expect(isMac()).toBe(true)
    expect(getSearchShortcut()).toBe('⌘K')
  })

  it('detects Windows platform from modern userAgentData', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgentData: { platform: 'Windows' },
        userAgent: 'Mozilla/5.0',
        platform: '',
      },
      writable: true,
      configurable: true,
    })

    expect(isMac()).toBe(false)
    expect(getSearchShortcut()).toBe('Ctrl+K')
  })

  it('detects Android platform correctly', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
        platform: 'Linux armv8l',
      },
      writable: true,
      configurable: true,
    })

    expect(isAndroid()).toBe(true)
    expect(isMac()).toBe(false)
  })

  it('returns false for isAndroid on non-Android platforms', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
      },
      writable: true,
      configurable: true,
    })

    expect(isAndroid()).toBe(false)
  })
})
