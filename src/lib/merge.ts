import type { Collection, Task, Tombstone } from '../types'
import { normalizeCollection, normalizeTask } from './model'

export interface MergeResult {
  tasks: Task[]
  collections: Collection[]
  tombstones: Tombstone[]
  changed: boolean
}

/**
 * Merge local and remote sync state, newest-wins by `updatedAt`.
 *
 * Deletions propagate via `tombstones`: any task/collection whose id appears
 * in a tombstone is dropped (deletions are sticky and win over edits). Tasks
 * whose collection was deleted are orphaned to the inbox rather than removed.
 */
export function mergeSyncState(
  localTasks: Task[],
  localCollections: Collection[],
  localTombstones: Tombstone[],
  remoteTasks: Task[],
  remoteCollections: Collection[],
  remoteTombstones: Tombstone[],
): MergeResult {
  let changed = false

  // 1. Merge tombstones, keeping the newest deletedAt per id.
  const tombMap = new Map<string, Tombstone>()
  for (const t of localTombstones) tombMap.set(t.id, t)
  for (const t of remoteTombstones) {
    const local = tombMap.get(t.id)
    if (!local || t.deletedAt > local.deletedAt) {
      tombMap.set(t.id, t)
      changed = true
    }
  }
  const tombstones = Array.from(tombMap.values())

  const deadTaskIds = new Set(tombstones.filter((t) => t.kind === 'task').map((t) => t.id))
  const deadColIds = new Set(tombstones.filter((t) => t.kind === 'collection').map((t) => t.id))

  // 2. Merge collections (drop tombstoned, newest-wins otherwise).
  const colMap = new Map<string, Collection>()
  for (const c of localCollections) {
    if (deadColIds.has(c.id)) {
      changed = true
      continue
    }
    colMap.set(c.id, c)
  }
  for (const rc of remoteCollections) {
    if (deadColIds.has(rc.id)) continue
    const norm = normalizeCollection(rc)
    const local = colMap.get(norm.id)
    if (!local) {
      colMap.set(norm.id, norm)
      changed = true
    } else {
      const localTs = local.updatedAt || local.createdAt || 0
      const remoteTs = norm.updatedAt || norm.createdAt || 0
      if (remoteTs > localTs) {
        colMap.set(norm.id, norm)
        changed = true
      }
    }
  }
  const collections = Array.from(colMap.values())

  // 3. Merge tasks (drop tombstoned, orphan tasks of deleted collections).
  const taskMap = new Map<string, Task>()
  for (const t of localTasks) {
    if (deadTaskIds.has(t.id)) {
      changed = true
      continue
    }
    if (t.listId && deadColIds.has(t.listId)) {
      taskMap.set(t.id, { ...t, listId: null, updatedAt: Date.now() })
      changed = true
      continue
    }
    taskMap.set(t.id, t)
  }
  for (const rt of remoteTasks) {
    if (deadTaskIds.has(rt.id)) continue
    const norm = normalizeTask(rt)
    if (norm.listId && deadColIds.has(norm.listId)) norm.listId = null
    const local = taskMap.get(norm.id)
    if (!local) {
      taskMap.set(norm.id, norm)
      changed = true
    } else {
      const localTs = local.updatedAt || local.createdAt || 0
      const remoteTs = norm.updatedAt || norm.createdAt || 0
      if (remoteTs > localTs) {
        taskMap.set(norm.id, norm)
        changed = true
      }
    }
  }
  const tasks = Array.from(taskMap.values())

  return { tasks, collections, tombstones, changed }
}
