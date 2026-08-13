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

/** Normalize a recurrence value: accepts legacy string rules and new objects. */
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
    if (typeof rec.day === 'number' && rec.day >= 1 && rec.day <= 31) out.day = Math.floor(rec.day)
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
