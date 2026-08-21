import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { normalizeRecurrence } from './model'
import { todayISO } from './date'
import {
  formatNextOccurrencePreview,
  nextOccurrenceDate,
  nextOccurrenceTask,
  recurrenceLabel,
} from './recurrence'

function task(extra: Partial<Task> & { id: string; title: string }): Task {
  return {
    done: false,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    listId: null,
    dueDate: null,
    description: '',
    priority: 'medium',
    subtasks: [],
    links: [],
    status: 'todo',
    ...extra,
  }
}

describe('recurrenceLabel', () => {
  it('labels null, presets and custom rules', () => {
    expect(recurrenceLabel(null)).toBe('Never')
    expect(recurrenceLabel({ rule: 'daily' })).toBe('Daily')
    expect(recurrenceLabel({ rule: 'daily', interval: 3 })).toBe('Every 3 days')
    expect(recurrenceLabel({ rule: 'weekly', interval: 2 })).toBe('Every 2 weeks')
    expect(recurrenceLabel({ rule: 'monthly', interval: 4 })).toBe('Every 4 months')
    expect(recurrenceLabel({ rule: 'yearly', interval: 5 })).toBe('Every 5 years')
    expect(recurrenceLabel({ rule: 'weekly' })).toBe('Weekly')
    expect(recurrenceLabel({ rule: 'weekdays' })).toBe('Weekdays (Mon–Fri)')
  })

  it('labels multi-weekday rules', () => {
    expect(recurrenceLabel({ rule: 'weekly', daysOfWeek: [1, 3, 5] })).toBe('Weekly on Mon, Wed, Fri')
    expect(recurrenceLabel({ rule: 'weekly', interval: 2, daysOfWeek: [1, 4] })).toBe('Every 2 weeks on Mon, Thu')
  })
})

describe('normalizeRecurrence', () => {
  it('migrates legacy string rules to objects', () => {
    expect(normalizeRecurrence('daily')).toEqual({ rule: 'daily' })
    expect(normalizeRecurrence('weekly')).toEqual({ rule: 'weekly' })
  })

  it('passes through valid objects and sanitizes properties', () => {
    expect(normalizeRecurrence({ rule: 'daily', interval: 3 })).toEqual({ rule: 'daily', interval: 3 })
    expect(
      normalizeRecurrence({
        rule: 'weekly',
        daysOfWeek: [5, 1, 1, 3],
      })
    ).toEqual({
      rule: 'weekly',
      daysOfWeek: [1, 3, 5],
    })
    expect(normalizeRecurrence({ rule: 'bogus' })).toBeNull()
    expect(normalizeRecurrence(42)).toBeNull()
    expect(normalizeRecurrence(undefined)).toBeNull()
  })
})

describe('nextOccurrenceDate', () => {
  it('advances daily by one day, across month boundaries', () => {
    expect(nextOccurrenceDate({ rule: 'daily' }, '2026-08-13')).toBe('2026-08-14')
    expect(nextOccurrenceDate({ rule: 'daily' }, '2026-08-31')).toBe('2026-09-01')
  })

  it('advances every N days', () => {
    expect(nextOccurrenceDate({ rule: 'daily', interval: 3 }, '2026-08-13')).toBe('2026-08-16')
  })

  it('skips the weekend for weekdays', () => {
    // 2026-08-14 is a Friday; the next weekday is Monday 2026-08-17
    expect(nextOccurrenceDate({ rule: 'weekdays' }, '2026-08-14')).toBe('2026-08-17')
  })

  it('advances weekly with custom days of the week', () => {
    // 2026-08-10 is Monday (1). Next chosen day [1, 3, 5] is Wed (3) -> 2026-08-12
    expect(nextOccurrenceDate({ rule: 'weekly', daysOfWeek: [1, 3, 5] }, '2026-08-10')).toBe('2026-08-12')
    // From Friday (5), next wraps around to next Monday -> 2026-08-17
    expect(nextOccurrenceDate({ rule: 'weekly', daysOfWeek: [1, 3, 5] }, '2026-08-14')).toBe('2026-08-17')
    // With interval=2 weeks: from Friday (5), jumps to Monday of 2 weeks later -> 2026-08-24
    expect(nextOccurrenceDate({ rule: 'weekly', interval: 2, daysOfWeek: [1, 3, 5] }, '2026-08-14')).toBe('2026-08-24')
  })

  it('advances monthly, clamping the day-of-month to the target month', () => {
    expect(nextOccurrenceDate({ rule: 'monthly' }, '2026-01-15')).toBe('2026-02-15')
    expect(nextOccurrenceDate({ rule: 'monthly' }, '2026-01-31')).toBe('2026-02-28')
  })

  it('advances yearly, clamping Feb 29 to Feb 28 in non-leap years', () => {
    expect(nextOccurrenceDate({ rule: 'yearly' }, '2026-08-13')).toBe('2027-08-13')
    expect(nextOccurrenceDate({ rule: 'yearly' }, '2024-02-29')).toBe('2025-02-28')
  })

  it('defaults the base date to today', () => {
    expect(nextOccurrenceDate({ rule: 'daily' }, null)).toBe(nextOccurrenceDate({ rule: 'daily' }, todayISO()))
  })
})

describe('nextOccurrenceTask', () => {
  it('clones a recurring task into an open next occurrence with an advanced due date', () => {
    const original = task({
      id: 'orig',
      title: 'Water plants',
      recurrence: { rule: 'daily' },
      dueDate: '2026-08-13',
      status: 'done',
      done: true,
      priority: 'high',
      subtasks: [
        { id: 's1', title: 'Fill watering can', done: true },
        { id: 's2', title: 'Water the ferns', done: false },
      ],
    })

    const next = nextOccurrenceTask(original, { rule: 'daily' })

    expect(next).not.toBeNull()
    expect(next!.id).not.toBe('orig')
    expect(next!.title).toBe('Water plants')
    expect(next!.recurrence).toEqual({ rule: 'daily' })
    expect(next!.done).toBe(false)
    expect(next!.status).toBe('todo')
    expect(next!.completedAt).toBeNull()
    expect(next!.dueDate).toBe('2026-08-14')
    expect(next!.subtasks).toHaveLength(2)
    expect(next!.subtasks?.every((s) => !s.done)).toBe(true)
  })
})

describe('formatNextOccurrencePreview', () => {
  it('returns null for null or undefined recurrence', () => {
    expect(formatNextOccurrencePreview(null)).toBeNull()
    expect(formatNextOccurrencePreview(undefined)).toBeNull()
  })

  it('formats human readable next occurrence preview', () => {
    const preview = formatNextOccurrencePreview({ rule: 'daily' }, '2026-08-13')
    expect(preview).toContain('Next:')
    expect(preview).toContain('Aug 14')
  })
})

