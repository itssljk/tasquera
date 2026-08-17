import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode, RefObject } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { routeHref } from '../lib/route'
import type { Collection, CollectionKind, MenuState, Route } from '../types'
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronIcon,
  EllipsisIcon,
  GripVerticalIcon,
  InboxIcon,
  KanbanIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SidebarIcon,
  StarFilledIcon,
  StarIcon,
  SunIcon,
  UpcomingIcon,
} from './icons'

import { APP_VERSION } from '../constants'

const menuItem =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-ink-700 transition-colors duration-100 hover:bg-paper-100 hover:text-ink-900 active:bg-paper-200'

const COLLAPSED_STORAGE_KEY = 'tasquera.sidebar_collapsed'

interface CollapsedState {
  boards?: boolean
  lists?: boolean
  favorites?: boolean
}

function loadCollapsedState(): CollapsedState {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return {}
}

interface SidebarProps {
  showQuickAdd?: boolean
  collapsed?: boolean
  onToggleCollapsed?: () => void
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
  onReorderFavorites?: (reordered: Collection[]) => void
  onToggleFavoriteCollection?: (id: string) => void
  onNavigate?: () => void
}

function NavLink({
  href,
  active,
  icon,
  label,
  count,
  onClick,
  collapsed,
}: {
  href: string
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick?: () => void
  collapsed?: boolean
}) {
  const handleClick = () => {
    window.location.hash = href
    onClick?.()
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] transition-colors duration-150 ${
        collapsed ? 'justify-center px-0' : ''
      } ${
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
      {!collapsed && (
        <>
          <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="relative z-10 shrink-0 text-[12.5px] tabular-nums text-ink-400">{count}</span>
          )}
        </>
      )}
    </button>
  )
}

function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  onAdd,
  addTooltip,
}: {
  label: string
  count?: number
  collapsed: boolean
  onToggle: () => void
  onAdd?: () => void
  addTooltip?: string
}) {
  return (
    <div className="group mb-1 mt-4 flex items-center justify-between px-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left select-none group/toggle rounded-md hover:text-ink-900 focus-visible:outline-none"
        aria-expanded={!collapsed}
      >
        <motion.span
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className="text-ink-400 group-hover/toggle:text-ink-700 flex shrink-0"
        >
          <ChevronIcon className="size-3 stroke-[2.4]" />
        </motion.span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400 group-hover/toggle:text-ink-700 transition-colors">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] tabular-nums font-semibold text-ink-400/80 bg-paper-200/60 px-1.5 py-0.5 rounded-full leading-none">
            {count}
          </span>
        )}
      </button>
      {onAdd && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          aria-label={addTooltip ?? `Add ${label.toLowerCase().slice(0, -1)}`}
          className="rounded-md p-1 text-ink-400 transition-opacity duration-150 hover:bg-paper-200/60 hover:text-ink-700 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <PlusIcon className="size-3.5" />
        </motion.button>
      )}
    </div>
  )
}

