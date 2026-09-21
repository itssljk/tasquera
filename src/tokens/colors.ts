/**
 * Tasquera Color & Semantic Tokens
 *
 * Designed according to the Archival Workstation specification:
 * - Three-hue cap (Paper neutral, Ink foreground, Pine emerald accent)
 * - All text tokens guaranteed >= 4.5:1 contrast against surface/canvas (WCAG AA)
 * - On-accent check: Dark check on mint in dark mode, light ivory on pine in light mode
 * - Clear optical separation between structural regions
 */

export interface ThemeColors {
  background: {
    canvas: string
    surface: string
    surfaceElevated: string
    surfaceSubtle: string
  }
  border: {
    subtle: string
    divider: string
    dashed: string
    focus: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    placeholder: string
  }
  accent: {
    primary: string
    hover: string
    subtle: string
    onAccent: string
  }
  status: {
    error: string
    warning: string
    info: string
  }
}

export const darkTokens: ThemeColors = {
  background: {
    canvas: '#151412', // Rich roasted chicory
    surface: '#1e1c19', // Elevated surface for sidebar, cards, inputs
    surfaceElevated: '#282522', // Popovers, modals, menus
    surfaceSubtle: '#22201c', // Faint highlight
  },
  border: {
    subtle: '#282522', // Optical row divider
    divider: '#38342f', // Crisp structural hairline separating sidebar and canvas
    dashed: '#756c60', // Distinct dashed affordance (>= 3:1 non-text contrast against surface)
    focus: '#38b577', // Pine focus ring
  },
  text: {
    primary: '#f3eee7', // Warm ivory vellum (Lc ~ 104)
    secondary: '#cfc6b8', // Secondary copy (Lc ~ 85)
    muted: '#a09687', // Task metadata, timestamps, completed items (>= 5.0:1)
    placeholder: '#a09687', // Input placeholders (>= 5.0:1)
  },
  accent: {
    primary: '#2ea069', // Vivid emerald / mint
    hover: '#38b577',
    subtle: '#183e2c',
    onAccent: '#151412', // Dark check on mint (5.55:1 contrast)
  },
  status: {
    error: '#d95a3f',
    warning: '#d99b26',
    info: '#4e93b8',
  },
}

export const lightTokens: ThemeColors = {
  background: {
    canvas: '#fbf9f5', // Warm vellum canvas
    surface: '#f3eee6', // Soft elevated paper
    surfaceElevated: '#e7dfd2', // Popovers, modals
    surfaceSubtle: '#ede7dc',
  },
  border: {
    subtle: '#e7dfd2',
    divider: '#d6ccbc', // Crisp structural hairline separating sidebar and canvas
    dashed: '#b8ab96', // Distinct dashed affordance
    focus: '#26774e',
  },
  text: {
    primary: '#1a1816', // Deep archival ink
    secondary: '#4b443b',
    muted: '#6b6255', // Task metadata, timestamps (>= 5.0:1)
    placeholder: '#6b6255', // Input placeholders (>= 5.0:1)
  },
  accent: {
    primary: '#1b5239', // Deep forest pine
    hover: '#26774e',
    subtle: '#e0ece5',
    onAccent: '#fbf9f5', // Light check on deep pine (8.61:1 contrast)
  },
  status: {
    error: '#b9381e',
    warning: '#9d5d05',
    info: '#2a6b8f',
  },
}

export const tokens = {
  dark: darkTokens,
  light: lightTokens,
} as const

export type ThemeMode = 'dark' | 'light'
