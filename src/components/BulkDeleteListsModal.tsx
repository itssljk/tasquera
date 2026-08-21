import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, Task } from '../types'
import { CheckIcon, KanbanIcon, ListIcon, SearchIcon, StarFilledIcon, TrashIcon } from './icons'

interface BulkDeleteListsModalProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  tasks: Task[]
  onDeleteCollections: (ids: string[], deleteTasks?: boolean) => void
}

export default function BulkDeleteListsModal({
  isOpen,
  onClose,
  collections,
  tasks,
  onDeleteCollections,
}: BulkDeleteListsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTasks, setDeleteTasks] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [armed, setArmed] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchInputId = useId()

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
      setDeleteTasks(false)
      setFilterQuery('')
      setArmed(false)
    }
  }, [isOpen])

  // Count tasks per collection
  const taskCountByCollection = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (t.listId) {
        map.set(t.listId, (map.get(t.listId) ?? 0) + 1)
      }
    }
    return map
  }, [tasks])

  const normalizedQuery = filterQuery.trim().toLowerCase()
  const filteredCollections = useMemo(() => {
    if (!normalizedQuery) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
  }, [collections, normalizedQuery])

  // Count total tasks in selected collections
  const affectedTasksCount = useMemo(() => {
    let count = 0
    for (const id of selectedIds) {
      count += taskCountByCollection.get(id) ?? 0
    }
    return count
  }, [selectedIds, taskCountByCollection])

  const allFilteredSelected =
    filteredCollections.length > 0 && filteredCollections.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    setArmed(false)
    if (allFilteredSelected) {
      const next = new Set(selectedIds)
      for (const c of filteredCollections) {
        next.delete(c.id)
      }
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      for (const c of filteredCollections) {
        next.add(c.id)
      }
      setSelectedIds(next)
    }
  }

  const toggleItem = (id: string) => {
    setArmed(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCommitDelete = () => {
    if (selectedIds.size === 0) return
    if (!armed) {
      setArmed(true)
      return
    }
    onDeleteCollections(Array.from(selectedIds), deleteTasks)
    onClose()
  }

  // Keyboard shortcut support (Escape to close)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-[#0c0b0a]/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-paper-200/80 bg-paper-100/98 p-5 shadow-2xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="bulk-delete-title"
                className="font-sans text-display font-bold leading-tight tracking-tight text-ink-900"
              >
                Delete Lists
              </h2>
              <p className="mt-1 text-small text-ink-500">
                Select lists to remove. Contained tasks will move to Unsorted.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-paper-200 hover:text-ink-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Search Filter (if > 4 collections) */}
          {collections.length > 4 && (
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink-400" />
              <input
                ref={searchInputRef}
                id={searchInputId}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search lists…"
                aria-label="Search lists to delete"
                className="w-full rounded-xl bg-paper-200/50 py-1.5 pl-8 pr-7 text-small text-ink-900 placeholder:text-ink-400 outline-none focus:bg-paper-200/90 focus:ring-1 focus:ring-pine-500/40 transition-colors"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-micro text-ink-400 hover:text-ink-700 p-0.5 rounded cursor-pointer"
                  aria-label="Clear list search filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Action / Counter bar */}
          <div className="mt-3.5 flex items-center justify-between px-1 text-caption text-ink-400">
            <span>
              {selectedIds.size === 0
                ? `${collections.length} ${collections.length === 1 ? 'list' : 'lists'} available`
                : `${selectedIds.size} of ${collections.length} selected`}
            </span>
            {filteredCollections.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="font-medium text-pine-400 hover:text-pine-300 hover:underline transition-colors"
              >
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {/* Collections List */}
          <div className="mt-2 max-h-[260px] space-y-1 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collections.length === 0 ? (
              <p className="py-8 text-center text-small text-ink-400 italic">No lists found</p>
            ) : filteredCollections.length === 0 ? (
              <p className="py-8 text-center text-small text-ink-400 italic">No matching lists</p>
            ) : (
              filteredCollections.map((c) => {
                const isSelected = selectedIds.has(c.id)
                const count = taskCountByCollection.get(c.id) ?? 0

                return (
                  <div
                    key={c.id}
                    onClick={() => toggleItem(c.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                      isSelected
                        ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
                        : 'text-ink-600 hover:bg-paper-200/50 hover:text-ink-800'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {/* Checkbox */}
                      <div
                        className={`flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'border-pine-600 bg-pine-600 text-white'
                            : 'border-paper-300 bg-paper-100 group-hover:border-ink-400'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && <CheckIcon className="size-3 stroke-[2.8]" />}
                      </div>

                      {/* Icon */}
                      {c.defaultView === 'board' ? (
                        <KanbanIcon
                          className={`size-3.5 shrink-0 ${isSelected ? 'text-pine-400' : 'text-ink-400'}`}
                        />
                      ) : (
                        <ListIcon
                          className={`size-3.5 shrink-0 ${isSelected ? 'text-pine-400' : 'text-ink-400'}`}
                        />
                      )}

                      {/* Name */}
                      <span className="truncate text-body">{c.name}</span>
                      {c.favorite && (
                        <StarFilledIcon className="size-3 shrink-0 text-pine-400" aria-hidden="true" />
                      )}
                    </div>

                    {/* Task count badge */}
                    <span className="shrink-0 text-caption tabular-nums text-ink-400">
                      {count > 0 ? `${count} ${count === 1 ? 'task' : 'tasks'}` : 'Empty'}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Delete tasks toggle option */}
          <div
            onClick={() => {
              setDeleteTasks(!deleteTasks)
              setArmed(false)
            }}
            className="mt-3.5 flex cursor-pointer items-center justify-between rounded-xl bg-paper-200/40 p-2.5 transition-colors hover:bg-paper-200/70"
          >
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-small font-medium text-ink-900 leading-snug">
                Also delete tasks inside these lists
              </p>
              <p className="mt-0.5 text-micro text-ink-500">
                {deleteTasks
                  ? affectedTasksCount > 0
                    ? `${affectedTasksCount} ${affectedTasksCount === 1 ? 'task' : 'tasks'} will be permanently deleted`
                    : 'Tasks in selected lists will be permanently deleted'
                  : affectedTasksCount > 0
                    ? `${affectedTasksCount} ${affectedTasksCount === 1 ? 'task' : 'tasks'} will be safely moved to your Inbox`
                    : 'Tasks will be preserved and moved to your Inbox'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={deleteTasks}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTasks(!deleteTasks)
                setArmed(false)
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                deleteTasks ? 'bg-terra-600' : 'bg-paper-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  deleteTasks ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-paper-200/60 pt-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-small font-medium text-ink-500 hover:bg-paper-200 hover:text-ink-800 transition-colors"
            >
              Cancel
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleCommitDelete}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-small font-medium transition-colors shadow-2xs disabled:opacity-40 ${
                armed
                  ? 'bg-terra-600 text-white hover:bg-terra-700'
                  : 'bg-terra-600/15 text-terra-600 hover:bg-terra-600 hover:text-white border border-terra-500/20'
              }`}
            >
              <TrashIcon className="size-3.5" />
              <span>
                {armed
                  ? `Confirm Delete (${selectedIds.size})`
                  : `Delete (${selectedIds.size})`}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
