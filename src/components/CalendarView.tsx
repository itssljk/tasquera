import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRINGS } from '../lib/motion'
import { useIsDesktop } from '../lib/useMediaQuery'
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
import { ChevronIcon, PlusIcon } from './icons'

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
    onAddTask,
    weekStartsOn = 'monday',
  } = props

  const isDesktop = useIsDesktop()
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
    <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
      {/* Left Column: Calendar Header & Day Grid */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-5">
        {/* Calendar Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <motion.h2
              key={calendarMode === 'week' ? weekHeading : `${year}-${month}`}
              initial={{ opacity: 0, x: direction * 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 font-serif italic text-display sm:text-display-md font-normal leading-tight tracking-tight text-ink-900 pb-0.5"
            >
              {calendarMode === 'week' ? weekHeading : monthLabel(year, month)}
            </motion.h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Mode Switcher */}
            <div className="relative flex items-center rounded-xl bg-paper-100 p-0.5 border border-paper-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                className={`relative z-1 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                  calendarMode === 'month'
                    ? 'font-semibold text-ink-900'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {calendarMode === 'month' && (
                  <motion.div
                    layoutId="calendarModeActive"
                    transition={SPRINGS.liquidPill}
                    className="absolute inset-0 rounded-lg bg-paper-50 shadow-xs border border-paper-200/60"
                  />
                )}
                <span className="relative z-1">Month</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('week')}
                className={`relative z-1 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                  calendarMode === 'week'
                    ? 'font-semibold text-ink-900'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {calendarMode === 'week' && (
                  <motion.div
                    layoutId="calendarModeActive"
                    transition={SPRINGS.liquidPill}
                    className="absolute inset-0 rounded-lg bg-paper-50 shadow-xs border border-paper-200/60"
                  />
                )}
                <span className="relative z-1">Week</span>
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
                    ? 'bg-pine-500/20 text-pine-400'
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

        {/* Continuous Architectural Grid */}
        <div className="space-y-2">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 text-center pb-1">
            {weekdays.map((d, i) => (
              <div
                key={i}
                className="py-1 text-center text-caption font-medium uppercase tracking-[0.14em] text-ink-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells with Clean Shared Hairline Borders */}
          <div className="overflow-hidden rounded-2xl border border-paper-200/60 bg-paper-200/35 p-px shadow-2xs">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={calendarMode === 'week' ? `week-${selected}` : `${year}-${month}`}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-7 gap-px"
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
                    <motion.button
                      key={iso}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelected(iso)
                        setYear(d.getFullYear())
                        setMonth(d.getMonth())
                      }}
                      aria-label={`${formatDueHeading(iso)}${totalCount > 0 ? `, ${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}` : ''}`}
                      aria-pressed={sel}
                      className={`group relative flex flex-col justify-between p-1.5 sm:p-2.5 transition-colors duration-150 cursor-pointer text-left overflow-hidden ${
                        calendarMode === 'week'
                          ? 'min-h-[120px] sm:min-h-[180px] lg:min-h-[220px]'
                          : 'min-h-[52px] sm:min-h-[108px] lg:min-h-[116px]'
                      } ${
                        sel
                          ? 'z-10'
                          : isCurrentToday
                            ? 'bg-paper-50/90 hover:bg-paper-100/70'
                            : inMonth
                              ? 'bg-paper-50/70 hover:bg-paper-100/60'
                              : 'bg-paper-50/25 hover:bg-paper-100/30'
                      }`}
                    >
                      {sel && (
                        <motion.div
                          layoutId="calendarSelectedDayHalo"
                          transition={SPRINGS.liquidPill}
                          className="absolute inset-0 bg-paper-100/95 ring-2 ring-inset ring-pine-500/70 z-0 pointer-events-none"
                        />
                      )}

                      {/* Day Number and Status Badge */}
                      <div className="relative z-1 flex items-center justify-between w-full">
                        {isCurrentToday ? (
                          <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-pine-600 text-caption font-bold text-[#fbf9f5] shadow-2xs">
                            {d.getDate()}
                          </span>
                        ) : (
                          <span
                            className={`text-body font-medium tabular-nums leading-none ${
                              sel
                                ? 'font-semibold text-ink-900'
                                : inMonth
                                  ? 'text-ink-900'
                                  : 'text-ink-400/40'
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        )}

                        {totalCount > 0 && (
                          <span
                            className={`text-micro tabular-nums font-semibold ${
                              hasOverdueOpen
                                ? 'text-terra-500'
                                : openCount > 0
                                  ? 'text-ink-500 group-hover:text-ink-800'
                                  : 'text-pine-400 font-bold'
                            }`}
                          >
                            {openCount > 0 ? `${openCount}` : '✓'}
                          </span>
                        )}
                      </div>

                      {/* Task preview snippets inside the day cell */}
                      <div className="relative z-1 mt-1.5 flex flex-col gap-1 w-full overflow-hidden">
                        {calendarMode === 'week' ? (
                          <>
                            {dayTasks.slice(0, 5).map((t) => (
                              <div
                                key={t.id}
                                className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-micro truncate transition-colors ${
                                  t.done
                                    ? 'bg-paper-200/40 text-ink-400/70 line-through'
                                    : isOverdue(iso)
                                      ? 'bg-terra-500/10 text-terra-300 font-medium'
                                      : sel
                                        ? 'bg-paper-200/90 text-ink-900 font-medium'
                                        : 'bg-paper-200/60 text-ink-700 font-medium'
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full shrink-0 ${
                                    t.done
                                      ? 'bg-ink-400/40'
                                      : isOverdue(iso)
                                        ? 'bg-terra-500'
                                        : 'bg-pine-500'
                                  }`}
                                />
                                <span className="truncate">{t.title}</span>
                              </div>
                            ))}
                            {totalCount > 5 && (
                              <span className="text-micro tabular-nums text-ink-400 px-1 font-medium">
                                +{totalCount - 5} more
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Mobile status indicator dots */}
                            <div className="flex sm:hidden items-center justify-center gap-1 pt-0.5">
                              {dayTasks.slice(0, 3).map((t) => (
                                <span
                                  key={t.id}
                                  className={`size-1.5 rounded-full shrink-0 ${
                                    t.done
                                      ? 'bg-ink-400/40'
                                      : isOverdue(iso)
                                        ? 'bg-terra-500'
                                        : 'bg-pine-500'
                                  }`}
                                />
                              ))}
                              {totalCount > 3 && (
                                <span className="text-[9px] font-bold text-ink-400 leading-none">
                                  +
                                </span>
                              )}
                            </div>

                            {/* Tablet & Desktop text snippets */}
                            <div className="hidden sm:flex flex-col gap-1 w-full">
                              {dayTasks.slice(0, 2).map((t) => (
                                <div
                                  key={t.id}
                                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-micro truncate transition-colors ${
                                    t.done
                                      ? 'bg-paper-200/40 text-ink-400/70 line-through'
                                      : isOverdue(iso)
                                        ? 'bg-terra-500/10 text-terra-300 font-medium'
                                        : sel
                                          ? 'bg-paper-200/90 text-ink-900 font-medium'
                                          : 'bg-paper-200/60 text-ink-700 font-medium'
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full shrink-0 ${
                                      t.done
                                        ? 'bg-ink-400/40'
                                        : isOverdue(iso)
                                          ? 'bg-terra-500'
                                          : 'bg-pine-500'
                                    }`}
                                  />
                                  <span className="truncate">{t.title}</span>
                                </div>
                              ))}
                              {totalCount > 2 && (
                                <span className="text-micro tabular-nums text-ink-400 px-1 font-medium">
                                  +{totalCount - 2} more
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right Column: Selected Day Agenda & Tasks (Sticky on Desktop) */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 space-y-4 lg:pl-6 lg:border-l lg:border-paper-200/50">
        <div>
          {/* Day Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-serif italic text-title-lg sm:text-display font-normal text-ink-900 leading-tight">
                  {formatDueHeading(selected)}
                </h2>
                {isTodaySelected ? (
                  <span className="inline-flex items-center rounded-full bg-pine-500/15 px-2.5 py-0.5 text-caption font-medium text-pine-400">
                    Today
                  </span>
                ) : isTomorrowSelected ? (
                  <span className="inline-flex items-center rounded-full bg-slateblue-600/15 px-2.5 py-0.5 text-caption font-medium text-slateblue-400">
                    Tomorrow
                  </span>
                ) : isYesterdaySelected ? (
                  <span className="inline-flex items-center rounded-full bg-amber-600/15 px-2.5 py-0.5 text-caption font-medium text-amber-500">
                    Yesterday
                  </span>
                ) : isSelectedPast && selectedOpen.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-terra-600/15 px-2.5 py-0.5 text-caption font-medium text-terra-500">
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
          </div>

          {/* Quick Inline Add for Selected Day */}
          <form
            onSubmit={handleQuickAdd}
            className="group relative mb-4 flex items-center gap-3 rounded-xl bg-paper-100/70 px-3.5 py-2.5 ring-1 ring-paper-200/80 transition-all focus-within:bg-paper-100 focus-within:ring-2 focus-within:ring-pine-500/40"
          >
            <PlusIcon className="size-4 shrink-0 text-pine-500" />
            <input
              ref={quickInputRef}
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`Add task for ${isTodaySelected ? 'today' : isTomorrowSelected ? 'tomorrow' : formatDueHeading(selected).split(',')[0]}${isDesktop ? ' (Enter to save)' : ''}…`}
              className="w-full bg-transparent text-body font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            {quickTitle.trim() && (
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-pine-600 px-2.5 py-1 text-caption font-semibold text-[#fbf9f5] transition-colors hover:bg-pine-700 cursor-pointer"
              >
                Add
              </button>
            )}
          </form>

          {/* Task List / Empty State for Selected Day */}
          {selectedOpen.length === 0 && selectedDone.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <p className="text-body font-medium text-ink-700">No scheduled tasks</p>
              <p className="mt-1 font-sans text-body text-ink-500">
                Enjoy the quiet of an open horizon.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {selectedOpen.length > 0 && (
                <ul className="space-y-0">
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
                <div className="pt-3 border-t border-paper-200/50">
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
                    <ul className="mt-2 space-y-0">
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
