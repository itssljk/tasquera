import { useEffect, useState } from 'react'
import type { Route } from '../types'

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
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

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
