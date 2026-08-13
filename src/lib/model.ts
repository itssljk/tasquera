import type { Collection, Task, Tombstone } from '../types'

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
