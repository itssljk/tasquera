import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkWebReminders,
  getReminderTime,
  reminderBody,
  reminderId,
  reminderKey,
  webPermission,
} from './notifications'
import type { AppSettings, Task } from '../types'

const settings: AppSettings = { notificationsEnabled: true, notificationTime: '09:00' }

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Ship the thing',
    done: false,
    createdAt: 1,
    completedAt: null,
    listId: null,
    dueDate: null,
    status: 'todo',
    ...overrides,
  }
}

/** Local-time ISO "YYYY-MM-DD" for `daysAgo` in the past. */
function isoDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static instances: FakeNotification[] = []
  title: string
  body: string
  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.body = options?.body ?? ''
    FakeNotification.instances.push(this)
  }
  close() {}
}

beforeEach(() => {
  localStorage.clear()
  FakeNotification.instances = []
  FakeNotification.permission = 'granted'
  ;(globalThis as { Notification: unknown }).Notification = FakeNotification
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  vi.spyOn(document, 'hasFocus').mockReturnValue(false)
})

describe('getReminderTime', () => {
  it('reminds date-only due dates at the configured time of day', () => {
    const task = makeTask({ dueDate: '2026-08-16' })
    const expected = new Date(2026, 7, 16, 9, 0).getTime()
    expect(getReminderTime(task, settings)).toBe(expected)
    expect(getReminderTime(task, { ...settings, notificationTime: '18:30' })).toBe(
      new Date(2026, 7, 16, 18, 30).getTime(),
    )
  })

  it('returns null when there is nothing to remind about', () => {
    expect(getReminderTime(makeTask(), settings)).toBeNull()
    expect(getReminderTime(makeTask({ dueDate: '2026-08-16', done: true }), settings)).toBeNull()
  })
})

describe('reminderKey / reminderId', () => {
  it('produces stable keys for due-date reminders', () => {
    const due = makeTask({ id: 'a', dueDate: '2026-08-16' })
    expect(reminderKey(due)).toBe('a:due:2026-08-16')
    expect(reminderKey(makeTask())).toBeNull()
  })

  it('derives ids within the Android notification id range, stably', () => {
    const task = makeTask({ id: 'abc', dueDate: '2026-08-16' })
    const id = reminderId(task)
    expect(Number.isInteger(id)).toBe(true)
    expect(id).toBeGreaterThan(0)
    expect(id).toBeLessThan(2147483647)
    expect(reminderId(task)).toBe(id)
  })
})

describe('reminderBody', () => {
  it('describes the reminder reason', () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const past = new Date(today)
    past.setDate(today.getDate() - 6)

    expect(reminderBody(makeTask({ dueDate: iso(today) }))).toBe('Due today')
    expect(reminderBody(makeTask({ dueDate: iso(past) }))).toContain('Overdue')
  })
})

describe('webPermission / checkWebReminders', () => {
  it('reports the current web permission', () => {
    expect(webPermission()).toBe('granted')
    FakeNotification.permission = 'denied'
    expect(webPermission()).toBe('denied')
  })

  it('skips reminders that are in the future', () => {
    const task = makeTask({ dueDate: isoDaysAgo(-5) })
    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does not remind about completed tasks', () => {
    const done = makeTask({ dueDate: isoDaysAgo(0), done: true })
    checkWebReminders([done], settings)
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does nothing when notifications are disabled', () => {
    const task = makeTask({ dueDate: isoDaysAgo(0) })
    checkWebReminders([task], { ...settings, notificationsEnabled: false })
    expect(FakeNotification.instances).toHaveLength(0)
  })
})
