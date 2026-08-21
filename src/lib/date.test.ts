import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  formatDue,
  getEffectiveDate,
  getNextMondayISO,
  isOverdue,
  parseISO,
  toISODate,
  todayISO,
} from './date'

describe('toISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 7, 13))).toBe('2026-08-13')
  })

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseISO / addDaysISO', () => {
  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('parses ISO to a local Date', () => {
    const d = parseISO('2026-08-13')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(13)
  })
})

describe('formatDue', () => {
  it('labels today, tomorrow and yesterday relative to now', () => {
    const today = todayISO()
    expect(formatDue(today)).toBe('Today')
    expect(formatDue(addDaysISO(today, 1))).toBe('Tomorrow')
    expect(formatDue(addDaysISO(today, -1))).toBe('Yesterday')
  })
})

describe('isOverdue', () => {
  it('is overdue strictly before today', () => {
    expect(isOverdue(addDaysISO(todayISO(), -1))).toBe(true)
    expect(isOverdue(todayISO())).toBe(false)
    expect(isOverdue(addDaysISO(todayISO(), 1))).toBe(false)
  })
})

describe('getEffectiveDate', () => {
  it('returns dueDate if present', () => {
    expect(getEffectiveDate({ dueDate: '2026-08-13' })).toBe('2026-08-13')
  })

  it('returns null when no dueDate is set', () => {
    expect(getEffectiveDate({})).toBeNull()
  })
})

describe('getNextMondayISO', () => {
  it('returns a Monday not before today', () => {
    const next = getNextMondayISO()
    const d = parseISO(next)
    expect(d.getDay()).toBe(1)
    expect(next >= todayISO()).toBe(true)
  })
})
