import type { Collection, Recurrence, Task, Tombstone } from '../types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function slugify(name: string): string {
  const s = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'collection'
}

export function freshId(name: string, existing: Collection[]): string {
  const base = slugify(name)
  if (!existing.some((c) => c.id === base)) return base
  return `${base}-${Math.random().toString(36).slice(2, 5)}`
}

const RECURRENCE_RULES: readonly Recurrence['rule'][] = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly']

export function normalizeRecurrence(r: unknown): Recurrence | null {
  if (!r) return null
  if (typeof r === 'string') {
    return (RECURRENCE_RULES as readonly string[]).includes(r)
      ? { rule: r as Recurrence['rule'] }
      : null
  }
  if (typeof r === 'object') {
    const rec = r as Partial<Recurrence>
    if (!rec.rule || !(RECURRENCE_RULES as readonly string[]).includes(rec.rule)) return null
    const out: Recurrence = { rule: rec.rule as Recurrence['rule'] }
    if (typeof rec.interval === 'number' && rec.interval > 1) out.interval = Math.floor(rec.interval)
    if (Array.isArray(rec.daysOfWeek) && rec.daysOfWeek.length > 0) {
      const validDays = Array.from(
        new Set(
          rec.daysOfWeek
            .filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
            .map((d) => Math.floor(d))
        )
      ).sort((a, b) => a - b)
      if (validDays.length > 0) out.daysOfWeek = validDays
    }
    if (typeof rec.day === 'number' && rec.day >= 1 && rec.day <= 31) out.day = Math.floor(rec.day)
    if (
      rec.monthlyPattern &&
      typeof rec.monthlyPattern === 'object' &&
      [1, 2, 3, 4, -1].includes(rec.monthlyPattern.nth) &&
      typeof rec.monthlyPattern.weekday === 'number' &&
      rec.monthlyPattern.weekday >= 0 &&
      rec.monthlyPattern.weekday <= 6
    ) {
      out.monthlyPattern = {
        nth: rec.monthlyPattern.nth,
        weekday: Math.floor(rec.monthlyPattern.weekday),
      }
    }
    if (rec.mode === 'completion' || rec.mode === 'due_date') {
      out.mode = rec.mode
    }
    if (rec.endCondition && typeof rec.endCondition === 'object') {
      if (rec.endCondition.type === 'date' && typeof rec.endCondition.endDate === 'string' && rec.endCondition.endDate) {
        out.endCondition = { type: 'date', endDate: rec.endCondition.endDate }
      } else if (rec.endCondition.type === 'count' && typeof rec.endCondition.endCount === 'number' && rec.endCondition.endCount > 0) {
        out.endCondition = { type: 'count', endCount: Math.floor(rec.endCondition.endCount) }
      } else if (rec.endCondition.type === 'never') {
        out.endCondition = { type: 'never' }
      }
    }
    if (typeof rec.occurrenceIndex === 'number' && rec.occurrenceIndex >= 1) {
      out.occurrenceIndex = Math.floor(rec.occurrenceIndex)
    }
    return out
  }
  return null
}

export function normalizeTask(t: Partial<Task> & { id: string; title: string }): Task {
  const now = Date.now()
  return {
    done: false,
    createdAt: now,
    updatedAt: t.updatedAt || t.createdAt || now,
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
    status: t.done ? 'done' : t.status || 'todo',
    ...t,
    recurrence: normalizeRecurrence(t.recurrence),
  }
}

export function normalizeCollection(c: Collection): Collection {
  const now = Date.now()
  return {
    ...c,
    updatedAt: c.updatedAt || c.createdAt || now,
  }
}

export function normalizeTombstone(t: Partial<Tombstone> & { id: string }): Tombstone {
  return {
    id: t.id,
    kind: t.kind === 'collection' ? 'collection' : 'task',
    deletedAt: t.deletedAt || Date.now(),
  }
}
