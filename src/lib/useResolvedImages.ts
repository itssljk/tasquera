import { useEffect, useState } from 'react'
import { resolveMany } from './attachments'

/** Resolve a list of image refs (ids or inline URLs) to their data URLs. */
export function useResolvedImages(refs: string[]): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})
  const key = refs.join('\u0001')

  useEffect(() => {
    let cancelled = false
    resolveMany(refs).then((m) => {
      if (!cancelled) setMap(m)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return map
}
