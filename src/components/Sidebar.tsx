import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { routeHref } from '../lib/route'
import type { Collection, CollectionKind, MenuState, Route } from '../types'
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircleIcon,
  EllipsisIcon,
  GripVerticalIcon,
  InboxIcon,
  LogoMark,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  UpcomingIcon,
} from './icons'
import { APP_VERSION } from '../constants'
import { SidebarInstallButton } from './InstallPWA'

const menuItem =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-ink-700 transition-colors duration-100 hover:bg-paper-100 hover:text-ink-900 active:bg-paper-200'

interface SidebarProps {
  showQuickAdd?: boolean
  route: Route
  collections: Collection[]
  countFor: (route: Route) => number
  quickAddRef?: RefObject<HTMLInputElement | null>
  addPlaceholder?: string
  onQuickAdd?: (title: string) => void
  menu: MenuState
  onMenu: (menu: MenuState) => void
  onOpenCreateModal: () => void
  onAddCollection: (kind: CollectionKind, name: string) => void
  onRenameCollection: (id: string, name: string) => void
  onDeleteCollection: (id: string) => void
  onReorderCollections?: (kind: CollectionKind, reordered: Collection[]) => void
  onNavigate?: () => void
  canInstallPWA?: boolean
  onInstallPWA?: () => void
}

function NavLink({
  href,
  active,
  icon,
  label,
  count,
  onClick,
}: {
  href: string
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick?: () => void
}) {
  const handleClick = () => {
    window.location.hash = href
    onClick?.()
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] transition-colors duration-150 ${
        active ? 'font-medium text-ink-900' : 'text-ink-500 hover:bg-paper-50/60 hover:text-ink-900'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeNavHighlight"
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
        />
      )}
      <span className={`relative z-10 shrink-0 transition-colors ${active ? 'text-pine-400' : 'text-ink-400'}`}>{icon}</span>
      <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="relative z-10 shrink-0 text-[12.5px] tabular-nums text-ink-400">{count}</span>
      )}
    </button>
  )
}

function SectionLabel({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="group mb-0.5 mt-4 flex items-center justify-between px-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</span>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAdd}
        aria-label={`Add ${label.toLowerCase().slice(0, -1)}`}
        className="rounded-md p-1 text-ink-400 transition-opacity duration-150 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
      >
        <PlusIcon className="size-3.5" />
      </motion.button>
    </div>
  )
}

