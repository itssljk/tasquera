import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSettings, Collection, CollectionKind, Task, TaskStatus, Tombstone } from '../types'
import { freshId, normalizeCollection, normalizeTask, normalizeTombstone, uid } from '../lib/model'
import { mergeSyncState } from '../lib/merge'
import { collectImages, deleteImages, importImages } from '../lib/attachments'

const STORAGE_KEY = 'tasquera.state.v2'
const LEGACY_KEY = 'tasquera.tasks.v1'

const DEFAULT_SETTINGS: AppSettings = {
  showQuickAdd: false,
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
  archiveTask: (id: string) => void
  archiveOldCompleted: (days?: number) => void
  restoreTask: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  exportData: () => Promise<string>
  importData: (json: string) => Promise<boolean>
  mergeState: (remoteTasks: Task[], remoteCollections: Collection[], remoteTombstones?: Tombstone[]) => void
  reorderTasks: (ids: string[]) => void
  reorderCollections: (kind: CollectionKind, reordered: Collection[]) => void
  reorderColumnTasks: (status: TaskStatus, reordered: Task[]) => void
  addCollection: (kind: CollectionKind, name: string) => void
  renameCollection: (id: string, name: string) => void
  deleteCollection: (id: string) => void
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
      // storage unavailable — keep state in memory
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
    setUndoToastMessage('Action undone (Ctrl+Z)')
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    const newFuture = future.slice(1)
    setFuture(newFuture)
    setPast((p) => [...p, state])
    setState(next)
    setUndoToastMessage('Action redone (Ctrl+Y)')
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
        taskPartial = { title: trimmed, listId, status }
      } else {
        const trimmed = data.title.trim()
        if (!trimmed) return
        taskPartial = { ...data, title: trimmed }
      }
      const isDone = taskPartial.status === 'done' || taskPartial.done === true
      const task: Task = normalizeTask({
        id: uid(),
        createdAt: Date.now(),
        completedAt: isDone ? Date.now() : null,
        listId: taskPartial.listId ?? listId,
        status: taskPartial.status ?? status,
        ...taskPartial,
      })
      commitState((s) => ({ ...s, tasks: [task, ...s.tasks] }))
    },

    toggleTask: (id) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => {
          if (t.id !== id) return t
          if (t.done || t.status === 'done') {
            return {
              ...t,
              done: false,
              status: 'todo',
              completedAt: null,
              updatedAt: Date.now(),
            }
          }
          if (t.status === 'in_progress') {
            return {
              ...t,
              done: true,
              status: 'done',
              completedAt: Date.now(),
              updatedAt: Date.now(),
            }
          }
          return {
            ...t,
            done: false,
            status: 'in_progress',
            completedAt: null,
            updatedAt: Date.now(),
          }
        }),
      })),

    deleteTask: (id) =>
      commitState((s) => {
        const task = s.tasks.find((t) => t.id === id)
        if (task?.images?.length) void deleteImages(task.images)
        return {
          ...s,
          tasks: s.tasks.filter((t) => t.id !== id),
          tombstones: withTombstone(s.tombstones ?? [], { id, kind: 'task', deletedAt: Date.now() }),
        }
      }),

    updateTask: (id, patch) =>
      commitState((s) => {
        let removedImages: string[] = []
        const tasks = s.tasks.map((t) => {
          if (t.id !== id) return t
          if (patch.images !== undefined) {
            const nextRefs = new Set(patch.images)
            removedImages = (t.images ?? []).filter((r) => !nextRefs.has(r))
          }
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
          return next
        })
        if (removedImages.length > 0) void deleteImages(removedImages)
        return { ...s, tasks }
      }),

    moveTask: (id, listId) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, listId, updatedAt: Date.now() } : t)),
      })),

    archiveTask: (id) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, archived: true, updatedAt: Date.now() } : t)),
      })),

    archiveOldCompleted: (days = 7) =>
      commitState((s) => {
        const cutoff = Date.now() - days * 86400000
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (!t.archived && t.done && (t.completedAt ?? t.createdAt) < cutoff) {
              return { ...t, archived: true, updatedAt: Date.now() }
            }
            return t
          }),
        }
      }),

    restoreTask: (id) =>
      commitState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, archived: false, updatedAt: Date.now() } : t)),
      })),

    clearCompleted: () =>
      commitState((s) => {
        const done = s.tasks.filter((t) => t.done)
        const now = Date.now()
        if (done.length === 0) return s
        void deleteImages(done.flatMap((t) => t.images ?? []))
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
        void deleteImages(s.tasks.flatMap((t) => t.images ?? []))
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
      const attachments = await collectImages(state.tasks.flatMap((t) => t.images ?? []))
      return JSON.stringify({ ...state, attachments }, null, 2)
    },

    importData: async (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<Persisted> & { attachments?: Record<string, string> }
        if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.collections)) return false
        if (parsed.attachments && typeof parsed.attachments === 'object') {
          await importImages(parsed.attachments)
        }
        commitState(() => ({
          version: 2,
          tasks: parsed.tasks!.map(normalizeTask),
          collections: (parsed.collections as Collection[]).map(normalizeCollection),
          tombstones: (parsed.tombstones ?? []).map(normalizeTombstone),
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

    reorderCollections: (kind, reordered) =>
      commitState((s) => {
        let idx = 0
        const next = s.collections.map((c) => {
          if (c.kind === kind && idx < reordered.length) {
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

    addCollection: (kind, name) =>
      commitState((s) => {
        const trimmed = name.trim()
        if (!trimmed) return s
        const c: Collection = {
          id: freshId(trimmed, s.collections),
          kind,
          name: trimmed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        return { ...s, collections: [c, ...s.collections] }
      }),

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
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
