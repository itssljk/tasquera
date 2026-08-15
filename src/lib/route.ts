import { useEffect, useState } from 'react'
import type { Collection, Route, Task } from '../types'

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').split('?')[0]
  const [seg, id] = h.split('/')
  switch (seg) {
    case 'today':
      return { name: 'today' }
    case 'upcoming':
      return { name: 'upcoming' }
    case 'calendar':
      return { name: 'calendar' }
    case 'completed':
      return { name: 'completed' }
    case 'archive':
      return { name: 'archive' }
    case 'settings':
      return { name: 'settings' }
    case 'tos':
    case 'terms':
      return { name: 'tos' }
    case 'privacy':
      return { name: 'privacy' }
    case 'licenses':
    case 'license':
    case 'legal':
      return { name: 'licenses' }
    case 'search':
      return { name: 'search' }
    case 'board':
      return id ? { name: 'collection', id, kind: 'board' } : { name: 'inbox' }
    case 'list':
      return id ? { name: 'collection', id, kind: 'list' } : { name: 'inbox' }
    default:
      return { name: 'inbox' }
  }
}

export function routeHref(route: Route): string {
  if (route.name === 'collection') return `#/${route.kind}/${route.id}`
  return `#/${route.name}`
}

export function getTaskLocationHref(task: Task, collections: Collection[]): string {
  if (task.archived) return '#/archive'
  if (task.listId) {
    const col = collections.find((c) => c.id === task.listId)
    if (col) return `#/${col.kind}/${col.id}`
  }
  if (task.done) return '#/completed'
  return '#/inbox'
}

export function getTaskLocationLabel(task: Task, collections: Collection[]): string {
  if (task.archived) return 'Archive'
  if (task.listId) {
    const col = collections.find((c) => c.id === task.listId)
    if (col) return col.name
  }
  if (task.done) return 'Completed'
  return 'Inbox'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
