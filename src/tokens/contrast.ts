/**
 * WCAG 2.1 Contrast Ratio and Relative Luminance Utilities
 *
 * Implements the official W3C formula:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b]
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return [r, g, b]
  }
  throw new Error(`Invalid hex color: ${hex}`)
}

export function getChannelLuminance(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const rLin = getChannelLuminance(r)
  const gLin = getChannelLuminance(g)
  const bLin = getChannelLuminance(b)
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

export function getContrastRatio(colorA: string, colorB: string): number {
  const lumA = getRelativeLuminance(colorA)
  const lumB = getRelativeLuminance(colorB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}
