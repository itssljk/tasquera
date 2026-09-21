import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import SettingsView from './SettingsView'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SettingsView mobile vs desktop info', () => {
  it('hides Keyboard Shortcuts and shows Mobile App install text on mobile viewports', () => {
    // Default test environment has isDesktop = false
    render(
      <SettingsView
        onClearAll={vi.fn()}
        onOpenShortcuts={vi.fn()}
        canInstallPWA={true}
        isStandalonePWA={false}
      />
    )

    // Keyboard shortcuts section should be hidden
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
    expect(screen.queryByText(/Press.*anywhere to open the cheat sheet/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'View shortcuts' })).toBeNull()

    // Install App section should be mobile-focused
    expect(screen.getByText('Mobile App')).toBeDefined()
    expect(
      screen.getByText(/Add Tasquera to your home screen for instant, distraction-free offline access\./i)
    ).toBeDefined()
  })

  it('displays Keyboard Shortcuts section and desktop install text on desktop viewports', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <SettingsView
        onClearAll={vi.fn()}
        onOpenShortcuts={vi.fn()}
        canInstallPWA={true}
        isStandalonePWA={false}
      />
    )

    // Keyboard shortcuts section should be visible
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined()
    expect(screen.getByText(/Press.*anywhere to open the cheat sheet\./i)).toBeDefined()
    expect(screen.getByRole('button', { name: 'View shortcuts' })).toBeDefined()

    // Install App section should refer to Desktop & Mobile
    expect(screen.getByText('Desktop & Mobile App')).toBeDefined()
    expect(
      screen.getByText(/Download Tasquera to your home screen or desktop/i)
    ).toBeDefined()
  })

  it('guides Android users to download official APK from GitHub releases', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36',
        platform: 'Linux armv8l',
      },
      writable: true,
      configurable: true,
    })

    render(
      <SettingsView
        onClearAll={vi.fn()}
        onOpenShortcuts={vi.fn()}
        canInstallPWA={false}
        isStandalonePWA={false}
        isNative={false}
        isFileSystemSupported={false}
      />
    )

    // Should display Android-specific title and download APK text
    expect(screen.getByText('Android App (Official APK)')).toBeDefined()
    expect(
      screen.getByText(/Download the official APK from GitHub Releases for native background alarms and Syncthing local folder sync\./i)
    ).toBeDefined()

    // Should have Download APK button pointing to releases
    const downloadApkLinks = screen.getAllByRole('link', { name: /Download APK/i })
    expect(downloadApkLinks.length).toBeGreaterThan(0)
    expect(downloadApkLinks[0].getAttribute('href')).toBe('https://github.com/itssljk/tasquera/releases')

    // Should offer Android APK guidance in notifications and folder sync sections
    const syncApkLinks = screen.getAllByRole('link', { name: /download the official Android APK/i })
    expect(syncApkLinks.length).toBe(2)
    syncApkLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBe('https://github.com/itssljk/tasquera/releases')
    })

    // Should offer Android APK in footer
    const footerApkLink = screen.getByRole('link', { name: 'Android APK' })
    expect(footerApkLink.getAttribute('href')).toBe('https://github.com/itssljk/tasquera/releases')
  })
})
