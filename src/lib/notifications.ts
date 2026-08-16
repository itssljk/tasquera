import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useRef } from 'react'
import type { AppSettings, Task } from '../types'
import { formatDeadline, formatDue, isOverdue, parseISO, todayISO } from './date'

/**
 * Due-date & deadline reminders.
 *
 * Two delivery paths:
 *  - Native (Android APK): real OS notifications scheduled ahead of time via
 *    @capacitor/local-notifications, so they fire even when the app is closed.
 *  - Web / PWA: browsers can't schedule background notifications without a
 *    push server, so while Tasquera is open we poll for reminders that have
 *    come due and show them with the Notification API. Reminders that went
 *    stale while the app was closed are caught up (once) within 24 hours.
 */

const DELIVERED_KEY = 'tasquera.notified.v1'
const DELIVERED_CAP = 500
const WEB_POLL_MS = 30_000
/** Stale web reminders older than this are dropped silently instead of notifying. */
const CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000
/** Android caps scheduled notifications per app (500); stay well under it. */
const MAX_SCHEDULED = 450

/* ------------------------------------------------------------------ */
/* Reminder computation (pure, unit-testable)                          */
/* ------------------------------------------------------------------ */

function reminderTimeOfDay(settings: AppSettings): string {
  return settings.notificationTime || '09:00'
}

/**
 * Epoch ms at which a task's reminder should fire, or null when the task has
 * no reminder (no date, done, or archived). Deadlines use their own time;
 * date-only due dates remind at `settings.notificationTime`.
 */
