import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { MonthlyNthWeekday, Recurrence, RecurrenceMode, RecurrenceRule } from '../types'
import { NTH_LABELS, ordinal, recurrenceLabel } from '../lib/recurrence'
import { CheckIcon, ChevronIcon, MinusIcon, PlusIcon, RepeatIcon } from './icons'

interface RecurrencePickerProps {
  value: Recurrence | null
  onChange: (value: Recurrence | null) => void
}

type UnitOption = 'daily' | 'weekly' | 'monthly' | 'yearly'

const PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: 'Never', value: null },
  { label: 'Daily', value: { rule: 'daily' } },
  { label: 'Weekdays', value: { rule: 'weekdays' } },
  { label: 'Weekly', value: { rule: 'weekly' } },
  { label: 'Monthly', value: { rule: 'monthly' } },
  { label: 'Yearly', value: { rule: 'yearly' } },
]

const UNIT_OPTIONS: { rule: UnitOption; singular: string; plural: string }[] = [
  { rule: 'daily', singular: 'day', plural: 'days' },
  { rule: 'weekly', singular: 'week', plural: 'weeks' },
  { rule: 'monthly', singular: 'month', plural: 'months' },
  { rule: 'yearly', singular: 'year', plural: 'years' },
]

// Day pill mapping (0 = Sun, 1 = Mon ... 6 = Sat).
const ORDERED_DAYS: { index: number; label: string; letter: string }[] = [
  { index: 1, label: 'Mon', letter: 'M' },
  { index: 2, label: 'Tue', letter: 'T' },
  { index: 3, label: 'Wed', letter: 'W' },
  { index: 4, label: 'Thu', letter: 'T' },
  { index: 5, label: 'Fri', letter: 'F' },
  { index: 6, label: 'Sat', letter: 'S' },
  { index: 0, label: 'Sun', letter: 'S' },
]

const NTH_OPTIONS: MonthlyNthWeekday['nth'][] = [1, 2, 3, 4, -1]

