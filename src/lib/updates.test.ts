import { describe, expect, it } from 'vitest'
import {
  isUpdateAvailable,
  parseManifest,
  resolveApkUrl,
} from './updates'
import type { UpdateInfo } from './updates'

describe('parseManifest', () => {
  it('parses a full manifest', () => {
    const m = parseManifest({
      versionCode: 800,
      versionName: '0.8.0',
      sha256: 'ABC123',
      releaseNotes: 'Fixes and improvements',
      apkUrl: 'https://example.com/app-release.apk',
    })
    expect(m).toEqual({
      versionCode: 800,
      versionName: '0.8.0',
      sha256: 'ABC123',
      releaseNotes: 'Fixes and improvements',
      apkUrl: 'https://example.com/app-release.apk',
    })
  })

  it('accepts a numeric-string versionCode and omits empty optional fields', () => {
    const m = parseManifest({ versionCode: '700', versionName: '' })
    expect(m).toEqual({ versionCode: 700, versionName: 'v700' })
  })

  it('rejects missing, negative, or non-numeric versionCode', () => {
    expect(parseManifest(null)).toBeNull()
    expect(parseManifest('nope')).toBeNull()
    expect(parseManifest({})).toBeNull()
    expect(parseManifest({ versionCode: -1 })).toBeNull()
    expect(parseManifest({ versionCode: 'abc' })).toBeNull()
  })
})

describe('isUpdateAvailable', () => {
  const current: UpdateInfo = { versionName: '0.7.0', versionCode: 700 }

  it('is true when the manifest code is newer', () => {
    expect(isUpdateAvailable(current, { versionCode: 701, versionName: '0.7.1' })).toBe(true)
  })

  it('is false when equal or older', () => {
    expect(isUpdateAvailable(current, { versionCode: 700, versionName: '0.7.0' })).toBe(false)
    expect(isUpdateAvailable(current, { versionCode: 699, versionName: '0.6.9' })).toBe(false)
  })
})

describe('resolveApkUrl', () => {
  const base = 'https://example.com/releases/latest/download/update.json'

  it('prefers an explicit apkUrl', () => {
    expect(resolveApkUrl({ versionCode: 1, versionName: '1', apkUrl: 'https://cdn.example.com/a.apk' }, base)).toBe(
      'https://cdn.example.com/a.apk',
    )
  })

  it('falls back to app-release.apk next to the manifest', () => {
    expect(resolveApkUrl({ versionCode: 1, versionName: '1' }, base)).toBe(
      'https://example.com/releases/latest/download/app-release.apk',
    )
  })
})
