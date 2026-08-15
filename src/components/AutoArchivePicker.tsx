import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, ChevronIcon, MinusIcon, PlusIcon } from './icons'

const PRESET_OPTIONS = [
  { label: 'After 1 day', value: 1 },
  { label: 'After 3 days', value: 3 },
  { label: 'After 7 days (Default)', value: 7 },
  { label: 'After 14 days', value: 14 },
  { label: 'After 30 days', value: 30 },
  { label: 'Never (Manual only)', value: 0 },
]

interface AutoArchivePickerProps {
  value: number
  onChange: (days: number) => void
}

export default function AutoArchivePicker({ value, onChange }: AutoArchivePickerProps) {
  const [open, setOpen] = useState(false)
  const isPreset = PRESET_OPTIONS.some((opt) => opt.value === value)
  const [customDays, setCustomDays] = useState(value > 0 ? value : 5)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (value > 0) {
      setCustomDays(value)
    }
  }, [value])

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 264
    const popoverHeight = 310

    let top = rect.bottom + 6
    if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 10) {
      top = rect.top - popoverHeight - 6
    }

    let left = rect.right - popoverWidth
    if (left < 10) {
      left = Math.max(10, rect.left)
    }
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10
    }

    setCoords({ top, left })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }

    const handleResize = () => updatePosition()
    const handleScroll = () => updatePosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const getLabel = () => {
    const preset = PRESET_OPTIONS.find((opt) => opt.value === value)
    if (preset) return preset.label
    if (value === 1) return 'After 1 day'
    return `After ${value} days (Custom)`
  }

  const handleApplyCustom = () => {
    const valid = Math.max(1, Math.min(365, customDays || 1))
    setCustomDays(valid)
    onChange(valid)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Auto-archive completed tasks duration"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-paper-200/90 bg-paper-50 px-3.5 py-1.5 text-[13.5px] font-medium text-ink-900 shadow-2xs transition-colors hover:bg-paper-100/90 hover:border-paper-300 active:bg-paper-200/70"
      >
        <span>{getLabel()}</span>
        <ChevronIcon
          className={`size-3.5 shrink-0 text-ink-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popoverRef}
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="z-[100] w-[264px] rounded-2xl bg-paper-100 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)] ring-1 ring-paper-300/50 text-ink-900 border border-paper-200/60"
            >
              {/* Header */}
              <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
                Auto-Archive Delay
              </div>

              {/* Preset Options List */}
              <div className="mt-1 space-y-0.5" role="listbox">
                {PRESET_OPTIONS.map((opt) => {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-pine-500/15 text-pine-400 font-semibold ring-1 ring-pine-500/30'
                          : 'text-ink-700 hover:bg-paper-200/70 hover:text-ink-900'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <CheckIcon className="size-3.5 shrink-0 text-pine-400" />}
                    </button>
                  )
                })}
              </div>

              {/* Custom Duration Section */}
              <div className="mt-2 border-t border-paper-200/80 pt-2 px-1 pb-0.5">
                <div className="flex items-center justify-between px-1.5 mb-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Custom Duration
                  </span>
                  {!isPreset && value > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pine-500/15 px-2 py-0.5 text-[11px] font-semibold text-pine-300 border border-pine-500/30">
                      <CheckIcon className="size-2.5" />
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-paper-200/40 p-1.5 border border-paper-300/30">
                  <div className="flex flex-1 items-center justify-between rounded-lg bg-paper-50 px-1 py-0.5 border border-paper-200/70 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCustomDays((d) => Math.max(1, d - 1))}
                      disabled={customDays <= 1}
                      aria-label="Decrease days"
                      className="flex size-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 disabled:opacity-25"
                    >
                      <MinusIcon className="size-3" />
                    </button>

                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDays}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10)
                          if (!isNaN(parsed)) setCustomDays(parsed)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleApplyCustom()
                          }
                        }}
                        className="w-9 bg-transparent text-center font-mono text-[13px] font-semibold text-ink-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[12px] font-medium text-ink-500 select-none pr-1">days</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCustomDays((d) => Math.min(365, d + 1))}
                      disabled={customDays >= 365}
                      aria-label="Increase days"
                      className="flex size-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 disabled:opacity-25"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="rounded-lg bg-pine-500 px-3 py-1.5 text-[12.5px] font-semibold text-paper-50 shadow-2xs transition-colors hover:bg-pine-400 active:bg-pine-600"
                  >
                    Set
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
