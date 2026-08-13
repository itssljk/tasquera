import type { Recurrence, RecurrenceRule, Task } from '../types'
import { parseISO, toISODate, todayISO } from './date'
import { uid } from './model'

const RULE_LABELS: Record<RecurrenceRule, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

/** "1st", "2nd", "3rd", "4th", "31st"… */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** Human-readable label for a recurrence rule. */
export function recurrenceLabel(r: Recurrence | null | undefined): string {
  if (!r) return 'Never'
  if (r.interval && r.interval > 1) {
    if (r.rule === 'daily') return `Every ${r.interval} days`
    if (r.rule === 'weekly') return `Every ${r.interval} weeks`
    if (r.rule === 'monthly') return `Every ${r.interval} months`
    if (r.rule === 'yearly') return `Every ${r.interval} years`
  }
  if (r.rule === 'monthly' && r.day) return `On the ${ordinal(r.day)} of the month`
  return RULE_LABELS[r.rule]
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
    case 'weekly':
      d.setDate(d.getDate() + 7 * interval)
      break
    case 'monthly':
      if (rec.day) {
        d.setDate(1)
        d.setMonth(d.getMonth() + 1)
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(rec.day, lastDay))
      } else {
        addMonthsClamped(d, interval)
      }
      break
    case 'yearly':
      addYearsClamped(d, interval)
      break
  }
  return toISODate(d)
}

/** Advance a datetime deadline's date part by the recurrence rule, preserving its time. */
function advanceDeadline(deadline: string, rec: Recurrence): string {
  const [datePart, timePart] = deadline.split('T')
  const nextDate = nextOccurrenceDate(rec, datePart)
  return timePart ? `${nextDate}T${timePart}` : nextDate
}

/** Clone a recurring task into its next occurrence (subtasks reset, status open). */
export function nextOccurrenceTask(task: Task, rec: Recurrence): Task {
  return {
    ...task,
    id: uid(),
    done: false,
    status: 'todo',
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: false,
    dueDate: nextOccurrenceDate(rec, task.dueDate),
    deadline: task.deadline ? advanceDeadline(task.deadline, rec) : null,
    subtasks: (task.subtasks ?? []).map((s) => ({ ...s, done: false })),
  }
}
