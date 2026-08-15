import type { MonthlyNthWeekday, Recurrence, RecurrenceRule, Task } from '../types'
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

export const NTH_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  [-1]: 'last',
}

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

/** Calculate the day of the month for the Nth (or last) specific weekday (e.g. 2nd Tuesday). */
export function getNthWeekdayOfMonth(year: number, month: number, nth: MonthlyNthWeekday['nth'], weekday: number): number {
  if (nth === -1) {
    // Last occurrence of weekday in month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const lastDateObj = new Date(year, month, lastDayOfMonth)
    const diff = (lastDateObj.getDay() - weekday + 7) % 7
    return lastDayOfMonth - diff
  }
  // 1st..4th occurrence of weekday in month
  const firstDayOfMonth = new Date(year, month, 1)
  const diff = (weekday - firstDayOfMonth.getDay() + 7) % 7
  const firstOccurrence = 1 + diff
  const targetDay = firstOccurrence + (nth - 1) * 7
  const maxDays = new Date(year, month + 1, 0).getDate()
  return Math.min(targetDay, maxDays)
}

/** Human-readable label for a recurrence rule. */
export function recurrenceLabel(r: Recurrence | null | undefined): string {
  if (!r) return 'Never'

  let baseLabel = ''
  const interval = r.interval && r.interval > 1 ? r.interval : 1

  if (r.rule === 'daily') {
    baseLabel = interval > 1 ? `Every ${interval} days` : 'Daily'
  } else if (r.rule === 'weekdays') {
    baseLabel = 'Weekdays (Mon–Fri)'
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

      if (interval > 1) {
        baseLabel = `Every ${interval} weeks on ${dayText}`
      } else {
        baseLabel = isAllWeekdays ? 'Every weekday' : `Weekly on ${dayText}`
      }
    } else {
      baseLabel = interval > 1 ? `Every ${interval} weeks` : 'Weekly'
    }
  } else if (r.rule === 'monthly') {
    if (r.monthlyPattern) {
      const nthStr = NTH_LABELS[r.monthlyPattern.nth] || ordinal(r.monthlyPattern.nth)
      const dayName = WEEKDAY_NAMES_LONG[r.monthlyPattern.weekday]
      baseLabel =
        interval > 1
          ? `Every ${interval} months on the ${nthStr} ${dayName}`
          : `Monthly on the ${nthStr} ${dayName}`
    } else if (r.day) {
      baseLabel =
        interval > 1
          ? `Every ${interval} months on the ${ordinal(r.day)}`
          : `On the ${ordinal(r.day)} of the month`
    } else {
      baseLabel = interval > 1 ? `Every ${interval} months` : 'Monthly'
    }
  } else if (r.rule === 'yearly') {
    baseLabel = interval > 1 ? `Every ${interval} years` : 'Yearly'
  } else {
    baseLabel = RULE_LABELS[r.rule] ?? 'Recurring'
  }

  // Suffixes
  if (r.mode === 'completion') {
    baseLabel += ' (after completion)'
  }

  if (r.endCondition?.type === 'date' && r.endCondition.endDate) {
    baseLabel += ` · Until ${r.endCondition.endDate}`
  } else if (r.endCondition?.type === 'count' && r.endCondition.endCount) {
    const total = r.endCondition.endCount
    const current = r.occurrenceIndex ?? 1
    baseLabel += total > 1 ? ` · (${current}/${total})` : ` · 1 time`
  }

  return baseLabel
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
        // Find next day in current week strictly after current day
        const nextDayInWeek = sortedDays.find((day) => day > currentWeekday)
        if (nextDayInWeek !== undefined) {
          const delta = nextDayInWeek - currentWeekday
          d.setDate(d.getDate() + delta)
        } else {
          // Wrap around to the first day in sortedDays after `interval` weeks
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
      if (rec.monthlyPattern) {
        const targetMonth = d.getMonth() + interval
        const targetYear = d.getFullYear() + Math.floor(targetMonth / 12)
        const normalizedMonth = ((targetMonth % 12) + 12) % 12
        const nthDay = getNthWeekdayOfMonth(
          targetYear,
          normalizedMonth,
          rec.monthlyPattern.nth,
          rec.monthlyPattern.weekday
        )
        return toISODate(new Date(targetYear, normalizedMonth, nthDay))
      } else if (rec.day) {
        d.setDate(1)
        d.setMonth(d.getMonth() + interval)
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
function advanceDeadline(deadline: string, rec: Recurrence, baseDateISO?: string | null): string {
  const [datePart, timePart] = deadline.split('T')
  const nextDate = nextOccurrenceDate(rec, baseDateISO || datePart)
  return timePart ? `${nextDate}T${timePart}` : nextDate
}

/** Clone a recurring task into its next occurrence (subtasks reset, status open).
 * Returns null if the series has reached its end condition. */
export function nextOccurrenceTask(task: Task, rec: Recurrence): Task | null {
  const currIndex = rec.occurrenceIndex ?? 1

  // Check count end condition
  if (rec.endCondition?.type === 'count' && rec.endCondition.endCount) {
    if (currIndex >= rec.endCondition.endCount) {
      return null
    }
  }

  // Base date for next calculation: either completion date or original dueDate
  const baseDate = rec.mode === 'completion' ? todayISO() : task.dueDate || todayISO()
  const nextDueDate = nextOccurrenceDate(rec, baseDate)

  // Check date end condition
  if (rec.endCondition?.type === 'date' && rec.endCondition.endDate) {
    if (nextDueDate > rec.endCondition.endDate) {
      return null
    }
  }

  const nextRecurrence: Recurrence = {
    ...rec,
    ...(rec.endCondition?.type === 'count' || rec.occurrenceIndex !== undefined
      ? { occurrenceIndex: currIndex + 1 }
      : {}),
  }

  return {
    ...task,
    id: uid(),
    done: false,
    status: 'todo',
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: false,
    dueDate: nextDueDate,
    deadline: task.deadline ? advanceDeadline(task.deadline, rec, baseDate) : null,
    subtasks: (task.subtasks ?? []).map((s) => ({ ...s, done: false })),
    recurrence: nextRecurrence,
  }
}
