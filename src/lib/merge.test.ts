import { describe, expect, it } from 'vitest'
import type { Collection, Task, Tombstone } from '../types'
import { mergeSyncState } from './merge'

function task(id: string, updatedAt: number, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    done: false,
    createdAt: updatedAt,
    updatedAt,
    completedAt: null,
    listId: null,
    dueDate: null,
    description: '',
    priority: 'medium',
    subtasks: [],
    links: [],
    status: 'todo',
    ...extra,
  }
}

function col(id: string, updatedAt: number, extra: Partial<Collection> = {}): Collection {
  return { id, kind: 'list', name: id, createdAt: updatedAt, updatedAt, ...extra }
}

function tomb(id: string, deletedAt: number, kind: 'task' | 'collection' = 'task'): Tombstone {
  return { id, kind, deletedAt }
}

describe('mergeSyncState', () => {
  it('adds new remote tasks and collections', () => {
    const r = mergeSyncState([], [], [], [task('a', 5)], [col('w', 5)], [])
    expect(r.changed).toBe(true)
    expect(r.tasks.map((t) => t.id)).toEqual(['a'])
    expect(r.collections.map((c) => c.id)).toEqual(['w'])
  })

  it('keeps the newest version of a task', () => {
    const keep = mergeSyncState([task('a', 10)], [], [], [task('a', 5)], [], [])
    expect(keep.changed).toBe(false)
    expect(keep.tasks[0].updatedAt).toBe(10)

    const replace = mergeSyncState([task('a', 5)], [], [], [task('a', 10)], [], [])
    expect(replace.changed).toBe(true)
    expect(replace.tasks[0].updatedAt).toBe(10)
  })

  it('reports no change for identical states', () => {
    const r = mergeSyncState([task('a', 10)], [col('w', 10)], [], [task('a', 10)], [col('w', 10)], [])
    expect(r.changed).toBe(false)
  })

  it('removes a local task when a remote tombstone arrives', () => {
    const r = mergeSyncState([task('a', 5)], [], [], [], [], [tomb('a', 100)])
    expect(r.tasks).toHaveLength(0)
    expect(r.tombstones.map((t) => t.id)).toEqual(['a'])
    expect(r.changed).toBe(true)
  })

  it('skips remote tasks that are tombstoned', () => {
    const r = mergeSyncState([], [], [tomb('a', 100)], [task('a', 5)], [], [])
    expect(r.tasks).toHaveLength(0)
  })

  it('does not resurrect a task that was deleted locally', () => {
    const r = mergeSyncState([], [], [tomb('a', 100)], [task('a', 200)], [], [])
    expect(r.tasks).toHaveLength(0)
  })

  it('keeps the newest tombstone timestamp', () => {
    const r = mergeSyncState([], [], [tomb('a', 100)], [], [], [tomb('a', 50)])
    expect(r.tombstones[0].deletedAt).toBe(100)
  })

  it('propagates favorites when the remote collection is newer', () => {
    const r = mergeSyncState([], [col('w', 10)], [], [], [col('w', 20, { favorite: true })], [])
    expect(r.changed).toBe(true)
    expect(r.collections[0].favorite).toBe(true)
    expect(r.collections[0].updatedAt).toBe(20)

    // Older remote copy cannot un-favorite a local favorite.
    const keep = mergeSyncState([], [col('w', 20, { favorite: true })], [], [], [col('w', 10)], [])
    expect(keep.changed).toBe(false)
    expect(keep.collections[0].favorite).toBe(true)
  })

  it('removes a tombstoned collection and orphans its tasks to the inbox', () => {
    const r = mergeSyncState(
      [task('a', 5, { listId: 'w' })],
      [col('w', 5)],
      [],
      [],
      [],
      [tomb('w', 100, 'collection')],
    )
    expect(r.collections).toHaveLength(0)
    expect(r.tasks).toHaveLength(1)
    expect(r.tasks[0].listId).toBeNull()
  })
})
