import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { Recurrence } from '../types'
import { ordinal, recurrenceLabel } from '../lib/recurrence'
import { CheckIcon, ChevronIcon, MinusIcon, PlusIcon, RepeatIcon } from './icons'

interface RecurrencePickerProps {
  value: Recurrence | null
  onChange: (value: Recurrence | null) => void
}

const PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: 'Never', value: null },
  { label: 'Daily', value: { rule: 'daily' } },
  { label: 'Weekdays', value: { rule: 'weekdays' } },
  { label: 'Weekly', value: { rule: 'weekly' } },
  { label: 'Monthly', value: { rule: 'monthly' } },
  { label: 'Yearly', value: { rule: 'yearly' } },
]

type UnitOption = 'daily' | 'weekly' | 'monthly' | 'yearly'

const UNIT_OPTIONS: { rule: UnitOption; singular: string; plural: string }[] = [
  { rule: 'daily', singular: 'day', plural: 'days' },
  { rule: 'weekly', singular: 'week', plural: 'weeks' },
  { rule: 'monthly', singular: 'month', plural: 'months' },
  { rule: 'yearly', singular: 'year', plural: 'years' },
]

function isSameRecurrence(a: Recurrence | null, b: Recurrence | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.rule === b.rule && (a.interval ?? 0) === (b.interval ?? 0) && (a.day ?? 0) === (b.day ?? 0)
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false)
  const [customTab, setCustomTab] = useState<'interval' | 'day'>('interval')

  // Custom picker state
  const [interval, setIntervalVal] = useState<number>(2)
  const [unitRule, setUnitRule] = useState<UnitOption>('daily')
  const [dayVal, setDayVal] = useState<number>(1)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Position popover floating in viewport (matching DatePicker pattern)
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

    let left = rect.left
    left = Math.max(12, Math.min(left, window.innerWidth - 300))

    setCoords({ top, left })
  }

  // Sync custom picker state when opening or when external value updates
  useEffect(() => {
    if (!open) return

    updatePosition()

    if (value?.rule === 'monthly' && value.day) {
      setCustomTab('day')
      setDayVal(value.day)
    } else if (value && value.interval && value.interval > 1) {
      setCustomTab('interval')
      setIntervalVal(value.interval)
      if (['daily', 'weekly', 'monthly', 'yearly'].includes(value.rule)) {
        setUnitRule(value.rule as UnitOption)
      }
    } else if (value && ['daily', 'weekly', 'monthly', 'yearly'].includes(value.rule)) {
      setUnitRule(value.rule as UnitOption)
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

  const isCustomActive = Boolean(
    (value?.interval && value.interval > 1) || (value?.rule === 'monthly' && value.day)
  )

  const handlePresetSelect = (presetVal: Recurrence | null) => {
    onChange(presetVal)
  }

  const handleIntervalChange = (newInterval: number, newUnit: UnitOption) => {
    const clamped = Math.max(1, Math.min(99, newInterval))
    setIntervalVal(clamped)
    setUnitRule(newUnit)
    onChange({ rule: newUnit, interval: clamped })
  }

  const handleDayChange = (newDay: number) => {
    const clamped = Math.max(1, Math.min(31, newDay))
    setDayVal(clamped)
    onChange({ rule: 'monthly', day: clamped })
  }

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
        <span>{recurrenceLabel(value)}</span>
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
              className="z-[100] w-[288px] rounded-2xl bg-paper-100 p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] ring-1 ring-paper-300/40 text-ink-900"
            >
              {/* Presets Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => {
                  const active = !isCustomActive && isSameRecurrence(value, p.value)
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetSelect(p.value)}
                      className={`relative flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[12px] font-medium transition-all duration-150 ${
                        active
                          ? 'bg-paper-200 text-pine-500 shadow-xs ring-1 ring-pine-500/30'
                          : 'text-ink-700 hover:bg-paper-200/60 hover:text-ink-900'
                      }`}
                    >
                      {active && <CheckIcon className="size-3 text-pine-500 shrink-0" />}
                      <span>{p.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Custom Divider & Section Header */}
              <div className="mt-3.5 border-t border-paper-300/30 pt-3">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Custom Rule
                  </span>
                  <div className="flex rounded-lg bg-paper-200/70 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTab('interval')
                        handleIntervalChange(interval, unitRule)
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        customTab === 'interval'
                          ? 'bg-paper-100 text-ink-900 shadow-2xs'
                          : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      Every N
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTab('day')
                        handleDayChange(dayVal)
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        customTab === 'day'
                          ? 'bg-paper-100 text-ink-900 shadow-2xs'
                          : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      Day of Month
                    </button>
                  </div>
                </div>

                {/* Custom Interval Mode */}
                {customTab === 'interval' && (
                  <div className="mt-1 space-y-2.5 rounded-xl bg-paper-200/40 p-2.5 border border-paper-300/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-ink-700">Repeat every</span>
                      {/* Stepper */}
                      <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/40">
                        <button
                          type="button"
                          onClick={() => handleIntervalChange(interval - 1, unitRule)}
                          disabled={interval <= 1}
                          aria-label="Decrease interval"
                          className="flex size-6 items-center justify-center rounded-md text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <MinusIcon className="size-3" />
                        </button>
                        <span className="w-7 text-center text-[13px] font-semibold text-ink-900 select-none">
                          {interval}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIntervalChange(interval + 1, unitRule)}
                          disabled={interval >= 99}
                          aria-label="Increase interval"
                          className="flex size-6 items-center justify-center rounded-md text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <PlusIcon className="size-3" />
                        </button>
                      </div>
                    </div>

                    {/* Unit Selector Pills */}
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {UNIT_OPTIONS.map((u) => {
                        const selected = unitRule === u.rule
                        return (
                          <button
                            key={u.rule}
                            type="button"
                            onClick={() => handleIntervalChange(interval, u.rule)}
                            className={`rounded-lg py-1 text-[11.5px] font-medium transition-all ${
                              selected
                                ? 'bg-pine-600 text-paper-50 font-semibold shadow-2xs'
                                : 'bg-paper-100/70 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                            }`}
                          >
                            {interval === 1 ? u.singular : u.plural}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Monthly Day Mode */}
                {customTab === 'day' && (
                  <div className="mt-1 space-y-2.5 rounded-xl bg-paper-200/40 p-2.5 border border-paper-300/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-ink-700">On the</span>
                      {/* Day Stepper */}
                      <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5 ring-1 ring-paper-300/40">
                        <button
                          type="button"
                          onClick={() => handleDayChange(dayVal - 1)}
                          disabled={dayVal <= 1}
                          aria-label="Decrease day"
                          className="flex size-6 items-center justify-center rounded-md text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <MinusIcon className="size-3" />
                        </button>
                        <span className="w-10 text-center text-[13px] font-semibold text-pine-500 select-none">
                          {ordinal(dayVal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDayChange(dayVal + 1)}
                          disabled={dayVal >= 31}
                          aria-label="Increase day"
                          className="flex size-6 items-center justify-center rounded-md text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <PlusIcon className="size-3" />
                        </button>
                      </div>
                      <span className="text-[12.5px] font-medium text-ink-700">of month</span>
                    </div>

                    {/* Day Shortcuts */}
                    <div className="flex gap-1.5 pt-0.5">
                      {[1, 15, 31].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDayChange(d)}
                          className={`flex-1 rounded-lg py-1 text-[11.5px] font-medium transition-all ${
                            dayVal === d
                              ? 'bg-pine-600 text-paper-50 font-semibold shadow-2xs'
                              : 'bg-paper-100/70 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                          }`}
                        >
                          {d === 31 ? 'Last day' : ordinal(d)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Readout Summary Footer */}
              {value && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-pine-500/10 px-2.5 py-1.5 text-[11.5px] text-pine-500 font-medium">
                  <span className="truncate">Summary: {recurrenceLabel(value)}</span>
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="ml-2 shrink-0 text-[11px] font-semibold text-ink-500 hover:text-terra-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
