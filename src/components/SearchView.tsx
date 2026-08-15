import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, MenuState, Task } from '../types'
import { searchTasks } from '../lib/search'
import { getTaskLocationHref, getTaskLocationLabel } from '../lib/route'
import {
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  ExternalLinkIcon,
  FlagIcon,
  ImageIcon,
  LinkIcon,
  NotesIcon,
  SearchIcon,
  SubtaskIcon,
} from './icons'
import { formatDeadline, formatDue, isDeadlineOverdue, isOverdue } from '../lib/date'

interface SearchViewProps {
  tasks: Task[]
  collections: Collection[]
  menu: MenuState
  onMenu: (menu: MenuState) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onEditDetails: (task: Task) => void
}

function HighlightedText({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms || terms.length === 0 || !text) return <>{text}</>
  const cleanTerms = terms.map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (cleanTerms.length === 0) return <>{text}</>

  const escaped = cleanTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  if (!escaped) return <>{text}</>
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        cleanTerms.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-pine-500/25 px-0.5 text-ink-900 underline decoration-pine-500/50">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function SearchResultItem({
  task,
  match,
  matchedTerms,
  collections,
  onTeleport,
}: {
  task: Task
  match: { field: string; snippet: string }
  matchedTerms?: string[]
  collections: Collection[]
  onTeleport: (task: Task) => void
}) {
  const locationLabel = getTaskLocationLabel(task, collections)
  const locationHref = getTaskLocationHref(task, collections)

  const subtasksCount = task.subtasks?.length ?? 0
  const subtasksDoneCount = task.subtasks?.filter((s) => s.done).length ?? 0
  const linksCount = task.links?.length ?? 0
  const imagesCount = task.images?.length ?? 0

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="group relative cursor-pointer rounded-xl bg-paper-100/90 p-3.5 transition-all duration-150 hover:bg-paper-200/80 active:bg-paper-200"
      onClick={() => onTeleport(task)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-[16px] font-medium leading-snug ${task.done ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
              <HighlightedText text={task.title} terms={matchedTerms} />
            </h3>
            {task.archived && (
              <span className="rounded bg-paper-300/60 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-500">
                Archived
              </span>
            )}
            {task.done && (
              <span className="rounded bg-pine-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-pine-400">
                Done
              </span>
            )}
          </div>

          {/* Match snippet preview when matched on non-title field */}
          {match.field !== 'title' && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-700">
              <span className="shrink-0 font-medium text-ink-500 capitalize">{match.field}:</span>
              <span className="truncate italic text-ink-700">
                “<HighlightedText text={match.snippet} terms={matchedTerms} />”
              </span>
            </div>
          )}

          {/* Metadata badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-ink-500">
            {/* Location pill */}
            <a
              href={locationHref}
              onClick={(e) => {
                e.stopPropagation()
                onTeleport(task)
              }}
              className="inline-flex items-center gap-1 rounded-md bg-paper-200/90 px-2 py-0.5 text-[11px] font-semibold text-pine-400 transition-colors group-hover:bg-pine-500/15"
            >
              <span>In {locationLabel}</span>
              <ExternalLinkIcon className="size-3 stroke-[2.2]" />
            </a>

            {/* Priority pill */}
            {task.priority && task.priority !== 'medium' && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${
                  task.priority === 'urgent'
                    ? 'bg-terra-600/20 text-terra-600'
                    : task.priority === 'high'
                      ? 'bg-amber-600/15 text-amber-600'
                      : 'bg-slateblue-600/15 text-slateblue-600'
                }`}
              >
                <FlagIcon className="size-3" />
                {task.priority}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && !task.done && (
              <span className={`inline-flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-terra-600 font-semibold' : 'text-ink-500'}`}>
                <CalendarIcon className="size-3 text-pine-600" />
                {formatDue(task.dueDate)}
              </span>
            )}

            {/* Deadline */}
            {task.deadline && !task.done && (
              <span className={`inline-flex items-center gap-1 font-medium ${isDeadlineOverdue(task.deadline) ? 'text-terra-600 font-semibold' : 'text-amber-600'}`}>
                <ClockIcon className="size-3" />
                {formatDeadline(task.deadline)}
              </span>
            )}

            {/* Subtasks badge */}
            {subtasksCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-paper-200/70 px-2 py-0.5 text-[11px]">
                <SubtaskIcon className="size-3 text-pine-600" />
                <span>{subtasksDoneCount}/{subtasksCount}</span>
              </span>
            )}

            {/* Note badge */}
            {task.description && (
              <span className="inline-flex items-center gap-1 rounded-md bg-paper-200/70 px-2 py-0.5 text-[11px]">
                <NotesIcon className="size-3 text-ink-500" />
                <span>Note</span>
              </span>
            )}

            {/* Links count */}
            {linksCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-pine-500/15 px-2 py-0.5 text-[11px] font-medium text-pine-400">
                <LinkIcon className="size-3" />
                <span>{linksCount} link{linksCount > 1 ? 's' : ''}</span>
              </span>
            )}

            {/* Images count */}
            {imagesCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slateblue-600/10 px-2 py-0.5 text-[11px] text-slateblue-600">
                <ImageIcon className="size-3" />
                <span>{imagesCount} photo{imagesCount > 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  )
}