export default function Sidebar(props: SidebarProps) {
  const {
    showQuickAdd = false,
    collapsed = false,
    onToggleCollapsed,
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
    onReorderFavorites,
    onToggleFavoriteCollection,
    onNavigate,
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
  const [sectionCollapsed, setSectionCollapsed] = useState<CollapsedState>(loadCollapsedState)

  // Favorites are the pinned view: favorited collections show only in the
  // Favorites section (in array order, drag-reorderable), not duplicated in
  // their own kind's section.
  const favorites = collections.filter((c) => c.favorite)
  const boards = collections.filter((c) => c.kind === 'board' && !c.favorite)
  const lists = collections.filter((c) => c.kind === 'list' && !c.favorite)

  const toggleCollapsed = (key: keyof CollapsedState) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Expand the active collection's section when the user navigates to it, so
  // they can see where they are. Only fires on an actual navigation (route id
  // change): if the user collapses the section while already viewing it, that
  // choice is respected instead of being undone on every render.
  const lastRouteIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (route.name !== 'collection') {
      lastRouteIdRef.current = null
      return
    }
    const activeCol = collections.find((c) => c.id === route.id)
    if (!activeCol) return
    const key: keyof CollapsedState = activeCol.kind === 'board' ? 'boards' : 'lists'
    if (route.id !== lastRouteIdRef.current && sectionCollapsed[key]) {
      setSectionCollapsed((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev, [key]: false }
        try {
          localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    }
    lastRouteIdRef.current = route.id
  }, [route, collections, sectionCollapsed])

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
      if (showQuickAdd && !collapsed && quickAddRef?.current && selfVisible) {
        quickAddRef.current.focus()
      } else {
        onOpenCreateModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quickAddRef, showQuickAdd, collapsed, onOpenCreateModal])

  const handleQuickAdd = (e: FormEvent) => {
    e.preventDefault()
    const title = quickAddValue.trim()
    if (!title) return
    onQuickAdd?.(title)
    setQuickAddValue('')
  }

  const beginAdd = (kind: CollectionKind) => {
    isSubmittingRef.current = false
    const key: keyof CollapsedState = kind === 'board' ? 'boards' : 'lists'
    if (sectionCollapsed[key]) {
      setSectionCollapsed((prev) => {
        const next = { ...prev, [key]: false }
        try {
          localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    }
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

  const collectionRow = (c: Collection, isFavoriteRow = false) => {
    const active = route.name === 'collection' && route.id === c.id
    const menuOpen = menu?.kind === 'collection' && menu.id === c.id
    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })

    const innerContent = (
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

        {!isFavoriteRow && renamingId !== c.id && (
          <span className="relative z-10 -ml-1 mr-2 shrink-0 text-ink-300 transition-opacity duration-150 cursor-grab active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100 coarse:opacity-0 coarse:cursor-default">
            <GripVerticalIcon className="size-3.5" />
          </span>
        )}

        {isFavoriteRow && (
          <>
            <span className="relative z-10 -ml-0.5 mr-2 shrink-0 text-ink-400 md:hidden">
              {c.kind === 'board' ? <KanbanIcon className="size-3.5" /> : <ListIcon className="size-3.5" />}
            </span>
            <span className="relative z-10 -ml-1 mr-2 hidden shrink-0 text-ink-300 transition-opacity duration-150 cursor-grab active:cursor-grabbing md:block md:opacity-0 md:group-hover:opacity-100">
              <GripVerticalIcon className="size-3.5" />
            </span>
          </>
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
          {renamingId !== c.id && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavoriteCollection?.(c.id)
              }}
              aria-label={c.favorite ? `Unfavorite ${c.name}` : `Favorite ${c.name}`}
              aria-pressed={c.favorite}
              title={c.favorite ? 'Unfavorite' : 'Favorite'}
              className={`rounded-lg p-1 transition-all duration-150 ${
                c.favorite
                  ? 'text-pine-400 hover:bg-paper-200 hover:opacity-90'
                  : 'text-ink-400 hover:bg-paper-200 hover:text-pine-400 md:hidden md:group-hover:block md:focus-visible:block'
              }`}
            >
              {c.favorite ? (
                <StarFilledIcon className="size-4" />
              ) : (
                <StarIcon className="size-4" />
              )}
            </motion.button>
          )}
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
                toggleMenu(menuOpen ? null : c.id)
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
    )

    const menuElement = (
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -2 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-2 top-full z-50 mt-1 w-44 rounded-xl bg-paper-50 p-1.5 shadow-lg border border-paper-200/50"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className={`${menuItem} cursor-pointer`}
              onClick={() => {
                onToggleFavoriteCollection?.(c.id)
                onMenu(null)
              }}
            >
              {c.favorite ? (
                <>
                  <StarFilledIcon className="size-4 text-pine-400 shrink-0" />
                  <span>Unfavorite</span>
                </>
              ) : (
                <>
                  <StarIcon className="size-4 text-ink-500 shrink-0" />
                  <span>Favorite</span>
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className={`${menuItem} cursor-pointer`}
              onClick={() => beginRename(c)}
            >
              Rename
            </motion.button>
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className={`${menuItem} cursor-pointer ${armedDelete === c.id ? 'font-medium text-terra-600' : ''}`}
              onClick={() => handleDelete(c.id)}
            >
              {armedDelete === c.id ? 'Delete · sure?' : 'Delete'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    )

    if (isFavoriteRow) {
      return (
        <Reorder.Item
          key={`fav-${c.id}`}
          value={c}
          dragListener={!isTouch}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`group relative select-none ${menuOpen ? 'z-50' : 'z-0'}`}
          style={{ zIndex: menuOpen ? 50 : undefined }}
        >
          {innerContent}
          {menuElement}
        </Reorder.Item>
      )
    }

    return (
      <Reorder.Item
        key={c.id}
        value={c}
        dragListener={!isTouch}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`group relative select-none ${menuOpen ? 'z-50' : 'z-0'}`}
        style={{ zIndex: menuOpen ? 50 : undefined }}
      >
        {innerContent}
        {menuElement}
      </Reorder.Item>
    )
  }

  return (
    <aside
      ref={rootRef}
      className={`flex h-full shrink-0 flex-col border-r border-paper-200/40 bg-paper-100 transition-[width] duration-200 ease-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {collapsed ? (
        <div className="flex items-center justify-center px-2 pb-1 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:pt-4">
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex size-9 items-center justify-center rounded-xl text-ink-400 transition-colors duration-150 hover:bg-paper-200/70 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/40"
            >
              <SidebarIcon className="size-[19px]" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pb-1 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:pt-4">
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/inbox'
              onNavigate?.()
            }}
            className="font-sans text-[19px] font-bold leading-none tracking-tight text-ink-900 transition-opacity hover:opacity-80 focus-visible:outline-none"
          >
            Tasquera<span className="text-pine-500">.</span>
          </button>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="rounded-lg p-1.5 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/40"
            >
              <SidebarIcon className="size-[18px]" />
            </button>
          )}
        </div>
      )}


      <div className="px-3 pt-3">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={() => onOpenCreateModal()}
          aria-label="New task"
          title={collapsed ? 'New task' : undefined}
          className={`flex items-center rounded-xl bg-pine-600 text-left text-[14.5px] font-medium text-[#fbf9f5] shadow-xs transition-colors duration-150 hover:bg-pine-700 active:bg-pine-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 ${
            collapsed ? 'mx-auto justify-center gap-0 p-2.5' : 'w-full gap-2.5 px-3.5 py-2.5'
          }`}
        >
          <PlusIcon className="size-[18px] shrink-0 stroke-[2.2]" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">New task</span>
              {!showQuickAdd && (
                <kbd className="hidden rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white/90 border border-white/10 sm:inline-block shadow-2xs">
                  /
                </kbd>
              )}
            </>
          )}
        </motion.button>

        {showQuickAdd && !collapsed && (
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

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pb-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-0.5">
          <NavLink href="#/inbox" active={route.name === 'inbox'} icon={<InboxIcon className="size-[18px]" />} label="Inbox" count={countFor({ name: 'inbox' })} onClick={onNavigate} collapsed={collapsed} />
          <NavLink href="#/today" active={route.name === 'today'} icon={<SunIcon className="size-[18px]" />} label="Today" count={countFor({ name: 'today' })} onClick={onNavigate} collapsed={collapsed} />
          <NavLink href="#/upcoming" active={route.name === 'upcoming'} icon={<UpcomingIcon className="size-[18px]" />} label="Upcoming" count={countFor({ name: 'upcoming' })} onClick={onNavigate} collapsed={collapsed} />
          <NavLink href="#/search" active={route.name === 'search'} icon={<SearchIcon className="size-[18px]" />} label="Search" onClick={onNavigate} collapsed={collapsed} />

          {/* Favorites Section */}
          {!collapsed && favorites.length > 0 && (
            <div>
              <SectionHeader
                label="Favorites"
                count={favorites.length}
                collapsed={!!sectionCollapsed.favorites}
                onToggle={() => toggleCollapsed('favorites')}
              />
              <AnimatePresence initial={false}>
                {!sectionCollapsed.favorites && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Reorder.Group
                      axis="y"
                      values={favorites}
                      onReorder={(newFavorites) => onReorderFavorites?.(newFavorites)}
                      className="space-y-0.5"
                    >
                      <AnimatePresence initial={false}>
                        {favorites.map((c) => collectionRow(c, true))}
                      </AnimatePresence>
                    </Reorder.Group>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Boards Section */}
          {!collapsed && (
            <div>
              <SectionHeader
                label="Boards"
                count={boards.length}
                collapsed={!!sectionCollapsed.boards}
                onToggle={() => toggleCollapsed('boards')}
                onAdd={() => beginAdd('board')}
              />
              <AnimatePresence>{addRow('board')}</AnimatePresence>
              <AnimatePresence initial={false}>
                {!sectionCollapsed.boards && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Reorder.Group
                      axis="y"
                      values={boards}
                      onReorder={(newBoards) => onReorderCollections?.('board', newBoards)}
                      className="space-y-0.5"
                    >
                      {boards.map((c) => collectionRow(c, false))}
                    </Reorder.Group>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Lists Section */}
          {!collapsed && (
            <div>
              <SectionHeader
                label="Lists"
                count={lists.length}
                collapsed={!!sectionCollapsed.lists}
                onToggle={() => toggleCollapsed('lists')}
                onAdd={() => beginAdd('list')}
              />
              <AnimatePresence>{addRow('list')}</AnimatePresence>
              <AnimatePresence initial={false}>
                {!sectionCollapsed.lists && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Reorder.Group
                      axis="y"
                      values={lists}
                      onReorder={(newLists) => onReorderCollections?.('list', newLists)}
                      className="space-y-0.5"
                    >
                      {lists.map((c) => collectionRow(c, false))}
                    </Reorder.Group>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="h-3" />
          <NavLink href="#/calendar" active={route.name === 'calendar'} icon={<CalendarIcon className="size-[18px]" />} label="Calendar" onClick={onNavigate} collapsed={collapsed} />
          <NavLink href="#/completed" active={route.name === 'completed'} icon={<CheckCircleIcon className="size-[18px]" />} label="Completed" count={countFor({ name: 'completed' })} onClick={onNavigate} collapsed={collapsed} />
          <NavLink href="#/archive" active={route.name === 'archive'} icon={<ArchiveIcon className="size-[18px]" />} label="Archive" onClick={onNavigate} collapsed={collapsed} />
        </div>

        <div className="pt-4 border-t border-paper-200/40 mt-3 space-y-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-1">
          <NavLink href="#/settings" active={route.name === 'settings'} icon={<SettingsIcon className="size-[18px]" />} label="Settings" onClick={onNavigate} collapsed={collapsed} />
          {!collapsed && (
            <div className="mt-2.5 px-3 flex items-center justify-between text-[11.5px] text-ink-400">
            <span className="font-mono font-medium text-ink-500">v{APP_VERSION}</span>
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
          )}
        </div>
      </nav>
    </aside>
  )
}
