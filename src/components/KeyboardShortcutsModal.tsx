import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRINGS } from '../lib/motion'
import { isMac, getSearchShortcut } from '../lib/platform'
import { CloseIcon } from './icons'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  name: string
  items: { keys: string[]; label: string }[]
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const searchKey = getSearchShortcut()
  const undoKey = isMac() ? '⌘Z' : 'Ctrl+Z'
  const redoKey = isMac() ? '⇧⌘Z' : 'Ctrl+Y'

  const groups: ShortcutGroup[] = [
    {
      name: 'Task Capture & Creation',
      items: [
        { keys: ['/', 'c'], label: 'Quick-add task / column card' },
        { keys: ['Enter'], label: 'Save task & keep adding' },
        { keys: ['Shift', 'Enter'], label: 'Expand to full task editor' },
        { keys: ['Esc'], label: 'Cancel draft or close view' },
      ],
    },
    {
      name: 'Navigation & Views',
      items: [
        { keys: ['1'], label: 'Go to Inbox' },
        { keys: ['2'], label: 'Go to Today' },
        { keys: ['3'], label: 'Go to Upcoming' },
        { keys: [searchKey], label: 'Search & Command Palette' },
        { keys: ['j', 'k'], label: 'Move focus up / down' },
      ],
    },
    {
      name: 'Task Actions',
      items: [
        { keys: ['x'], label: 'Toggle completed / todo' },
        { keys: ['e'], label: 'Open full task details' },
        { keys: ['Delete'], label: 'Delete selected task' },
        { keys: ['Shift', 'Click'], label: 'Multi-select tasks' },
        { keys: [undoKey], label: 'Undo previous action' },
        { keys: [redoKey], label: 'Redo previous action' },
      ],
    },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={SPRINGS.snappy}
          className="relative w-full max-w-lg rounded-2xl bg-paper-100 p-6 shadow-2xl border border-paper-200/80 z-10 max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-paper-200/50">
            <div>
              <h2 className="text-body-lg font-bold text-ink-900 leading-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-small text-ink-500 mt-0.5">
                Tactile velocity for keyboard-first triage
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-paper-200 hover:text-ink-800 transition-colors cursor-pointer"
              aria-label="Close keyboard shortcuts"
            >
              <CloseIcon className="size-4.5" />
            </button>
          </div>

          {/* Shortcut Groups */}
          <div className="mt-5 space-y-6">
            {groups.map((group) => (
              <div key={group.name} className="space-y-2">
                <h3 className="text-caption font-semibold uppercase tracking-wider text-ink-400 px-1">
                  {group.name}
                </h3>
                <div className="rounded-xl bg-paper-50/60 p-2.5 space-y-1.5 border border-paper-200/40">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 py-1 px-1.5 text-body"
                    >
                      <span className="text-ink-700 text-small sm:text-body">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <span key={kIdx} className="flex items-center gap-1">
                            <kbd className="rounded-md bg-paper-200 px-2 py-0.5 font-mono text-caption font-semibold text-ink-700 shadow-2xs border border-paper-300/60">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-micro text-ink-400">then</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Hint */}
          <div className="mt-6 pt-3 border-t border-paper-200/50 flex items-center justify-between text-caption text-ink-400">
            <span>Press <kbd className="rounded bg-paper-200 px-1.5 py-0.5 font-mono font-medium text-ink-600">?</kbd> anywhere to view this cheat sheet</span>
            <span>Press <kbd className="rounded bg-paper-200 px-1.5 py-0.5 font-mono font-medium text-ink-600">Esc</kbd> to exit</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