export default function SearchView(props: SearchViewProps) {
  const { tasks, collections, onEditDetails } = props

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'archived' | 'urgent' | 'high'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const effectiveQuery = useMemo(() => {
    let q = query.trim()
    if (activeFilter === 'active' && !q.includes('is:open') && !q.includes('is:todo')) {
      q = q ? `${q} is:open` : 'is:open'
    } else if (activeFilter === 'completed' && !q.includes('is:done')) {
      q = q ? `${q} is:done` : 'is:done'
    } else if (activeFilter === 'archived' && !q.includes('is:archived')) {
      q = q ? `${q} is:archived` : 'is:archived'
    } else if (activeFilter === 'urgent' && !q.includes('p:urgent')) {
      q = q ? `${q} p:urgent` : 'p:urgent'
    } else if (activeFilter === 'high' && !q.includes('p:high')) {
      q = q ? `${q} p:high` : 'p:high'
    }
    return q
  }, [query, activeFilter])

  const results = useMemo(
    () => searchTasks(tasks, collections, effectiveQuery, { includeArchived: activeFilter === 'archived' }),
    [tasks, collections, effectiveQuery, activeFilter]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (query) {
        setQuery('')
      } else {
        inputRef.current?.blur()
      }
    }
  }

  const handleTeleport = (task: Task) => {
    const href = getTaskLocationHref(task, collections)
    window.location.hash = href
    // Optionally open details modal for quick inspection
    onEditDetails(task)
  }

  const filterChips: { id: typeof activeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archived' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'high', label: 'High Priority' },
  ]

  return (
    <div className="mt-2 max-w-2xl">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, notes, subtasks, links (e.g. 'milk', 'is:done', 'p:high')..."
          aria-label="Search"
          className="w-full rounded-xl bg-paper-100 py-3 pl-10 pr-10 text-[15px] text-ink-900 outline-none ring-1 ring-paper-300/60 transition-all focus:ring-2 focus:ring-pine-500/40 placeholder:text-ink-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-paper-200 hover:text-ink-900 transition-colors"
            aria-label="Clear search query"
          >
            <CloseIcon className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id)}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-all ${
                isActive
                  ? 'bg-pine-600 text-[#fbf9f5] shadow-2xs'
                  : 'bg-paper-100 text-ink-500 hover:bg-paper-200 hover:text-ink-700'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {query.trim() === '' && activeFilter === 'all' ? (
          <div className="py-16 text-center text-ink-500">
            <p className="text-[14px]">Type to search across all your tasks, notes, subtasks, and links.</p>
            <p className="mt-2 text-[12.5px] text-ink-400">
              Tips: Try searching multi-word phrases, or filters like <code className="rounded bg-paper-200 px-1 py-0.5 text-pine-400 font-mono text-[11.5px]">is:done</code>, <code className="rounded bg-paper-200 px-1 py-0.5 text-pine-400 font-mono text-[11.5px]">p:urgent</code>, or <code className="rounded bg-paper-200 px-1 py-0.5 text-pine-400 font-mono text-[11.5px]">is:archived</code>.
            </p>
          </div>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[13.5px] text-ink-500">
            No matching tasks found {query.trim() ? `for “${query.trim()}”` : ''}.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12.5px] font-medium uppercase tracking-[0.16em] text-ink-500">
                {results.length} result{results.length === 1 ? '' : 's'}
              </p>
              <span className="text-[12px] text-ink-400">Click result to teleport to location</span>
            </div>
            <ul className="space-y-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {results.map((r) => (
                  <SearchResultItem
                    key={r.task.id}
                    task={r.task}
                    match={r.match}
                    matchedTerms={r.matchedTerms}
                    collections={collections}
                    onTeleport={handleTeleport}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
