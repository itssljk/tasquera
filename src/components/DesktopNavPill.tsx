import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, Route } from '../types'
import { findCollection } from '../lib/model'
import { getSearchShortcut } from '../lib/platform'
import {
  CalendarIcon,
  CheckCircleIcon,
  EllipsisIcon,
  InboxIcon,
  KanbanIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  StarFilledIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
  UpcomingIcon,
} from './icons'

interface DesktopNavPillProps {
  route: Route
  collections: Collection[]
  countFor: (route: Route) => number
  onOpenCreateTask: () => void
  onOpenCommandPalette: () => void
  onToggleFavoriteCollection?: (id: string) => void
  onDeleteCollection?: (id: string) => void
  onRenameCollection?: (id: string, name: string) => void
  onAddCollection?: (name: string) => void
  onOpenBulkDelete?: () => void
}

const VIEW_ITEMS = [
  { name: 'calendar', label: 'Calendar', hash: '#/calendar', icon: <CalendarIcon className="size-4" />, accent: 'text-slateblue-500' },
  { name: 'completed', label: 'Completed', hash: '#/completed', icon: <CheckCircleIcon className="size-4" />, accent: 'text-pine-500' },
  { name: 'settings', label: 'Settings', hash: '#/settings', icon: <SettingsIcon className="size-4" />, accent: 'text-ink-600' },
] as const

