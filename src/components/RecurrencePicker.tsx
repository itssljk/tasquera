import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { Recurrence, RecurrenceRule } from '../types'
import { formatNextOccurrencePreview, recurrenceLabel } from '../lib/recurrence'
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

function isSameRecurrence(a: Recurrence | null, b: Recurrence | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.rule !== b.rule) return false
  if ((a.interval ?? 1) !== (b.interval ?? 1)) return false

  const aDays = a.daysOfWeek?.slice().sort().join(',') ?? ''
  const bDays = b.daysOfWeek?.slice().sort().join(',') ?? ''
  if (aDays !== bDays) return false

  return true
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')

  // Custom picker state
  const [interval, setIntervalVal] = useState<number>(1)
  const [unitRule, setUnitRule] = useState<UnitOption>('weekly')
  const [selectedDays, setSelectedDays] = useState<number[]>([1]) // Mon

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const isCustomRule = (v: Recurrence | null): boolean => {
    if (!v) return false
    return Boolean(
      (v.interval && v.interval > 1) ||
      (v.daysOfWeek && v.daysOfWeek.length > 0)
    )
  }

  const updatePosition = () => {
    if (!triggerRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 280
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

      if (value.daysOfWeek && value.daysOfWeek.length > 0) {
        setSelectedDays(value.daysOfWeek)
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
  }, [open, activeTab, unitRule])

  const buildRecurrenceObject = (
    uRule: UnitOption,
    intVal: number,
    days: number[]
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

    return rec
  }

  const applyCustom = (
    overrides?: Partial<{
      unitRule: UnitOption
      interval: number
      selectedDays: number[]
    }>
  ) => {
    const uRule = overrides?.unitRule ?? unitRule
    const intVal = overrides?.interval ?? interval
    const days = overrides?.selectedDays ?? selectedDays

    const newRec = buildRecurrenceObject(uRule, intVal, days)
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
        className={`group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-body font-medium transition-all duration-150 outline-none ring-offset-paper-50 focus-visible:ring-2 focus-visible:ring-pine-500/40 active:scale-[0.98] cursor-pointer ${
          value
            ? 'bg-pine-500/10 text-pine-500 hover:bg-pine-500/20'
            : 'text-ink-700 hover:bg-paper-200/80 hover:text-ink-900'
        }`}
      >
        <RepeatIcon
          className={`size-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 group-hover:rotate-12 ${
            value ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'
          }`}
        />
        <span className="max-w-[200px] truncate">{recurrenceLabel(value)}</span>
        <ChevronIcon
          className={`size-3 shrink-0 text-ink-400 transition-all duration-200 group-hover:text-ink-700 ${
            open ? 'rotate-180 text-ink-800' : 'group-hover:translate-y-[1px]'
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
                  className={`flex-1 rounded-lg py-1 text-caption font-semibold transition-all duration-150 cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-paper-100 text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-paper-100/50'
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
                  className={`flex-1 rounded-lg py-1 text-caption font-semibold transition-all duration-150 cursor-pointer ${
                    activeTab === 'custom'
                      ? 'bg-paper-100 text-ink-900 shadow-2xs'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-paper-100/50'
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
                          className={`group/preset flex items-center justify-between rounded-xl px-3 py-2 text-small font-medium transition-all duration-150 hover:translate-x-0.5 active:scale-[0.98] cursor-pointer ${
                            active
                              ? 'bg-pine-600 text-paper-50 shadow-xs'
                              : 'bg-paper-200/50 text-ink-700 hover:bg-paper-200 hover:text-ink-900'
                          }`}
                        >
                          <span>{p.label}</span>
                          {active && <CheckIcon className="size-3.5 text-paper-50 shrink-0 transition-transform duration-150 group-hover/preset:scale-110" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Repeat Every + Units */}
                    <div className="rounded-xl bg-paper-200/40 p-2.5 border border-paper-300/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-small font-medium text-ink-700">Repeat every</span>
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
                          <span className="w-6 text-center text-small font-semibold text-ink-900 select-none">
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
                              className={`rounded-lg py-1 text-caption font-medium transition-all ${
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
                          <div className="flex items-center justify-between text-caption text-ink-500 font-medium">
                            <span>On days</span>
                            <div className="flex gap-1.5 text-micro">
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
                                  className={`flex flex-col items-center justify-center py-1 rounded-lg text-micro font-semibold transition-all ${
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
                    </div>
                  </div>
                )}
              </div>

              {/* Readout Summary Footer & Done */}
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-paper-300/30 pt-2.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <span className="block text-micro font-bold uppercase tracking-wider text-ink-400">
                    Summary
                  </span>
                  <span className="block truncate text-caption font-medium text-pine-500">
                    {recurrenceLabel(value)}
                  </span>
                  {value && (
                    <span className="block truncate text-micro text-ink-400 mt-0.5">
                      {formatNextOccurrencePreview(value)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {value && (
                    <button
                      type="button"
                      onClick={() => onChange(null)}
                      className="rounded-lg px-2 py-1 text-caption font-medium text-ink-500 hover:bg-paper-200 hover:text-terra-600 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-pine-600 px-2.5 py-1 text-caption font-semibold text-paper-50 hover:bg-pine-700 transition-colors cursor-pointer"
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
