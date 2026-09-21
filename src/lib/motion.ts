import type { Transition } from 'framer-motion'

/**
 * Calibrated Apple iOS Liquid Glass Spring Physics Presets
 * Designed for high-velocity tactile responsiveness without artificial web-easings.
 */
export const SPRINGS = {
  /** Checkboxes, icon bounces, button depressions, badge counter flips */
  snappy: {
    type: 'spring',
    stiffness: 520,
    damping: 28,
    mass: 0.6,
  } as Transition,

  /** Popovers, context menus, date pickers, dropdown selects */
  popover: {
    type: 'spring',
    stiffness: 460,
    damping: 30,
    mass: 0.7,
  } as Transition,

  /** Sliding pills, tabs, segments, active indicator layoutId halos */
  liquidPill: {
    type: 'spring',
    stiffness: 420,
    damping: 32,
    mass: 0.8,
  } as Transition,

  /** Centered dialogs, search palette, full modal sheets */
  modal: {
    type: 'spring',
    stiffness: 380,
    damping: 32,
    mass: 0.9,
  } as Transition,

  /** Bottom sheets, swipe drawers with rubber-band physics */
  sheet: {
    type: 'spring',
    stiffness: 340,
    damping: 30,
    mass: 1.0,
  } as Transition,

  /** View cross-fades, tab switches, calendar month wipes */
  contentSlide: {
    type: 'spring',
    stiffness: 360,
    damping: 34,
    mass: 0.85,
  } as Transition,

  /** Playful micro-bounces for celebrations & success checkmarks */
  bouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 22,
    mass: 0.7,
  } as Transition,
  /** Tactile card pickup elevation - rapid lift with controlled weight */
  cardLift: {
    type: 'spring',
    stiffness: 440,
    damping: 26,
    mass: 0.7,
  } as Transition,

  /** Tactile card landing & drop settle - realistic desk impact settling */
  cardDrop: {
    type: 'spring',
    stiffness: 380,
    damping: 26,
    mass: 0.85,
  } as Transition,
} as const

/** Reusable tactile interaction gestures */
export const GESTURES = {
  buttonTap: { scale: 0.94 },
  buttonHover: { scale: 1.02 },
  pillTap: { scale: 0.96 },
  cardTap: { scale: 0.985 },
  subtleHover: { scale: 1.01 },
} as const