export function getReminderTime(task: Task, settings: AppSettings): number | null {
  if (task.done || task.archived) return null
  if (task.deadline) {
    const t = new Date(task.deadline)
    return isNaN(t.getTime()) ? null : t.getTime()
  }
  if (!task.dueDate) return null
  const [h, m] = reminderTimeOfDay(settings).split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  const d = parseISO(task.dueDate)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Stable per-reminder key so we never deliver the same reminder twice. */
export function reminderKey(task: Task): string | null {
  if (task.deadline) return `${task.id}:deadline:${task.deadline}`
  if (task.dueDate) return `${task.id}:due:${task.dueDate}`
  return null
}

/** Stable notification id (1..2^31-2) derived from the reminder key. */
export function reminderId(task: Task): number {
  const key = reminderKey(task) ?? `${task.id}:due`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return (h >>> 0) % 2147483647 || 1
}

/** Short human-readable reason shown in the notification. */
export function reminderBody(task: Task): string {
  if (task.deadline) return `Deadline ${formatDeadline(task.deadline)}`
  const due = task.dueDate
  if (!due) return 'Reminder'
  if (due === todayISO()) return 'Due today'
  if (isOverdue(due)) return `Overdue — was due ${formatDue(due)}`
  return `Due ${formatDue(due)}`
}

/* ------------------------------------------------------------------ */
/* Web (browser / PWA) foreground delivery                             */
/* ------------------------------------------------------------------ */

export type WebPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export function webPermission(): WebPermission {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return 'prompt'
}

export async function requestWebPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

function readDelivered(): Set<string> {
  try {
    const raw = localStorage.getItem(DELIVERED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function storeDelivered(keys: Set<string>) {
  try {
    const all = [...keys]
    localStorage.setItem(DELIVERED_KEY, JSON.stringify(all.slice(-DELIVERED_CAP)))
  } catch {
    // Storage unavailable — best effort; duplicates are only a minor annoyance.
  }
}

function showWebNotification(task: Task) {
  try {
    const n = new Notification(task.title, {
      body: reminderBody(task),
      tag: `tasquera-${task.id}`,
      icon: 'pwa-192x192.png',
      badge: 'pwa-192x192.png',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Some environments restrict the constructor; skip rather than crash.
  }
}

/**
 * Deliver any reminders that have come due. Called periodically while the app
 * is open and when the tab regains focus. Overdue reminders are caught up only
 * if they came due within the last 24 hours (or earlier today); anything older
 * is silently marked as delivered to avoid a burst of stale notifications.
 */
export function checkWebReminders(tasks: Task[], settings: AppSettings): void {
  if (!settings.notificationsEnabled) return
  if (webPermission() !== 'granted') return
  // The user can already see the app — no need for an OS-level nudge.
  if (document.visibilityState === 'visible' && document.hasFocus()) return

  const delivered = readDelivered()
  const now = Date.now()
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  let changed = false

  for (const task of tasks) {
    const fire = getReminderTime(task, settings)
    const key = reminderKey(task)
    if (fire === null || key === null || delivered.has(key)) continue
    if (fire > now) continue
    const freshEnough = fire >= dayStart.getTime() || now - fire <= CATCHUP_WINDOW_MS
    if (freshEnough) showWebNotification(task)
    delivered.add(key)
    changed = true
  }

  if (changed) storeDelivered(delivered)
}

/* ------------------------------------------------------------------ */
/* Native (Android APK) scheduling                                     */
/* ------------------------------------------------------------------ */

export type NativePermission = 'granted' | 'denied' | 'prompt' | 'unknown'

export async function nativePermission(): Promise<NativePermission> {
  try {
    const s = await LocalNotifications.checkPermissions()
    if (s.display === 'granted') return 'granted'
    if (s.display === 'denied') return 'denied'
    return 'prompt'
  } catch {
    return 'unknown'
  }
}

export async function requestNativePermission(): Promise<boolean> {
  try {
    const s = await LocalNotifications.checkPermissions()
    if (s.display === 'granted') return true
    if (s.display === 'denied') return false
    const req = await LocalNotifications.requestPermissions()
    return req.display === 'granted'
  } catch {
    return false
  }
}

let lastNativeSignature = ''

/**
 * Reconcile the OS's scheduled notifications with the current tasks: cancel
 * everything pending, then schedule reminders that are still in the future.
 * The signature guard skips redundant work when nothing relevant changed.
 */
export async function scheduleNativeReminders(tasks: Task[], settings: AppSettings): Promise<void> {
  try {
    if (!settings.notificationsEnabled) {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
      }
      lastNativeSignature = ''
      return
    }

    const perm = await nativePermission()
    if (perm !== 'granted') return

    const now = Date.now()
    const notifications = []
    for (const task of tasks) {
      const fire = getReminderTime(task, settings)
      if (fire === null || fire <= now) continue
      notifications.push({
        id: reminderId(task),
        title: task.title,
        body: reminderBody(task),
        schedule: { at: new Date(fire), allowWhileIdle: true },
      })
    }

    const signature = JSON.stringify(notifications.map((n) => [n.id, n.title, n.body, n.schedule?.at?.getTime()]))
    if (signature === lastNativeSignature) return
    lastNativeSignature = signature

    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
    await LocalNotifications.schedule({ notifications: notifications.slice(0, MAX_SCHEDULED) })
  } catch {
    // Reminders are best-effort — never crash the app over a notification.
  }
}

/* ------------------------------------------------------------------ */
/* Permission status (for the Settings UI)                             */
/* ------------------------------------------------------------------ */

export type NotificationStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (Capacitor.isNativePlatform()) return nativePermission()
  return webPermission()
}

/* ------------------------------------------------------------------ */
/* React hook                                                          */
/* ------------------------------------------------------------------ */

/**
 * Keeps reminders in sync with the task list and notification settings.
 * On Android this (re)schedules OS notifications whenever tasks change; on
 * web it polls for reminders while the app is open.
 */
export function useTaskReminders(tasks: Task[], settings: AppSettings): void {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      if (!settings.notificationsEnabled) {
        void scheduleNativeReminders([], { ...settings, notificationsEnabled: false })
        return
      }
      void scheduleNativeReminders(tasks, settings)
      return
    }

    if (!settings.notificationsEnabled) return
    const run = () => checkWebReminders(tasksRef.current, settingsRef.current)
    run()
    const interval = setInterval(run, WEB_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [tasks, settings.notificationsEnabled, settings.notificationTime])
}
