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
})
