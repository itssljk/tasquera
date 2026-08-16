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

const settings: AppSettings = { showQuickAdd: false, notificationsEnabled: true, notificationTime: '09:00' }

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Ship the thing',
    done: false,
    createdAt: 1,
    completedAt: null,
    listId: null,
    dueDate: null,
    deadline: null,
    archived: false,
    status: 'todo',
    ...overrides,
  }
}

/** Local-time ISO "YYYY-MM-DDTHH:mm" for `msAgo` milliseconds in the past. */
function isoPast(msAgo: number): string {
  const d = new Date(Date.now() - msAgo)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  it('returns the deadline time for datetime deadlines', () => {
    const task = makeTask({ deadline: '2026-08-16T17:00' })
    const expected = new Date(2026, 7, 16, 17, 0).getTime()
    expect(getReminderTime(task, settings)).toBe(expected)
  })

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
    expect(getReminderTime(makeTask({ dueDate: '2026-08-16', archived: true }), settings)).toBeNull()
  })
})

describe('reminderKey / reminderId', () => {
  it('produces stable keys for deadline and due-date reminders', () => {
    const deadline = makeTask({ id: 'a', deadline: '2026-08-16T17:00' })
    const due = makeTask({ id: 'a', dueDate: '2026-08-16' })
    expect(reminderKey(deadline)).toBe('a:deadline:2026-08-16T17:00')
    expect(reminderKey(due)).toBe('a:due:2026-08-16')
    expect(reminderKey(makeTask())).toBeNull()
  })

  it('derives ids within the Android notification id range, stably', () => {
    const task = makeTask({ id: 'abc', deadline: '2026-08-16T17:00' })
    const id = reminderId(task)
    expect(Number.isInteger(id)).toBe(true)
    expect(id).toBeGreaterThan(0)
    expect(id).toBeLessThan(2147483647)
    expect(reminderId(task)).toBe(id)
    expect(reminderId(makeTask({ id: 'abc', dueDate: '2026-08-16' }))).not.toBe(id)
  })
})

describe('reminderBody', () => {
  it('describes the reminder reason', () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const past = new Date(today)
    past.setDate(today.getDate() - 6)

    expect(reminderBody(makeTask({ deadline: '2026-08-16T17:00' }))).toContain('Deadline')
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

  it('delivers a due reminder once, and never twice', () => {
    const task = makeTask({ deadline: isoPast(60 * 1000) })
    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(1)
    expect(FakeNotification.instances[0].title).toBe('Ship the thing')

    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(1)
  })

  it('skips reminders that are still in the future', () => {
    const task = makeTask({ deadline: isoPast(-2 * 60 * 60 * 1000) })
    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('silently drops stale reminders older than 24h instead of notifying', () => {
    const task = makeTask({ deadline: isoPast(48 * 60 * 60 * 1000) })
    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(0)

    // It was still marked as delivered, so it never resurfaces later.
    checkWebReminders([task], settings)
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does not remind about completed or archived tasks', () => {
    const done = makeTask({ deadline: isoPast(60 * 1000), done: true })
    const archived = makeTask({ deadline: isoPast(60 * 1000), archived: true })
    checkWebReminders([done, archived], settings)
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does nothing when notifications are disabled', () => {
    const task = makeTask({ deadline: isoPast(60 * 1000) })
    checkWebReminders([task], { ...settings, notificationsEnabled: false })
    expect(FakeNotification.instances).toHaveLength(0)
  })
})
