import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import type { Transition } from 'framer-motion'
import { useLongPressDrag } from '../lib/useLongPressDrag'
import { formatDate, formatDue, isOverdue } from '../lib/date'
import { recurrenceLabel } from '../lib/recurrence'
import { SPRINGS } from '../lib/motion'
import { triggerHaptic } from '../lib/platform'
import type { Collection, Task } from '../types'
import {
  CalendarIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  LinkIcon,
  NotesIcon,
  PencilIcon,
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
      whileTap={{ scale: 0.82 }}
      transition={SPRINGS.snappy}
    >
      <motion.circle
        cx="11"
        cy="11"
        r="8.75"
        fill={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent'}
        stroke={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)'}
        strokeWidth="2"
        animate={{
          scale: isDone ? [1, 1.25, 0.95, 1] : 1,
          fill: isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent',
          stroke: isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)',
        }}
        transition={isDone ? SPRINGS.bouncy : SPRINGS.snappy}
      />
      {isDone ? (
        <motion.path
          d="M6.75 11.5l2.9 2.9 5.6-5.8"
          fill="none"
          stroke="var(--color-on-accent)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: 1,
            opacity: 1,
          }}
          transition={{
            pathLength: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.1 },
          }}
        />
      ) : isInProgress ? (
        <motion.circle
          cx="11"
          cy="11"
          r="3.2"
          fill="var(--color-on-accent)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRINGS.bouncy}
        />
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
  selected?: boolean
  isKeyboardFocused?: boolean
  onSelectToggle?: (id: string, e: React.MouseEvent) => void
  onToggleMenu: (id: string | null) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
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
    selected = false,
    isKeyboardFocused = false,
    onSelectToggle,
    onToggleMenu,
    onToggle,
    onDelete,
    onUpdate: _onUpdate,
    onMove,
    onEditDetails,
  } = props

  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeHapticRef = useRef<{ rightTriggered: boolean; deleteTriggered: boolean; editTriggered: boolean }>({
    rightTriggered: false,
    deleteTriggered: false,
    editTriggered: false,
  })
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
    e.stopPropagation()
    triggerHaptic(done ? 'selection' : 'success')
    onToggle(task.id)
  }

  const subtasksCount = task.subtasks?.length ?? 0
  const subtasksDoneCount = task.subtasks?.filter((s) => s.done).length ?? 0
  const linksCount = task.links?.length ?? 0
  const hasMeta =
    (task.priority !== undefined && task.priority !== 'medium') ||
    (!!task.recurrence && !done) ||
    (!!task.dueDate && !done) ||
    subtasksCount > 0 ||
    !!task.description ||
    linksCount > 0 ||
    (done && !!task.completedAt) ||
    !!meta

  const rowTransition: Transition = {
    layout: SPRINGS.liquidPill,
    opacity: { duration: 0.18 },
    scale: { duration: 0.18 },
  }

  const rowClass = `group relative flex flex-col px-3 py-2 transition-colors duration-150 border-b border-paper-200/40 last:border-b-0 ${
    selected
      ? 'bg-pine-500/10 rounded-xl ring-1 ring-pine-500/35 shadow-2xs'
      : isKeyboardFocused
        ? 'bg-paper-100 rounded-xl ring-1 ring-pine-500/50 shadow-2xs'
        : done
          ? ''
          : 'hover:bg-paper-100/60 active:bg-paper-100'
  } ${reorderable && !done ? (isTouch ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing') : ''} ${
    menuOpen ? 'z-50' : 'z-0'
  } ${isDragging ? 'opacity-60 rounded-xl' : ''}`

  const rowMotionProps = {
    layout: true as const,
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.98,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      transition: {
        opacity: { duration: 0.22, delay: done ? 0.8 : 0 },
        height: { duration: 0.25, delay: done ? 0.85 : 0 },
        paddingTop: { duration: 0.25, delay: done ? 0.85 : 0 },
        paddingBottom: { duration: 0.25, delay: done ? 0.85 : 0 },
        y: { duration: 0.22, delay: done ? 0.8 : 0 },
      },
    },
    transition: rowTransition,
    style: { zIndex: menuOpen ? 60 : undefined },
  }

  const rowContent = (
    <div className={`relative w-full rounded-xl ${swipeOffset !== 0 ? 'overflow-hidden' : ''}`}>
      {/* Two-Tier Swipe Action Background Trays */}
      <AnimatePresence>
        {swipeOffset > 8 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-0 right-1/2 flex items-center pl-3.5 rounded-xl bg-pine-600/20 text-pine-400 pointer-events-none z-0"
          >
            <motion.div
              animate={{
                scale: swipeOffset > 65 ? [1, 1.22, 1.1] : 1,
              }}
              transition={SPRINGS.snappy}
              className="flex items-center gap-1.5 font-semibold text-small"
            >
              <CheckIcon className="size-4 stroke-[2.5]" />
              <span>{done ? 'To Do' : 'Done'}</span>
            </motion.div>
          </motion.div>
        )}
        {swipeOffset < -8 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-y-0 right-0 left-1/2 flex items-center justify-end pr-3.5 rounded-xl pointer-events-none z-0 transition-colors duration-150 ${
              swipeOffset < -130 ? 'bg-terra-600/20 text-terra-500' : 'bg-amber-600/20 text-amber-500'
            }`}
          >
            <motion.div
              animate={{
                scale: swipeOffset < -130 || (-130 <= swipeOffset && swipeOffset < -60) ? [1, 1.22, 1.1] : 1,
              }}
              transition={SPRINGS.snappy}
              className="flex items-center gap-1.5 font-semibold text-small"
            >
              {swipeOffset < -130 ? (
                <>
                  <span>Delete</span>
                  <TrashIcon className="size-4" />
                </>
              ) : (
                <>
                  <span>Schedule</span>
                  <CalendarIcon className="size-4" />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag={isTouch && !isDragging ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.28}
        onDrag={(_, info) => {
          setSwipeOffset(info.offset.x)
          if (info.offset.x > 70) {
            if (!swipeHapticRef.current.rightTriggered) {
              triggerHaptic('light')
              swipeHapticRef.current.rightTriggered = true
            }
          } else {
            swipeHapticRef.current.rightTriggered = false
          }

          if (info.offset.x < -130) {
            if (!swipeHapticRef.current.deleteTriggered) {
              triggerHaptic('light')
              swipeHapticRef.current.deleteTriggered = true
            }
          } else {
            swipeHapticRef.current.deleteTriggered = false
          }

          if (info.offset.x < -45 && info.offset.x >= -130) {
            if (!swipeHapticRef.current.editTriggered) {
              triggerHaptic('light')
              swipeHapticRef.current.editTriggered = true
            }
          } else if (info.offset.x >= -45) {
            swipeHapticRef.current.editTriggered = false
          }
        }}
        onDragEnd={(_, info) => {
          setSwipeOffset(0)
          swipeHapticRef.current = { rightTriggered: false, deleteTriggered: false, editTriggered: false }
          if (info.offset.x > 70 || (info.offset.x > 35 && info.velocity.x > 500)) {
            triggerHaptic('success')
            onToggle(task.id)
          } else if (info.offset.x < -130 || (info.offset.x < -65 && info.velocity.x < -650)) {
            triggerHaptic('warning')
            onDelete(task.id)
          } else if (info.offset.x < -45) {
            triggerHaptic('light')
            onEditDetails?.(task)
          }
        }}
        className="relative z-10 w-full"
      >
        <div className={`flex ${hasMeta ? 'items-start' : 'items-center'} gap-2.5 w-full`}>
        {onSelectToggle ? (
          <button
            type="button"
            onClick={(e) => onSelectToggle(task.id, e)}
            aria-label={selected ? `Deselect “${task.title}”` : `Select “${task.title}”`}
            className={`-ml-2 -my-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 cursor-pointer ${hasMeta ? 'self-start mt-0' : ''}`}
          >
            <CheckCircle done={done} status={task.status} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggleClick}
            aria-label={
              done
                ? `Move “${task.title}” back to To Do`
                : `Mark “${task.title}” as done`
            }
            aria-pressed={done}
            className={`-ml-2 -my-2 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 cursor-pointer ${hasMeta ? 'self-start mt-0' : ''}`}
          >
            <CheckCircle done={done} status={task.status} />
          </button>
        )}

        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={(e) => {
            if (e.shiftKey && onSelectToggle) {
              e.preventDefault()
              onSelectToggle(task.id, e)
            } else {
              onEditDetails?.(task)
            }
          }}
        >
          <motion.p
            animate={{
              color: done ? 'var(--color-ink-500)' : 'var(--color-ink-900)',
            }}
            transition={{ duration: 0.2 }}
            className={`relative break-words text-body-lg font-medium leading-snug sm:text-title transition-all duration-200 ${
              done ? 'line-through decoration-ink-500/70 decoration-[1.5px]' : ''
            }`}
          >
            {task.title}
          </motion.p>

          {/* Metadata Indicators */}
          {hasMeta && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption font-medium text-ink-500 tabular-nums">
              {/* Priority */}
              {task.priority && task.priority !== 'medium' && (
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    task.priority === 'urgent'
                      ? 'text-terra-600'
                      : task.priority === 'high'
                        ? 'text-amber-600'
                        : 'text-slateblue-600'
                  }`}
                >
                  <FlagIcon className="size-3" />
                  <span className="capitalize">{task.priority}</span>
                </span>
              )}

              {/* Recurrence */}
              {task.recurrence && !done && (
                <span className="inline-flex items-center gap-1 text-pine-600 font-medium">
                  <RepeatIcon className="size-3" />
                  <span>{recurrenceLabel(task.recurrence)}</span>
                </span>
              )}

              {/* Due date */}
              {task.dueDate && !done && (
                <span className={`inline-flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-terra-600 font-semibold' : 'text-ink-500'}`}>
                  <CalendarIcon className="size-3 text-pine-600" />
                  <span>{formatDue(task.dueDate)}</span>
                </span>
              )}

              {/* Subtasks progress indicator */}
              {subtasksCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditDetails?.(task)
                  }}
                  title={`Subtasks: ${subtasksDoneCount}/${subtasksCount}`}
                  aria-label={`Subtasks: ${subtasksDoneCount}/${subtasksCount}`}
                  className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine-500/40 rounded cursor-pointer"
                >
                  <SubtaskIcon className="size-3 text-pine-600" />
                  <span className="tabular-nums">{subtasksDoneCount}/{subtasksCount}</span>
                </button>
              )}

              {/* Description / Notes icon */}
              {task.description && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditDetails?.(task)
                  }}
                  title="Notes"
                  aria-label="View notes"
                  className="inline-flex items-center text-ink-400 hover:text-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine-500/40 rounded cursor-pointer"
                >
                  <NotesIcon className="size-3" />
                </button>
              )}

              {/* Links icon */}
              {linksCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditDetails?.(task)
                  }}
                  title={`${linksCount} link${linksCount > 1 ? 's' : ''}`}
                  aria-label={`${linksCount} link${linksCount > 1 ? 's' : ''}`}
                  className="inline-flex items-center gap-1 text-ink-400 hover:text-pine-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine-500/40 rounded cursor-pointer"
                >
                  <LinkIcon className="size-3" />
                  <span className="tabular-nums">{linksCount}</span>
                </button>
              )}

              {done && task.completedAt && <span className="text-ink-400">Completed {formatDate(task.completedAt)}</span>}
              {meta && <span className="text-ink-400">{meta}</span>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {onEditDetails && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onEditDetails(task)}
              aria-label="Edit task details"
              title="Edit task details"
              className="hidden md:flex rounded-lg p-1.5 transition-all duration-150 text-ink-400 hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100 cursor-pointer"
            >
              <PencilIcon className="size-[16px]" />
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
              data-menu-trigger="true"
              className={`flex size-10 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 cursor-pointer ${
                menuOpen
                  ? 'bg-paper-200 text-ink-700 opacity-100'
                  : 'text-ink-400 hover:bg-paper-200 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100'
              }`}
            >
              <EllipsisVerticalIcon className="size-[18px]" />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation()
                      close()
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: menuDirection === 'up' ? 6 : -6, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.94, y: menuDirection === 'up' ? 4 : -4, filter: 'blur(2px)' }}
                    transition={SPRINGS.popover}
                    style={{ transformOrigin: menuDirection === 'up' ? 'bottom right' : 'top right' }}
                    className={`absolute right-0 z-50 w-52 max-h-[min(340px,75vh)] overflow-y-auto rounded-2xl glass-menu p-1.5 text-body [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                      menuDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    }`}
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                  {onEditDetails && (
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      onClick={() => {
                        onEditDetails(task)
                        close()
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-small font-medium text-pine-600 hover:bg-pine-500/10 transition-colors"
                    >
                      <PencilIcon className="size-3.5" />
                      <span>Edit details...</span>
                    </motion.button>
                  )}

                  {(collections.length > 0 || task.listId !== null) && (
                    <>
                      {onEditDetails && <div className="mx-1.5 my-1 h-px bg-paper-200/60" />}
                      <p className="px-2.5 pb-1 pt-0.5 text-micro font-semibold uppercase tracking-wider text-ink-400">Move to</p>
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-small transition-colors ${
                          task.listId === null ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                        }`}
                        onClick={() => {
                          onMove(task.id, null)
                          close()
                        }}
                      >
                        <span className={`size-1.5 shrink-0 rounded-full transition-transform ${task.listId === null ? 'bg-pine-500 scale-125' : 'bg-transparent'}`} />
                        <span className="min-w-0 flex-1 truncate">Inbox</span>
                      </motion.button>

                      {collections.map((col) => (
                        <motion.button
                          key={col.id}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-small transition-colors ${
                            task.listId === col.id ? 'font-medium text-ink-900 bg-paper-100' : 'text-ink-700 hover:bg-paper-100'
                          }`}
                          onClick={() => {
                            onMove(task.id, col.id)
                            close()
                          }}
                        >
                          <span className={`size-1.5 shrink-0 rounded-full transition-transform ${task.listId === col.id ? 'bg-pine-500 scale-125' : 'bg-transparent'}`} />
                          <span className="min-w-0 flex-1 truncate">{col.name}</span>
                        </motion.button>
                      ))}
                    </>
                  )}

                  <div className="mx-1.5 my-1 h-px bg-paper-200/60" />

                  {/* Delete */}
                  <motion.button
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-small text-terra-600 transition-colors hover:bg-terra-50"
                    onClick={() => {
                      onDelete(task.id)
                      close()
                    }}
                  >
                    <TrashIcon className="size-3.5" />
                    <span>Delete</span>
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </motion.div>
</div>
)

  if (reorderable) {
    return (
      <Reorder.Item
        value={task.id}
        data-task-id={task.id}
        dragListener={!isTouch}
        dragControls={longPress.controls}
        onDragStart={longPress.onDragStart}
        onDragEnd={longPress.onDragEnd}
        whileDrag={{
          scale: 1.025,
          rotate: 0.8,
          boxShadow: '0 20px 35px -8px rgba(0,0,0,0.5), 0 0 0 1px var(--color-paper-200)',
          zIndex: 50,
        }}
        {...rowMotionProps}
        {...(isTouch ? longPress.dragProps : {})}
        className={`${rowClass} coarse:select-none coarse:[-webkit-touch-callout:none]`}
      >
        {rowContent}
      </Reorder.Item>
    )
  }

  return (
    <motion.li {...rowMotionProps} data-task-id={task.id} className={rowClass}>
      {rowContent}
    </motion.li>
  )
}
