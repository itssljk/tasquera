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

export function findCollection(collections: Collection[], idOrName?: string | null): Collection | undefined {
  if (!idOrName) return undefined
  let decoded = idOrName.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // ignore decoding errors
  }
  const lower = decoded.toLowerCase()
  const slug = slugify(decoded)
  return (
    collections.find((c) => c.id === idOrName) ||
    collections.find((c) => c.id === decoded) ||
    collections.find((c) => c.id.toLowerCase() === lower) ||
    collections.find((c) => c.name === decoded) ||
    collections.find((c) => c.name.toLowerCase() === lower) ||
    collections.find((c) => slugify(c.name) === slug) ||
    collections.find((c) => slugify(c.id) === slug)
  )
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
    description: '',
    priority: 'medium',
    subtasks: [],
    links: [],
    status: t.done ? 'done' : t.status || 'todo',
    ...t,
    recurrence: normalizeRecurrence(t.recurrence),
  }
}

export function normalizeCollection(c: Collection): Collection {
  const now = Date.now()
  const defaultView = c.defaultView || (c.kind === 'board' ? 'board' : 'list')
  return {
    ...c,
    kind: c.kind || 'list',
    defaultView,
    favorite: !!c.favorite,
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
