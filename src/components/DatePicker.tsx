import { useState } from 'react'
import {
  formatDue,
  monthLabel,
  parseISO,
  todayISO,
  toISODate,
} from '../lib/date'
import { CalendarIcon, ChevronIcon, CloseIcon } from './icons'

/* ------------------------------------------------------------------ */
/* Trigger chip                                                        */
/* ------------------------------------------------------------------ */

export interface DatePickerTriggerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  accentColor?: 'pine' | 'amber'
  /** Whether this chip's calendar panel is currently expanded. */
  open: boolean
  onToggle: () => void
}

export function DatePickerTrigger(props: DatePickerTriggerProps) {
  const {
    value,
    onChange,
    placeholder = 'Set due date',
    accentColor = 'pine',
    open,
    onToggle,
  } = props

  const iconColor = accentColor === 'amber' ? 'text-amber-600' : 'text-pine-600'
  const displayText = value ? formatDue(value) : placeholder

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-150 hover:bg-paper-200/80 ${
        open ? 'bg-paper-200/70' : ''
      }`}
    >
      <span className="flex items-center transition-transform duration-150 group-hover:scale-110">
        <CalendarIcon className={`size-3.5 shrink-0 ${iconColor}`} />
      </span>

      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 text-body font-medium transition-colors outline-none cursor-pointer ${
          value ? 'text-ink-900 font-semibold' : 'text-ink-500 group-hover:text-ink-900 hover:text-ink-900'
        }`}
      >
        <span>{displayText}</span>
      </button>

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
          aria-label="Clear date"
          className="ml-0.5 rounded-md p-0.5 text-ink-400 hover:bg-paper-200 hover:text-ink-900 transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer"
        >
          <CloseIcon className="size-3" />
        </button>
      )}

      <ChevronIcon
        className={`size-3 shrink-0 text-ink-400 transition-all duration-200 group-hover:text-ink-700 ${
          open ? 'rotate-180 text-ink-900' : 'group-hover:translate-y-[1px]'
        }`}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inline calendar panel                                               */
/* ------------------------------------------------------------------ */

export interface DatePickerPanelProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  accentColor?: 'pine' | 'amber'
  weekStartsOn?: 'monday' | 'sunday'
  onClose: () => void
}

function get42CalendarDays(year: number, month: number, weekStartsOn: 'monday' | 'sunday' = 'monday'): Date[] {
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

export function DatePickerPanel(props: DatePickerPanelProps) {
  const {
    value,
    onChange,
    accentColor = 'pine',
    weekStartsOn = 'monday',
    onClose,
  } = props

  // The panel remounts each time it opens, so initializing from the current
  // value keeps the calendar view in sync with what's selected.
  const initialDateObj = value ? parseISO(value) : new Date()
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth())

  const today = todayISO()
  const days = get42CalendarDays(viewYear, viewMonth, weekStartsOn)

  // Handlers
  const handleSelectDate = (isoDate: string) => {
    onChange(isoDate)
    onClose()
  }

  const handleClear = () => {
    onChange('')
    onClose()
  }

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const goTodayView = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }

  // Accent styling tokens
  const selectedBg = accentColor === 'amber' ? 'bg-amber-600 text-paper-50 font-semibold' : 'bg-pine-600 text-paper-50 font-semibold'

  return (
    <div className="w-full rounded-2xl border border-paper-200/80 bg-paper-100 p-3.5 text-ink-900 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.85)]">
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between">
        <span className="font-sans text-body-lg font-semibold text-ink-900">
          {monthLabel(viewYear, viewMonth)}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goTodayView}
            className="rounded-md px-1.5 py-0.5 text-caption font-medium text-ink-500 hover:bg-paper-200 hover:text-ink-900 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg p-1 text-ink-500 hover:bg-paper-200 hover:text-ink-900 transition-colors"
          >
            <ChevronIcon className="size-3.5 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-lg p-1 text-ink-500 hover:bg-paper-200 hover:text-ink-900 transition-colors"
          >
            <ChevronIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 7-column Calendar Grid */}
      <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
        {(weekStartsOn === 'sunday'
          ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
          : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        ).map((d, idx) => (
          <span key={idx} className="text-micro font-bold uppercase tracking-wider text-ink-400 py-0.5">
            {d}
          </span>
        ))}

        {days.map((cellDate, idx) => {
          const cellIso = toISODate(cellDate)
          const inCurrentMonth = cellDate.getMonth() === viewMonth
          const isSelected = cellIso === value
          const isTodayCell = cellIso === today

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(cellIso)}
              className={`relative flex aspect-square w-full items-center justify-center rounded-lg text-small transition-all ${
                isSelected
                  ? selectedBg
                  : inCurrentMonth
                  ? 'text-ink-900 hover:bg-paper-200/80 font-medium'
                  : 'text-ink-400/50 hover:bg-paper-100 hover:text-ink-600'
              }`}
            >
              <span>{cellDate.getDate()}</span>
              {isTodayCell && !isSelected && (
                <span className="absolute bottom-1 size-1 rounded-full bg-pine-600" />
              )}
            </button>
          )
        })}
      </div>

      {/* Footer Bar */}
      <div className="mt-3.5 pt-2.5 border-t border-paper-200/60 flex items-center justify-between text-small">
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="font-medium text-terra-600 hover:text-terra-700 transition-colors"
          >
            Clear date
          </button>
        ) : (
          <span className="text-ink-400">Select date</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-paper-200 px-3 py-1 font-semibold text-ink-900 hover:bg-paper-300/80 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
