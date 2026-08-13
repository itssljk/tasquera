import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { useLongPressDrag } from '../lib/useLongPressDrag'
import { ImageThumbs } from './ImageThumbs'
import type { Collection, MenuState, Task, TaskStatus } from '../types'
import { formatDue, formatDeadline, isOverdue, isDeadlineOverdue } from '../lib/date'
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
  GripVerticalIcon,
  ImageIcon,
  LinkIcon,
  NotesIcon,
  PencilIcon,
  PlusIcon,
  SubtaskIcon,
  TrashIcon,
} from './icons'

interface BoardViewProps {
  board: Collection
  tasks: Task[]
  collections: Collection[]
  menu: MenuState
  onMenu: (menu: MenuState) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onArchive: (id: string) => void
  onArchiveOldCompleted?: (days?: number) => void
  onOpenCreateModal?: (listId?: string | null, status?: TaskStatus) => void
  onEditDetails?: (task: Task) => void
  onReorderColumnTasks?: (status: TaskStatus, reordered: Task[]) => void
}

const COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'todo', label: 'To Do', dot: 'bg-paper-300' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-amber-600' },
  { id: 'done', label: 'Done', dot: 'bg-pine-600' },
]

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function ReorderableBoardCard({ task, render }: { task: Task; render: (t: Task) => ReactNode }) {
  const longPress = useLongPressDrag()
  const { isTouch, isDragging } = longPress
  return (
    <Reorder.Item
      value={task}
      dragListener={!isTouch}
      dragControls={longPress.controls}
      onDragStart={longPress.onDragStart}
      onDragEnd={longPress.onDragEnd}
      {...(isTouch ? longPress.dragProps : {})}
      className={`list-none ${isDragging ? 'opacity-60' : ''} coarse:select-none coarse:[-webkit-touch-callout:none]`}
    >
      {render(task)}
    </Reorder.Item>
  )
}