function isSameRecurrence(a: Recurrence | null, b: Recurrence | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.rule !== b.rule) return false
  if ((a.interval ?? 1) !== (b.interval ?? 1)) return false
  if ((a.day ?? 0) !== (b.day ?? 0)) return false
  if ((a.mode ?? 'due_date') !== (b.mode ?? 'due_date')) return false

  const aDays = a.daysOfWeek?.slice().sort().join(',') ?? ''
  const bDays = b.daysOfWeek?.slice().sort().join(',') ?? ''
  if (aDays !== bDays) return false

  const aNth = a.monthlyPattern ? `${a.monthlyPattern.nth}-${a.monthlyPattern.weekday}` : ''
  const bNth = b.monthlyPattern ? `${b.monthlyPattern.nth}-${b.monthlyPattern.weekday}` : ''
  if (aNth !== bNth) return false

  const aEnd = a.endCondition ? `${a.endCondition.type}-${a.endCondition.endDate}-${a.endCondition.endCount}` : ''
  const bEnd = b.endCondition ? `${b.endCondition.type}-${b.endCondition.endDate}-${b.endCondition.endCount}` : ''
  if (aEnd !== bEnd) return false

  return true
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')

  // Custom picker state
  const [interval, setIntervalVal] = useState<number>(1)
  const [unitRule, setUnitRule] = useState<UnitOption>('weekly')
  const [selectedDays, setSelectedDays] = useState<number[]>([1]) // Mon
  const [monthlyMode, setMonthlyMode] = useState<'day' | 'nth'>('day')
  const [dayVal, setDayVal] = useState<number>(1)
  const [nthVal, setNthVal] = useState<MonthlyNthWeekday['nth']>(1)
  const [nthWeekday, setNthWeekday] = useState<number>(1) // Monday
  const [mode, setMode] = useState<RecurrenceMode>('due_date')
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>('never')
  const [endDate, setEndDate] = useState<string>('')
  const [endCount, setEndCount] = useState<number>(5)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const isCustomRule = (v: Recurrence | null): boolean => {
    if (!v) return false
    return Boolean(
      (v.interval && v.interval > 1) ||
        (v.daysOfWeek && v.daysOfWeek.length > 0) ||
        v.monthlyPattern ||
        (v.rule === 'monthly' && v.day) ||
        v.mode === 'completion' ||
        v.endCondition
    )
  }

  const updatePosition = () => {
    if (!triggerRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 340
    const popoverWidth = 320

    const spaceBelow = window.innerHeight - triggerRect.bottom - 12
    const spaceAbove = triggerRect.top - 12

    let top: number
    if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
      top = triggerRect.bottom + 6
      if (top + popoverHeight > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - popoverHeight - 12)
      }
    } else {
      top = triggerRect.top - popoverHeight - 6
      if (top < 12) {
        top = 12
      }
    }

    let left = triggerRect.left
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12))

    setCoords({ top, left })
  }

  // Synchronize internal state from prop `value` when opened
  useEffect(() => {
    if (!open) return

    if (value) {
      if (['daily', 'weekly', 'monthly', 'yearly'].includes(value.rule)) {
        setUnitRule(value.rule as UnitOption)
      } else if (value.rule === 'weekdays') {
        setUnitRule('weekly')
        setSelectedDays([1, 2, 3, 4, 5])
      }

      setIntervalVal(value.interval ?? 1)
      setMode(value.mode ?? 'due_date')

      if (value.daysOfWeek && value.daysOfWeek.length > 0) {
        setSelectedDays(value.daysOfWeek)
      }

      if (value.monthlyPattern) {
        setMonthlyMode('nth')
        setNthVal(value.monthlyPattern.nth)
        setNthWeekday(value.monthlyPattern.weekday)
      } else if (value.day) {
        setMonthlyMode('day')
        setDayVal(value.day)
      }

      if (value.endCondition) {
        setEndType(value.endCondition.type)
        if (value.endCondition.endDate) setEndDate(value.endCondition.endDate)
        if (value.endCondition.endCount) setEndCount(value.endCondition.endCount)
      } else {
        setEndType('never')
      }

      setActiveTab(isCustomRule(value) ? 'custom' : 'presets')
    } else {
      setActiveTab('presets')
    }

    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      updatePosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open, value])

  useLayoutEffect(() => {
    if (open) {
      updatePosition()
    }
  }, [open, activeTab, unitRule, monthlyMode, endType])

  const buildRecurrenceObject = (
    uRule: UnitOption,
    intVal: number,
    days: number[],
    mMode: 'day' | 'nth',
    dVal: number,
    nthV: MonthlyNthWeekday['nth'],
    nthW: number,
    rMode: RecurrenceMode,
    eType: 'never' | 'date' | 'count',
    eDate: string,
    eCount: number
  ): Recurrence => {
    const rec: Recurrence = {
      rule: uRule as RecurrenceRule,
    }

    if (intVal > 1) {
      rec.interval = intVal
    }

    if (uRule === 'weekly' && days.length > 0) {
      rec.daysOfWeek = [...days].sort((a, b) => a - b)
    }

    if (uRule === 'monthly') {
      if (mMode === 'nth') {
        rec.monthlyPattern = { nth: nthV, weekday: nthW }
      } else {
        rec.day = dVal
      }
    }

    if (rMode === 'completion') {
      rec.mode = 'completion'
    }

    if (eType === 'date' && eDate) {
      rec.endCondition = { type: 'date', endDate: eDate }
    } else if (eType === 'count' && eCount > 0) {
      rec.endCondition = { type: 'count', endCount: eCount }
    }

    return rec
  }

  const applyCustom = (
    overrides?: Partial<{
      unitRule: UnitOption
      interval: number
      selectedDays: number[]
      monthlyMode: 'day' | 'nth'
      dayVal: number
      nthVal: MonthlyNthWeekday['nth']
      nthWeekday: number
      mode: RecurrenceMode
      endType: 'never' | 'date' | 'count'
      endDate: string
      endCount: number
    }>
  ) => {
    const uRule = overrides?.unitRule ?? unitRule
    const intVal = overrides?.interval ?? interval
    const days = overrides?.selectedDays ?? selectedDays
    const mMode = overrides?.monthlyMode ?? monthlyMode
    const dVal = overrides?.dayVal ?? dayVal
    const nthV = overrides?.nthVal ?? nthVal
    const nthW = overrides?.nthWeekday ?? nthWeekday
    const rMode = overrides?.mode ?? mode
    const eType = overrides?.endType ?? endType
    const eDate = overrides?.endDate ?? endDate
    const eCount = overrides?.endCount ?? endCount

    const newRec = buildRecurrenceObject(
      uRule,
      intVal,
      days,
      mMode,
      dVal,
      nthV,
      nthW,
      rMode,
      eType,
      eDate,
      eCount
    )
    onChange(newRec)
  }

  const handlePresetSelect = (presetVal: Recurrence | null) => {
    onChange(presetVal)
  }

  const handleDayToggle = (dayIdx: number) => {
    let next: number[]
    if (selectedDays.includes(dayIdx)) {
      next = selectedDays.filter((d) => d !== dayIdx)
      if (next.length === 0) next = [dayIdx] // keep at least one
    } else {
      next = [...selectedDays, dayIdx].sort((a, b) => a - b)
    }
    setSelectedDays(next)
    applyCustom({ selectedDays: next })
  }

  const isCustomActive = isCustomRule(value)

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Repeat options"
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 outline-none ring-offset-paper-50 focus-visible:ring-2 focus-visible:ring-pine-500/40 ${
          value
            ? 'bg-pine-500/10 text-pine-500 hover:bg-pine-500/15'
            : 'text-ink-700 hover:bg-paper-200/70 hover:text-ink-900'
        }`}
      >
        <RepeatIcon className={`size-3.5 shrink-0 ${value ? 'text-pine-500' : 'text-ink-400'}`} />
        <span className="max-w-[200px] truncate">{recurrenceLabel(value)}</span>
        <ChevronIcon
          className={`size-3 shrink-0 text-ink-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-ink-700' : ''
          }`}
        />
      </button>

      {open &&
        createPortal(
          <AnimatePresence mode="wait">
            <motion.div
              ref={popoverRef}
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="z-[100] flex max-h-[calc(100vh-24px)] w-[320px] flex-col rounded-2xl bg-paper-100 p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] ring-1 ring-paper-300/40 text-ink-900 text-left"
            >
              {/* Header Segmented Tabs */}
              <div className="flex rounded-xl bg-paper-200/80 p-0.5 mb-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`flex-1 rounded-lg py-1 text-[11.5px] font-semibold transition-all ${
                    activeTab === 'presets'
                      ? 'bg-paper-100 text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('custom')
                    if (!value || !isCustomActive) {
                      applyCustom()
                    }
                  }}
                  className={`flex-1 rounded-lg py-1 text-[11.5px] font-semibold transition-all ${
                    activeTab === 'custom'
                      ? 'bg-paper-100 text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  Custom Rule
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 scrollbar-none">
                {activeTab === 'presets' ? (
                  <div className="grid grid-cols-2 gap-1.5 py-0.5">
                    {PRESETS.map((p) => {
                      const active = !isCustomActive && isSameRecurrence(value, p.value)
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handlePresetSelect(p.value)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-[12px] font-medium transition-all ${
                            active
                              ? 'bg-pine-600 text-paper-50 shadow-xs'
                              : 'bg-paper-200/50 text-ink-700 hover:bg-paper-200 hover:text-ink-900'
                          }`}
                        >
                          <span>{p.label}</span>
                          {active && <CheckIcon className="size-3.5 text-paper-50 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Repeat Every + Units */}
                    <div className="rounded-xl bg-paper-200/40 p-2.5 border border-paper-300/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-ink-700">Repeat every</span>
                        {/* Stepper */}
                        <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/40">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, interval - 1)
                              setIntervalVal(next)
                              applyCustom({ interval: next })
                            }}
                            disabled={interval <= 1}
                            aria-label="Decrease interval"
                            className="flex size-5 items-center justify-center rounded text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30"
                          >
                            <MinusIcon className="size-2.5" />
                          </button>
                          <span className="w-6 text-center text-[12.5px] font-semibold text-ink-900 select-none">
                            {interval}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(99, interval + 1)
                              setIntervalVal(next)
                              applyCustom({ interval: next })
                            }}
                            disabled={interval >= 99}
                            aria-label="Increase interval"
                            className="flex size-5 items-center justify-center rounded text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30"
                          >
                            <PlusIcon className="size-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Unit Selector Pills */}
                      <div className="grid grid-cols-4 gap-1">
                        {UNIT_OPTIONS.map((u) => {
                          const selected = unitRule === u.rule
                          return (
                            <button
                              key={u.rule}
                              type="button"
                              onClick={() => {
                                setUnitRule(u.rule)
                                applyCustom({ unitRule: u.rule })
                              }}
                              className={`rounded-lg py-1 text-[11px] font-medium transition-all ${
                                selected
                                  ? 'bg-pine-600 text-paper-50 font-semibold shadow-2xs'
                                  : 'bg-paper-100/80 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                              }`}
                            >
                              {interval === 1 ? u.singular : u.plural}
                            </button>
                          )
                        })}
                      </div>

                      {/* Weekly Day of Week Multi-select */}
                      {unitRule === 'weekly' && (
                        <div className="pt-1.5 space-y-1.5 border-t border-paper-300/20">
                          <div className="flex items-center justify-between text-[11px] text-ink-500 font-medium">
                            <span>On days</span>
                            <div className="flex gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const wk = [1, 2, 3, 4, 5]
                                  setSelectedDays(wk)
                                  applyCustom({ selectedDays: wk })
                                }}
                                className="hover:text-pine-500"
                              >
                                Weekdays
                              </button>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const we = [0, 6]
                                  setSelectedDays(we)
                                  applyCustom({ selectedDays: we })
                                }}
                                className="hover:text-pine-500"
                              >
                                Weekends
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {ORDERED_DAYS.map((d) => {
                              const active = selectedDays.includes(d.index)
                              return (
                                <button
                                  key={d.index}
                                  type="button"
                                  title={d.label}
                                  onClick={() => handleDayToggle(d.index)}
                                  className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10.5px] font-semibold transition-all ${
                                    active
                                      ? 'bg-pine-600 text-paper-50 shadow-2xs ring-1 ring-pine-500/50'
                                      : 'bg-paper-100 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                                  }`}
                                >
                                  <span>{d.letter}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Monthly Advanced Pattern */}
                      {unitRule === 'monthly' && (
                        <div className="pt-1.5 space-y-2 border-t border-paper-300/20">
                          <div className="flex rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/30">
                            <button
                              type="button"
                              onClick={() => {
                                setMonthlyMode('day')
                                applyCustom({ monthlyMode: 'day', dayVal })
                              }}
                              className={`flex-1 rounded-md py-0.5 text-[10.5px] font-medium transition-colors ${
                                monthlyMode === 'day'
                                  ? 'bg-paper-200 text-ink-900 shadow-2xs font-semibold'
                                  : 'text-ink-500 hover:text-ink-700'
                              }`}
                            >
                              Specific Day
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMonthlyMode('nth')
                                applyCustom({ monthlyMode: 'nth', nthVal, nthWeekday })
                              }}
                              className={`flex-1 rounded-md py-0.5 text-[10.5px] font-medium transition-colors ${
                                monthlyMode === 'nth'
                                  ? 'bg-paper-200 text-ink-900 shadow-2xs font-semibold'
                                  : 'text-ink-500 hover:text-ink-700'
                              }`}
                            >
                              Relative Weekday
                            </button>
                          </div>

                          {monthlyMode === 'day' ? (
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[11.5px] text-ink-600 font-medium">On the</span>
                              <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/40">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(1, dayVal - 1)
                                    setDayVal(next)
                                    applyCustom({ dayVal: next })
                                  }}
                                  disabled={dayVal <= 1}
                                  aria-label="Decrease day"
                                  className="flex size-5 items-center justify-center rounded text-ink-500 hover:bg-paper-200 disabled:opacity-30"
                                >
                                  <MinusIcon className="size-2.5" />
                                </button>
                                <span className="w-10 text-center text-[11.5px] font-semibold text-pine-500">
                                  {ordinal(dayVal)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.min(31, dayVal + 1)
                                    setDayVal(next)
                                    applyCustom({ dayVal: next })
                                  }}
                                  disabled={dayVal >= 31}
                                  aria-label="Increase day"
                                  className="flex size-5 items-center justify-center rounded text-ink-500 hover:bg-paper-200 disabled:opacity-30"
                                >
                                  <PlusIcon className="size-2.5" />
                                </button>
                              </div>
                              <span className="text-[11.5px] text-ink-600 font-medium">of month</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="grid grid-cols-5 gap-1">
                                {NTH_OPTIONS.map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => {
                                      setNthVal(n)
                                      applyCustom({ monthlyMode: 'nth', nthVal: n, nthWeekday })
                                    }}
                                    className={`rounded-md py-0.5 text-[10px] font-medium transition-colors ${
                                      nthVal === n
                                        ? 'bg-pine-600 text-paper-50 font-semibold'
                                        : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
                                    }`}
                                  >
                                    {NTH_LABELS[n]}
                                  </button>
                                ))}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {ORDERED_DAYS.map((d) => (
                                  <button
                                    key={d.index}
                                    type="button"
                                    title={d.label}
                                    onClick={() => {
                                      setNthWeekday(d.index)
                                      applyCustom({ monthlyMode: 'nth', nthVal, nthWeekday: d.index })
                                    }}
                                    className={`rounded-md py-0.5 text-[10px] font-medium transition-colors ${
                                      nthWeekday === d.index
                                        ? 'bg-pine-600 text-paper-50 font-semibold'
                                        : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Recurrence Mode (Schedule vs Completion) */}
                    <div className="rounded-xl bg-paper-200/40 p-2 border border-paper-300/20 flex items-center justify-between">
                      <span className="text-[11.5px] font-medium text-ink-700">Schedule</span>
                      <div className="flex rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/30">
                        <button
                          type="button"
                          onClick={() => {
                            setMode('due_date')
                            applyCustom({ mode: 'due_date' })
                          }}
                          className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                            mode === 'due_date'
                              ? 'bg-paper-200 text-ink-900 shadow-2xs font-semibold'
                              : 'text-ink-500 hover:text-ink-700'
                          }`}
                        >
                          On Due Date
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('completion')
                            applyCustom({ mode: 'completion' })
                          }}
                          className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                            mode === 'completion'
                              ? 'bg-paper-200 text-ink-900 shadow-2xs font-semibold'
                              : 'text-ink-500 hover:text-ink-700'
                          }`}
                        >
                          After Done
                        </button>
                      </div>
                    </div>

                    {/* End Conditions */}
                    <div className="rounded-xl bg-paper-200/40 p-2.5 border border-paper-300/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-medium text-ink-700">Ends</span>
                        <div className="flex rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/30">
                          {(['never', 'date', 'count'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setEndType(t)
                                applyCustom({ endType: t })
                              }}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                endType === t
                                  ? 'bg-paper-200 text-ink-900 shadow-2xs font-semibold'
                                  : 'text-ink-500 hover:text-ink-700'
                              }`}
                            >
                              {t === 'never' ? 'Never' : t === 'date' ? 'On date' : 'Count'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {endType === 'date' && (
                        <div className="pt-0.5">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value)
                              applyCustom({ endType: 'date', endDate: e.target.value })
                            }}
                            className="w-full rounded-lg bg-paper-100 px-2 py-1 text-[11.5px] text-ink-900 border border-paper-300/40 outline-none focus:ring-1 focus:ring-pine-500"
                          />
                        </div>
                      )}

                      {endType === 'count' && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11.5px] text-ink-600">End after</span>
                          <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/40">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(1, endCount - 1)
                                setEndCount(next)
                                applyCustom({ endType: 'count', endCount: next })
                              }}
                              disabled={endCount <= 1}
                              className="flex size-4 items-center justify-center rounded text-ink-500 hover:bg-paper-200 disabled:opacity-30"
                            >
                              <MinusIcon className="size-2" />
                            </button>
                            <span className="w-5 text-center text-[11.5px] font-semibold text-ink-900">
                              {endCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.min(999, endCount + 1)
                                setEndCount(next)
                                applyCustom({ endType: 'count', endCount: next })
                              }}
                              disabled={endCount >= 999}
                              className="flex size-4 items-center justify-center rounded text-ink-500 hover:bg-paper-200 disabled:opacity-30"
                            >
                              <PlusIcon className="size-2" />
                            </button>
                          </div>
                          <span className="text-[11.5px] text-ink-600">times</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Readout Summary Footer & Done */}
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-paper-300/30 pt-2.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <span className="block text-[9.5px] font-bold uppercase tracking-wider text-ink-400">
                    Summary
                  </span>
                  <span className="block truncate text-[11.5px] font-medium text-pine-500">
                    {recurrenceLabel(value)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {value && (
                    <button
                      type="button"
                      onClick={() => onChange(null)}
                      className="rounded-lg px-2 py-1 text-[11px] font-medium text-ink-500 hover:bg-paper-200 hover:text-terra-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-pine-600 px-2.5 py-1 text-[11px] font-semibold text-paper-50 hover:bg-pine-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
