import { describe, expect, it } from 'vitest'
import type { Collection, Task } from '../types'
import { getTaskLocationHref, getTaskLocationLabel, parseRoute, routeHref } from './route'

const collections: Collection[] = [
  { id: 'c1', kind: 'list', name: 'Work', createdAt: 1 },
  { id: 'c2', kind: 'board', name: 'Projects', createdAt: 1 },
]

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    title: 'Test',
    done: false,
    createdAt: 1,
    completedAt: null,
    listId: null,
    dueDate: null,
    status: 'todo',
    ...overrides,
  }
}

describe('parseRoute', () => {
  it('defaults to inbox', () => {
    expect(parseRoute('')).toEqual({ name: 'inbox' })
    expect(parseRoute('#/')).toEqual({ name: 'inbox' })
    expect(parseRoute('#/unknown')).toEqual({ name: 'inbox' })
  })

  it('parses named routes', () => {
    expect(parseRoute('#/today')).toEqual({ name: 'today' })
    expect(parseRoute('#/upcoming')).toEqual({ name: 'upcoming' })
    expect(parseRoute('#/calendar')).toEqual({ name: 'calendar' })
    expect(parseRoute('#/completed')).toEqual({ name: 'completed' })
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' })
  })

  it('parses legal routes', () => {
    expect(parseRoute('#/tos')).toEqual({ name: 'tos' })
    expect(parseRoute('#/terms')).toEqual({ name: 'tos' })
    expect(parseRoute('#/privacy')).toEqual({ name: 'privacy' })
  })

  it('parses collections by kind and generic collection route', () => {
    expect(parseRoute('#/collection/abc')).toEqual({ name: 'collection', id: 'abc', kind: 'list' })
    expect(parseRoute('#/board/abc')).toEqual({ name: 'collection', id: 'abc', kind: 'board' })
    expect(parseRoute('#/list/abc')).toEqual({ name: 'collection', id: 'abc', kind: 'list' })
    expect(parseRoute('#/collection')).toEqual({ name: 'inbox' })
    expect(parseRoute('#/board')).toEqual({ name: 'inbox' })
  })
})

describe('routeHref', () => {
  it('builds hrefs for named routes', () => {
    expect(routeHref({ name: 'inbox' })).toBe('#/inbox')
    expect(routeHref({ name: 'today' })).toBe('#/today')
  })

  it('builds collection hrefs', () => {
    expect(routeHref({ name: 'collection', id: 'abc', kind: 'board' })).toBe('#/collection/abc')
    expect(routeHref({ name: 'collection', id: 'abc', kind: 'list' })).toBe('#/collection/abc')
  })
})

describe('getTaskLocationHref & getTaskLocationLabel', () => {
  it('returns collection route when task has listId', () => {
    const tList = makeTask({ listId: 'c1' })
    const tBoard = makeTask({ listId: 'c2' })
    expect(getTaskLocationHref(tList, collections)).toBe('#/collection/c1')
    expect(getTaskLocationLabel(tList, collections)).toBe('Work')
    expect(getTaskLocationHref(tBoard, collections)).toBe('#/collection/c2')
    expect(getTaskLocationLabel(tBoard, collections)).toBe('Projects')
  })

  it('returns completed route when done without collection', () => {
    const t = makeTask({ done: true })
    expect(getTaskLocationHref(t, collections)).toBe('#/completed')
    expect(getTaskLocationLabel(t, collections)).toBe('Completed')
  })

  it('returns inbox route when active without collection', () => {
    const t = makeTask({ done: false, listId: null })
    expect(getTaskLocationHref(t, collections)).toBe('#/inbox')
    expect(getTaskLocationLabel(t, collections)).toBe('Inbox')
  })
})
