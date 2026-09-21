import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AndroidInstallModal, AndroidDownloadBanner, usePWAInstall } from './InstallPWA'
import { renderHook, act } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('Android APK guidance components', () => {
  it('renders AndroidInstallModal with download link to official releases', () => {
    const onClose = vi.fn()
    render(
      <AndroidInstallModal
        isOpen={true}
        onClose={onClose}
      />
    )

    expect(screen.getByText('Get Tasquera for Android')).toBeDefined()
    expect(screen.getByText('Official APK from GitHub Releases')).toBeDefined()
    expect(screen.getByText(/Why use the official APK\?/i)).toBeDefined()
    expect(screen.getByText(/Background reminders:/i)).toBeDefined()
    expect(screen.getByText(/Syncthing folder sync:/i)).toBeDefined()

    const downloadButton = screen.getByRole('link', { name: /Download Official APK/i })
    expect(downloadButton.getAttribute('href')).toBe('https://github.com/itssljk/tasquera/releases')

    const closeButtons = screen.getAllByRole('button', { name: 'Close' })
    expect(closeButtons.length).toBeGreaterThan(0)
    fireEvent.click(closeButtons[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('renders AndroidDownloadBanner for Android users and links to official releases', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36',
      },
      writable: true,
      configurable: true,
    })

    const onOpenModal = vi.fn()
    render(<AndroidDownloadBanner onOpenModal={onOpenModal} />)

    expect(screen.getByText('Tasquera for Android')).toBeDefined()
    expect(
      screen.getByText(/Download the official APK for background reminders and Syncthing sync\./i)
    ).toBeDefined()

    const downloadLink = screen.getByRole('link', { name: /Download APK/i })
    expect(downloadLink.getAttribute('href')).toBe('https://github.com/itssljk/tasquera/releases')

    const guideButton = screen.getByRole('button', { name: 'Guide' })
    fireEvent.click(guideButton)
    expect(onOpenModal).toHaveBeenCalled()

    const dismissButton = screen.getByRole('button', { name: 'Dismiss Android banner' })
    fireEvent.click(dismissButton)
    expect(localStorage.getItem('tasquera_android_apk_banner_dismissed')).toBe('1')
  })

  it('usePWAInstall triggers Android modal when prompted on Android devices', () => {
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36',
      },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => usePWAInstall())

    expect(result.current.isAndroid).toBe(true)
    expect(result.current.canInstall).toBe(true)

    act(() => {
      result.current.promptInstall()
    })

    expect(result.current.showAndroidModal).toBe(true)
  })
})
