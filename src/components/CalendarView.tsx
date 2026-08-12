import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDueHeading, getEffectiveDate, monthLabel, toISODate, todayISO } from '../lib/date'
import type { Collection, MenuState, Task } from '../types'
import TaskRow from './TaskRow'
import { ChevronIcon } from './icons'

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
  const { tasks, collections, menu, onMenu, onToggle, onDelete, onUpdate, onMove, onArchive } = props

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayISO())
  const [direction, setDirection] = useState(0)

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

  const selectedOpen = (dueByDay.get(selected) ?? [])
    .filter((t) => !t.done)
    .sort((a, b) => a.createdAt - b.createdAt)
  const selectedDone = (dueByDay.get(selected) ?? []).filter((t) => t.done)

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

  const today = todayISO()

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
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <motion.h1
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: direction * 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="min-w-0 font-serif text-[22px] italic leading-none tracking-tight text-ink-900 sm:text-[27px]"
        >
          {monthLabel(year, month)}
        </motion.h1>
        <div className="flex shrink-0 items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToday}
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:bg-paper-100 hover:text-ink-900"
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-paper-100 hover:text-ink-900"
          >
            <ChevronIcon className="size-4 rotate-180" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-paper-100 hover:text-ink-900"
          >
            <ChevronIcon className="size-4" />
          </motion.button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-7 gap-1"
          >
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                {d}
              </div>
            ))}
            {cells.map((d) => {
              const iso = toISODate(d)
              const inMonth = d.getMonth() === month
              const sel = iso === selected
              const isToday = iso === today
              const hasOpen = (dueByDay.get(iso) ?? []).some((t) => !t.done)
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  aria-label={formatDueHeading(iso)}
                  aria-pressed={sel}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-[14px] transition-colors duration-150 ${
                    sel
                      ? 'font-medium text-paper-50'
                      : isToday
                        ? 'bg-paper-200 font-semibold text-ink-900 hover:bg-paper-200'
                        : inMonth
                          ? 'text-ink-900 hover:bg-paper-100'
                          : 'text-ink-400/50 hover:bg-paper-100'
                  }`}
                >
                  {sel && (
                    <motion.div
                      layoutId="calendarSelected"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-pine-600 shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{d.getDate()}</span>
                  <span className={`relative z-10 size-1 rounded-full ${hasOpen ? (sel ? 'bg-paper-50' : 'bg-pine-500') : 'bg-transparent'}`} />
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          {formatDueHeading(selected)}
        </h2>
        {selectedOpen.length === 0 && selectedDone.length === 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-[15px] text-ink-500"
          >
            Nothing due on this day.
          </motion.p>
        ) : (
          <>
            <ul className="mt-2">
              <AnimatePresence mode="popLayout">
                {selectedOpen.map((t) => (
                  <TaskRow key={t.id} task={t} done={false} menuOpen={menu?.kind === 'task' && menu.id === t.id} {...rowProps} />
                ))}
              </AnimatePresence>
            </ul>
            {selectedDone.length > 0 && (
              <>
                <p className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-400">Completed</p>
                <ul className="mt-1">
                  <AnimatePresence mode="popLayout">
                    {selectedDone.map((t) => (
                      <TaskRow key={t.id} task={t} done={true} menuOpen={menu?.kind === 'task' && menu.id === t.id} {...rowProps} />
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
