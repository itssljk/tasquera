import { describe, expect, it } from 'vitest'
import type { Collection, Task } from '../types'
import { searchTasks } from './search'

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    done: false,
    createdAt: 1,
    updatedAt: 1,
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
    ...overrides,
  }
}

const collections: Collection[] = [
  { id: 'work', kind: 'list', name: 'Work', createdAt: 1 },
  { id: 'home', kind: 'board', name: 'Home', createdAt: 1 },
]

describe('searchTasks', () => {
  it('returns empty for a blank query', () => {
    const tasks = [makeTask({ id: '1', title: 'Buy milk' })]
    expect(searchTasks(tasks, collections, '   ')).toEqual([])
  })

  it('matches titles case-insensitively', () => {
    const tasks = [makeTask({ id: '1', title: 'Buy MILK' })]
    const r = searchTasks(tasks, collections, 'milk')
    expect(r).toHaveLength(1)
    expect(r[0].match.field).toBe('title')
  })

  it('matches multi-word queries non-contiguously (tokenized search)', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Buy 2L organic milk from store' }),
      makeTask({ id: '2', title: 'Buy orange juice' }),
    ]
    const r = searchTasks(tasks, collections, 'buy milk')
    expect(r).toHaveLength(1)
    expect(r[0].task.id).toBe('1')
  })

  it('matches description, subtasks and links', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Plan trip', description: 'book a hotel' }),
      makeTask({ id: '2', title: 'Groceries', subtasks: [{ id: 's1', title: 'buy milk', done: false }] }),
      makeTask({ id: '3', title: 'Research', links: [{ id: 'l1', url: 'https://example.com' }] }),
    ]
    expect(searchTasks(tasks, collections, 'hotel')[0].task.id).toBe('1')
    expect(searchTasks(tasks, collections, 'milk')[0].task.id).toBe('2')
    expect(searchTasks(tasks, collections, 'example')[0].task.id).toBe('3')
  })

  it('matches by list name', () => {
    const tasks = [makeTask({ id: '1', title: 'Stuff', listId: 'work' })]
    const r = searchTasks(tasks, collections, 'work')
    expect(r).toHaveLength(1)
    expect(r[0].match.field).toBe('list')
    expect(r[0].listName).toBe('Work')
  })

  it('excludes archived tasks by default unless requested', () => {
    const tasks = [makeTask({ id: '1', title: 'Milk', archived: true })]
    expect(searchTasks(tasks, collections, 'milk')).toEqual([])
    expect(searchTasks(tasks, collections, 'milk is:archived')).toHaveLength(1)
    expect(searchTasks(tasks, collections, 'milk', { includeArchived: true })).toHaveLength(1)
  })

  it('supports operators is:done and p:urgent', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Buy milk', done: true, priority: 'urgent' }),
      makeTask({ id: '2', title: 'Buy bread', done: false, priority: 'urgent' }),
      makeTask({ id: '3', title: 'Buy eggs', done: true, priority: 'low' }),
    ]
    const doneUrgent = searchTasks(tasks, collections, 'is:done p:urgent')
    expect(doneUrgent).toHaveLength(1)
    expect(doneUrgent[0].task.id).toBe('1')
  })

  it('ranks title matches first and open tasks before done', () => {
    const tasks = [
      makeTask({ id: '1', title: 'unrelated', subtasks: [{ id: 's1', title: 'alpha', done: false }], createdAt: 3 }),
      makeTask({ id: '2', title: 'alpha task', createdAt: 2 }),
      makeTask({ id: '3', title: 'alpha done', done: true, status: 'done', createdAt: 4 }),
    ]
    const r = searchTasks(tasks, collections, 'alpha')
    expect(r.map((x) => x.task.id)).toEqual(['2', '1', '3'])
  })
})