export default function BoardView({
  board,
  tasks,
  collections,
  menu,
  onMenu,
  onToggle,
  onDelete,
  onUpdate,
  onMove,
  onArchive,
  onArchiveOldCompleted,
  onOpenCreateModal,
  onEditDetails,
  onReorderColumnTasks,
}: BoardViewProps) {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [showOlderDone, setShowOlderDone] = useState(false)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set())
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [menuDirectionMap, setMenuDirectionMap] = useState<Record<string, 'up' | 'down'>>({})

  const handleCardMenuToggle = (e: MouseEvent<HTMLButtonElement>, taskId: string) => {
    e.stopPropagation()
    const isOpening = !(menu?.kind === 'task' && menu.id === taskId)
    if (isOpening) {
      const rect = e.currentTarget.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const direction = spaceBelow < 340 && rect.top > 340 ? 'up' : 'down'
      setMenuDirectionMap((prev) => ({ ...prev, [taskId]: direction }))
    }
    onMenu(isOpening ? { kind: 'task', id: taskId } : null)
  }

  const toggleCardExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      if (status === 'done') {
        triggerTaskConfetti(e.currentTarget as HTMLElement)
      }
      onUpdate(taskId, { status })
    }
  }

  const handleToggleClick = (e: MouseEvent<HTMLButtonElement>, task: Task) => {
    if (task.status === 'in_progress') {
      triggerTaskConfetti(e.currentTarget)
    }
    onToggle(task.id)
  }

  const renderCard = (t: Task) => {
    const menuOpen = menu?.kind === 'task' && menu.id === t.id
    const isExpanded = expandedCardIds.has(t.id)
    const subtasksCount = t.subtasks?.length ?? 0
    const subtasksDoneCount = t.subtasks?.filter((s) => s.done).length ?? 0
    const linksCount = t.links?.length ?? 0
    const imagesCount = t.images?.length ?? 0
    const hasDetails = Boolean(t.description || subtasksCount > 0 || linksCount > 0 || imagesCount > 0)
    const isDone = t.done || t.status === 'done'
    const isInProgress = !isDone && t.status === 'in_progress'

    const menuDirection = menuDirectionMap[t.id] ?? 'down'

    return (
      <motion.div
        layout
        key={t.id}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: -6 }}
        transition={{
          layout: { type: 'spring', stiffness: 400, damping: 30 },
          opacity: { duration: 0.18 },
        }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        className={`group relative rounded-xl bg-paper-50 p-3.5 shadow-xs transition-all duration-150 hover:shadow-md ${
          isDone ? 'opacity-60' : ''
        } ${menuOpen ? 'z-50' : 'z-0'}`}
        style={{ zIndex: menuOpen ? 50 : undefined }}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <GripVerticalIcon className="mt-1 size-3.5 shrink-0 text-ink-400 transition-opacity hover:text-ink-700 cursor-grab active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100" aria-label="Drag to reorder vertically" />
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => handleToggleClick(e, t)}
              aria-label={
                isDone
                  ? 'Move back to To Do'
                  : isInProgress
                    ? 'Move to Done'
                    : 'Move to In Progress'
              }
              className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md transition-colors ${
                isDone
                  ? 'bg-pine-600 text-[#fbf9f5]'
                  : isInProgress
                    ? 'border border-amber-600 bg-amber-600/20 text-amber-600'
                    : 'border border-ink-400/40 hover:border-pine-500'
              }`}
            >
              {isDone && <CheckIcon className="size-3" />}
              {isInProgress && <span className="size-1.5 rounded-full bg-amber-600" />}
            </motion.button>

            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEditDetails?.(t)}>
              <span
                className={`text-[14.5px] leading-snug text-ink-900 transition-colors hover:text-pine-700 ${
                  isDone ? 'line-through text-ink-400' : ''
                }`}
              >
                {t.title}
              </span>

              {/* Card Metadata Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-400">
                {t.priority && t.priority !== 'medium' && (
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      t.priority === 'urgent'
                        ? 'bg-terra-600/20 text-terra-600'
                        : t.priority === 'high'
                          ? 'bg-amber-600/15 text-amber-600'
                          : 'bg-slateblue-600/15 text-slateblue-600'
                    }`}
                  >
                    <FlagIcon className="size-2.5" />
                    {t.priority}
                  </span>
                )}

                {t.dueDate && (
                  <span className={`flex items-center gap-1 font-medium ${!isDone && isOverdue(t.dueDate) ? 'text-terra-600 font-semibold' : 'text-ink-500'}`}>
                    <CalendarIcon className="size-3 text-pine-600" />
                    {formatDue(t.dueDate)}
                  </span>
                )}

                {t.deadline && (
                  <span className={`flex items-center gap-1 font-medium ${!isDone && isDeadlineOverdue(t.deadline) ? 'text-terra-600 font-semibold' : 'text-amber-600'}`}>
                    <ClockIcon className="size-3" />
                    {formatDeadline(t.deadline)}
                  </span>
                )}

                {subtasksCount > 0 && (
                  <span className="flex items-center gap-1 text-ink-400 bg-paper-200/60 px-1.5 py-0.5 rounded">
                    <SubtaskIcon className="size-3 text-pine-500" />
                    {subtasksDoneCount}/{subtasksCount}
                  </span>
                )}

                {t.description && (
                  <span className="flex items-center gap-1 text-ink-400 bg-paper-200/60 px-1.5 py-0.5 rounded" title={t.description}>
                    <NotesIcon className="size-3" />
                  </span>
                )}

                {linksCount > 0 && (
                  <span className="flex items-center gap-1 text-pine-500 bg-pine-500/10 px-1.5 py-0.5 rounded">
                    <LinkIcon className="size-3" />
                    {linksCount}
                  </span>
                )}

                {imagesCount > 0 && (
                  <span className="flex items-center gap-1 text-ink-400 bg-paper-200/60 px-1.5 py-0.5 rounded">
                    <ImageIcon className="size-3 text-slateblue-600" />
                    {imagesCount}
                  </span>
                )}

                {hasDetails && (
                  <button
                    type="button"
                    onClick={(e) => toggleCardExpanded(t.id, e)}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors ${
                      isExpanded ? 'bg-pine-500/15 text-pine-600' : 'bg-paper-200/80 text-ink-600 hover:bg-paper-200'
                    }`}
                  >
                    <ChevronIcon className={`size-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    {isExpanded ? 'Hide details' : 'Details'}
                  </button>
                )}
              </div>

              {/* Details Content Section */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-3 space-y-2.5 rounded-lg bg-paper-200/40 p-2.5 text-[12.5px] border border-paper-200/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                    {/* Description */}
                    {t.description && (
                      <div className="space-y-0.5">
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Description</span>
                        <p className="text-[12.5px] leading-relaxed text-ink-800 whitespace-pre-wrap">{t.description}</p>
                      </div>
                    )}

                    {/* Subtasks Section with Animated Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">
                          Subtasks {subtasksCount > 0 && `(${subtasksDoneCount}/${subtasksCount})`}
                        </span>
                        {subtasksCount > 0 && (
                          <span className="text-[10px] font-semibold text-pine-600">
                            {Math.round((subtasksDoneCount / subtasksCount) * 100)}%
                          </span>
                        )}
                      </div>

                      {subtasksCount > 0 && (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-paper-200">
                          <motion.div
                            className="h-full rounded-full bg-pine-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((subtasksDoneCount / subtasksCount) * 100)}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        </div>
                      )}

                      {subtasksCount > 0 && (
                        <div className="space-y-1 pt-0.5">
                          {t.subtasks?.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 text-[12px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newSubtasks = t.subtasks?.map((item) => (item.id === s.id ? { ...item, done: !item.done } : item)) ?? []
                                  const allDone = newSubtasks.length > 0 && newSubtasks.every((item) => item.done)
                                  let newStatus = t.status
                                  if (allDone) {
                                    newStatus = 'done'
                                    triggerTaskConfetti(e.currentTarget as HTMLElement)
                                  } else if (t.status === 'done' && !allDone) {
                                    newStatus = 'in_progress'
                                  }
                                  onUpdate(t.id, { subtasks: newSubtasks, status: newStatus, done: newStatus === 'done' })
                                }}
                                className={`flex size-3.5 shrink-0 items-center justify-center rounded transition-colors ${
                                  s.done ? 'bg-pine-600 text-paper-50' : 'border border-ink-400/50 hover:border-pine-500'
                                }`}
                              >
                                {s.done && <CheckIcon className="size-2" />}
                              </button>
                              <span className={s.done ? 'line-through text-ink-400' : 'text-ink-900'}>{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Subtask Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const form = e.currentTarget
                          const input = form.elements.namedItem('cardSubtask') as HTMLInputElement
                          const title = input?.value.trim()
                          if (!title) return
                          const updated = [...(t.subtasks || []), { id: String(Date.now()), title, done: false }]
                          onUpdate(t.id, { subtasks: updated })
                          input.value = ''
                        }}
                        className="flex items-center gap-1.5 pt-0.5"
                      >
                        <PlusIcon className="size-3 shrink-0 text-ink-400" />
                        <input
                          name="cardSubtask"
                          type="text"
                          placeholder="Add subtask…"
                          className="w-full bg-transparent text-[11.5px] text-ink-900 placeholder:text-ink-400 outline-none"
                        />
                      </form>
                    </div>

                    {/* Links */}
                    {linksCount > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Links</span>
                        <div className="flex flex-wrap gap-1.5">
                          {t.links?.map((l) => (
                            <a
                              key={l.id}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded bg-paper-100 px-2 py-1 text-[11.5px] font-medium text-pine-600 shadow-2xs hover:bg-pine-500/10 transition-colors"
                            >
                              <ExternalLinkIcon className="size-3" />
                              <span>{l.title || l.url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {imagesCount > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Images</span>
                        <ImageThumbs refs={t.images ?? []} onPreview={setLightboxImage} imgClassName="size-14" gapClassName="gap-1.5" />
                      </div>
                    )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleCardMenuToggle(e, t.id)}
              aria-label="Task actions"
              className="mt-0.5 rounded p-1 text-ink-400 transition-opacity hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:group-hover:opacity-100"
            >
              <EllipsisVerticalIcon className="size-3.5" />
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
                      onEditDetails(t)
                      onMenu(null)
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
                    onUpdate(t.id, { status: 'todo', done: false, completedAt: null })
                    onMenu(null)
                  }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                    !t.done && (t.status === 'todo' || !t.status)
                      ? 'bg-paper-200 text-ink-900 font-semibold shadow-2xs'
                      : 'text-ink-600 hover:bg-paper-100'
                  }`}
                >
                  To Do
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(t.id, { status: 'in_progress', done: false, completedAt: null })
                    onMenu(null)
                  }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                    !t.done && t.status === 'in_progress'
                      ? 'bg-amber-600/20 text-amber-700 font-semibold shadow-2xs'
                      : 'text-ink-600 hover:bg-paper-100'
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(t.id, { status: 'done', done: true, completedAt: t.completedAt ?? Date.now() })
                    onMenu(null)
                  }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                    t.done || t.status === 'done'
                      ? 'bg-pine-600/20 text-pine-700 font-semibold shadow-2xs'
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
                      onUpdate(t.id, { priority: p })
                      onMenu(null)
                    }}
                    className={`capitalize rounded-lg px-1.5 py-1 text-[10.5px] font-medium transition-colors ${
                      (t.priority ?? 'medium') === p
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
                  t.listId === null ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                }`}
                onClick={() => {
                  onMove(t.id, null)
                  onMenu(null)
                }}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${t.listId === null ? 'bg-pine-500' : 'bg-transparent'}`} />
                <span className="min-w-0 flex-1 truncate">Inbox</span>
              </button>

              {collections.filter((c) => c.kind === 'board').map((b) => (
                <button
                  key={b.id}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] ${
                    t.listId === b.id ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                  }`}
                  onClick={() => {
                    onMove(t.id, b.id)
                    onMenu(null)
                  }}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${t.listId === b.id ? 'bg-pine-500' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                </button>
              ))}

              {collections.filter((c) => c.kind === 'list').map((l) => (
                <button
                  key={l.id}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] ${
                    t.listId === l.id ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                  }`}
                  onClick={() => {
                    onMove(t.id, l.id)
                    onMenu(null)
                  }}
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${t.listId === l.id ? 'bg-pine-500' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                </button>
              ))}

              <div className="mx-2 my-1.5 h-px bg-paper-200/60" />

              {/* Due Date */}
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Due Date</p>
              <div className="px-1 pb-1">
                <input
                  type="date"
                  value={t.dueDate ?? ''}
                  onChange={(e) => onUpdate(t.id, { dueDate: e.target.value || null })}
                  aria-label="Set due date"
                  className="w-full rounded-lg bg-paper-100 px-2.5 py-1.5 text-[12px] text-ink-900 outline-none focus:ring-2 focus:ring-pine-500/25"
                />
              </div>

              <div className="mx-2 my-1.5 h-px bg-paper-200/60" />

              {/* Archive / Delete */}
              <button
                onClick={() => {
                  onArchive(t.id)
                  onMenu(null)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink-700 transition-colors hover:bg-paper-100"
              >
                <ArchiveIcon className="size-3.5 text-ink-400" />
                <span>Archive</span>
              </button>
              <button
                onClick={() => {
                  onDelete(t.id)
                  onMenu(null)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-terra-600 transition-colors hover:bg-terra-50"
              >
                <TrashIcon className="size-3.5" />
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </motion.div>
  )
}

  return (
    <div className="mt-6">
      <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => {
            if (col.id === 'done') return t.done || t.status === 'done'
            if (col.id === 'in_progress') return !t.done && t.status === 'in_progress'
            return !t.done && t.status !== 'in_progress'
          })

          const now = Date.now()
          const recentTasks =
            col.id === 'done'
              ? colTasks.filter((t) => (t.completedAt ?? t.createdAt) >= now - SEVEN_DAYS_MS)
              : colTasks
          const olderTasks =
            col.id === 'done'
              ? colTasks.filter((t) => (t.completedAt ?? t.createdAt) < now - SEVEN_DAYS_MS)
              : []

          const isOver = dragOverCol === col.id

          return (
            <motion.div
              layout
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`min-w-[80vw] snap-center flex flex-col rounded-2xl bg-paper-100/70 p-3.5 transition-all duration-200 md:min-w-0 md:snap-none ${
                isOver ? 'bg-pine-50/50 ring-2 ring-pine-500/40 scale-[1.01]' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${col.dot}`} />
                  <h3 className="text-[13.5px] font-semibold text-ink-900">{col.label}</h3>
                  <span className="rounded-full bg-paper-200/80 px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-ink-500">
                    {colTasks.length}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onOpenCreateModal?.(board.id, col.id)}
                  aria-label={`Add task to ${col.label}`}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-700"
                >
                  <PlusIcon className="size-4" />
                </motion.button>
              </div>

              <div className="min-h-[160px] flex-1">
                <Reorder.Group
                  axis="y"
                  values={recentTasks}
                  onReorder={(newOrder) => onReorderColumnTasks?.(col.id, newOrder)}
                  className="space-y-2.5"
                >
                  <AnimatePresence mode="popLayout">
                    {recentTasks.map((t) => (
                      <ReorderableBoardCard key={t.id} task={t} render={renderCard} />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>

                {col.id === 'done' && olderTasks.length > 0 && (
                  <div className="mt-4 border-t border-paper-200/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowOlderDone((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl bg-paper-200/50 px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:bg-paper-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <ArchiveIcon className="size-3.5 text-ink-400" />
                        <span>Older completed ({olderTasks.length})</span>
                      </div>
                      <ChevronIcon
                        className={`size-3.5 transition-transform duration-200 ${
                          showOlderDone ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {showOlderDone && (
                      <div className="mt-2.5 space-y-2.5">
                        {olderTasks.map((t) => renderCard(t))}
                        {onArchiveOldCompleted && (
                          <button
                            type="button"
                            onClick={() => onArchiveOldCompleted(7)}
                            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-paper-300 px-3 py-1.5 text-[12px] font-medium text-ink-500 transition-colors hover:border-pine-400 hover:bg-paper-50 hover:text-pine-700"
                          >
                            <ArchiveIcon className="size-3.5" />
                            <span>Archive older done tasks (&gt;7d)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {colTasks.length === 0 && (
                  <motion.button
                    key="add-btn"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenCreateModal?.(board.id, col.id)}
                    className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-paper-300/80 px-3 py-2 text-[13px] text-ink-500 transition-colors hover:border-pine-400 hover:bg-paper-50 hover:text-pine-700"
                  >
                    <PlusIcon className="size-3.5" />
                    <span>Add task</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
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
    </div>
  )
}
