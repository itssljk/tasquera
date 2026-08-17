import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import type { Task } from '../types'

function wrapper({ children }: { children: ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>
}

function setup() {
  return renderHook(() => useStore(), { wrapper })
}

const remoteTask = (id: string, updatedAt: number): Task => ({
  id,
  title: `Remote ${id}`,
  done: false,
  createdAt: updatedAt,
  updatedAt,
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
  status: 'todo',
})

beforeEach(() => {
  localStorage.clear()
})

describe('store', () => {
  it('adds and toggles tasks through statuses', () => {
    const { result } = setup()
    act(() => result.current.addTask('Hello'))
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Hello')

    const id = result.current.tasks[0].id
    act(() => result.current.toggleTask(id))
    expect(result.current.tasks[0].status).toBe('in_progress')
    act(() => result.current.toggleTask(id))
    expect(result.current.tasks[0].status).toBe('done')
    expect(result.current.tasks[0].done).toBe(true)
  })

  it('spawns the next occurrence when a recurring task is completed', () => {
    const { result } = setup()
    act(() => result.current.addTask({ title: 'Water plants', recurrence: { rule: 'daily' }, dueDate: '2026-08-13' }))
    const id = result.current.tasks[0].id

    // todo -> in_progress does not spawn
    act(() => result.current.toggleTask(id))
    expect(result.current.tasks).toHaveLength(1)

    // in_progress -> done spawns the next occurrence
    act(() => result.current.toggleTask(id))
    expect(result.current.tasks).toHaveLength(2)

    const [next, completed] = result.current.tasks
    expect(completed.id).toBe(id)
    expect(completed.status).toBe('done')
    expect(next.id).not.toBe(id)
    expect(next.title).toBe('Water plants')
    expect(next.status).toBe('todo')
    expect(next.dueDate).toBe('2026-08-14')
    expect(next.recurrence).toEqual({ rule: 'daily' })
  })

  it('spawns the next occurrence when a recurring task is marked done via updateTask', () => {
    const { result } = setup()
    act(() => result.current.addTask({ title: 'Weekly review', recurrence: { rule: 'weekly' }, dueDate: '2026-08-13' }))
    const id = result.current.tasks[0].id

    act(() => result.current.updateTask(id, { status: 'done', done: true }))
    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0].dueDate).toBe('2026-08-20')
    expect(result.current.tasks[0].status).toBe('todo')
  })

  it('stops spawning when recurrence count reaches endCount limit', () => {
    const { result } = setup()
    act(() =>
      result.current.addTask({
        title: 'Limited chore',
        recurrence: { rule: 'daily', endCondition: { type: 'count', endCount: 1 } },
        dueDate: '2026-08-13',
      })
    )
    const id = result.current.tasks[0].id

    // Complete the task -> since endCount is 1 and occurrenceIndex is 1, no new task is spawned
    act(() => result.current.toggleTask(id))
    act(() => result.current.toggleTask(id))
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].status).toBe('done')
  })

  it('records a tombstone on delete and clears it on undo', () => {
    const { result } = setup()
    act(() => result.current.addTask('Hello'))
    const id = result.current.tasks[0].id

    act(() => result.current.deleteTask(id))
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.tombstones.some((t) => t.id === id && t.kind === 'task')).toBe(true)

    act(() => result.current.undo())
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tombstones.some((t) => t.id === id)).toBe(false)
  })

  it('merges remote state and honors remote tombstones', () => {
    const { result } = setup()
    act(() => result.current.addTask('Local'))

    act(() => result.current.mergeState([remoteTask('remote-1', 100)], [], []))
    expect(result.current.tasks.map((t) => t.id)).toContain('remote-1')

    act(() => result.current.mergeState([], [], [{ id: 'remote-1', kind: 'task', deletedAt: 200 }]))
    expect(result.current.tasks.map((t) => t.id)).not.toContain('remote-1')
  })

  it('does not pollute undo history on no-op merges', () => {
    const { result } = setup()
    act(() => result.current.addTask('Hello'))

    act(() => result.current.mergeState(result.current.tasks, [], []))
    act(() => result.current.mergeState(result.current.tasks, [], []))

    act(() => result.current.undo())
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.canUndo).toBe(false)
  })

  it('adds and toggles favorite status on collections', () => {
    const { result } = setup()
    act(() => result.current.addCollection('board', 'Project Alpha'))
    act(() => result.current.addCollection('board', 'Project Beta'))
    // addCollection prepends: [Beta, Alpha]
    const alphaId = result.current.collections[1].id
    expect(result.current.collections[1].favorite).toBe(false)

    // Favoriting pins the collection to the top and bumps updatedAt so the
    // pinned state propagates to other devices via the newest-wins sync merge.
    const originalUpdatedAt = result.current.collections[1].updatedAt ?? 0
    act(() => result.current.toggleFavoriteCollection(alphaId))
    expect(result.current.collections[0].id).toBe(alphaId)
    expect(result.current.collections[0].favorite).toBe(true)
    expect(result.current.collections[0].updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt)

    act(() => result.current.toggleFavoriteCollection(alphaId))
    const alpha = result.current.collections.find((c) => c.id === alphaId)!
    expect(alpha.favorite).toBe(false)
  })

  it('preserves favorites and pinned order through an export/import round trip', async () => {
    const { result } = setup()
    act(() => result.current.addCollection('board', 'Alpha'))
    act(() => result.current.addCollection('list', 'Beta'))
    act(() => result.current.addCollection('board', 'Gamma'))
    // Array after prepends: [Gamma, Beta, Alpha]
    const alphaId = result.current.collections.find((c) => c.name === 'Alpha')!.id
    const betaId = result.current.collections.find((c) => c.name === 'Beta')!.id
    act(() => result.current.toggleFavoriteCollection(betaId)) // [Beta(fav), Gamma, Alpha]
    act(() => result.current.toggleFavoriteCollection(alphaId)) // [Alpha(fav), Beta(fav), Gamma]

    const exported = await result.current.exportData()

    localStorage.clear()
    const { result: fresh } = setup()
    await act(async () => {
      expect(await fresh.current.importData(exported)).toBe(true)
    })
    expect(fresh.current.collections.map((c) => c.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(fresh.current.collections.map((c) => c.favorite)).toEqual([true, true, false])
  })

  it('reorders non-favorited collections while leaving favorited ones in place', () => {
    const { result } = setup()
    act(() => result.current.addCollection('board', 'B1'))
    act(() => result.current.addCollection('board', 'B2'))
    act(() => result.current.addCollection('board', 'B3'))
    // Array order after prepends: [B3, B2, B1]; favoriting B2 pins it to the front.
    act(() => result.current.toggleFavoriteCollection(result.current.collections[1].id))
    expect(result.current.collections.map((c) => c.name)).toEqual(['B2', 'B3', 'B1'])

    // Reorder the two non-favorited boards: [B1, B3]
    act(() =>
      result.current.reorderCollections('board', [
        result.current.collections[2],
        result.current.collections[1],
      ])
    )

    expect(result.current.collections.map((c) => c.name)).toEqual(['B2', 'B1', 'B3'])
    expect(result.current.collections[0].favorite).toBe(true)
  })

  it('reorders favorites independently of other collections', () => {
    const { result } = setup()
    act(() => result.current.addCollection('board', 'A'))
    act(() => result.current.addCollection('list', 'B'))
    act(() => result.current.addCollection('board', 'C'))
    // Array: [C, B, A]. Favorite C (front), then A (pins above C).
    act(() => result.current.toggleFavoriteCollection(result.current.collections[0].id))
    act(() => result.current.toggleFavoriteCollection(result.current.collections[2].id))
    expect(result.current.collections.map((c) => c.name)).toEqual(['A', 'C', 'B'])

    // Drag favorites to [C, A]: B (not favorited) stays untouched in place.
    act(() =>
      result.current.reorderFavorites([
        result.current.collections[1],
        result.current.collections[0],
      ])
    )

    expect(result.current.collections.map((c) => c.name)).toEqual(['C', 'A', 'B'])
    expect(result.current.collections[2].name).toBe('B')
    expect(result.current.collections[2].favorite).toBe(false)
  })
})
