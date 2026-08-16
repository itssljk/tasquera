import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  addDaysISO,
  formatDueHeading,
  getEffectiveDate,
  isOverdue,
  monthLabel,
  toISODate,
  todayISO,
} from '../lib/date'
import type { Collection, MenuState, Task, TaskStatus } from '../types'
import TaskRow from './TaskRow'
import { CalendarIcon, ChevronIcon, PlusIcon } from './icons'

interface CalendarViewProps {
  tasks: Task[]
  collections: Collection[]
  menu: MenuState
  onMenu: (menu: MenuState) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onArchive: (id: string) => void
  onRestore?: (id: string) => void
  onEditDetails?: (task: Task) => void
  onOpenCreateModal?: (listId?: string | null, status?: TaskStatus, dueDate?: string | null) => void
  onAddTask?: (taskData: Partial<Task> & { title: string }) => void
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)) // Monday-first
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function CalendarView(props: CalendarViewProps) {
  const {
    tasks,
    collections,
    menu,
    onMenu,
    onToggle,
    onDelete,
    onUpdate,
    onMove,
    onArchive,
    onRestore,
    onEditDetails,
    onOpenCreateModal,
    onAddTask,
  } = props

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayISO())
  const [direction, setDirection] = useState(0)
  const [quickTitle, setQuickTitle] = useState('')
  const [showDone, setShowDone] = useState(true)
  const quickInputRef = useRef<HTMLInputElement>(null)

  const dueByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (t.archived) continue
      const dateKey = getEffectiveDate(t)
      if (!dateKey) continue
      const arr = map.get(dateKey) ?? []
      arr.push(t)
      map.set(dateKey, arr)
    }
    return map
  }, [tasks])

  const cells = useMemo(() => monthCells(year, month), [year, month])

  const selectedTasks = dueByDay.get(selected) ?? []
  const selectedOpen = selectedTasks
    .filter((t) => !t.done)
    .sort((a, b) => a.createdAt - b.createdAt)
  const selectedDone = selectedTasks.filter((t) => t.done)

  const shift = (delta: number) => {
    setDirection(delta)
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const goToday = () => {
    setDirection(0)
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
    setSelected(todayISO())
  }

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = quickTitle.trim()
    if (!trimmed) return
    onAddTask?.({
      title: trimmed,
      dueDate: selected,
      status: 'todo',
    })
    setQuickTitle('')
  }

  const today = todayISO()
  const isTodaySelected = selected === today
  const isTomorrowSelected = selected === addDaysISO(today, 1)
  const isYesterdaySelected = selected === addDaysISO(today, -1)
  const isSelectedPast = selected < today

  const rowProps = {
    collections,
    reorderable: false,
    dragId: null,
    onToggleMenu: (id: string | null) => onMenu(id ? { kind: 'task', id } : null),
    onToggle,
    onDelete,
    onUpdate,
    onMove,
    onArchive,
    onRestore,
    onEditDetails,
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <motion.h1
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: direction * 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 font-sans text-[24px] font-bold leading-none tracking-tight text-ink-900 sm:text-[28px]"
          >
            {monthLabel(year, month)}
          </motion.h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToday}
            className={`rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ${
              isTodaySelected
                ? 'bg-pine-500/20 text-pine-500'
                : 'text-ink-600 hover:bg-paper-200/80 hover:text-ink-900'
            }`}
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-xl p-2 text-ink-500 transition-colors duration-150 hover:bg-paper-200/80 hover:text-ink-900"
          >
            <ChevronIcon className="size-4 rotate-180" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-xl p-2 text-ink-500 transition-colors duration-150 hover:bg-paper-200/80 hover:text-ink-900"
          >
            <ChevronIcon className="size-4" />
          </motion.button>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="rounded-2xl border border-paper-200/70 bg-paper-100/60 p-3.5 shadow-2xs backdrop-blur-xs sm:p-4.5">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
            <div
              key={i}
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${year}-${month}`}
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-7 gap-1 sm:gap-1.5"
            >
              {cells.map((d) => {
                const iso = toISODate(d)
                const inMonth = d.getMonth() === month
                const sel = iso === selected
                const isCurrentToday = iso === today
                const dayTasks = dueByDay.get(iso) ?? []
                const openCount = dayTasks.filter((t) => !t.done).length
                const totalCount = dayTasks.length
                const hasOverdueOpen = openCount > 0 && isOverdue(iso)

                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    aria-label={`${formatDueHeading(iso)}${totalCount > 0 ? `, ${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}` : ''}`}
                    aria-pressed={sel}
                    className={`group relative flex aspect-square flex-col items-center justify-between rounded-xl p-1.5 transition-all duration-150 sm:rounded-2xl sm:p-2 ${
                      sel
                        ? 'text-paper-50 font-semibold shadow-xs'
                        : isCurrentToday
                          ? 'bg-paper-200/90 font-bold text-ink-900 hover:bg-paper-200'
                          : inMonth
                            ? 'text-ink-900 hover:bg-paper-200/60'
                            : 'text-ink-400/40 hover:bg-paper-200/40'
                    }`}
                  >
                    {sel && (
                      <motion.div
                        layoutId="calendarSelected"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-pine-600 sm:rounded-2xl shadow-xs"
                      />
                    )}

                    {/* Today small ring marker if not selected */}
                    {isCurrentToday && !sel && (
                      <span className="absolute inset-0 rounded-xl border border-pine-500/30 sm:rounded-2xl" />
                    )}

                    <span className="relative z-10 text-[13.5px] sm:text-[14.5px]">
                      {d.getDate()}
                    </span>

                    {/* Micro Task Indicator Dots */}
                    <div className="relative z-10 flex h-1.5 items-center justify-center gap-0.5">
                      {totalCount > 0 && (
                        <>
                          {sel ? (
                            // High contrast indicators when selected
                            <span className="size-1 rounded-full bg-paper-50" />
                          ) : hasOverdueOpen ? (
                            <span className="size-1 rounded-full bg-terra-600" />
                          ) : openCount > 0 ? (
                            <>
                              <span className="size-1 rounded-full bg-pine-600" />
                              {openCount > 1 && <span className="size-1 rounded-full bg-pine-600/70" />}
                              {openCount > 2 && <span className="size-1 rounded-full bg-pine-600/40" />}
                            </>
                          ) : (
                            <span className="size-1 rounded-full bg-pine-600/35" />
                          )}
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Selected Day Agenda Section */}
      <div className="mt-8 space-y-4">
        {/* Day Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink-900 sm:text-[16.5px]">
              {formatDueHeading(selected)}
            </h2>
            {isTodaySelected ? (
              <span className="inline-flex items-center rounded-md bg-pine-500/20 px-2 py-0.5 text-[11px] font-semibold text-pine-500">
                Today
              </span>
            ) : isTomorrowSelected ? (
              <span className="inline-flex items-center rounded-md bg-slateblue-600/20 px-2 py-0.5 text-[11px] font-semibold text-slateblue-600">
                Tomorrow
              </span>
            ) : isYesterdaySelected ? (
              <span className="inline-flex items-center rounded-md bg-amber-600/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                Yesterday
              </span>
            ) : isSelectedPast && selectedOpen.length > 0 ? (
              <span className="inline-flex items-center rounded-md bg-terra-600/20 px-2 py-0.5 text-[11px] font-semibold text-terra-600">
                Past Due
              </span>
            ) : null}

            {selectedTasks.length > 0 && (
              <span className="text-[12px] font-medium text-ink-400">
                • {selectedOpen.length} open{selectedDone.length > 0 ? `, ${selectedDone.length} done` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenCreateModal && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onOpenCreateModal(null, 'todo', selected)}
                className="inline-flex items-center gap-1 rounded-xl bg-pine-600 px-3 py-1.5 text-[12.5px] font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700"
              >
                <PlusIcon className="size-3.5" />
                <span>Add Task</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Quick Inline Add for Selected Day */}
        <form
          onSubmit={handleQuickAdd}
          className="flex items-center gap-2 rounded-xl bg-paper-100/70 px-3.5 py-2 transition-all focus-within:bg-paper-100 focus-within:ring-2 focus-within:ring-pine-500/25"
        >
          <PlusIcon className="size-4 shrink-0 text-pine-600" />
          <input
            ref={quickInputRef}
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`Add task for ${isTodaySelected ? 'today' : isTomorrowSelected ? 'tomorrow' : formatDueHeading(selected).split(',')[0]} (press Enter)…`}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 outline-none"
          />
          {quickTitle.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              type="submit"
              className="rounded-lg bg-pine-600 px-2.5 py-1 text-[11.5px] font-semibold text-paper-50 shadow-2xs hover:bg-pine-700"
            >
              Add
            </motion.button>
          )}
        </form>

        {/* Tasks List */}
        {selectedOpen.length === 0 && selectedDone.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-paper-200 p-8 text-center"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-paper-200/60 text-ink-400">
              <CalendarIcon className="size-5" />
            </div>
            <p className="mt-3 text-[14.5px] font-medium text-ink-700">No tasks due on this day</p>
            <p className="mt-1 text-[12.5px] text-ink-400">
              Enjoy the quiet, or add a task using the input above.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {selectedOpen.length > 0 && (
              <ul className="space-y-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {selectedOpen.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      done={false}
                      menuOpen={menu?.kind === 'task' && menu.id === t.id}
                      {...rowProps}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {selectedDone.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDone(!showDone)}
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-400 hover:text-ink-600 transition-colors"
                >
                  <ChevronIcon
                    className={`size-3 transition-transform duration-200 ${showDone ? 'rotate-90' : ''}`}
                  />
                  <span>Completed ({selectedDone.length})</span>
                </button>
                {showDone && (
                  <ul className="mt-2 space-y-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {selectedDone.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          done={true}
                          menuOpen={menu?.kind === 'task' && menu.id === t.id}
                          {...rowProps}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
