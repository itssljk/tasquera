import { useState } from 'react'
import type { MouseEvent } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { useLongPressDrag } from '../lib/useLongPressDrag'
import { ImageThumbs } from './ImageThumbs'
import { formatDate, formatDue, formatDeadline, isOverdue, isDeadlineOverdue } from '../lib/date'
import { recurrenceLabel } from '../lib/recurrence'
import type { Collection, Task } from '../types'
import { triggerTaskConfetti } from '../lib/confetti'
import {
  ArchiveIcon,
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CloseIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  FlagIcon,
  ImageIcon,
  LinkIcon,
  NotesIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  SubtaskIcon,
  TrashIcon,
} from './icons'

function CheckCircle({ done, status }: { done: boolean; status?: string }) {
  const isDone = done || status === 'done'
  const isInProgress = !isDone && status === 'in_progress'

  return (
    <motion.svg
      viewBox="0 0 22 22"
      className="size-[22px]"
      aria-hidden="true"
      whileTap={{ scale: 0.84 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      <motion.circle
        cx="11"
        cy="11"
        r="8.75"
        fill={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent'}
        stroke={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)'}
        strokeWidth="2"
        animate={{
          scale: isDone ? [1, 1.18, 1] : 1,
          fill: isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent',
          stroke: isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)',
        }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      />
      {isDone ? (
        <motion.path
          d="M6.75 11.5l2.9 2.9 5.6-5.8"
          fill="none"
          stroke="#FBF9F5"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: 1,
            opacity: 1,
          }}
          transition={{
            pathLength: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.1 },
          }}
        />
      ) : isInProgress ? (
        <circle cx="11" cy="11" r="3.2" fill="#FBF9F5" />
      ) : null}
    </motion.svg>
  )
}

interface TaskRowProps {
  task: Task
  done: boolean
  collections: Collection[]
  reorderable: boolean
  menuOpen: boolean
  meta?: string
  onToggleMenu: (id: string | null) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onArchive: (id: string) => void
  onRestore?: (id: string) => void
  onEditDetails?: (task: Task) => void
}