export default function Sidebar(props: SidebarProps) {
  const {
    showQuickAdd = false,
    route,
    collections,
    countFor,
    quickAddRef,
    addPlaceholder,
    onQuickAdd,
    menu,
    onMenu,
    onOpenCreateModal,
    onAddCollection,
    onRenameCollection,
    onDeleteCollection,
    onReorderCollections,
    onNavigate,
    canInstallPWA,
    onInstallPWA,
  } = props

  const rootRef = useRef<HTMLElement>(null)
  const isSubmittingRef = useRef(false)
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const [adding, setAdding] = useState<CollectionKind | null>(null)
  const [addName, setAddName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [armedDelete, setArmedDelete] = useState<string | null>(null)
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const boards = collections.filter((c) => c.kind === 'board')
  const lists = collections.filter((c) => c.kind === 'list')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key !== '/' || typing) return
      const selfVisible = rootRef.current ? rootRef.current.offsetParent !== null : false
      if (!selfVisible) {
        // The desktop sidebar is always mounted but hidden on small screens. If
        // another sidebar (e.g. the drawer's copy) is visible, let it handle the
        // shortcut; otherwise fall back to opening the modal so "/" still works
        // on mobile.
        const anyVisible = Array.from(document.querySelectorAll('aside')).some((a) => a.offsetParent !== null)
        if (anyVisible) return
      }
      e.preventDefault()
      if (showQuickAdd && quickAddRef?.current && selfVisible) {
        quickAddRef.current.focus()
      } else {
        onOpenCreateModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quickAddRef, showQuickAdd, onOpenCreateModal])

  const handleQuickAdd = (e: FormEvent) => {
    e.preventDefault()
    const title = quickAddValue.trim()
    if (!title) return
    onQuickAdd?.(title)
    setQuickAddValue('')
  }

  const beginAdd = (kind: CollectionKind) => {
    isSubmittingRef.current = false
    setAdding(kind)
    setAddName('')
  }

  const commitAdd = (e: FormEvent) => {
    e.preventDefault()
    const v = addName.trim()
    if (v) {
      isSubmittingRef.current = true
      onAddCollection(adding ?? 'board', v)
    }
    setAdding(null)
    setAddName('')
  }

  const cancelAdd = () => {
    if (isSubmittingRef.current) return
    setAdding(null)
    setAddName('')
  }

  const beginRename = (c: Collection) => {
    setRenamingId(c.id)
    setRenameName(c.name)
    onMenu(null)
  }

  const commitRename = (e: FormEvent) => {
    e.preventDefault()
    if (renamingId) onRenameCollection(renamingId, renameName)
    setRenamingId(null)
  }

  const cancelRename = () => setRenamingId(null)

  const toggleMenu = (id: string | null) => {
    onMenu(id ? { kind: 'collection', id } : null)
    if (!id) setArmedDelete(null)
  }

  const handleDelete = (id: string) => {
    if (armedDelete === id) {
      onDeleteCollection(id)
      onMenu(null)
      setArmedDelete(null)
    } else {
      setArmedDelete(id)
    }
  }

  const addRow = (kind: CollectionKind) =>
    adding === kind ? (
      <motion.form
        key={`add-${kind}`}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          isSubmittingRef.current
            ? { opacity: 0, transition: { duration: 0 } }
            : { opacity: 0, y: -4 }
        }
        transition={
          isSubmittingRef.current
            ? { duration: 0 }
            : { duration: 0.15 }
        }
        onSubmit={commitAdd}
        className="px-2 pb-1"
      >
        <input
          autoFocus
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && cancelAdd()}
          onBlur={cancelAdd}
          placeholder={kind === 'board' ? 'Board name' : 'List name'}
          aria-label={`New ${kind} name`}
          className="w-full rounded-lg bg-paper-50 px-2.5 py-1.5 text-[14px] text-ink-900 outline-none ring-2 ring-pine-500/25 placeholder:text-ink-400"
        />
      </motion.form>
    ) : null

  const collectionRow = (c: Collection) => {
    const active = route.name === 'collection' && route.id === c.id
    const menuOpen = menu?.kind === 'collection' && menu.id === c.id
    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })

    return (
      <Reorder.Item
        key={c.id}
        value={c}
        dragListener={!isTouch}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="group relative select-none"
      >
        <div
          className={`relative flex items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 ${
            active ? '' : 'hover:bg-paper-50/60'
          }`}
          style={{ zIndex: menuOpen ? 40 : undefined }}
        >
          {active && (
            <motion.div
              layoutId="activeNavHighlight"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}

          {renamingId !== c.id && (
            <span className="relative z-10 -ml-1 mr-2 shrink-0 text-ink-300 transition-opacity duration-150 cursor-grab active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100 coarse:opacity-0 coarse:cursor-default">
              <GripVerticalIcon className="size-3.5" />
            </span>
          )}

          {renamingId === c.id ? (
            <form onSubmit={commitRename} className="relative z-10 min-w-0 flex-1">
              <input
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && cancelRename()}
                onBlur={cancelRename}
                aria-label={`Rename ${c.name}`}
                className="w-full rounded-md bg-paper-50 px-2 py-0.5 text-[14px] text-ink-900 outline-none ring-2 ring-pine-500/25"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.location.hash = routeHref({ name: 'collection', id: c.id, kind: c.kind })
                onNavigate?.()
              }}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex min-w-0 flex-1 items-center text-left text-[15px] transition-colors duration-150 ${
                active ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
            </button>
          )}

          <div className="relative z-10 flex shrink-0 items-center justify-end">
            {count > 0 && (
              <span
                className={`text-[12.5px] tabular-nums text-ink-400 transition-opacity duration-150 ${
                  renamingId !== c.id ? 'md:group-hover:opacity-0' : ''
                } ${menuOpen ? 'opacity-0' : ''}`}
              >
                {count}
              </span>
            )}
            {renamingId !== c.id && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMenu(c.id)
                }}
                aria-label={`Actions for ${c.name}`}
                aria-expanded={menuOpen}
                className={`rounded-lg p-1 text-ink-400 transition-all duration-150 hover:bg-paper-200 hover:text-ink-700 md:absolute md:right-0 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 ${
                  menuOpen ? '!opacity-100' : ''
                }`}
              >
                <EllipsisIcon className="size-4" />
              </motion.button>
            )}
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -2 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-2 top-full z-50 mt-1 w-40 rounded-xl bg-paper-50 p-1.5 shadow-lg"
              role="menu"
            >
              <button className={menuItem} onClick={() => beginRename(c)}>
                Rename
              </button>
              <button
                className={`${menuItem} ${armedDelete === c.id ? 'font-medium text-terra-600' : ''}`}
                onClick={() => handleDelete(c.id)}
              >
                {armedDelete === c.id ? 'Delete · sure?' : 'Delete'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Reorder.Item>
    )
  }

  return (
    <aside ref={rootRef} className="flex h-full w-64 shrink-0 flex-col bg-paper-100 border-r border-paper-200/40">
      <div className="flex items-center gap-2.5 px-4 pb-1 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:pt-5">
        <LogoMark className="size-6" />
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/inbox'
            onNavigate?.()
          }}
          className="font-sans text-[20px] font-bold leading-none tracking-tight text-ink-900 transition-opacity hover:opacity-80"
        >
          Tasquera<span className="text-pine-500">.</span>
        </button>
      </div>

      <div className="px-3 pt-3">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={() => onOpenCreateModal()}
          className="flex w-full items-center gap-2.5 rounded-xl bg-pine-600 px-3.5 py-2.5 text-left text-[14.5px] font-medium text-[#fbf9f5] shadow-xs transition-colors duration-150 hover:bg-pine-700 active:bg-pine-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100"
        >
          <PlusIcon className="size-[18px] shrink-0 stroke-[2.2]" />
          <span className="min-w-0 flex-1">New task</span>
          {!showQuickAdd && (
            <kbd className="hidden rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white/90 border border-white/10 sm:inline-block shadow-2xs">
              /
            </kbd>
          )}
        </motion.button>

        {showQuickAdd && (
          <form onSubmit={handleQuickAdd} className="pt-2">
            <div className="relative flex items-center">
              <PlusIcon className="pointer-events-none absolute left-2.5 size-4 text-ink-400" />
              <input
                ref={quickAddRef}
                type="text"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={addPlaceholder ?? 'Quick add task…'}
                aria-label="Quick add task"
                className="w-full rounded-lg bg-paper-100 pl-8 pr-16 py-1.5 text-[13.5px] text-ink-900 shadow-xs outline-none ring-1 ring-paper-300/60 transition-all placeholder:text-ink-400 focus:bg-paper-200 focus:ring-2 focus:ring-pine-500/40"
              />
              <div className="pointer-events-none absolute right-2 flex items-center gap-1">
                {quickAddValue.trim() ? (
                  <kbd className="rounded bg-pine-600 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-white shadow-xs">
                    ↵ Enter
                  </kbd>
                ) : isFocused ? (
                  <span className="text-[10px] font-medium text-ink-400">↵ Enter</span>
                ) : (
                  <kbd className="rounded bg-paper-300/60 px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-400">
                    /
                  </kbd>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pb-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-0.5">
          <NavLink href="#/inbox" active={route.name === 'inbox'} icon={<InboxIcon className="size-[18px]" />} label="Inbox" count={countFor({ name: 'inbox' })} onClick={onNavigate} />
          <NavLink href="#/today" active={route.name === 'today'} icon={<SunIcon className="size-[18px]" />} label="Today" count={countFor({ name: 'today' })} onClick={onNavigate} />
          <NavLink href="#/upcoming" active={route.name === 'upcoming'} icon={<UpcomingIcon className="size-[18px]" />} label="Upcoming" count={countFor({ name: 'upcoming' })} onClick={onNavigate} />
          <NavLink href="#/search" active={route.name === 'search'} icon={<SearchIcon className="size-[18px]" />} label="Search" onClick={onNavigate} />

          <SectionLabel label="Boards" onAdd={() => beginAdd('board')} />
          <AnimatePresence>{addRow('board')}</AnimatePresence>
          <Reorder.Group
            axis="y"
            values={boards}
            onReorder={(newBoards) => onReorderCollections?.('board', newBoards)}
            className="space-y-0.5"
          >
            {boards.map(collectionRow)}
          </Reorder.Group>

          <SectionLabel label="Lists" onAdd={() => beginAdd('list')} />
          <AnimatePresence>{addRow('list')}</AnimatePresence>
          <Reorder.Group
            axis="y"
            values={lists}
            onReorder={(newLists) => onReorderCollections?.('list', newLists)}
            className="space-y-0.5"
          >
            {lists.map(collectionRow)}
          </Reorder.Group>

          <div className="h-4" />
          <NavLink href="#/calendar" active={route.name === 'calendar'} icon={<CalendarIcon className="size-[18px]" />} label="Calendar" onClick={onNavigate} />
          <NavLink href="#/completed" active={route.name === 'completed'} icon={<CheckCircleIcon className="size-[18px]" />} label="Completed" count={countFor({ name: 'completed' })} onClick={onNavigate} />
          <NavLink href="#/archive" active={route.name === 'archive'} icon={<ArchiveIcon className="size-[18px]" />} label="Archive" onClick={onNavigate} />
        </div>

        <div className="pt-4 border-t border-paper-200/40 mt-3 space-y-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-1">
          {canInstallPWA && onInstallPWA && (
            <SidebarInstallButton onClick={onInstallPWA} />
          )}
          <NavLink href="#/settings" active={route.name === 'settings'} icon={<SettingsIcon className="size-[18px]" />} label="Settings" onClick={onNavigate} />
          <div className="mt-2.5 px-3 flex items-center justify-between text-[11.5px] text-ink-400">
            <span className="font-mono font-medium text-ink-500">{APP_VERSION}</span>
            <div className="flex items-center gap-2">
              <a
                href="#/tos"
                onClick={onNavigate}
                className="transition-colors hover:text-ink-700"
              >
                Terms
              </a>
              <span>·</span>
              <a
                href="#/privacy"
                onClick={onNavigate}
                className="transition-colors hover:text-ink-700"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  )
}
