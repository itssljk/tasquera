import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { normalizeRecurrence } from './model'
import { todayISO } from './date'
import { nextOccurrenceDate, nextOccurrenceTask, ordinal, recurrenceLabel } from './recurrence'

function task(extra: Partial<Task> & { id: string; title: string }): Task {
  return {
    done: false,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    listId: null,
    dueDate: null,
    deadline: null,
    description: '',
    priority: 'medium',
    subtasks: [],
    links: [],
    images: [],
    archived: false,
    status: 'todo',
    ...extra,
  }
}

describe('ordinal', () => {
  it('formats ordinals including teens', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(31)).toBe('31st')
  })
})

describe('recurrenceLabel', () => {
  it('labels null, presets and custom rules', () => {
    expect(recurrenceLabel(null)).toBe('Never')
    expect(recurrenceLabel({ rule: 'daily' })).toBe('Daily')
    expect(recurrenceLabel({ rule: 'daily', interval: 3 })).toBe('Every 3 days')
    expect(recurrenceLabel({ rule: 'weekly', interval: 2 })).toBe('Every 2 weeks')
    expect(recurrenceLabel({ rule: 'monthly', interval: 4 })).toBe('Every 4 months')
    expect(recurrenceLabel({ rule: 'yearly', interval: 5 })).toBe('Every 5 years')
    expect(recurrenceLabel({ rule: 'monthly', day: 1 })).toBe('On the 1st of the month')
    expect(recurrenceLabel({ rule: 'weekly' })).toBe('Weekly')
  })
})

describe('normalizeRecurrence', () => {
  it('migrates legacy string rules to objects', () => {
    expect(normalizeRecurrence('daily')).toEqual({ rule: 'daily' })
    expect(normalizeRecurrence('weekly')).toEqual({ rule: 'weekly' })
  })

  it('passes through valid objects and drops invalid ones', () => {
    expect(normalizeRecurrence({ rule: 'daily', interval: 3 })).toEqual({ rule: 'daily', interval: 3 })
    expect(normalizeRecurrence({ rule: 'monthly', day: 15 })).toEqual({ rule: 'monthly', day: 15 })
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

  it('advances weekly by seven days', () => {
    expect(nextOccurrenceDate({ rule: 'weekly' }, '2026-08-13')).toBe('2026-08-20')
  })

  it('advances monthly, clamping the day-of-month to the target month', () => {
    expect(nextOccurrenceDate({ rule: 'monthly' }, '2026-01-15')).toBe('2026-02-15')
    expect(nextOccurrenceDate({ rule: 'monthly' }, '2026-01-31')).toBe('2026-02-28')
  })

  it('advances monthly on a specific day of the month', () => {
    expect(nextOccurrenceDate({ rule: 'monthly', day: 1 }, '2026-08-13')).toBe('2026-09-01')
    expect(nextOccurrenceDate({ rule: 'monthly', day: 31 }, '2026-08-13')).toBe('2026-09-30')
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

    expect(next.id).not.toBe('orig')
    expect(next.title).toBe('Water plants')
    expect(next.priority).toBe('high')
    expect(next.recurrence).toEqual({ rule: 'daily' })
    expect(next.done).toBe(false)
    expect(next.status).toBe('todo')
    expect(next.completedAt).toBeNull()
    expect(next.dueDate).toBe('2026-08-14')
    expect(next.subtasks).toHaveLength(2)
    expect(next.subtasks?.every((s) => !s.done)).toBe(true)
  })
})
