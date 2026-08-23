import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  addDaysISO,
  formatDueHeading,
  getEffectiveDate,
  isOverdue,
  monthLabel,
  parseISO,
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
  weekStartsOn?: 'monday' | 'sunday'
  onMenu: (menu: MenuState) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onMove: (id: string, listId: string | null) => void
  onEditDetails?: (task: Task) => void
  onOpenCreateModal?: (listId?: string | null, status?: TaskStatus, dueDate?: string | null) => void
  onAddTask?: (taskData: Partial<Task> & { title: string }) => void
}

function monthCells(year: number, month: number, weekStartsOn: 'monday' | 'sunday' = 'monday'): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  const dayOffset = weekStartsOn === 'sunday' ? first.getDay() : (first.getDay() + 6) % 7
  start.setDate(first.getDate() - dayOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function weekCells(centerDateISO: string, weekStartsOn: 'monday' | 'sunday' = 'monday'): Date[] {
  const d = parseISO(centerDateISO)
  const dayOffset = weekStartsOn === 'sunday' ? d.getDay() : (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - dayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
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
    onEditDetails,
    onOpenCreateModal,
    onAddTask,
    weekStartsOn = 'monday',
  } = props

  const now = new Date()
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month')
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
      const dateKey = getEffectiveDate(t)
      if (!dateKey) continue
      const arr = map.get(dateKey) ?? []
      arr.push(t)
      map.set(dateKey, arr)
    }
    return map
  }, [tasks])

  const currentWeekDays = useMemo(() => weekCells(selected, weekStartsOn), [selected, weekStartsOn])
  const cells = useMemo(() => monthCells(year, month, weekStartsOn), [year, month, weekStartsOn])

  const selectedTasks = dueByDay.get(selected) ?? []
  const selectedOpen = selectedTasks
    .filter((t) => !t.done)
    .sort((a, b) => a.createdAt - b.createdAt)
  const selectedDone = selectedTasks.filter((t) => t.done)

  const shift = (delta: number) => {
    setDirection(delta)
    if (calendarMode === 'week') {
      const nextDate = addDaysISO(selected, delta * 7)
      setSelected(nextDate)
      const d = parseISO(nextDate)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    } else {
      const d = new Date(year, month + delta, 1)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
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
    onEditDetails,
  }

  const weekHeading = useMemo(() => {
    const start = currentWeekDays[0]
    const end = currentWeekDays[6]
    const startFmt = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endFmt = end.toLocaleDateString('en-US', {
      month: start.getMonth() === end.getMonth() ? undefined : 'short',
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
    })
    return `${startFmt} – ${endFmt}`
  }, [currentWeekDays])

  const weekdays = weekStartsOn === 'sunday'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-7 lg:items-start">
      {/* Left Column: Calendar Header & Day Grid */}
      <div className="lg:col-span-7 space-y-4">
        {/* Calendar Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <motion.h1
              key={calendarMode === 'week' ? weekHeading : `${year}-${month}`}
              initial={{ opacity: 0, x: direction * 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 font-sans text-title-lg font-bold leading-none tracking-tight text-ink-900 sm:text-display"
            >
              {calendarMode === 'week' ? weekHeading : monthLabel(year, month)}
            </motion.h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-paper-100 p-0.5 border border-paper-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                className={`rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                  calendarMode === 'month'
                    ? 'bg-paper-50 font-semibold text-ink-900 shadow-xs'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('week')}
                className={`rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                  calendarMode === 'week'
                    ? 'bg-paper-50 font-semibold text-ink-900 shadow-xs'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Week
              </button>
            </div>

            {/* Navigation & Today */}
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={goToday}
                className={`rounded-xl px-2.5 py-1 text-small font-semibold transition-all duration-150 cursor-pointer ${
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
                aria-label={calendarMode === 'week' ? 'Previous week' : 'Previous month'}
                className="rounded-xl p-1.5 text-ink-500 transition-colors duration-150 hover:bg-paper-200/80 hover:text-ink-900 cursor-pointer"
              >
                <ChevronIcon className="size-4 rotate-180" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => shift(1)}
                aria-label={calendarMode === 'week' ? 'Next week' : 'Next month'}
                className="rounded-xl p-1.5 text-ink-500 transition-colors duration-150 hover:bg-paper-200/80 hover:text-ink-900 cursor-pointer"
              >
                <ChevronIcon className="size-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Calendar Boxed Card */}
        <div className="rounded-2xl border border-paper-200/80 bg-paper-100/50 p-2.5 sm:p-3.5 shadow-2xs backdrop-blur-xs">
          {/* Weekday Column Headers */}
          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {weekdays.map((d, i) => (
              <div
                key={i}
                className="py-1 text-center text-caption font-semibold uppercase tracking-[0.12em] text-ink-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid of Boxed Day Cells */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={calendarMode === 'week' ? `week-${selected}` : `${year}-${month}`}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-7 gap-1 sm:gap-1.5"
              >
                {(calendarMode === 'week' ? currentWeekDays : cells).map((d) => {
                  const iso = toISODate(d)
                  const inMonth = d.getMonth() === month || calendarMode === 'week'
                  const sel = iso === selected
                  const isCurrentToday = iso === today
                  const dayTasks = dueByDay.get(iso) ?? []
                  const openCount = dayTasks.filter((t) => !t.done).length
                  const totalCount = dayTasks.length
                  const hasOverdueOpen = openCount > 0 && isOverdue(iso)

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        setSelected(iso)
                        setYear(d.getFullYear())
                        setMonth(d.getMonth())
                      }}
                      aria-label={`${formatDueHeading(iso)}${totalCount > 0 ? `, ${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}` : ''}`}
                      aria-pressed={sel}
                      className={`group relative flex flex-col justify-between rounded-xl p-1.5 sm:p-2 transition-all duration-150 cursor-pointer border text-left ${
                        calendarMode === 'week'
                          ? 'min-h-[82px] sm:min-h-[96px]'
                          : 'min-h-[54px] sm:min-h-[62px]'
                      } ${
                        sel
                          ? 'bg-pine-600 border-pine-500 text-[#fbf9f5] shadow-xs'
                          : isCurrentToday
                            ? 'bg-pine-50/40 border-pine-500/50 text-ink-900 hover:bg-pine-50/70 hover:border-pine-500/70'
                            : inMonth
                              ? 'bg-paper-100/70 border-paper-200/70 text-ink-900 hover:bg-paper-200/80 hover:border-paper-300/80'
                              : 'bg-paper-100/25 border-paper-200/30 text-ink-500/40 hover:bg-paper-100/50 hover:border-paper-200/60 hover:text-ink-500/70'
                      }`}
                    >
                      {/* Day Number and Today / Active Marker */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-body font-semibold leading-none ${
                            sel
                              ? 'text-[#fbf9f5]'
                              : isCurrentToday
                                ? 'text-pine-400 font-bold'
                                : inMonth
                                  ? 'text-ink-900'
                                  : 'text-ink-500/50'
                          }`}
                        >
                          {d.getDate()}
                        </span>

                        {isCurrentToday && !sel && (
                          <span className="size-1.5 rounded-full bg-pine-500" title="Today" />
                        )}
                      </div>

                      {/* Task Count & Status Indicators */}
                      <div className="mt-auto pt-1 flex items-center justify-between w-full">
                        {totalCount > 0 ? (
                          <div className="flex items-center gap-1">
                            {sel ? (
                              <span className="inline-flex items-center rounded-md bg-white/20 px-1.5 py-0.5 text-micro font-bold text-[#fbf9f5]">
                                {openCount > 0 ? openCount : '✓'}
                              </span>
                            ) : hasOverdueOpen ? (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-terra-500/20 px-1.5 py-0.5 text-micro font-bold text-terra-500">
                                {openCount}
                              </span>
                            ) : openCount > 0 ? (
                              <span className="inline-flex items-center rounded-md bg-pine-500/20 px-1.5 py-0.5 text-micro font-bold text-pine-400">
                                {openCount}
                              </span>
                            ) : (
                              <span className="text-micro font-medium text-ink-500">
                                ✓
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-3.5" />
                        )}

                        {calendarMode === 'week' && totalCount > 0 && (
                          <span
                            className={`text-micro hidden sm:inline ${
                              sel ? 'text-white/80' : 'text-ink-400'
                            }`}
                          >
                            {totalCount === 1 ? '1 task' : `${totalCount} tasks`}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right Column: Selected Day Agenda & Tasks (Sticky on Desktop) */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
        {/* Day Section Header */}
        <div className="rounded-2xl border border-paper-200/80 bg-paper-100/50 p-4 shadow-2xs backdrop-blur-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-200/80 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-title font-bold text-ink-900">
                  {formatDueHeading(selected)}
                </h2>
                {isTodaySelected ? (
                  <span className="inline-flex items-center rounded-md bg-pine-500/20 px-2 py-0.5 text-caption font-semibold text-pine-500">
                    Today
                  </span>
                ) : isTomorrowSelected ? (
                  <span className="inline-flex items-center rounded-md bg-slateblue-600/20 px-2 py-0.5 text-caption font-semibold text-slateblue-600">
                    Tomorrow
                  </span>
                ) : isYesterdaySelected ? (
                  <span className="inline-flex items-center rounded-md bg-amber-600/20 px-2 py-0.5 text-caption font-semibold text-amber-600">
                    Yesterday
                  </span>
                ) : isSelectedPast && selectedOpen.length > 0 ? (
                  <span className="inline-flex items-center rounded-md bg-terra-600/20 px-2 py-0.5 text-caption font-semibold text-terra-600">
                    Past Due
                  </span>
                ) : null}
              </div>

              {selectedTasks.length > 0 && (
                <p className="mt-1 text-small font-medium text-ink-500">
                  {selectedOpen.length} open{selectedDone.length > 0 ? `, ${selectedDone.length} done` : ''}
                </p>
              )}
            </div>

            {onOpenCreateModal && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onOpenCreateModal(null, 'todo', selected)}
                className="inline-flex items-center gap-1 rounded-xl bg-pine-600 px-2.5 py-1 text-small font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 cursor-pointer"
              >
                <PlusIcon className="size-3.5" />
                <span>New</span>
              </motion.button>
            )}
          </div>

          {/* Quick Inline Add for Selected Day */}
          <form
            onSubmit={handleQuickAdd}
            className="flex items-center gap-2 rounded-xl bg-paper-100 px-3 py-2 border border-paper-200/80 transition-all focus-within:ring-2 focus-within:ring-pine-500/25"
          >
            <PlusIcon className="size-4 shrink-0 text-pine-600" />
            <input
              ref={quickInputRef}
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`Add task for ${isTodaySelected ? 'today' : isTomorrowSelected ? 'tomorrow' : formatDueHeading(selected).split(',')[0]} (Enter)…`}
              className="min-w-0 flex-1 bg-transparent text-body text-ink-900 placeholder:text-ink-400 outline-none"
            >
            </input>
            {quickTitle.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                type="submit"
                className="rounded-lg bg-pine-600 px-2 py-0.5 text-caption font-semibold text-paper-50 shadow-2xs hover:bg-pine-700 cursor-pointer"
              >
                Add
              </motion.button>
            )}
          </form>

          {/* Task List / Empty State for Selected Day */}
          {selectedOpen.length === 0 && selectedDone.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-paper-200/80 py-8 px-4 text-center"
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-paper-200/60 text-ink-400">
                <CalendarIcon className="size-4" />
              </div>
              <p className="mt-2 text-body font-medium text-ink-700">No tasks for this day</p>
              <p className="mt-0.5 text-small text-ink-400">
                Enjoy the quiet or schedule a task above.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
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
                <div className="pt-2 border-t border-paper-200/60">
                  <button
                    type="button"
                    onClick={() => setShowDone(!showDone)}
                    className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-ink-400 hover:text-ink-600 transition-colors cursor-pointer"
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
    </div>
  )
}
