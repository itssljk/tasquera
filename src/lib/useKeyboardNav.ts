import { useEffect, useState } from 'react'
import type { Task } from '../types'

interface UseKeyboardNavProps {
  tasks: Task[]
  onToggle: (id: string) => void
  onEdit?: (task: Task) => void
  onDelete: (id: string) => void
  enabled?: boolean
}

export function useKeyboardNav({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  enabled = true,
}: UseKeyboardNavProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null)

  // Reset or clamp focusedId if tasks change and focused task no longer exists
  useEffect(() => {
    if (focusedId && !tasks.some((t) => t.id === focusedId)) {
      setFocusedId(null)
    }
  }, [tasks, focusedId])

  useEffect(() => {
    if (!enabled || tasks.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable

      if (isInput) return

      // Don't intercept if modifier keys like Cmd/Ctrl/Alt are pressed (e.g. Cmd+K, Cmd+Z)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const currentIndex = focusedId ? tasks.findIndex((t) => t.id === focusedId) : -1

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0
        const nextTask = tasks[nextIndex]
        if (nextTask) setFocusedId(nextTask.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tasks.length - 1
        const prevTask = tasks[prevIndex]
        if (prevTask) setFocusedId(prevTask.id)
      } else if (e.key === 'x') {
        if (focusedId) {
          e.preventDefault()
          onToggle(focusedId)
        }
      } else if (e.key === 'e' || (e.key === 'Enter' && focusedId)) {
        if (focusedId) {
          const currentTask = tasks.find((t) => t.id === focusedId)
          if (currentTask) {
            e.preventDefault()
            onEdit?.(currentTask)
          }
        }
      } else if (e.key === '#' || e.key === 'Delete') {
        if (focusedId) {
          e.preventDefault()
          onDelete(focusedId)
        }
      } else if (e.key === 'Escape') {
        setFocusedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, tasks, focusedId, onToggle, onEdit, onDelete])

  return {
    focusedId,
    setFocusedId,
    clearFocus: () => setFocusedId(null),
  }
}
