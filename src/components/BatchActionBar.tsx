import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection } from '../types'
import { CalendarIcon, CheckIcon, CloseIcon, ListIcon, TrashIcon } from './icons'
import { todayISO, addDaysISO } from '../lib/date'

interface BatchActionBarProps {
  selectedCount: number
  collections: Collection[]
  onMarkDone: () => void
  onMarkTodo?: () => void
  onReschedule: (dueDate: string | null) => void
  onMoveToList: (listId: string | null) => void
  onDelete: () => void
  onClearSelection: () => void
}

export default function BatchActionBar({
  selectedCount,
  collections,
  onMarkDone,
  onMarkTodo,
  onReschedule,
  onMoveToList,
  onDelete,
  onClearSelection,
}: BatchActionBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showDateMenu, setShowDateMenu] = useState(false)

  if (selectedCount === 0) return null

  const today = todayISO()
  const tomorrow = addDaysISO(today, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className="fixed bottom-20 md:bottom-8 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-paper-200/90 bg-paper-100/98 px-4 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl text-ink-900 text-small"
    >
      <div className="flex items-center gap-2 pr-2 border-r border-paper-200">
        <span className="font-semibold text-ink-900 tabular-nums">{selectedCount}</span>
        <span className="text-ink-500 font-medium">selected</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Complete */}
        <button
          type="button"
          onClick={onMarkDone}
          title="Mark selected as completed"
          className="inline-flex items-center gap-1.5 rounded-xl bg-paper-200/60 px-3 py-1.5 text-small font-medium text-ink-700 hover:bg-pine-600 hover:text-paper-50 transition-colors cursor-pointer"
        >
          <CheckIcon className="size-3.5" />
          <span className="hidden sm:inline">Complete</span>
        </button>

        {onMarkTodo && (
          <button
            type="button"
            onClick={onMarkTodo}
            title="Mark selected as incomplete"
            className="inline-flex items-center gap-1.5 rounded-xl bg-paper-200/60 px-3 py-1.5 text-small font-medium text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">To Do</span>
          </button>
        )}

        {/* Schedule Menu Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowDateMenu(!showDateMenu)
              setShowMoveMenu(false)
            }}
            title="Reschedule selected tasks"
            className="inline-flex items-center gap-1.5 rounded-xl bg-paper-200/60 px-3 py-1.5 text-small font-medium text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition-colors cursor-pointer"
          >
            <CalendarIcon className="size-3.5 text-pine-500" />
            <span className="hidden sm:inline">Due Date</span>
          </button>

          <AnimatePresence>
            {showDateMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-paper-200 bg-paper-100 p-1.5 shadow-xl text-left"
              >
                <button
                  type="button"
                  onClick={() => {
                    onReschedule(today)
                    setShowDateMenu(false)
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-small text-ink-800 hover:bg-paper-200 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReschedule(tomorrow)
                    setShowDateMenu(false)
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-small text-ink-800 hover:bg-paper-200 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReschedule(null)
                    setShowDateMenu(false)
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-small text-ink-500 hover:bg-paper-200 hover:text-terra-600 cursor-pointer"
                >
                  No Date (Clear)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Move Menu Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMoveMenu(!showMoveMenu)
              setShowDateMenu(false)
            }}
            title="Move to list"
            className="inline-flex items-center gap-1.5 rounded-xl bg-paper-200/60 px-3 py-1.5 text-small font-medium text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition-colors cursor-pointer"
          >
            <ListIcon className="size-3.5" />
            <span className="hidden sm:inline">Move</span>
          </button>

          <AnimatePresence>
            {showMoveMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-48 max-h-56 overflow-y-auto rounded-xl border border-paper-200 bg-paper-100 p-1.5 shadow-xl text-left"
              >
                <button
                  type="button"
                  onClick={() => {
                    onMoveToList(null)
                    setShowMoveMenu(false)
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-small text-ink-800 hover:bg-paper-200 cursor-pointer"
                >
                  Inbox
                </button>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onMoveToList(c.id)
                      setShowMoveMenu(false)
                    }}
                    className="w-full truncate rounded-lg px-2.5 py-1.5 text-left text-small text-ink-800 hover:bg-paper-200 cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete selected tasks"
          className="inline-flex items-center gap-1.5 rounded-xl bg-terra-600/15 px-3 py-1.5 text-small font-medium text-terra-600 hover:bg-terra-600 hover:text-white transition-colors cursor-pointer"
        >
          <TrashIcon className="size-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Clear selection"
          className="rounded-xl p-1.5 text-ink-400 hover:bg-paper-200 hover:text-ink-900 transition-colors cursor-pointer"
        >
          <CloseIcon className="size-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
