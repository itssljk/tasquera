import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, ChevronIcon } from './icons'

export interface DropdownOption<T extends string | number> {
  value: T
  label: string
  /** Optional text color class for the option label, e.g. priority colors */
  textClass?: string
}

interface DropdownProps<T extends string | number> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  icon?: ReactNode
  /** Text color class for the current value shown in the trigger */
  valueTextClass?: string
  /** Custom trigger className */
  triggerClass?: string
  /** Alignment of the menu relative to trigger */
  align?: 'left' | 'right'
  /** Custom menu className */
  menuClass?: string
}

export default function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  valueTextClass,
  triggerClass,
  align = 'left',
  menuClass,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const filteredOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const selectedIndex = filteredOptions.findIndex((o) => o.value === value)
  const selected = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)

    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        setQuery('')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (filteredOptions.length > 0) {
          setActiveIndex((i) => (i + 1) % filteredOptions.length)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (filteredOptions.length > 0) {
          setActiveIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length)
        }
      } else if (e.key === 'Enter' || (e.key === ' ' && !query)) {
        e.preventDefault()
        e.stopPropagation()
        const opt = filteredOptions[activeIndex]
        if (opt) onChange(opt.value)
        setOpen(false)
        setQuery('')
      } else if (e.key === 'Tab') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    rootRef.current?.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      rootRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, filteredOptions, activeIndex, onChange, selectedIndex, query])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body font-medium text-ink-800 transition-all duration-150 hover:bg-paper-200/80 hover:text-ink-900 active:scale-[0.98] cursor-pointer ${
          triggerClass ?? ''
        }`}
      >
        {icon && (
          <span className="flex items-center transition-transform duration-150 group-hover:scale-110">
            {icon}
          </span>
        )}
        <span className={`font-medium transition-colors ${valueTextClass ?? 'text-ink-900'}`}>{selected?.label ?? value}</span>
        <ChevronIcon
          className={`size-3 shrink-0 text-ink-400 transition-all duration-200 group-hover:text-ink-700 ${
            open ? 'rotate-180 text-ink-900' : 'group-hover:translate-y-[1px]'
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-1.5 max-h-64 min-w-[176px] overflow-hidden rounded-xl bg-paper-200 p-1 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.85)] ring-1 ring-paper-300/60 flex flex-col ${
              menuClass ?? ''
            }`}
          >
            {options.length > 8 && (
              <div className="p-1 pb-1.5 border-b border-paper-300/50">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIndex(0)
                  }}
                  placeholder="Filter…"
                  className="w-full rounded-lg bg-paper-100 px-2 py-1 text-small text-ink-900 placeholder:text-ink-400 outline-none ring-1 ring-pine-500/40"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <ul
              role="listbox"
              aria-label={ariaLabel}
              className="overflow-y-auto max-h-52 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-small text-ink-400 italic text-center">No matches</li>
              ) : (
                filteredOptions.map((opt, i) => (
                  <li key={opt.value} role="option" aria-selected={opt.value === value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                        setQuery('')
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`group/opt flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-body transition-all duration-150 hover:translate-x-0.5 cursor-pointer ${
                        i === activeIndex ? 'bg-paper-300/70 text-ink-900' : 'text-ink-700 hover:bg-paper-300/40 hover:text-ink-900'
                      }`}
                    >
                      <span
                        className={`flex-1 truncate font-medium transition-colors duration-150 ${
                          opt.textClass ?? (opt.value === value ? 'text-ink-900 font-semibold' : 'text-ink-600 group-hover/opt:text-ink-900')
                        }`}
                      >
                        {opt.label}
                      </span>
                      {opt.value === value && (
                        <span className="transition-transform duration-150 group-hover/opt:scale-110">
                          <CheckIcon className="size-3.5 shrink-0 text-pine-500" />
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
