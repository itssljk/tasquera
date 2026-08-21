import type { Recurrence, RecurrenceRule, Task } from '../types'
import { parseISO, toISODate, todayISO } from './date'
import { uid } from './model'

export const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const RULE_LABELS: Record<RecurrenceRule, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

/** Human-readable label for a recurrence rule. */
export function recurrenceLabel(r: Recurrence | null | undefined): string {
  if (!r) return 'Never'

  const interval = r.interval && r.interval > 1 ? r.interval : 1

  if (r.rule === 'daily') {
    return interval > 1 ? `Every ${interval} days` : 'Daily'
  } else if (r.rule === 'weekdays') {
    return 'Weekdays (Mon–Fri)'
  } else if (r.rule === 'weekly') {
    if (r.daysOfWeek && r.daysOfWeek.length > 0) {
      const isAllWeekdays =
        r.daysOfWeek.length === 5 && [1, 2, 3, 4, 5].every((d) => r.daysOfWeek?.includes(d))
      const isWeekends =
        r.daysOfWeek.length === 2 && [0, 6].every((d) => r.daysOfWeek?.includes(d))

      let dayText = ''
      if (isAllWeekdays) {
        dayText = 'weekdays'
      } else if (isWeekends) {
        dayText = 'weekends'
      } else {
        dayText = r.daysOfWeek.map((d) => WEEKDAY_NAMES_SHORT[d]).join(', ')
      }

      return interval > 1
        ? `Every ${interval} weeks on ${dayText}`
        : isAllWeekdays ? 'Every weekday' : `Weekly on ${dayText}`
    }
    return interval > 1 ? `Every ${interval} weeks` : 'Weekly'
  } else if (r.rule === 'monthly') {
    return interval > 1 ? `Every ${interval} months` : 'Monthly'
  } else if (r.rule === 'yearly') {
    return interval > 1 ? `Every ${interval} years` : 'Yearly'
  }
  return RULE_LABELS[r.rule] ?? 'Recurring'
}

/** Add months while clamping the day-of-month to the target month's last day. */
function addMonthsClamped(d: Date, months: number): void {
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
}

/** Add years while keeping Feb 29 on Feb 28 in non-leap years. */
function addYearsClamped(d: Date, years: number): void {
  const month = d.getMonth()
  const day = d.getDate()
  d.setFullYear(d.getFullYear() + years)
  if (month === 1 && day === 29 && d.getMonth() !== 1) {
    d.setMonth(1)
    d.setDate(28)
  }
}

/** Compute the next due date for a recurrence rule, based on the given date (default today). */
export function nextOccurrenceDate(rec: Recurrence, fromISO?: string | null): string {
  const d = parseISO(fromISO || todayISO())
  const interval = rec.interval && rec.interval > 1 ? rec.interval : 1

  switch (rec.rule) {
    case 'daily':
      d.setDate(d.getDate() + interval)
      break
    case 'weekdays': {
      let steps = 1
      while (steps > 0) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() !== 0 && d.getDay() !== 6) steps -= 1
      }
      break
    }
    case 'weekly': {
      if (rec.daysOfWeek && rec.daysOfWeek.length > 0) {
        const sortedDays = [...rec.daysOfWeek].sort((a, b) => a - b)
        const currentWeekday = d.getDay()
        const nextDayInWeek = sortedDays.find((day) => day > currentWeekday)
        if (nextDayInWeek !== undefined) {
          const delta = nextDayInWeek - currentWeekday
          d.setDate(d.getDate() + delta)
        } else {
          const firstDay = sortedDays[0]
          const delta = 7 * interval - currentWeekday + firstDay
          d.setDate(d.getDate() + delta)
        }
      } else {
        d.setDate(d.getDate() + 7 * interval)
      }
      break
    }
    case 'monthly':
      addMonthsClamped(d, interval)
      break
    case 'yearly':
      addYearsClamped(d, interval)
      break
  }
  return toISODate(d)
}

/** Clone a recurring task into its next occurrence (subtasks reset, status open). */
export function nextOccurrenceTask(task: Task, rec: Recurrence): Task {
  const baseDate = task.dueDate || todayISO()
  const nextDueDate = nextOccurrenceDate(rec, baseDate)

  return {
    ...task,
    id: uid(),
    done: false,
    status: 'todo',
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dueDate: nextDueDate,
    subtasks: (task.subtasks ?? []).map((s) => ({ ...s, done: false })),
    recurrence: rec,
  }
}

/** Format the next occurrence date into a friendly human-readable preview (e.g. "Next: Mon, Aug 24"). */
export function formatNextOccurrencePreview(rec: Recurrence | null | undefined, fromISO?: string | null): string | null {
  if (!rec) return null
  const nextDate = nextOccurrenceDate(rec, fromISO)
  const d = parseISO(nextDate)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `Next: ${formatted}`
}


