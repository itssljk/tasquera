import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSettings, Collection, CollectionKind, CollectionViewMode, Task, TaskStatus, Tombstone } from '../types'
import { freshId, normalizeCollection, normalizeTask, normalizeTombstone, uid } from '../lib/model'
import { nextOccurrenceTask } from '../lib/recurrence'
import { mergeSyncState } from '../lib/merge'
import { isMac } from '../lib/platform'
import { playTaskCompleteSound } from '../lib/sound'
import { parseTaskInput } from '../lib/nlp'

const STORAGE_KEY = 'tasquera.state.v2'
const LEGACY_KEY = 'tasquera.tasks.v1'

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  notificationTime: '09:00',
  taskModalLayout: 'centered',
  weekStartsOn: 'monday',
  soundEnabled: false,
  defaultTaskPriority: 'none',
}

interface Persisted {
  version: 2
  tasks: Task[]
  collections: Collection[]
  tombstones?: Tombstone[]
  settings?: AppSettings
}

function withTombstone(list: Tombstone[], t: Tombstone): Tombstone[] {
  return [...list.filter((x) => x.id !== t.id), t]
}

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>
      if (parsed.version === 2 && Array.isArray(parsed.tasks) && Array.isArray(parsed.collections)) {
        return {
          version: 2,
          tasks: parsed.tasks.map(normalizeTask),
          collections: (parsed.collections as Collection[]).map(normalizeCollection),
          tombstones: (parsed.tombstones ?? []).map(normalizeTombstone),
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        }
      }
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    const legacy: unknown = legacyRaw ? JSON.parse(legacyRaw) : []
    const tasks = Array.isArray(legacy) ? legacy.map(normalizeTask) : []
    return { version: 2, tasks, collections: [], tombstones: [], settings: DEFAULT_SETTINGS }
  } catch {
    return { version: 2, tasks: [], collections: [], tombstones: [], settings: DEFAULT_SETTINGS }
  }
}

