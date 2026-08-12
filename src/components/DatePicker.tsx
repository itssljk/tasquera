import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

export interface DatePickerProps {
  value: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  mode?: 'date' | 'datetime'
  label?: string
  placeholder?: string
  icon?: React.ReactNode
  accentColor?: 'pine' | 'amber'
  align?: 'left' | 'right'
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
                  {isSelected && (
                    <motion.div
                      layoutId="clock-active-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                      className="absolute inset-0 rounded-full bg-amber-600 shadow-2xs z-[-1]"
                    />
                  )}
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
                  {isSelected && (
                    <motion.div
                      layoutId="clock-active-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                      className="absolute inset-0 rounded-full bg-amber-600 shadow-2xs z-[-1]"
                    />
                  )}
                  <span className="relative z-10">{String(m).padStart(2, '0')}</span>
                </button>
              )
            })}
      </div>
    </div>
  )
}

export default function DatePicker(props: DatePickerProps) {
  const {
    value,
    onChange,
    mode = 'date',
    label,
    placeholder = mode === 'datetime' ? 'Set deadline' : 'Set due date',
    icon,
    accentColor = mode === 'datetime' ? 'amber' : 'pine',
    align = 'left',
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date')

  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Current view year & month for calendar navigation
  const initialDateObj = value ? (mode === 'datetime' ? parseISO(value.split('T')[0]) : parseISO(value)) : new Date()
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth())

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverHeight = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    let top: number
    if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6
    } else {
      top = rect.top - popoverHeight - 6
    }
    top = Math.max(12, Math.min(top, window.innerHeight - popoverHeight - 12))

    let left = align === 'right' ? rect.right - 288 : rect.left
    left = Math.max(12, Math.min(left, window.innerWidth - 300))

    setCoords({ top, left })
  }

  // Reset tab & sync calendar view ONLY when popover transitions to open
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const activeObj = value ? (mode === 'datetime' ? parseISO(value.split('T')[0]) : parseISO(value)) : new Date()
      setViewYear(activeObj.getFullYear())
      setViewMonth(activeObj.getMonth())
      setActiveTab('date')
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  // Update popover position when opened or tab changes
  useEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, activeTab])

  // Reposition on resize and scroll
  useEffect(() => {
    if (!isOpen) return
    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const parsed = mode === 'datetime' ? parseISODatetime(value) : { date: value, time: '09:00' }
  const selectedDateStr = parsed.date
  const selectedTimeStr = parsed.time

  const today = todayISO()
  const days = get42CalendarDays(viewYear, viewMonth)

  // Handlers
  const handleSelectDate = (isoDate: string) => {
    if (mode === 'date') {
      onChange(isoDate)
      setIsOpen(false)
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

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onChange('')
    setIsOpen(false)
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
  const iconColor = accentColor === 'amber' ? 'text-amber-600' : 'text-pine-600'
  const selectedBg = accentColor === 'amber' ? 'bg-amber-600 text-paper-50 font-semibold' : 'bg-pine-600 text-paper-50 font-semibold'

  // Display text for button trigger
  let displayText = placeholder
  if (value) {
    displayText = mode === 'datetime' ? formatDeadline(value) : formatDue(value)
  }

  return (
    <div ref={triggerRef} className="relative inline-block text-left">
      {/* Trigger Pill Button */}
      <div className="flex items-center gap-1.5 rounded-lg border border-paper-200/80 bg-paper-50 px-2.5 py-1.5 shadow-2xs transition-all hover:border-paper-300">
        {icon || (mode === 'datetime' ? <ClockIcon className={`size-3.5 shrink-0 ${iconColor}`} /> : <CalendarIcon className={`size-3.5 shrink-0 ${iconColor}`} />)}
        {label && <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</span>}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 text-[13px] font-medium transition-colors outline-none ${
            value ? 'text-ink-900 font-semibold' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          <span>{displayText}</span>
        </button>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear date"
            className="ml-0.5 rounded-md p-0.5 text-ink-400 hover:bg-paper-200 hover:text-ink-900 transition-colors"
          >
            <CloseIcon className="size-3" />
          </button>
        )}
      </div>

      {/* Floating Portal Popover Panel */}
      {isOpen &&
        createPortal(
          <AnimatePresence mode="wait">
            <motion.div
              ref={popoverRef}
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="z-[100] w-[288px] rounded-2xl bg-paper-100 p-3.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] border border-paper-200 text-ink-900"
            >
              {/* Segmented Tab Switcher (for datetime mode) */}
              {mode === 'datetime' && (
                <div className="flex items-center gap-1 rounded-xl bg-paper-200/50 p-1 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('date')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-all ${
                      activeTab === 'date'
                        ? 'bg-paper-50 text-ink-900 shadow-2xs'
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
                        ? 'bg-amber-600 text-paper-50 shadow-2xs'
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
                    <span className="font-serif text-[15px] italic font-semibold text-ink-900">
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

                  {/* 7-column Calendar Grid */}
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
                          className={`relative flex size-8 items-center justify-center rounded-lg text-[12.5px] transition-all ${
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
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-paper-200 px-3 py-1 font-semibold text-ink-900 hover:bg-paper-300/80 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
