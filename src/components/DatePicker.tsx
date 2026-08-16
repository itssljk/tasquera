import { useState } from 'react'
import {
  formatDeadline,
  formatDue,
  formatTimeLabel,
  monthLabel,
  parseISO,
  parseISODatetime,
  todayISO,
  toISODate,
} from '../lib/date'
import { CalendarIcon, ChevronIcon, ClockIcon, CloseIcon } from './icons'

/* ------------------------------------------------------------------ */
/* Trigger chip                                                        */
/* ------------------------------------------------------------------ */

export interface DatePickerTriggerProps {
  value: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  mode?: 'date' | 'datetime'
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
    mode = 'date',
    placeholder = mode === 'datetime' ? 'Set deadline' : 'Set due date',
    accentColor = mode === 'datetime' ? 'amber' : 'pine',
    open,
    onToggle,
  } = props

  const iconColor = accentColor === 'amber' ? 'text-amber-600' : 'text-pine-600'

  let displayText = placeholder
  if (value) {
    displayText = mode === 'datetime' ? formatDeadline(value) : formatDue(value)
  }

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-150 hover:bg-paper-200/80 ${
        open ? 'bg-paper-200/70' : ''
      }`}
    >
      <span className="flex items-center transition-transform duration-150 group-hover:scale-110">
        {mode === 'datetime' ? (
          <ClockIcon className={`size-3.5 shrink-0 ${iconColor}`} />
        ) : (
          <CalendarIcon className={`size-3.5 shrink-0 ${iconColor}`} />
        )}
      </span>

      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 text-[13px] font-medium transition-colors outline-none cursor-pointer ${
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
  value: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  mode?: 'date' | 'datetime'
  accentColor?: 'pine' | 'amber'
  onClose: () => void
}

function get42CalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  // Monday-first calculation
  const dayOffset = (first.getDay() + 6) % 7
  start.setDate(first.getDate() - dayOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

interface AnalogClockPickerProps {
  timeStr: string // "HH:mm"
  onChangeTime: (timeStr: string) => void
}

function AnalogClockPicker({ timeStr, onChangeTime }: AnalogClockPickerProps) {
  const [clockMode, setClockMode] = useState<'hours' | 'minutes'>('hours')

  const [hStr, mStr] = (timeStr || '09:00').split(':')
  const hours24 = parseInt(hStr || '9', 10)
  const minutes = parseInt(mStr || '0', 10)

  const isPM = hours24 >= 12
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12

  const updateTime = (newHour12: number, newMinute: number, newIsPM: boolean) => {
    let h24 = newHour12 % 12
    if (newIsPM) h24 += 12
    const hFormatted = String(h24).padStart(2, '0')
    const mFormatted = String(newMinute).padStart(2, '0')
    onChangeTime(`${hFormatted}:${mFormatted}`)
  }

  const toggleAMPM = (pm: boolean) => {
    updateTime(hour12, minutes, pm)
  }

  const handleHourClick = (h: number) => {
    updateTime(h, minutes, isPM)
    setClockMode('minutes')
  }

  const handleMinuteClick = (m: number) => {
    updateTime(hour12, m, isPM)
  }

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  const radius = 64

  return (
    <div className="flex flex-col items-center py-1">
      {/* Time Header Readout & AM/PM Toggle */}
      <div className="flex items-center justify-between w-full px-2 mb-3">
        {/* Hour / Minute Toggle Buttons */}
        <div className="flex items-center gap-1 font-mono text-[22px] font-bold text-ink-900">
          <button
            type="button"
            onClick={() => setClockMode('hours')}
            className={`rounded-lg px-2 py-0.5 transition-all ${
              clockMode === 'hours' ? 'bg-amber-600/20 text-amber-600 ring-1 ring-amber-500/40' : 'hover:bg-paper-200/70'
            }`}
          >
            {String(hour12).padStart(2, '0')}
          </button>
          <span className="text-ink-400">:</span>
          <button
            type="button"
            onClick={() => setClockMode('minutes')}
            className={`rounded-lg px-2 py-0.5 transition-all ${
              clockMode === 'minutes' ? 'bg-amber-600/20 text-amber-600 ring-1 ring-amber-500/40' : 'hover:bg-paper-200/70'
            }`}
          >
            {String(minutes).padStart(2, '0')}
          </button>
        </div>

        {/* AM / PM Toggle Pill */}
        <div className="flex items-center rounded-lg bg-paper-200/60 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => toggleAMPM(false)}
            className={`rounded-md px-2 py-1 transition-all ${
              !isPM ? 'bg-amber-600 text-paper-50 shadow-2xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => toggleAMPM(true)}
            className={`rounded-md px-2 py-1 transition-all ${
              isPM ? 'bg-amber-600 text-paper-50 shadow-2xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Analog Clock Dial */}
      <div className="relative size-[180px] rounded-full bg-paper-200/40 border border-paper-200/80 shadow-inner flex items-center justify-center select-none">
        {/* Center Mode Label */}
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400/80">
          {clockMode}
        </span>

        {/* Clock Numbers / Ticks */}
        {clockMode === 'hours'
          ? hoursList.map((h) => {
              const angleDeg = h * 30 - 90
              const rad = (angleDeg * Math.PI) / 180
              const x = Math.round(radius * Math.cos(rad))
              const y = Math.round(radius * Math.sin(rad))
              const isSelected = hour12 === h

              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHourClick(h)}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute flex size-7 items-center justify-center rounded-full text-[12.5px] font-semibold transition-colors z-20 ${
                    isSelected ? 'text-paper-50 font-bold' : 'text-ink-700 hover:bg-paper-200/80 hover:text-ink-900'
                  }`}
                >
                  {isSelected && <span className="absolute inset-0 rounded-full bg-amber-600 shadow-2xs z-[-1]" />}
                  <span className="relative z-10">{h}</span>
                </button>
              )
            })
          : minutesList.map((m) => {
              const angleDeg = m * 6 - 90
              const rad = (angleDeg * Math.PI) / 180
              const x = Math.round(radius * Math.cos(rad))
              const y = Math.round(radius * Math.sin(rad))
              const isSelected = Math.abs(minutes - m) < 3

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinuteClick(m)}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute flex size-7 items-center justify-center rounded-full text-[11.5px] font-semibold transition-colors z-20 ${
                    isSelected ? 'text-paper-50 font-bold' : 'text-ink-700 hover:bg-paper-200/80 hover:text-ink-900'
                  }`}
                >
                  {isSelected && <span className="absolute inset-0 rounded-full bg-amber-600 shadow-2xs z-[-1]" />}
                  <span className="relative z-10">{String(m).padStart(2, '0')}</span>
                </button>
              )
            })}
      </div>
    </div>
  )
}

export function DatePickerPanel(props: DatePickerPanelProps) {
  const {
    value,
    onChange,
    mode = 'date',
    accentColor = mode === 'datetime' ? 'amber' : 'pine',
    onClose,
  } = props

  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date')

  // The panel remounts each time it opens, so initializing from the current
  // value keeps the calendar view in sync with what's selected.
  const initialDateObj = value ? (mode === 'datetime' ? parseISO(value.split('T')[0]) : parseISO(value)) : new Date()
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth())

  const parsed = mode === 'datetime' ? parseISODatetime(value) : { date: value, time: '09:00' }
  const selectedDateStr = parsed.date
  const selectedTimeStr = parsed.time

  const today = todayISO()
  const days = get42CalendarDays(viewYear, viewMonth)

  // Handlers
  const handleSelectDate = (isoDate: string) => {
    if (mode === 'date') {
      onChange(isoDate)
      onClose()
    } else {
      const timeToUse = selectedTimeStr || '09:00'
      onChange(`${isoDate}T${timeToUse}`)
      setActiveTab('time')
    }
  }

  const handleSelectTime = (timeStr: string) => {
    const dateToUse = selectedDateStr || today
    onChange(`${dateToUse}T${timeStr}`)
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
      {/* Segmented Tab Switcher (for datetime mode) */}
      {mode === 'datetime' && (
        <div className="mb-3 flex items-center gap-1 rounded-xl bg-paper-200/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('date')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-all ${
              activeTab === 'date'
                ? 'bg-paper-50 text-ink-900 shadow-2xs ring-1 ring-paper-300/30'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <CalendarIcon className="size-3.5 text-pine-600" />
            <span>{selectedDateStr ? formatDue(selectedDateStr) : 'Date'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-all ${
              activeTab === 'time'
                ? 'bg-paper-50 text-ink-900 shadow-2xs ring-1 ring-paper-300/30'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <ClockIcon className="size-3.5" />
            <span>{selectedTimeStr ? formatTimeLabel(selectedTimeStr) : 'Time'}</span>
          </button>
        </div>
      )}

      {/* DATE TAB VIEW */}
      {(mode === 'date' || activeTab === 'date') && (
        <div>
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-[15px] font-semibold text-ink-900">
              {monthLabel(viewYear, viewMonth)}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={goTodayView}
                className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-500 hover:bg-paper-200 hover:text-ink-900 transition-colors"
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

          {/* 7-column Calendar Grid (cells stretch to fill the card) */}
          <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <span key={idx} className="text-[10px] font-bold uppercase tracking-wider text-ink-400 py-0.5">
                {d}
              </span>
            ))}

            {days.map((cellDate, idx) => {
              const cellIso = toISODate(cellDate)
              const inCurrentMonth = cellDate.getMonth() === viewMonth
              const isSelected = cellIso === selectedDateStr
              const isTodayCell = cellIso === today

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cellIso)}
                  className={`relative flex aspect-square w-full items-center justify-center rounded-lg text-[12.5px] transition-all ${
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
        </div>
      )}

      {/* TIME TAB VIEW: ANALOG CLOCK PICKER */}
      {mode === 'datetime' && activeTab === 'time' && (
        <AnalogClockPicker
          timeStr={selectedTimeStr}
          onChangeTime={handleSelectTime}
        />
      )}

      {/* Footer Bar */}
      <div className="mt-3.5 pt-2.5 border-t border-paper-200/60 flex items-center justify-between text-[12px]">
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