export default function DesktopNavPill({
  route,
  collections,
  countFor,
  onOpenCreateTask,
  onOpenCommandPalette,
  onToggleFavoriteCollection,
  onDeleteCollection,
  onRenameCollection,
  onAddCollection,
  onOpenBulkDelete,
}: DesktopNavPillProps) {
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const collectionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null)
      }
      if (collectionsRef.current && !collectionsRef.current.contains(e.target as Node)) {
        setCollectionsOpen(false)
        setMenuAnchor(null)
        setIsAdding(false)
        setFilterQuery('')
        setRenamingId(null)
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCollectionsOpen(false)
        setMoreMenuOpen(false)
        setMenuAnchor(null)
        setIsAdding(false)
        setFilterQuery('')
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isCollectionActive = route.name === 'collection'
  const isInboxActive = route.name === 'inbox'
  const isTodayActive = route.name === 'today'
  const isUpcomingActive = route.name === 'upcoming'

  const activeCollection = isCollectionActive ? findCollection(collections, route.id) : undefined
  const activeCollectionName = activeCollection?.name ?? null

  const inboxCount = countFor({ name: 'inbox' })
  const todayCount = countFor({ name: 'today' })
  const upcomingCount = countFor({ name: 'upcoming' })

  const normalizedQuery = filterQuery.trim().toLowerCase()
  const filteredCollections = normalizedQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
    : collections
  const favorites = filteredCollections.filter((c) => c.favorite)
  const allLists = filteredCollections.filter((c) => !c.favorite)

  const handleCommitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (addName.trim()) {
      onAddCollection?.(addName.trim())
    }
    setIsAdding(false)
    setAddName('')
  }

  const activeMenuCollection = menuAnchor ? collections.find((c) => c.id === menuAnchor.id) : null

  const startRename = (c: Collection) => {
    setMenuAnchor(null)
    setRenamingId(c.id)
    setRenameValue(c.name)
  }

  const commitRename = (c: Collection) => {
    if (renamingId !== c.id) return
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== c.name) {
      onRenameCollection?.(c.id, trimmed)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const navigateTo = (hash: string) => {
    window.location.hash = hash
    setCollectionsOpen(false)
    setMoreMenuOpen(false)
    setMenuAnchor(null)
  }

  const renderCollectionRow = (c: Collection) => {
    const active = isCollectionActive && (activeCollection?.id === c.id || route.id === c.id)
    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })
    const isMenuOpen = menuAnchor?.id === c.id
    const isRenaming = renamingId === c.id

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
          active ? 'bg-paper-50 font-medium text-ink-900' : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
        }`}
      >
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitRename(c)
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(c)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setRenamingId(null)
                  setRenameValue('')
                }
              }}
              placeholder="Name…"
              aria-label={`Rename ${c.name}`}
              className="w-full min-w-0 rounded-md bg-paper-100 px-2 py-1 text-body text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => navigateTo(`#/collection/${c.id}`)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-body"
          >
            {c.defaultView === 'board' ? (
              <KanbanIcon className={`size-3.5 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400'}`} />
            ) : (
              <ListIcon className={`size-3.5 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400'}`} />
            )}
            <span className="truncate">{c.name}</span>
          </button>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-1">
            {c.favorite && <StarFilledIcon className="size-3 text-pine-400" aria-hidden="true" />}
            {count > 0 && <span className="text-caption tabular-nums text-ink-400">{count}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (menuAnchor?.id === c.id) {
                  setMenuAnchor(null)
                } else {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const menuWidth = 176
                  const menuHeight = 135
                  let x = rect.right - menuWidth
                  let y = rect.bottom + 6
                  if (y + menuHeight > window.innerHeight - 12) {
                    y = rect.top - menuHeight - 6
                  }
                  if (x < 8) x = 8
                  setMenuAnchor({ id: c.id, x, y })
                }
              }}
              aria-label={`Actions for “${c.name}”`}
              aria-expanded={isMenuOpen}
              className={`rounded-md p-1 transition-colors hover:bg-paper-200 hover:text-ink-800 ${
                isMenuOpen
                  ? 'text-ink-900 bg-paper-200 opacity-100'
                  : 'text-ink-400 opacity-100 transition-colors md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100'
              }`}
            >
              <EllipsisIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderCollectionSection = (label: string, items: Collection[]) => {
    if (items.length === 0) return null
    return (
      <div className="mb-1">
        <p className="px-2.5 pb-1 pt-1 text-micro font-bold uppercase tracking-wider text-ink-400">
          {label}
        </p>
        <div className="space-y-0.5">{items.map(renderCollectionRow)}</div>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 bg-paper-50/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
      {/* Brand Wordmark — flex-1 keeps the pill dead-centered */}
      <div className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={() => navigateTo('#/inbox')}
          aria-label="Tasquera home (Inbox)"
          className="group flex items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/40"
        >
          <span className="font-sans text-brand font-bold leading-none tracking-tight text-ink-900 transition-opacity group-hover:opacity-80">
            Tasquera<span className="text-pine-500">.</span>
          </span>
        </button>
      </div>

      {/* Floating Primary Pill */}
      <nav className="relative flex items-center gap-1 rounded-2xl bg-paper-100/90 p-1.5 shadow-sm border border-paper-200/60 backdrop-blur-md" aria-label="Primary">
        {/* Tab 1: Inbox */}
        <button
          type="button"
          onClick={() => navigateTo('#/inbox')}
          aria-current={isInboxActive ? 'page' : undefined}
          className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-body transition-colors ${
            isInboxActive ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isInboxActive && (
            <motion.div
              layoutId="desktopPillActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <InboxIcon className={`relative z-10 size-4 ${isInboxActive ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-700'}`} />
          <span className="relative z-10">Inbox</span>
          {inboxCount > 0 && (
            <span className="relative z-10 text-caption tabular-nums font-semibold text-ink-400">
              {inboxCount}
            </span>
          )}
        </button>

        {/* Tab 2: Today */}
        <button
          type="button"
          onClick={() => navigateTo('#/today')}
          aria-current={isTodayActive ? 'page' : undefined}
          className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-body transition-colors ${
            isTodayActive ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isTodayActive && (
            <motion.div
              layoutId="desktopPillActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <SunIcon className={`relative z-10 size-4 ${isTodayActive ? 'text-amber-500' : 'text-ink-400 group-hover:text-ink-700'}`} />
          <span className="relative z-10">Today</span>
          {todayCount > 0 && (
            <span className="relative z-10 text-caption tabular-nums font-semibold text-ink-400">
              {todayCount}
            </span>
          )}
        </button>

        {/* Tab 3: Upcoming */}
        <button
          type="button"
          onClick={() => navigateTo('#/upcoming')}
          aria-current={isUpcomingActive ? 'page' : undefined}
          className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-body transition-colors ${
            isUpcomingActive ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isUpcomingActive && (
            <motion.div
              layoutId="desktopPillActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <UpcomingIcon className={`relative z-10 size-4 ${isUpcomingActive ? 'text-slateblue-400' : 'text-ink-400 group-hover:text-ink-700'}`} />
          <span className="relative z-10">Upcoming</span>
          {upcomingCount > 0 && (
            <span className="relative z-10 text-caption tabular-nums font-semibold text-ink-400">
              {upcomingCount}
            </span>
          )}
        </button>

        {/* Tab 4: Collections Dropdown */}
        <div ref={collectionsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setCollectionsOpen(!collectionsOpen)
              setMoreMenuOpen(false)
            }}
            aria-expanded={collectionsOpen}
            aria-controls="collections-popover"
            aria-current={isCollectionActive ? 'page' : undefined}
            className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-body transition-colors ${
              isCollectionActive ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {isCollectionActive && (
              <motion.div
                layoutId="desktopPillActive"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
              />
            )}
            <ListIcon className={`relative z-10 size-4 ${isCollectionActive ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-700'}`} />
            <span className="relative z-10 truncate max-w-[120px]">
              {activeCollectionName ? activeCollectionName : 'Lists'}
            </span>
            <span className="relative z-10 text-micro text-ink-400">▾</span>
          </button>

          {/* Collections Popover */}
          <AnimatePresence>
            {collectionsOpen && (
              <motion.div
                id="collections-popover"
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                onScroll={() => setMenuAnchor(null)}
                className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl bg-paper-100/95 p-2 shadow-2xl border border-paper-200/80 backdrop-blur-xl max-h-[420px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-paper-200/40">
                  <span className="text-caption font-bold uppercase tracking-wider text-ink-400">Lists</span>
                  <div className="flex items-center gap-1">
                    {collections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollectionsOpen(false)
                          onOpenBulkDelete?.()
                        }}
                        className="rounded px-2 py-0.5 text-caption font-medium text-ink-400 hover:text-ink-700 hover:bg-paper-200 transition-colors"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(!isAdding)
                        setAddName('')
                      }}
                      className="rounded px-2 py-0.5 text-caption font-medium text-pine-400 hover:bg-paper-200 transition-colors"
                    >
                      + New List
                    </button>
                  </div>
                </div>

                {/* Inline Add Form */}
                {isAdding && (
                  <form onSubmit={handleCommitAdd} className="mb-2 rounded-xl bg-paper-50 p-2.5 shadow-xs border border-paper-200/60">
                    <span className="mb-1.5 block text-caption font-semibold uppercase tracking-wider text-ink-400">
                      New List
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="List name…"
                        className="min-w-0 flex-1 rounded-lg bg-paper-100 px-2.5 py-1.5 text-body text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400"
                      />
                      <button
                        type="submit"
                        disabled={!addName.trim()}
                        className="rounded-lg bg-pine-600 px-3 py-1.5 text-small font-medium text-white disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="rounded-lg px-2 py-1.5 text-small text-ink-400 hover:text-ink-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Search Filter for 7+ lists */}
                {collections.length > 6 && (
                  <div className="relative mb-2 px-0.5">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink-400" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter lists…"
                      className="w-full rounded-xl bg-paper-200/50 py-1.5 pl-8 pr-7 text-small text-ink-900 placeholder:text-ink-400 outline-none focus:bg-paper-200/90 focus:ring-1 focus:ring-pine-500/40 transition-colors"
                    />
                    {filterQuery && (
                      <button
                        type="button"
                        onClick={() => setFilterQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-micro text-ink-400 hover:text-ink-700 p-0.5 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {collections.length === 0 ? (
                  <p className="px-3 py-4 text-center text-small text-ink-400 italic">No lists yet</p>
                ) : filteredCollections.length === 0 ? (
                  <p className="px-3 py-4 text-center text-small text-ink-400 italic">No matching lists</p>
                ) : (
                  <>
                    {renderCollectionSection('Favorites', favorites)}
                    {renderCollectionSection(favorites.length > 0 ? 'Lists' : 'All Lists', allLists)}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Action Controls — flex-1 keeps the pill dead-centered */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {/* Search field (lg+) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Search & Commands"
          title={`Search & Commands (${getSearchShortcut()})`}
          className="hidden w-36 items-center gap-2 rounded-xl bg-paper-100/90 px-3 py-1.5 text-body text-ink-500 border border-paper-200/60 shadow-2xs transition-colors hover:bg-paper-200/70 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 lg:flex xl:w-44 2xl:w-48"
        >
          <SearchIcon className="size-4 shrink-0 text-ink-400" />
          <span className="min-w-0 flex-1 text-left text-small">Search…</span>
          <kbd className="shrink-0 rounded bg-paper-200/80 px-1.5 py-0.5 font-sans text-micro font-medium text-ink-500">
            {getSearchShortcut()}
          </kbd>
        </button>

        {/* Search icon (below lg) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Search & Commands"
          title={`Search & Commands (${getSearchShortcut()})`}
          className="flex size-9 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-paper-100 hover:text-ink-800 lg:hidden"
        >
          <SearchIcon className="size-4" />
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenCreateTask}
          aria-label="New task"
          title="New task (/)"
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-pine-600 px-2.5 text-white shadow-xs transition-colors hover:bg-pine-700 2xl:px-3"
        >
          <PlusIcon className="size-4 stroke-[2.4]" />
          <span className="hidden text-body font-medium 2xl:inline">New task</span>
        </motion.button>

        {/* Secondary views (xl+): visible icon row */}
        <div className="hidden items-center gap-0.5 xl:flex" role="group" aria-label="More views">
          {VIEW_ITEMS.map((v) => {
            const active = route.name === v.name
            return (
              <button
                key={v.name}
                type="button"
                onClick={() => navigateTo(v.hash)}
                aria-label={v.label}
                aria-current={active ? 'page' : undefined}
                title={v.label}
                className={`flex size-9 items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-paper-100' : 'text-ink-400 hover:bg-paper-100 hover:text-ink-800'
                }`}
              >
                <span className={active ? v.accent : ''}>{v.icon}</span>
              </button>
            )
          })}
        </div>

        {/* More dropdown (md–xl fallback) */}
        <div ref={moreRef} className="relative xl:hidden">
          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(!moreMenuOpen)
              setCollectionsOpen(false)
            }}
            aria-label="More views"
            aria-expanded={moreMenuOpen}
            className="flex size-9 items-center justify-center rounded-xl text-ink-400 hover:bg-paper-100 hover:text-ink-800 transition-colors"
          >
            <EllipsisIcon className="size-4" />
          </button>

          <AnimatePresence>
            {moreMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl bg-paper-100/95 p-1.5 shadow-2xl border border-paper-200/80 backdrop-blur-xl"
              >
                {VIEW_ITEMS.map((v) => {
                  const active = route.name === v.name
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => navigateTo(v.hash)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-body transition-colors ${
                        active ? 'bg-paper-50 font-medium text-ink-900' : 'text-ink-700 hover:bg-paper-50 hover:text-ink-900'
                      }`}
                    >
                      <span className={active ? v.accent : 'text-ink-400'}>{v.icon}</span>
                      <span>{v.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Popout Actions Menu */}
      <AnimatePresence>
        {menuAnchor && activeMenuCollection && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ top: menuAnchor.y, left: menuAnchor.x }}
            className="fixed z-[100] w-44 rounded-2xl bg-paper-50/98 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] border border-paper-200 backdrop-blur-xl"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onToggleFavoriteCollection?.(activeMenuCollection.id)
                setMenuAnchor(null)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body font-medium text-ink-700 hover:bg-paper-100 hover:text-ink-900 transition-colors cursor-pointer"
            >
              {activeMenuCollection.favorite ? (
                <StarFilledIcon className="size-4 text-pine-400" />
              ) : (
                <StarIcon className="size-4 text-ink-400" />
              )}
              <span>{activeMenuCollection.favorite ? 'Unfavorite' : 'Favorite'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                startRename(activeMenuCollection)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body font-medium text-ink-700 hover:bg-paper-100 hover:text-ink-900 transition-colors cursor-pointer"
            >
              <PencilIcon className="size-4 text-ink-400" />
              <span>Rename</span>
            </button>
            <div className="mx-1.5 my-1 h-px bg-paper-200/60" />
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${activeMenuCollection.name}? This can’t be undone.`)) {
                  onDeleteCollection?.(activeMenuCollection.id)
                }
                setMenuAnchor(null)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body font-medium text-terra-600 hover:bg-terra-50 transition-colors cursor-pointer"
            >
              <TrashIcon className="size-4" />
              <span>Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
