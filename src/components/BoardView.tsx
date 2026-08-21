import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { useLongPressDrag } from '../lib/useLongPressDrag'
import BoardCardDetails from './BoardCardDetails'
import type { Collection, MenuState, PriorityLevel, Task, TaskStatus } from '../types'
import { formatDue, isOverdue } from '../lib/date'
import {
  CalendarIcon,
  ChevronIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  GripVerticalIcon,
  LinkIcon,
  NotesIcon,
  PlusIcon,
  SubtaskIcon,
  TrashIcon,
} from './icons'

interface BoardViewProps {
  board: Collection
  tasks: Task[]
  collections: Collection[]
  menu: MenuState
  weekStartsOn?: 'monday' | 'sunday'
  onMenu: (menu: MenuState) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onOpenCreateModal?: (listId?: string | null, status?: TaskStatus) => void
  onEditDetails?: (task: Task) => void
  onReorderColumnTasks?: (status: TaskStatus, reordered: Task[]) => void
}

const COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'todo', label: 'To Do', dot: 'bg-ink-400' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-amber-600' },
  { id: 'done', label: 'Done', dot: 'bg-pine-500' },
]

const PRIORITIES: { id: PriorityLevel; label: string; dot: string }[] = [
  { id: 'low', label: 'Low', dot: 'bg-slateblue-600' },
  { id: 'medium', label: 'Medium', dot: 'bg-pine-500' },
  { id: 'high', label: 'High', dot: 'bg-amber-600' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-terra-600' },
]

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function taskStatusOf(task: Task): TaskStatus {
  if (task.done || task.status === 'done') return 'done'
  if (task.status === 'in_progress') return 'in_progress'
  return 'todo'
}

interface DragPoint {
  x: number
  y: number
}

function BoardCheckCircle({
  done,
  status,
  onClick,
}: {
  done: boolean
  status?: TaskStatus
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const isDone = done || status === 'done'
  const isInProgress = !isDone && status === 'in_progress'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      onClick={onClick}
      aria-label={
        isDone
          ? 'Move back to To Do'
          : isInProgress
            ? 'Move to Done'
            : 'Move to In Progress'
      }
      className="mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-pine-500/50"
    >
      <svg viewBox="0 0 22 22" className="size-5.5" aria-hidden="true">
        <circle
          cx="11"
          cy="11"
          r="8.75"
          fill={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent'}
          stroke={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)'}
          strokeWidth="2"
          className="transition-colors duration-150"
        />
        {isDone ? (
          <motion.path
            d="M6.75 11.5l2.9 2.9 5.6-5.8"
            fill="none"
            stroke="#FBF9F5"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : isInProgress ? (
          <circle cx="11" cy="11" r="3" fill="#FBF9F5" />
        ) : null}
      </svg>
    </motion.button>
  )
}

function cardSurfaceClass(isDone: boolean, dragging: boolean, menuOpen: boolean): string {
  return `group relative rounded-xl border bg-paper-100 p-3 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
    dragging
      ? 'z-50 scale-[1.02] cursor-grabbing border-paper-300/80 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.75)]'
      : 'cursor-pointer border-paper-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.35)] hover:border-paper-300/60 hover:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.55)]'
  } ${isDone ? 'opacity-70' : ''} ${menuOpen || dragging ? 'z-50' : ''}`
}

function ReorderableBoardCard({
  task,
  children,
  menuOpen,
  onOpen,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  task: Task
  children: ReactNode
  menuOpen: boolean
  onOpen: () => void
  onDragStart: (task: Task) => void
  onDrag: (task: Task, point: DragPoint) => void
  onDragEnd: (task: Task, point: DragPoint) => void
}) {
  const longPress = useLongPressDrag()
  const { isTouch, isDragging } = longPress
  const isDone = task.done || task.status === 'done'
  return (
    <Reorder.Item
      value={task}
      dragListener={!isTouch}
      dragControls={longPress.controls}
      onDragStart={() => {
        longPress.onDragStart()
        onDragStart(task)
      }}
      onDrag={(_, info) => onDrag(task, info.point)}
      onDragEnd={(_, info) => {
        longPress.onDragEnd()
        onDragEnd(task, info.point)
      }}
      {...(isTouch ? longPress.dragProps : {})}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{
        layout: { type: 'spring', stiffness: 500, damping: 34 },
        opacity: { duration: 0.16 },
        y: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
      }}
      whileHover={isDragging ? undefined : { y: -2, transition: { duration: 0.12 } }}
      className={`list-none ${cardSurfaceClass(isDone, isDragging, menuOpen)} coarse:select-none coarse:[-webkit-touch-callout:none]`}
    >
      <div className="flex items-start gap-2.5" onClick={onOpen}>
        {children}
      </div>
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
  onOpenCreateModal,
  onReorderColumnTasks,
  weekStartsOn = 'monday',
}: BoardViewProps) {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [showOlderDone, setShowOlderDone] = useState(false)
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null)
  const [menuDirectionMap, setMenuDirectionMap] = useState<Record<string, 'up' | 'down'>>({})
  const [activeMobileCol, setActiveMobileCol] = useState<TaskStatus>('todo')

  const columnsAreaRef = useRef<HTMLDivElement>(null)
  const detailsTask = detailsTaskId ? tasks.find((t) => t.id === detailsTaskId) ?? null : null

  const scrollToColumn = (colId: TaskStatus) => {
    setActiveMobileCol(colId)
    const colEl = columnsAreaRef.current?.querySelector(`[data-col="${colId}"]`)
    if (colEl) {
      colEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

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

  const findColumnAt = (point: DragPoint): TaskStatus | null => {
    const area = columnsAreaRef.current
    if (!area) return null
    const clientX = point.x - (window.scrollX || 0)
    const clientY = point.y - (window.scrollY || 0)
    const cols = area.querySelectorAll<HTMLElement>('[data-col]')
    for (const el of Array.from(cols)) {
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return (el.dataset.col as TaskStatus) ?? null
      }
    }
    return null
  }

  const handleCardDrag = (_task: Task, point: DragPoint) => {
    const over = findColumnAt(point)
    setDragOverCol((prev) => (prev === over ? prev : over))
  }

  const handleCardDragEnd = (task: Task, point: DragPoint) => {
    const target = findColumnAt(point)
    setDragOverCol(null)
    if (!target) return
    if (target === taskStatusOf(task)) return
    onUpdate(task.id, {
      status: target,
      done: target === 'done',
      completedAt: target === 'done' ? (task.completedAt ?? Date.now()) : null,
    })
  }

  const handleToggleClick = (_e: MouseEvent<HTMLButtonElement>, task: Task) => {
    onToggle(task.id)
  }

  const renderCard = (t: Task) => {
    const menuOpen = menu?.kind === 'task' && menu.id === t.id
    const subtasksCount = t.subtasks?.length ?? 0
    const subtasksDoneCount = t.subtasks?.filter((s) => s.done).length ?? 0
    const linksCount = t.links?.length ?? 0
    const isDone = t.done || t.status === 'done'
    const dueOverdue = !isDone && !!t.dueDate && isOverdue(t.dueDate)
    const hasMeta =
      (t.priority !== undefined && t.priority !== 'medium') ||
      !!t.dueDate ||
      subtasksCount > 0 ||
      linksCount > 0 ||
      !!t.description

    const priorityColor =
      t.priority === 'urgent'
        ? 'text-terra-600'
        : t.priority === 'high'
          ? 'text-amber-600'
          : 'text-slateblue-600'

    const menuDirection = menuDirectionMap[t.id] ?? 'down'

    return (
      <>
        <GripVerticalIcon
          className="mt-1.5 hidden size-3.5 shrink-0 cursor-grab text-ink-400/60 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing sm:block"
          aria-label="Drag to reorder vertically"
        />

        <BoardCheckCircle
          done={isDone}
          status={t.status}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleClick(e, t)
          }}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`text-body-lg font-medium leading-snug text-ink-900 ${
              isDone ? 'text-ink-400 line-through' : ''
            }`}
          >
            {t.title}
          </p>

          {hasMeta && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption font-medium text-ink-400">
              {t.priority !== undefined && t.priority !== 'medium' && (
                <span className={`inline-flex items-center gap-1 ${priorityColor}`}>
                  <FlagIcon className="size-3" />
                  <span className="capitalize">{t.priority}</span>
                </span>
              )}

              {t.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    dueOverdue ? 'font-semibold text-terra-600' : ''
                  }`}
                >
                  <CalendarIcon className="size-3" />
                  {formatDue(t.dueDate)}
                </span>
              )}

              {subtasksCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <SubtaskIcon className="size-3 text-pine-500" />
                  {subtasksDoneCount}/{subtasksCount}
                </span>
              )}

              {linksCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <LinkIcon className="size-3" />
                  {linksCount}
                </span>
              )}

              {t.description && <NotesIcon className="size-3" aria-label="Has notes" />}
            </div>
          )}
        </div>

        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => handleCardMenuToggle(e, t.id)}
            aria-label="Task actions"
            className="mt-0.5 rounded-lg p-1 text-ink-400 transition-opacity hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:group-hover:opacity-100"
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
                className={`absolute right-0 z-50 w-64 max-h-[min(360px,75vh)] overflow-y-auto rounded-2xl border border-paper-200/80 bg-paper-100/95 p-1.5 text-small shadow-2xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                  menuDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                }`}
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Status */}
                <div className="grid grid-cols-3 gap-1 px-0.5 pt-0.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => {
                      onUpdate(t.id, { status: 'todo', done: false, completedAt: null })
                      onMenu(null)
                    }}
                    className={`cursor-pointer rounded-lg px-1.5 py-1.5 text-caption font-medium whitespace-nowrap text-center transition-all ${
                      !t.done && (t.status === 'todo' || !t.status)
                        ? 'bg-paper-200 font-semibold text-ink-900 shadow-xs'
                        : 'text-ink-500 hover:bg-paper-200/80 hover:text-ink-900'
                    }`}
                  >
                    To Do
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => {
                      onUpdate(t.id, { status: 'in_progress', done: false, completedAt: null })
                      onMenu(null)
                    }}
                    className={`cursor-pointer rounded-lg px-1.5 py-1.5 text-caption font-medium whitespace-nowrap text-center transition-all ${
                      !t.done && t.status === 'in_progress'
                        ? 'bg-amber-600/20 font-semibold text-amber-600 shadow-xs'
                        : 'text-ink-500 hover:bg-amber-500/10 hover:text-amber-600'
                    }`}
                  >
                    In Progress
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => {
                      onUpdate(t.id, { status: 'done', done: true, completedAt: t.completedAt ?? Date.now() })
                      onMenu(null)
                    }}
                    className={`cursor-pointer rounded-lg px-1.5 py-1.5 text-caption font-medium whitespace-nowrap text-center transition-all ${
                      t.done || t.status === 'done'
                        ? 'bg-pine-500/20 font-semibold text-pine-400 shadow-xs'
                        : 'text-ink-500 hover:bg-pine-500/15 hover:text-pine-400'
                    }`}
                  >
                    Done
                  </motion.button>
                </div>

                <div className="mx-1.5 my-1.5 h-px bg-paper-200/60" />

                {/* Priority */}
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-micro font-semibold uppercase tracking-wider text-ink-400">
                    Priority
                  </span>
                  <div className="flex items-center gap-1">
                    {PRIORITIES.map((p) => {
                      const active = (t.priority ?? 'medium') === p.id
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          title={p.label}
                          aria-label={`Priority ${p.label}`}
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.88 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          onClick={() => {
                            onUpdate(t.id, { priority: p.id })
                            onMenu(null)
                          }}
                          className={`cursor-pointer rounded-full p-1.5 transition-colors ${
                            active ? 'bg-paper-200 ring-1 ring-paper-300' : 'hover:bg-paper-200/80'
                          }`}
                        >
                          <span className={`block size-2.5 rounded-full ${p.dot} shadow-xs transition-transform`} />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div className="mx-1.5 my-1.5 h-px bg-paper-200/60" />

                {/* Move to */}
                <p className="px-2 pb-1 pt-0.5 text-micro font-semibold uppercase tracking-wider text-ink-400">
                  Move to
                </p>
                <motion.button
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    t.listId === null ? 'bg-paper-200 font-medium text-ink-900' : 'text-ink-600 hover:bg-paper-200/70 hover:text-ink-900'
                  }`}
                  onClick={() => {
                    onMove(t.id, null)
                    onMenu(null)
                  }}
                >
                  <span className={`size-1.5 shrink-0 rounded-full transition-transform ${t.listId === null ? 'bg-pine-500 scale-125' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1 truncate">Inbox</span>
                </motion.button>

                {collections.map((col) => (
                  <motion.button
                    key={col.id}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      t.listId === col.id ? 'bg-paper-200 font-medium text-ink-900' : 'text-ink-600 hover:bg-paper-200/70 hover:text-ink-900'
                    }`}
                    onClick={() => {
                      onMove(t.id, col.id)
                      onMenu(null)
                    }}
                  >
                    <span className={`size-1.5 shrink-0 rounded-full transition-transform ${t.listId === col.id ? 'bg-pine-500 scale-125' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1 truncate">{col.name}</span>
                  </motion.button>
                ))}

                <div className="mx-1.5 my-1.5 h-px bg-paper-200/60" />

                {/* Delete */}
                <div className="px-0.5 pb-0.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => {
                      onDelete(t.id)
                      onMenu(null)
                    }}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-small font-medium text-terra-600 transition-colors hover:bg-terra-500/15"
                  >
                    <TrashIcon className="size-3.5" />
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    )
  }

  // Keep the mobile segment control in sync while the column pager scrolls.
  useEffect(() => {
    const el = columnsAreaRef.current
    if (!el) return
    const handleScroll = () => {
      if (window.innerWidth >= 768) return
      const scrollLeft = el.scrollLeft
      const colEls = el.querySelectorAll<HTMLElement>('[data-col]')
      let closestCol: TaskStatus = 'todo'
      let minDiff = Infinity
      colEls.forEach((c) => {
        const diff = Math.abs(c.offsetLeft - el.offsetLeft - scrollLeft)
        if (diff < minDiff) {
          minDiff = diff
          closestCol = (c.dataset.col as TaskStatus) ?? 'todo'
        }
      })
      setActiveMobileCol(closestCol)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const colTasksFor = (colId: TaskStatus): Task[] =>
    tasks.filter((t) => {
      if (colId === 'done') return t.done || t.status === 'done'
      if (colId === 'in_progress') return !t.done && t.status === 'in_progress'
      return !t.done && t.status !== 'in_progress'
    })

  return (
    <div className="mt-4 sm:mt-6">
      {/* Mobile column switcher */}
      <div className="mb-4 flex rounded-full bg-paper-100/70 p-1 md:hidden">
        {COLUMNS.map((c) => {
          const count = colTasksFor(c.id).length
          const isActive = activeMobileCol === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => scrollToColumn(c.id)}
              className={`relative flex-1 rounded-full px-2 py-1.5 text-small font-medium transition-colors ${
                isActive ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="board-mobile-segment"
                  className="absolute inset-0 rounded-full bg-paper-200 shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                <span>{c.label}</span>
                <span className="text-caption tabular-nums opacity-70">{count}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Columns */}
      <div
        ref={columnsAreaRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0"
      >
        {COLUMNS.map((col) => {
          const colTasks = colTasksFor(col.id)
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
            <section
              key={col.id}
              data-col={col.id}
              className={`flex min-h-[240px] min-w-[86vw] shrink-0 snap-center flex-col rounded-2xl border transition-colors duration-200 sm:min-w-[440px] md:min-w-0 md:snap-none ${
                isOver ? 'border-pine-500/40 bg-pine-50/25' : 'border-transparent'
              }`}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${col.dot}`} />
                  <h3 className="text-small font-semibold uppercase tracking-[0.08em] text-ink-500">
                    {col.label}
                  </h3>
                  <span className="rounded-md bg-paper-100 px-1.5 py-0.5 text-caption font-medium tabular-nums text-ink-400">
                    {colTasks.length}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onOpenCreateModal?.(board.id, col.id)}
                  aria-label={`Add task to ${col.label}`}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-paper-100 hover:text-ink-900"
                >
                  <PlusIcon className="size-4" />
                </motion.button>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-2.5">
                <Reorder.Group
                  axis="y"
                  values={recentTasks}
                  onReorder={(newOrder) => onReorderColumnTasks?.(col.id, newOrder)}
                  className="flex flex-col gap-2.5"
                >
                  {recentTasks.map((t) => (
                    <ReorderableBoardCard
                      key={t.id}
                      task={t}
                      menuOpen={menu?.kind === 'task' && menu.id === t.id}
                      onOpen={() => {
                        onMenu(null)
                        setDetailsTaskId(t.id)
                      }}
                      onDragStart={() => {}}
                      onDrag={handleCardDrag}
                      onDragEnd={handleCardDragEnd}
                    >
                      {renderCard(t)}
                    </ReorderableBoardCard>
                  ))}
                </Reorder.Group>

                {col.id === 'done' && olderTasks.length > 0 && (
                  <div className="mt-1 border-t border-paper-200/50 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOlderDone((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-caption font-medium text-ink-400 transition-colors hover:bg-paper-100 hover:text-ink-700"
                    >
                      <span>
                        Older completed ({olderTasks.length})
                      </span>
                      <ChevronIcon
                        className={`size-3.5 transition-transform duration-200 ${showOlderDone ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {showOlderDone && (
                      <div className="mt-2 flex flex-col gap-2.5">
                        {olderTasks.map((t) => {
                          const isDone = t.done || t.status === 'done'
                          const menuOpen = menu?.kind === 'task' && menu.id === t.id
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                onMenu(null)
                                setDetailsTaskId(t.id)
                              }}
                              className={cardSurfaceClass(isDone, false, menuOpen)}
                            >
                              <div className="flex items-start gap-2.5">{renderCard(t)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick add */}
              {colTasks.length === 0 ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenCreateModal?.(board.id, col.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-paper-200/70 py-6 text-body font-medium text-ink-400 transition-colors hover:border-pine-500/40 hover:bg-pine-50/20 hover:text-pine-400"
                >
                  <PlusIcon className="size-3.5" />
                  Add task
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenCreateModal?.(board.id, col.id)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-medium text-ink-400/80 transition-colors hover:bg-paper-100/60 hover:text-ink-700"
                >
                  <PlusIcon className="size-3.5" />
                  Add task
                </motion.button>
              )}
            </section>
          )
        })}
      </div>

      <AnimatePresence>
        {detailsTask && (
          <BoardCardDetails
            key={detailsTask.id}
            task={detailsTask}
            boardName={board.name}
            collections={collections}
            weekStartsOn={weekStartsOn}
            onClose={() => setDetailsTaskId(null)}
            onUpdate={onUpdate}
            onDelete={() => {
              onDelete(detailsTask.id)
              setDetailsTaskId(null)
            }}
            onMove={onMove}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