export default function TaskRow(props: TaskRowProps) {
  const {
    task,
    done,
    collections,
    reorderable,
    menuOpen,
    meta,
    onToggleMenu,
    onToggle,
    onDelete,
    onUpdate,
    onMove,
    onArchive,
    onRestore,
    onEditDetails,
  } = props

  const boards = collections.filter((c) => c.kind === 'board')
  const lists = collections.filter((c) => c.kind === 'list')

  const [expanded, setExpanded] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')
  const longPress = useLongPressDrag()
  const { isTouch, isDragging } = longPress

  const close = () => onToggleMenu(null)

  const handleMenuClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!menuOpen) {
      const rect = e.currentTarget.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 340 && rect.top > 340) {
        setMenuDirection('up')
      } else {
        setMenuDirection('down')
      }
    }
    onToggleMenu(menuOpen ? null : task.id)
  }

  const handleToggleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (task.status === 'in_progress') {
      triggerTaskConfetti(e.currentTarget)
    }
    onToggle(task.id)
  }

  const handleToggleSubtask = (e: MouseEvent, subtaskId: string) => {
    e.stopPropagation()
    if (!task.subtasks) return
    const newSubtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
    const allDone = newSubtasks.length > 0 && newSubtasks.every((s) => s.done)
    let newStatus = task.status
    if (allDone) {
      newStatus = 'done'
      triggerTaskConfetti(e.currentTarget as HTMLElement)
    } else if (task.status === 'done' && !allDone) {
      newStatus = 'in_progress'
    }
    onUpdate(task.id, {
      subtasks: newSubtasks,
      status: newStatus,
      done: newStatus === 'done',
    })
  }

  const handleAddSubtaskInline = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    const newSub = { id: String(Date.now()), title: trimmed, done: false }
    const updated = [...(task.subtasks || []), newSub]
    onUpdate(task.id, { subtasks: updated })
    setNewSubtaskTitle('')
  }

  const handleAddLinkInline = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLinkUrl.trim()) return
    const newLink = { id: String(Date.now()), url: newLinkUrl.trim(), title: newLinkTitle.trim() || undefined }
    onUpdate(task.id, { links: [...(task.links || []), newLink] })
    setNewLinkUrl('')
    setNewLinkTitle('')
    setShowAddLink(false)
  }

  const subtasksCount = task.subtasks?.length ?? 0
  const subtasksDoneCount = task.subtasks?.filter((s) => s.done).length ?? 0
  const linksCount = task.links?.length ?? 0
  const imagesCount = task.images?.length ?? 0

  const rowTransition: Transition = {
    layout: { type: 'spring', stiffness: 400, damping: 30 },
    opacity: { duration: 0.18 },
    scale: { duration: 0.18 },
  }

  const rowClass = `group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ${
    done ? '' : 'hover:bg-paper-100'
  } ${reorderable && !done ? (isTouch ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing') : ''} ${
    menuOpen ? 'z-50' : 'z-0'
  } ${isDragging ? 'opacity-60' : ''}`

  const rowMotionProps = {
    layout: true as const,
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.96, height: 0, marginTop: 0, marginBottom: 0 },
    transition: rowTransition,
    style: { zIndex: menuOpen ? 60 : undefined },
  }

  const rowContent = (
    <>
      <button
        type="button"
        onClick={handleToggleClick}
        aria-label={
          done
            ? `Move “${task.title}” back to To Do`
            : task.status === 'in_progress'
              ? `Move “${task.title}” to Done`
              : `Move “${task.title}” to In Progress`
        }
        aria-pressed={done}
        className="mt-0.5 shrink-0 rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600"
      >
        <CheckCircle done={done} status={task.status} />
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEditDetails?.(task)}>
        <motion.p
          animate={{
            color: done ? 'var(--color-ink-500)' : 'var(--color-ink-900)',
          }}
          transition={{ duration: 0.2 }}
          className="relative break-words text-[16.5px] leading-snug"
        >
          {task.title}
          {done && (
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-[52%] h-[1.5px] w-full origin-left bg-ink-500/80"
            />
          )}
        </motion.p>

        {/* Metadata Indicators Badges */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] font-medium">
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

          {/* Recurrence badge */}
          {task.recurrence && !done && (
            <span className="inline-flex items-center gap-1 rounded-md bg-pine-500/10 px-2 py-0.5 text-[11px] font-medium text-pine-600">
              <RepeatIcon className="size-3" />
              {recurrenceLabel(task.recurrence)}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && !done && (
            <span className={`inline-flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-terra-600 font-semibold' : 'text-ink-500'}`}>
              <CalendarIcon className="size-3 text-pine-600" />
              {formatDue(task.dueDate)}
            </span>
          )}

          {/* Deadline */}
          {task.deadline && !done && (
            <span className={`inline-flex items-center gap-1 font-medium ${isDeadlineOverdue(task.deadline) ? 'text-terra-600 font-semibold' : 'text-amber-600'}`}>
              <ClockIcon className="size-3" />
              {formatDeadline(task.deadline)}
            </span>
          )}

          {/* Subtasks progress badge */}
          {subtasksCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="inline-flex items-center gap-1 text-ink-600 bg-paper-200/80 hover:bg-paper-200 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            >
              <SubtaskIcon className="size-3 text-pine-600" />
              <span>{subtasksDoneCount}/{subtasksCount}</span>
            </button>
          )}

          {/* Description note icon badge */}
          {task.description && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="inline-flex items-center gap-1 text-ink-600 bg-paper-200/80 hover:bg-paper-200 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            >
              <NotesIcon className="size-3 text-ink-500" />
              <span>Note</span>
            </button>
          )}

          {/* Links icon badge */}
          {linksCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="inline-flex items-center gap-1 text-pine-600 bg-pine-500/10 hover:bg-pine-500/20 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            >
              <LinkIcon className="size-3" />
              <span>{linksCount} link{linksCount > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Images icon badge */}
          {imagesCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="inline-flex items-center gap-1 text-slateblue-600 bg-slateblue-600/10 hover:bg-slateblue-600/20 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            >
              <ImageIcon className="size-3" />
              <span>{imagesCount} photo{imagesCount > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Details toggle badge - only show if there are details to expand */}
          {(task.description || subtasksCount > 0 || linksCount > 0 || imagesCount > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                expanded ? 'bg-pine-500/15 text-pine-600' : 'bg-paper-200/80 text-ink-600 hover:bg-paper-200'
              }`}
            >
              <ChevronIcon className={`size-3 transition-transform duration-200 ${expanded ? 'rotate-90 text-pine-600' : ''}`} />
              <span>{expanded ? 'Hide details' : 'Details'}</span>
            </button>
          )}

          {done && task.completedAt && <span className="text-ink-400">Completed {formatDate(task.completedAt)}</span>}
          {meta && <span className="text-ink-400">{meta}</span>}
        </div>

        {/* Details Content Drawer */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div
                className="mt-3 space-y-3.5 rounded-xl bg-paper-200/40 p-3.5 text-[13px] border border-paper-200/70 shadow-2xs"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Description */}
              {task.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Description</span>
                  <p className="text-[13.5px] leading-relaxed text-ink-800 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Subtasks Section with Animated Progress Bar & Inline Adder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    Subtasks {subtasksCount > 0 && `(${subtasksDoneCount}/${subtasksCount})`}
                  </span>
                  {subtasksCount > 0 && (
                    <span className="text-[11px] font-semibold text-pine-600">
                      {Math.round((subtasksDoneCount / subtasksCount) * 100)}%
                    </span>
                  )}
                </div>

                {subtasksCount > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
                    <motion.div
                      className="h-full rounded-full bg-pine-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((subtasksDoneCount / subtasksCount) * 100)}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {subtasksCount > 0 && (
                  <div className="space-y-1 pt-1">
                    {task.subtasks?.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[13px] py-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSubtask(e, s.id)}
                          className={`flex size-4 shrink-0 items-center justify-center rounded transition-colors ${
                            s.done ? 'bg-pine-600 text-paper-50' : 'border border-ink-400/50 hover:border-pine-500'
                          }`}
                        >
                          {s.done && <CheckIcon className="size-2.5" />}
                        </button>
                        <span className={s.done ? 'line-through text-ink-400' : 'text-ink-900'}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Subtask Form */}
                <form onSubmit={handleAddSubtaskInline} className="flex items-center gap-1.5 pt-1">
                  <PlusIcon className="size-3.5 shrink-0 text-ink-400" />
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add subtask (press Enter)…"
                    className="w-full bg-transparent text-[12.5px] text-ink-900 placeholder:text-ink-400 outline-none"
                  />
                </form>
              </div>

              {/* Links Section */}
              <div className="space-y-2 pt-1 border-t border-paper-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Links</span>
                  {!showAddLink && (
                    <button
                      type="button"
                      onClick={() => setShowAddLink(true)}
                      className="text-[11px] font-medium text-pine-400 hover:text-pine-300 inline-flex items-center gap-0.5"
                    >
                      <PlusIcon className="size-3" />
                      <span>Add link</span>
                    </button>
                  )}
                </div>

                {linksCount > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.links?.map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-paper-100 px-2.5 py-1.5 text-[12px] font-medium text-pine-600 shadow-2xs hover:bg-pine-500/10 transition-colors"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                        <span>{l.title || l.url}</span>
                      </a>
                    ))}
                  </div>
                )}

                {showAddLink && (
                  <form onSubmit={handleAddLinkInline} className="space-y-1.5 rounded-lg bg-paper-100 p-2 border border-paper-200">
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                      autoFocus
                      className="w-full bg-transparent text-[12px] text-ink-900 outline-none placeholder:text-ink-400"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full bg-transparent text-[12px] text-ink-900 outline-none placeholder:text-ink-400"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowAddLink(false)}
                          className="px-2 py-0.5 text-[11px] text-ink-500 hover:text-ink-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newLinkUrl.trim()}
                          className="rounded bg-pine-600 px-2 py-0.5 text-[11px] font-medium text-paper-50 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Images Section */}
              {imagesCount > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-paper-200/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Images</span>
                  <ImageThumbs refs={task.images ?? []} onPreview={setLightboxImage} imgClassName="size-16" />
                </div>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {(task.description || subtasksCount > 0 || linksCount > 0 || imagesCount > 0) && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Hide task details' : 'Show task details'}
            title={expanded ? 'Hide details' : 'Show details'}
            className={`rounded-lg p-1.5 transition-all duration-150 ${
              expanded ? 'bg-paper-200 text-pine-600' : 'text-ink-400 hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100'
            }`}
          >
            <ChevronIcon className={`size-[18px] transition-transform duration-200 ${expanded ? 'rotate-90 text-pine-600' : ''}`} />
          </motion.button>
        )}
        <div className="relative">
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleMenuClick}
            aria-label={`Actions for “${task.title}”`}
            aria-expanded={menuOpen}
            className="rounded-lg p-1.5 text-ink-400 transition-all duration-150 hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
          >
            <EllipsisVerticalIcon className="size-[18px]" />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: menuDirection === 'up' ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: menuDirection === 'up' ? 4 : -4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                style={{ transformOrigin: menuDirection === 'up' ? 'bottom right' : 'top right' }}
                className={`absolute right-0 z-50 w-64 max-h-[min(340px,75vh)] overflow-y-auto rounded-2xl bg-paper-50/95 p-2 shadow-2xl backdrop-blur-md border border-paper-200/90 text-[13px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                  menuDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                }`}
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
            {onEditDetails && (
              <>
                <button
                  onClick={() => {
                    onEditDetails(task)
                    close()
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-pine-600 hover:bg-pine-500/10 transition-colors"
                >
                  <PencilIcon className="size-3.5" />
                  <span>Edit details...</span>
                </button>
                <div className="mx-2 my-1.5 h-px bg-paper-200/60" />
              </>
            )}

            {/* Status Switcher */}
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Status</p>
            <div className="grid grid-cols-3 gap-1 px-1 pb-2">
              <button
                type="button"
                onClick={() => {
                  onUpdate(task.id, { status: 'todo', done: false, completedAt: null })
                  close()
                }}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                  !task.done && (task.status === 'todo' || !task.status)
                    ? 'bg-paper-200 text-ink-900 font-semibold shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-100'
                }`}
              >
                To Do
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdate(task.id, { status: 'in_progress', done: false, completedAt: null })
                  close()
                }}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                  !task.done && task.status === 'in_progress'
                    ? 'bg-amber-600/20 text-amber-700 font-semibold shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-100'
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdate(task.id, { status: 'done', done: true, completedAt: task.completedAt ?? Date.now() })
                  close()
                }}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                  task.done || task.status === 'done'
                    ? 'bg-pine-500/20 text-pine-400 font-semibold shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-100'
                }`}
              >
                Done
              </button>
            </div>

            <div className="mx-2 my-1 h-px bg-paper-200/60" />

            {/* Priority Selector */}
            <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Priority</p>
            <div className="grid grid-cols-4 gap-1 px-1 pb-2">
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onUpdate(task.id, { priority: p })
                    close()
                  }}
                  className={`capitalize rounded-lg px-1.5 py-1 text-[10.5px] font-medium transition-colors ${
                    (task.priority ?? 'medium') === p
                      ? p === 'urgent'
                        ? 'bg-terra-600/20 text-terra-600 font-semibold'
                        : p === 'high'
                          ? 'bg-amber-600/20 text-amber-600 font-semibold'
                          : p === 'low'
                            ? 'bg-slateblue-600/20 text-slateblue-600 font-semibold'
                            : 'bg-paper-200 text-ink-900 font-semibold'
                      : 'text-ink-500 hover:bg-paper-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="mx-2 my-1 h-px bg-paper-200/60" />

            {/* Move To */}
            <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Move To</p>
            <button
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] ${
                task.listId === null ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
              }`}
              onClick={() => {
                onMove(task.id, null)
                close()
              }}
            >
              <span className={`size-1.5 shrink-0 rounded-full ${task.listId === null ? 'bg-pine-500' : 'bg-transparent'}`} />
              <span className="min-w-0 flex-1 truncate">Inbox</span>
            </button>

            {boards.map((b) => (
              <button
                key={b.id}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] ${
                  task.listId === b.id ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                }`}
                onClick={() => {
                  onMove(task.id, b.id)
                  close()
                }}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${task.listId === b.id ? 'bg-pine-500' : 'bg-transparent'}`} />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
              </button>
            ))}

            {lists.map((l) => (
              <button
                key={l.id}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] ${
                  task.listId === l.id ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                }`}
                onClick={() => {
                  onMove(task.id, l.id)
                  close()
                }}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${task.listId === l.id ? 'bg-pine-500' : 'bg-transparent'}`} />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
              </button>
            ))}

            <div className="mx-2 my-1.5 h-px bg-paper-200/60" />

            {/* Due Date */}
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Due Date</p>
            <div className="px-1 pb-1">
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
                aria-label="Set due date"
                className="w-full rounded-lg bg-paper-100 px-2.5 py-1.5 text-[12px] text-ink-900 outline-none focus:ring-2 focus:ring-pine-500/25"
              />
            </div>

            <div className="mx-2 my-1.5 h-px bg-paper-200/60" />

            {/* Archive / Delete */}
            {task.archived ? (
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink-700 transition-colors hover:bg-paper-100"
                onClick={() => {
                  onRestore?.(task.id)
                  close()
                }}
              >
                <ArchiveIcon className="size-3.5 text-ink-400" />
                <span>Restore from archive</span>
              </button>
            ) : (
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink-700 transition-colors hover:bg-paper-100"
                onClick={() => {
                  onArchive(task.id)
                  close()
                }}
              >
                <ArchiveIcon className="size-3.5 text-ink-400" />
                <span>Archive</span>
              </button>
            )}

            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-terra-600 transition-colors hover:bg-terra-50"
              onClick={() => {
                onDelete(task.id)
                close()
              }}
            >
              <TrashIcon className="size-3.5" />
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>

      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxImage(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 rounded-full bg-paper-100 p-2 text-ink-900 shadow-md hover:bg-paper-200"
              >
                <CloseIcon className="size-4" />
              </button>
              <img src={lightboxImage} alt="Attachment preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )

  if (reorderable) {
    return (
      <Reorder.Item
        value={task.id}
        dragListener={!isTouch}
        dragControls={longPress.controls}
        onDragStart={longPress.onDragStart}
        onDragEnd={longPress.onDragEnd}
        {...rowMotionProps}
        {...(isTouch ? longPress.dragProps : {})}
        className={`${rowClass} coarse:select-none coarse:[-webkit-touch-callout:none]`}
      >
        {rowContent}
      </Reorder.Item>
    )
  }

  return (
    <motion.li {...rowMotionProps} className={rowClass}>
      {rowContent}
    </motion.li>
  )
}
