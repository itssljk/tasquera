import type { PriorityLevel } from '../types'
import { addDaysISO, parseISO, toISODate, todayISO } from './date'

export interface ParsedTaskInput {
  title: string
  dueDate: string | null
  priority?: PriorityLevel
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

/**
 * Parse natural language tokens for dates and priority from an input string.
 * Leaves the remaining cleaned text as the title.
 */
export function parseTaskInput(raw: string, baseDateISO?: string): ParsedTaskInput {
  let text = raw.trim()
  const today = baseDateISO || todayISO()
  const base = parseISO(today)

  let dueDate: string | null = null
  let priority: PriorityLevel | undefined = undefined

  // 1. Extract Priority: !urgent, !high, !med, !low, !u, !h, !m, !l, p1, p2, p3, p4
  const priorityPatterns: [RegExp, PriorityLevel][] = [
    [/(?:^|\s)!(urgent|urg|u)\b|(?:^|\s)p1\b/i, 'urgent'],
    [/(?:^|\s)!(high|hi|h)\b|(?:^|\s)p2\b/i, 'high'],
    [/(?:^|\s)!(medium|med|m)\b|(?:^|\s)p3\b/i, 'medium'],
    [/(?:^|\s)!(low|l)\b|(?:^|\s)p4\b/i, 'low'],
  ]

  for (const [regex, level] of priorityPatterns) {
    if (regex.test(text)) {
      priority = level
      text = text.replace(regex, ' ')
      break
    }
  }

  // 2. Extract Dates
  // 2a. ISO format YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) {
    dueDate = isoMatch[1]
    text = text.replace(isoMatch[0], ' ')
  }

  // 2b. "today", "tod"
  if (!dueDate) {
    const todayMatch = text.match(/\b(today|tod)\b/i)
    if (todayMatch) {
      dueDate = today
      text = text.replace(todayMatch[0], ' ')
    }
  }

  // 2c. "tomorrow", "tmrw", "tom"
  if (!dueDate) {
    const tomMatch = text.match(/\b(tomorrow|tmrw|tom)\b/i)
    if (tomMatch) {
      dueDate = addDaysISO(today, 1)
      text = text.replace(tomMatch[0], ' ')
    }
  }

  // 2d. "yesterday"
  if (!dueDate) {
    const yestMatch = text.match(/\b(yesterday)\b/i)
    if (yestMatch) {
      dueDate = addDaysISO(today, -1)
      text = text.replace(yestMatch[0], ' ')
    }
  }

  // 2e. "in N days" or "in N weeks"
  if (!dueDate) {
    const inNDaysMatch = text.match(/\bin\s+(\d+)\s+(days?|weeks?|d|w)\b/i)
    if (inNDaysMatch) {
      const count = parseInt(inNDaysMatch[1], 10)
      const unit = inNDaysMatch[2].toLowerCase()
      const daysToAdd = unit.startsWith('w') ? count * 7 : count
      dueDate = addDaysISO(today, daysToAdd)
      text = text.replace(inNDaysMatch[0], ' ')
    }
  }

  // 2f. "next (weekday)" or just "(weekday)"
  if (!dueDate) {
    const weekdayMatch = text.match(/\b(next\s+)?(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b/i)
    if (weekdayMatch) {
      const isNext = Boolean(weekdayMatch[1])
      const targetDay = WEEKDAYS[weekdayMatch[2].toLowerCase()]
      if (targetDay !== undefined) {
        const currentDay = base.getDay()
        let diff = (targetDay - currentDay + 7) % 7
        if (diff === 0 || isNext) {
          diff += 7
        }
        dueDate = addDaysISO(today, diff)
        text = text.replace(weekdayMatch[0], ' ')
      }
    }
  }

  // 2g. Month & Day: e.g. "Aug 25", "August 25th", "25 Aug", "25th of August"
  if (!dueDate) {
    const monthDayMatch = text.match(
      /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
    )
    if (monthDayMatch) {
      const monthIdx = MONTHS[monthDayMatch[1].toLowerCase()]
      const dayNum = parseInt(monthDayMatch[2], 10)
      if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
        let targetYear = base.getFullYear()
        const targetDate = new Date(targetYear, monthIdx, dayNum)
        if (targetDate < base && targetDate.getMonth() < base.getMonth()) {
          targetYear += 1
          targetDate.setFullYear(targetYear)
        }
        dueDate = toISODate(targetDate)
        text = text.replace(monthDayMatch[0], ' ')
      }
    }
  }

  // Clean remaining whitespace
  const cleanTitle = text.replace(/\s+/g, ' ').trim()

  return {
    title: cleanTitle || raw.trim(),
    dueDate,
    priority,
  }
}
