import { describe, expect, it } from 'vitest'
import { darkTokens, lightTokens } from './colors'
import { getContrastRatio } from './contrast'
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('Automated Contrast Check — Tasquera Semantic Tokens', () => {
  describe('Dark Theme Accessibility', () => {
    it('primary text satisfies WCAG AAA (>= 7:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(darkTokens.text.primary, darkTokens.background.canvas)
      const onSurface = getContrastRatio(darkTokens.text.primary, darkTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(7.0)
      expect(onSurface).toBeGreaterThanOrEqual(7.0)
    })

    it('secondary text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(darkTokens.text.secondary, darkTokens.background.canvas)
      const onSurface = getContrastRatio(darkTokens.text.secondary, darkTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('muted text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(darkTokens.text.muted, darkTokens.background.canvas)
      const onSurface = getContrastRatio(darkTokens.text.muted, darkTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('placeholder text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(darkTokens.text.placeholder, darkTokens.background.canvas)
      const onSurface = getContrastRatio(darkTokens.text.placeholder, darkTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('on-accent check satisfies WCAG AA (>= 4.5:1) — Dark check on mint', () => {
      const checkContrast = getContrastRatio(darkTokens.accent.onAccent, darkTokens.accent.primary)

      // Dark check (#151412) on mint (#2ea069)
      expect(checkContrast).toBeGreaterThanOrEqual(4.5)
    })

    it('dashed new-list button border satisfies non-text UI contrast (>= 3:1) on surface', () => {
      const dashedContrast = getContrastRatio(darkTokens.border.dashed, darkTokens.background.surface)

      expect(dashedContrast).toBeGreaterThanOrEqual(3.0)
    })

    it('sidebar divider creates a visible boundary from canvas', () => {
      const dividerContrast = getContrastRatio(darkTokens.border.divider, darkTokens.background.canvas)
      const surfaceStep = getContrastRatio(darkTokens.background.surface, darkTokens.background.canvas)

      // Ensure divider is distinctly separated from canvas and surface
      expect(dividerContrast).toBeGreaterThan(1.3)
      expect(surfaceStep).toBeGreaterThan(1.05)
    })
  })

  describe('Light Theme Accessibility', () => {
    it('primary text satisfies WCAG AAA (>= 7:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(lightTokens.text.primary, lightTokens.background.canvas)
      const onSurface = getContrastRatio(lightTokens.text.primary, lightTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(7.0)
      expect(onSurface).toBeGreaterThanOrEqual(7.0)
    })

    it('secondary text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(lightTokens.text.secondary, lightTokens.background.canvas)
      const onSurface = getContrastRatio(lightTokens.text.secondary, lightTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('muted text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(lightTokens.text.muted, lightTokens.background.canvas)
      const onSurface = getContrastRatio(lightTokens.text.muted, lightTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('placeholder text satisfies WCAG AA (>= 4.5:1) on canvas and surface', () => {
      const onCanvas = getContrastRatio(lightTokens.text.placeholder, lightTokens.background.canvas)
      const onSurface = getContrastRatio(lightTokens.text.placeholder, lightTokens.background.surface)

      expect(onCanvas).toBeGreaterThanOrEqual(4.5)
      expect(onSurface).toBeGreaterThanOrEqual(4.5)
    })

    it('on-accent check satisfies WCAG AA (>= 4.5:1) — Light check on deep pine', () => {
      const checkContrast = getContrastRatio(lightTokens.accent.onAccent, lightTokens.accent.primary)

      // Light check (#fbf9f5) on deep pine (#1b5239)
      expect(checkContrast).toBeGreaterThanOrEqual(4.5)
    })

    it('dashed new-list button border is clearly visible on surface', () => {
      const dashedContrast = getContrastRatio(lightTokens.border.dashed, lightTokens.background.surface)

      expect(dashedContrast).toBeGreaterThanOrEqual(1.5)
    })
  })

  describe('CSS Theme Token Synchronization', () => {
    it('src/index.css includes all required semantic token declarations', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css')
      const cssContent = fs.readFileSync(cssPath, 'utf-8')

      const requiredTokens = [
        '--color-on-accent',
        '--color-border-sidebar',
        '--color-border-dashed',
        '--color-text-muted',
        '--color-text-placeholder',
      ]

      for (const token of requiredTokens) {
        expect(cssContent).toContain(token)
      }
    })

    it('CSS ink-400 satisfies >= 4.5:1 contrast in both themes', () => {
      // Dark theme ink-400 against dark surface
      const darkInk400 = '#a09687'
      const darkContrast = getContrastRatio(darkInk400, darkTokens.background.surface)
      expect(darkContrast).toBeGreaterThanOrEqual(4.5)

      // Light theme ink-400 against light surface
      const lightInk400 = '#6b6255'
      const lightContrast = getContrastRatio(lightInk400, lightTokens.background.surface)
      expect(lightContrast).toBeGreaterThanOrEqual(4.5)
    })

    it('on-accent text on pine-600 achieves high contrast across both dark and light themes', () => {
      // Dark theme: onAccent (#151412) on mint (#2ea069)
      const darkBtnContrast = getContrastRatio(darkTokens.accent.onAccent, darkTokens.accent.primary)
      expect(darkBtnContrast).toBeGreaterThanOrEqual(5.0)

      // Light theme: onAccent (#fbf9f5) on deep pine (#1b5239)
      const lightBtnContrast = getContrastRatio(lightTokens.accent.onAccent, lightTokens.accent.primary)
      expect(lightBtnContrast).toBeGreaterThanOrEqual(8.0)
    })
  })
})