export interface StoreValue {
  tasks: Task[]
  collections: Collection[]
  tombstones: Tombstone[]
  settings: AppSettings
  canUndo: boolean
  canRedo: boolean
  undoToastMessage: string | null
  undo: () => void
  redo: () => void
  clearUndoToast: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  addTask: (data: string | (Partial<Task> & { title: string }), listId?: string | null, status?: TaskStatus) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  moveTask: (id: string, listId: string | null) => void
  clearCompleted: () => void
  clearAll: () => void
  exportData: () => Promise<string>
  importData: (json: string) => Promise<boolean>
  exportMarkdown: (listId?: string | null) => string
  mergeState: (remoteTasks: Task[], remoteCollections: Collection[], remoteTombstones?: Tombstone[]) => void
  reorderTasks: (ids: string[]) => void
  reorderCollections: (reorderedOrKind: Collection[] | CollectionKind, reordered?: Collection[]) => void
  reorderFavorites: (reordered: Collection[]) => void
  reorderColumnTasks: (status: TaskStatus, reordered: Task[]) => void
  batchUpdateTasks: (ids: string[], patch: Partial<Task>) => void
  batchDeleteTasks: (ids: string[]) => void
  batchToggleTasks: (ids: string[], done: boolean) => void
  batchMoveTasks: (ids: string[], listId: string | null) => void
  batchScheduleTasks: (ids: string[], dueDate: string | null) => void
  addCollection: (nameOrKind: string, nameOrDefaultView?: string | CollectionViewMode) => void
  renameCollection: (id: string, name: string) => void
  deleteCollection: (id: string) => void
  deleteCollections: (ids: string[], deleteTasks?: boolean) => void
  toggleFavoriteCollection: (id: string) => void
  setCollectionViewMode: (id: string, viewMode: CollectionViewMode) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(loadState)
  const [past, setPast] = useState<Persisted[]>([])
  const [future, setFuture] = useState<Persisted[]>([])
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null)

  const MAX_HISTORY = 50

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable: keep state in memory
    }
  }, [state])

  const commitState = (updater: (prev: Persisted) => Persisted) => {
    setState((prev) => {
      const next = updater(prev)
      if (next === prev) return prev
      setPast((p) => [...p.slice(-MAX_HISTORY), prev])
      setFuture([])
      return next
    })
  }

  const undo = () => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)
    setPast(newPast)
    setFuture((f) => [state, ...f])
    setState(previous)
    setUndoToastMessage(isMac() ? 'Action undone (⌘Z)' : 'Action undone (Ctrl+Z)')
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    const newFuture = future.slice(1)
    setFuture(newFuture)
    setPast((p) => [...p, state])
    setState(next)
    setUndoToastMessage(isMac() ? 'Action redone (⇧⌘Z)' : 'Action redone (Ctrl+Y)')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (!isCmdOrCtrl) return

      const active = document.activeElement
      const isInputFocused =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)

      if (e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (!isInputFocused) {
            e.preventDefault()
            redo()
          }
        } else {
          if (!isInputFocused) {
            e.preventDefault()
            undo()
          }
        }
      } else if (e.key.toLowerCase() === 'y') {
        if (!isInputFocused) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [past, future, state])

  const value: StoreValue = {
    tasks: state.tasks,
    collections: state.collections,
    tombstones: state.tombstones ?? [],
    settings: state.settings || DEFAULT_SETTINGS,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoToastMessage,
    undo,
    redo,
    clearUndoToast: () => setUndoToastMessage(null),
    updateSettings: (patch) =>
      commitState((s) => ({
        ...s,
        settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}), ...patch },
      })),

    addTask: (data, listId = null, status = 'todo') => {
      let taskPartial: Partial<Task> & { title: string }
      if (typeof data === 'string') {
        const trimmed = data.trim()
        if (!trimmed) return
        const parsed = parseTaskInput(trimmed)
        taskPartial = {
          title: parsed.title,
          dueDate: parsed.dueDate,
          priority: parsed.priority,
          listId,
          status,
        }
      } else {
        const trimmed = data.title.trim()
        if (!trimmed) return
        const parsed = parseTaskInput(trimmed)
        taskPartial = {
          ...data,
          title: parsed.title || trimmed,
          dueDate: data.dueDate ? data.dueDate : (parsed.dueDate || null),
          priority: (data.priority && data.priority !== 'medium') ? data.priority : (parsed.priority || data.priority),
        }
      }
      const isDone = taskPartial.status === 'done' || taskPartial.done === true
      const defaultPriority =
        state.settings?.defaultTaskPriority && state.settings.defaultTaskPriority !== 'none'
          ? state.settings.defaultTaskPriority
          : undefined
      const priority = taskPartial.priority ?? defaultPriority
      const task: Task = normalizeTask({
        id: uid(),
        createdAt: Date.now(),
        completedAt: isDone ? Date.now() : null,
        listId: taskPartial.listId ?? listId,
        status: taskPartial.status ?? status,
        ...taskPartial,
        priority,
      })
      commitState((s) => ({ ...s, tasks: [task, ...s.tasks] }))
    },

    toggleTask: (id) =>
      commitState((s) => {
        let spawned: Task | null = null
        let becameDone = false
        const tasks = s.tasks.map((t) => {
          if (t.id !== id) return t
          const wasDone = t.done || t.status === 'done'
          let next: Task
          if (wasDone) {
            next = { ...t, done: false, status: 'todo', completedAt: null, updatedAt: Date.now() }
          } else if (t.status === 'in_progress') {
            next = { ...t, done: true, status: 'done', completedAt: Date.now(), updatedAt: Date.now() }
            becameDone = true
          } else {
            next = { ...t, done: false, status: 'in_progress', completedAt: null, updatedAt: Date.now() }
          }
          if (!wasDone && next.status === 'done' && next.recurrence) {
            spawned = nextOccurrenceTask(next, next.recurrence)
          }
          return next
        })
        if (becameDone && s.settings?.soundEnabled) {
          playTaskCompleteSound()
        }
        return spawned ? { ...s, tasks: [spawned, ...tasks] } : { ...s, tasks }
      }),

    deleteTask: (id) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id),
        tombstones: withTombstone(s.tombstones ?? [], { id, kind: 'task', deletedAt: Date.now() }),
      })),

    updateTask: (id, patch) =>
      commitState((s) => {
        let spawned: Task | null = null
        let becameDone = false
        const tasks = s.tasks.map((t) => {
          if (t.id !== id) return t
          const next = { ...t, ...patch, updatedAt: Date.now() }
          if (patch.subtasks !== undefined && patch.subtasks.length > 0) {
            if (patch.subtasks.every((st) => st.done)) {
              next.done = true
              next.status = 'done'
              next.completedAt = next.completedAt ?? Date.now()
            } else if (next.status === 'done' && !patch.subtasks.every((st) => st.done)) {
              next.done = false
              next.status = 'in_progress'
              next.completedAt = null
            }
          }
          if (patch.status !== undefined) {
            if (patch.status === 'done') {
              next.done = true
              next.completedAt = t.completedAt ?? Date.now()
            } else {
              next.done = false
              next.completedAt = null
            }
          }
          const wasDone = t.done || t.status === 'done'
          const isDoneNow = next.done || next.status === 'done'
          if (!wasDone && isDoneNow) {
            becameDone = true
          }
          if (!wasDone && isDoneNow && next.recurrence) {
            spawned = nextOccurrenceTask(next, next.recurrence)
          }
          return next
        })
        if (becameDone && s.settings?.soundEnabled) {
          playTaskCompleteSound()
        }
        return spawned ? { ...s, tasks: [spawned, ...tasks] } : { ...s, tasks }
      }),

    moveTask: (id, listId) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, listId, updatedAt: Date.now() } : t)),
      })),

    clearCompleted: () =>
      commitState((s) => {
        const done = s.tasks.filter((t) => t.done)
        const now = Date.now()
        if (done.length === 0) return s
        return {
          ...s,
          tasks: s.tasks.filter((t) => !t.done),
          tombstones: done.reduce(
            (list, t) => withTombstone(list, { id: t.id, kind: 'task', deletedAt: now }),
            s.tombstones ?? [],
          ),
        }
      }),

    clearAll: () =>
      commitState((s) => {
        if (s.tasks.length === 0) return s
        const now = Date.now()
        return {
          ...s,
          tasks: [],
          tombstones: s.tasks.reduce(
            (list, t) => withTombstone(list, { id: t.id, kind: 'task', deletedAt: now }),
            s.tombstones ?? [],
          ),
        }
      }),

    exportData: async () => {
      return JSON.stringify(state, null, 2)
    },

    importData: async (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<Persisted>
        if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.collections)) return false
        commitState(() => ({
          version: 2,
          tasks: parsed.tasks!.map(normalizeTask),
          collections: (parsed.collections as Collection[]).map(normalizeCollection),
          tombstones: (parsed.tombstones ?? []).map(normalizeTombstone),
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        }))
        return true
      } catch {
        return false
      }
    },

    mergeState: (remoteTasks, remoteCollections, remoteTombstones = []) => {
      commitState((s) => {
        const result = mergeSyncState(
          s.tasks,
          s.collections,
          s.tombstones ?? [],
          remoteTasks,
          remoteCollections,
          remoteTombstones,
        )
        if (!result.changed) return s
        return {
          ...s,
          tasks: result.tasks,
          collections: result.collections,
          tombstones: result.tombstones,
        }
      })
    },

    reorderTasks: (ids) =>
      commitState((s) => {
        const idSet = new Set(ids)
        const reordered = ids
          .map((id) => s.tasks.find((t) => t.id === id))
          .filter((t): t is Task => !!t)
        const others = s.tasks.filter((t) => !idSet.has(t.id))
        return { ...s, tasks: [...reordered, ...others] }
      }),

    reorderCollections: (reorderedOrKind, maybeReordered) =>
      commitState((s) => {
        // Favorited collections are not part of the non-favorite reorder list;
        // treat them as fixed anchors so dragging non-favorites never clobbers
        // or duplicates them.
        let reordered: Collection[]
        let filterKind: CollectionKind | null = null
        if (typeof reorderedOrKind === 'string') {
          filterKind = reorderedOrKind
          reordered = maybeReordered || []
        } else {
          reordered = reorderedOrKind
        }

        let idx = 0
        const next = s.collections.map((c) => {
          const matches = filterKind ? c.kind === filterKind : true
          if (matches && !c.favorite && idx < reordered.length) {
            return reordered[idx++]
          }
          return c
        })
        return { ...s, collections: next }
      }),

    reorderColumnTasks: (_status, reordered) =>
      commitState((s) => {
        const reorderedIds = new Set(reordered.map((t) => t.id))
        const otherTasks = s.tasks.filter((t) => !reorderedIds.has(t.id))
        return {
          ...s,
          tasks: [...reordered, ...otherTasks],
        }
      }),

    addCollection: (nameOrKind, nameOrDefaultView) =>
      commitState((s) => {
        let name = nameOrKind
        let defaultView: CollectionViewMode = 'list'
        let kind: CollectionKind = 'list'

        if (nameOrDefaultView !== undefined) {
          if (nameOrKind === 'board' || nameOrKind === 'list') {
            kind = nameOrKind
            name = nameOrDefaultView
            if (kind === 'board') defaultView = 'board'
          } else {
            defaultView = nameOrDefaultView as CollectionViewMode
          }
        }

        const trimmed = name.trim()
        if (!trimmed) return s
        const c: Collection = {
          id: freshId(trimmed, s.collections),
          kind,
          name: trimmed,
          favorite: false,
          defaultView,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        return { ...s, collections: [c, ...s.collections] }
      }),

    setCollectionViewMode: (id, viewMode) =>
      commitState((s) => ({
        ...s,
        collections: s.collections.map((c) =>
          c.id === id
            ? {
                ...c,
                defaultView: viewMode,
                kind: viewMode === 'board' ? 'board' : 'list',
                updatedAt: Date.now(),
              }
            : c
        ),
      })),

    renameCollection: (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      commitState((s) => ({
        ...s,
        collections: s.collections.map((c) => (c.id === id ? { ...c, name: trimmed, updatedAt: Date.now() } : c)),
      }))
    },

    deleteCollection: (id) =>
      commitState((s) => ({
        ...s,
        collections: s.collections.filter((c) => c.id !== id),
        tasks: s.tasks.map((t) => (t.listId === id ? { ...t, listId: null, updatedAt: Date.now() } : t)),
        tombstones: withTombstone(s.tombstones ?? [], { id, kind: 'collection', deletedAt: Date.now() }),
      })),

    deleteCollections: (ids, deleteTasks = false) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => {
        let newTombstones = s.tombstones ?? []
        for (const id of idSet) {
          newTombstones = withTombstone(newTombstones, { id, kind: 'collection', deletedAt: now })
        }
        if (deleteTasks) {
          const tasksToDelete = s.tasks.filter((t) => t.listId && idSet.has(t.listId))
          for (const t of tasksToDelete) {
            newTombstones = withTombstone(newTombstones, { id: t.id, kind: 'task', deletedAt: now })
          }
          return {
            ...s,
            collections: s.collections.filter((c) => !idSet.has(c.id)),
            tasks: s.tasks.filter((t) => !(t.listId && idSet.has(t.listId))),
            tombstones: newTombstones,
          }
        }
        return {
          ...s,
          collections: s.collections.filter((c) => !idSet.has(c.id)),
          tasks: s.tasks.map((t) => (t.listId && idSet.has(t.listId) ? { ...t, listId: null, updatedAt: now } : t)),
          tombstones: newTombstones,
        }
      })
    },

    toggleFavoriteCollection: (id) =>
      commitState((s) => {
        const target = s.collections.find((c) => c.id === id)
        if (!target) return s
        if (target.favorite) {
          // Unfavoriting keeps the collection in place; it simply stops
          // appearing in the Favorites section.
          return {
            ...s,
            collections: s.collections.map((c) =>
              c.id === id ? { ...c, favorite: false, updatedAt: Date.now() } : c
            ),
          }
        }
        // Favoriting pins the collection to the top of the Favorites section.
        // updatedAt is bumped so the pinned state propagates to other devices
        // via the newest-wins sync merge. Favorites are hidden from their own
        // kind's section, so array order is the source of truth for the pinned
        // order and can be drag-reordered.
        const rest = s.collections.filter((c) => c.id !== id)
        return {
          ...s,
          collections: [{ ...target, favorite: true, updatedAt: Date.now() }, ...rest],
        }
      }),

    exportMarkdown: (listId) => {
      const targetTasks = listId !== undefined
        ? state.tasks.filter((t) => t.listId === listId)
        : state.tasks
      const lines: string[] = []
      const colName = listId ? state.collections.find((c) => c.id === listId)?.name ?? 'Tasks' : 'Tasquera Tasks'
      lines.push(`# ${colName}\n`)
      for (const t of targetTasks) {
        const check = t.done || t.status === 'done' ? '[x]' : '[ ]'
        const due = t.dueDate ? ` (Due: ${t.dueDate})` : ''
        const prio = t.priority && t.priority !== 'medium' ? ` [${t.priority.toUpperCase()}]` : ''
        lines.push(`- ${check} ${t.title}${prio}${due}`)
        if (t.subtasks && t.subtasks.length > 0) {
          for (const s of t.subtasks) {
            lines.push(`  - ${s.done ? '[x]' : '[ ]'} ${s.title}`)
          }
        }
        if (t.description) {
          lines.push(`    > ${t.description.replace(/\n/g, '\n    > ')}`)
        }
      }
      return lines.join('\n')
    },

    batchUpdateTasks: (ids, patch) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (idSet.has(t.id) ? { ...t, ...patch, updatedAt: now } : t)),
      }))
    },

    batchDeleteTasks: (ids) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => {
        let newTombstones = s.tombstones ?? []
        for (const id of idSet) {
          newTombstones = withTombstone(newTombstones, { id, kind: 'task', deletedAt: now })
        }
        return {
          ...s,
          tasks: s.tasks.filter((t) => !idSet.has(t.id)),
          tombstones: newTombstones,
        }
      })
      setUndoToastMessage(`Deleted ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`)
    },

    batchToggleTasks: (ids, done) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          idSet.has(t.id)
            ? {
                ...t,
                done,
                status: done ? 'done' : 'todo',
                completedAt: done ? now : null,
                updatedAt: now,
              }
            : t
        ),
      }))
    },

    batchMoveTasks: (ids, listId) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (idSet.has(t.id) ? { ...t, listId, updatedAt: now } : t)),
      }))
    },

    batchScheduleTasks: (ids, dueDate) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const now = Date.now()
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (idSet.has(t.id) ? { ...t, dueDate, updatedAt: now } : t)),
      }))
    },

    reorderFavorites: (reordered) =>
      commitState((s) => {
        let idx = 0
        const next = s.collections.map((c) => {
          if (c.favorite && idx < reordered.length) {
            return reordered[idx++]
          }
          return c
        })
        return { ...s, collections: next }
      }),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
