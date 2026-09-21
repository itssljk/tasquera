import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRINGS } from '../lib/motion'
import { getSearchShortcut } from '../lib/platform'
import type { Collection, CollectionKind, Route } from '../types'
import {
  EllipsisIcon,
  InboxIcon,
  KanbanIcon,
  ListIcon,
  LogoMark,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SidebarIcon,
  StarFilledIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
  UpcomingIcon,
} from './icons'

interface SidebarProps {
  route: Route
  collections: Collection[]
  countFor: (route: Route) => number
  isCollapsed: boolean
  onToggleCollapsed: () => void
  onOpenCommandPalette?: () => void
  onAddCollection?: (nameOrKind: string | CollectionKind, nameOrDefaultView?: string) => void
  onRenameCollection?: (id: string, name: string) => void
  onDeleteCollection?: (id: string) => void
  onToggleFavoriteCollection?: (id: string) => void
  onOpenBulkDelete?: () => void
}

export default function Sidebar({
  route,
  collections,
  countFor,
  isCollapsed,
  onToggleCollapsed,
  onOpenCommandPalette,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  onToggleFavoriteCollection,
  onOpenBulkDelete,
}: SidebarProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addKind, setAddKind] = useState<CollectionKind>('list')
  const [addName, setAddName] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Close context menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAnchor(null)
        setIsAdding(false)
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

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [isAdding])

  const isCollectionActive = route.name === 'collection'
  const activeCollectionId = isCollectionActive ? route.id : null

  const normalizedQuery = filterQuery.trim().toLowerCase()
  const filteredCollections = normalizedQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
    : collections

  const favorites = filteredCollections.filter((c) => c.favorite)
  const nonFavorites = filteredCollections.filter((c) => !c.favorite)

  const activeMenuCollection = menuAnchor
    ? collections.find((c) => c.id === menuAnchor.id)
    : null

  const handleCommitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = addName.trim()
    if (trimmed && onAddCollection) {
      onAddCollection(addKind, trimmed)
    }
    setIsAdding(false)
    setAddName('')
  }

  const startRename = (c: Collection) => {
    setMenuAnchor(null)
    setRenamingId(c.id)
    setRenameValue(c.name)
  }

  const commitRename = (c: Collection) => {
    if (renamingId !== c.id) return
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== c.name && onRenameCollection) {
      onRenameCollection(c.id, trimmed)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const navigateTo = (hash: string) => {
    window.location.hash = hash
    setMenuAnchor(null)
  }

  const renderItem = (c: Collection, compact: boolean) => {
    const isBoard = c.kind === 'board' || c.defaultView === 'board'
    const active = isCollectionActive && activeCollectionId === c.id
    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })
    const isMenuOpen = menuAnchor?.id === c.id
    const isRenaming = renamingId === c.id

    if (compact) {
      return (
        <div key={c.id} className="relative flex justify-center py-0.5">
          <button
            type="button"
            onClick={() => navigateTo(`#/collection/${c.id}`)}
            title={`${c.name} (${isBoard ? 'Board' : 'List'})${count > 0 ? ` · ${count}` : ''}`}
            aria-label={`${c.name} (${isBoard ? 'Board' : 'List'})`}
            className={`group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
              active
                ? 'bg-paper-200 text-pine-400 shadow-2xs'
                : 'text-ink-400 hover:bg-paper-200/70 hover:text-ink-900'
            }`}
          >
            {isBoard ? (
              <KanbanIcon className={`size-4.5 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-800'}`} />
            ) : (
              <ListIcon className={`size-4.5 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-800'}`} />
            )}
            {count > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-pine-500 ring-2 ring-paper-100" />
            )}
          </button>
        </div>
      )
    }

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
          active
            ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
            : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
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
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-body cursor-pointer"
          >
            {isBoard ? (
              <KanbanIcon
                className={`size-4 shrink-0 transition-colors ${
                  active ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'
                }`}
              />
            ) : (
              <ListIcon
                className={`size-4 shrink-0 transition-colors ${
                  active ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'
                }`}
              />
            )}
            <span className="truncate text-body">{c.name}</span>
          </button>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-1">
            {c.favorite && (
              <StarFilledIcon className="size-3 text-pine-400" aria-hidden="true" />
            )}
            {count > 0 && (
              <span className="text-caption tabular-nums font-semibold text-ink-400 px-1">
                {count}
              </span>
            )}
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
                  let x = rect.right + 6
                  let y = rect.top
                  if (x + menuWidth > window.innerWidth - 12) {
                    x = rect.left - menuWidth - 6
                  }
                  if (y + menuHeight > window.innerHeight - 12) {
                    y = window.innerHeight - menuHeight - 12
                  }
                  setMenuAnchor({ id: c.id, x, y })
                }
              }}
              aria-label={`Actions for “${c.name}”`}
              aria-expanded={isMenuOpen}
              className={`rounded-md p-1 transition-colors hover:bg-paper-200 hover:text-ink-800 cursor-pointer ${
                isMenuOpen
                  ? 'text-ink-900 bg-paper-200 opacity-100'
                  : 'text-ink-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
              }`}
            >
              <EllipsisIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Sidebar inner content rendered for desktop rail
  const renderSidebarContent = (compact: boolean) => (
    <div className="flex h-full flex-col justify-between select-none">
      {/* Top section: Header + Search */}
      <div className="shrink-0 pt-3.5 px-3">
        {/* Header row */}
        <div
          className={`flex items-center ${
            compact ? 'flex-col gap-2.5 justify-center' : 'justify-between px-1 mb-3'
          }`}
        >
          {compact ? (
            <>
              <button
                type="button"
                onClick={() => navigateTo('#/inbox')}
                title="Tasquera"
                className="rounded-lg p-1 transition-opacity hover:opacity-80 cursor-pointer"
              >
                <LogoMark className="size-6" />
              </button>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="flex size-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 cursor-pointer"
              >
                <SidebarIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={onOpenCommandPalette}
                aria-label="Search or command"
                title={`Search or command (${getSearchShortcut()})`}
                className="flex size-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 cursor-pointer"
              >
                <SearchIcon className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigateTo('#/inbox')}
                className="group flex items-center gap-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500/40"
              >
                <LogoMark className="size-5" />
                <span className="font-serif italic text-brand tracking-tight text-ink-900 transition-opacity group-hover:opacity-85">
                  Tasquera<span className="text-pine-500">.</span>
                </span>
              </button>

              <div className="flex items-center gap-1">
                {collections.length > 1 && onOpenBulkDelete && (
                  <button
                    type="button"
                    onClick={onOpenBulkDelete}
                    title="Manage / Select lists"
                    className="hidden lg:inline-flex rounded-md px-1.5 py-0.5 text-caption font-medium text-ink-400 hover:text-ink-700 hover:bg-paper-200 transition-colors cursor-pointer"
                  >
                    Select
                  </button>
                )}
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="flex size-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 cursor-pointer"
                >
                  <SidebarIcon className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search trigger button for expanded sidebar */}
        {!compact && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group flex w-full items-center justify-between rounded-xl bg-paper-200/50 hover:bg-paper-200/80 px-2.5 py-1.5 text-small text-ink-500 hover:text-ink-800 transition-all ring-1 ring-paper-200/60 hover:ring-paper-300/60 cursor-pointer mb-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <SearchIcon className="size-3.5 shrink-0 text-ink-400 group-hover:text-ink-600 transition-colors" />
              <span className="truncate">Search or command…</span>
            </div>
            <kbd className="ml-1.5 shrink-0 rounded-md bg-paper-100 px-1.5 py-0.5 font-mono text-micro font-medium text-ink-400 shadow-2xs group-hover:text-ink-600">
              {getSearchShortcut()}
            </kbd>
          </button>
        )}

        {/* Search filter when not compact and list is long */}
        {!compact && collections.length > 5 && (
          <div className="relative mb-2 mt-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter lists & boards…"
              className="w-full rounded-xl bg-paper-200/50 py-1.5 pl-8 pr-7 text-small text-ink-900 placeholder:text-ink-400 outline-none focus:bg-paper-200/90 focus:ring-1 focus:ring-pine-500/40 transition-colors"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-micro text-ink-400 hover:text-ink-700 p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        {compact ? (
          <div className="space-y-1">
            <div className="space-y-1 pb-2 mb-2 border-b border-paper-200/50">
              <button
                type="button"
                onClick={() => navigateTo('#/inbox')}
                title={`Inbox${countFor({ name: 'inbox' }) > 0 ? ` · ${countFor({ name: 'inbox' })}` : ''}`}
                className={`group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  route.name === 'inbox' ? 'bg-paper-200 text-pine-400 shadow-2xs' : 'text-ink-400 hover:bg-paper-200/70 hover:text-ink-900'
                }`}
              >
                <InboxIcon className={`size-4.5 shrink-0 ${route.name === 'inbox' ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-800'}`} />
                {countFor({ name: 'inbox' }) > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-pine-500 ring-2 ring-paper-100" />}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/today')}
                title={`Today${countFor({ name: 'today' }) > 0 ? ` · ${countFor({ name: 'today' })}` : ''}`}
                className={`group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  route.name === 'today' ? 'bg-paper-200 text-amber-500 shadow-2xs' : 'text-ink-400 hover:bg-paper-200/70 hover:text-ink-900'
                }`}
              >
                <SunIcon className={`size-4.5 shrink-0 ${route.name === 'today' ? 'text-amber-500' : 'text-ink-400 group-hover:text-ink-800'}`} />
                {countFor({ name: 'today' }) > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2 ring-paper-100" />}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/upcoming')}
                title={`Upcoming${countFor({ name: 'upcoming' }) > 0 ? ` · ${countFor({ name: 'upcoming' })}` : ''}`}
                className={`group relative flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  route.name === 'upcoming' || route.name === 'calendar' ? 'bg-paper-200 text-pine-400 shadow-2xs' : 'text-ink-400 hover:bg-paper-200/70 hover:text-ink-900'
                }`}
              >
                <UpcomingIcon className={`size-4.5 shrink-0 ${route.name === 'upcoming' || route.name === 'calendar' ? 'text-pine-400' : 'text-ink-400 group-hover:text-ink-800'}`} />
                {countFor({ name: 'upcoming' }) > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-pine-500 ring-2 ring-paper-100" />}
              </button>
            </div>
            {filteredCollections.map((c) => renderItem(c, true))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Core Views */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => navigateTo('#/inbox')}
                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-body transition-colors cursor-pointer ${
                  route.name === 'inbox'
                    ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <InboxIcon className={`size-4 shrink-0 transition-colors ${route.name === 'inbox' ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'}`} />
                  <span>Inbox</span>
                </div>
                {countFor({ name: 'inbox' }) > 0 && (
                  <span className="text-caption tabular-nums font-semibold text-ink-400 px-1">
                    {countFor({ name: 'inbox' })}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/today')}
                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-body transition-colors cursor-pointer ${
                  route.name === 'today'
                    ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SunIcon className={`size-4 shrink-0 transition-colors ${route.name === 'today' ? 'text-amber-500' : 'text-ink-400 group-hover:text-ink-700'}`} />
                  <span>Today</span>
                </div>
                {countFor({ name: 'today' }) > 0 && (
                  <span className="text-caption tabular-nums font-semibold text-ink-400 px-1">
                    {countFor({ name: 'today' })}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/upcoming')}
                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-body transition-colors cursor-pointer ${
                  route.name === 'upcoming' || route.name === 'calendar'
                    ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
                    : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UpcomingIcon className={`size-4 shrink-0 transition-colors ${route.name === 'upcoming' || route.name === 'calendar' ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'}`} />
                  <span>Upcoming</span>
                </div>
                {countFor({ name: 'upcoming' }) > 0 && (
                  <span className="text-caption tabular-nums font-semibold text-ink-400 px-1">
                    {countFor({ name: 'upcoming' })}
                  </span>
                )}
              </button>
            </div>

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div>
                <p className="px-2 pb-1 text-micro font-bold uppercase tracking-wider text-ink-400">
                  Favorites
                </p>
                <div className="space-y-0.5">
                  {favorites.map((c) => renderItem(c, false))}
                </div>
              </div>
            )}

            {/* Lists & Boards Section */}
            <div>
              <p className="px-2 pb-1 text-micro font-bold uppercase tracking-wider text-ink-400">
                {favorites.length > 0 ? 'Lists & Boards' : 'All Lists & Boards'}
              </p>
              {filteredCollections.length === 0 ? (
                <p className="px-2 py-4 text-center text-small text-ink-400 italic">
                  {normalizedQuery ? 'No matches found' : 'No lists or boards yet'}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {(favorites.length > 0 ? nonFavorites : filteredCollections).map((c) =>
                    renderItem(c, false)
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Pinned Area: "+ New list or board" & Settings */}
      <div className="shrink-0 p-3 border-t border-paper-200/50 bg-paper-100/90 backdrop-blur-sm">
        {compact ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleCollapsed()
                setIsAdding(true)
              }}
              title="New list or board"
              aria-label="New list or board"
              className="flex size-9 items-center justify-center rounded-xl bg-paper-200 text-ink-900 shadow-xs transition-colors hover:bg-paper-300 active:bg-paper-400 ring-1 ring-paper-300 cursor-pointer"
            >
              <PlusIcon className="size-4 stroke-[2.4]" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('#/settings')}
              title="Settings (,)"
              aria-label="Settings"
              className={`flex size-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                route.name === 'settings'
                  ? 'bg-paper-200 text-pine-400 shadow-2xs'
                  : 'text-ink-400 hover:bg-paper-200/70 hover:text-ink-900'
              }`}
            >
              <SettingsIcon className="size-4.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {isAdding ? (
              <form
                onSubmit={handleCommitAdd}
                className="rounded-xl bg-paper-50 p-2.5 shadow-xs border border-paper-200/60"
              >
                {/* Kind selector (List vs Board) */}
                <div className="mb-2 flex items-center rounded-lg bg-paper-200/60 p-0.5 text-caption font-medium">
                  <button
                    type="button"
                    onClick={() => setAddKind('list')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 transition-colors cursor-pointer ${
                      addKind === 'list'
                        ? 'bg-paper-50 text-ink-900 font-semibold shadow-2xs'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <ListIcon className="size-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddKind('board')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 transition-colors cursor-pointer ${
                      addKind === 'board'
                        ? 'bg-paper-50 text-ink-900 font-semibold shadow-2xs'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    <KanbanIcon className="size-3.5" />
                    <span>Board</span>
                  </button>
                </div>

                <input
                  ref={addInputRef}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={addKind === 'board' ? 'Board name…' : 'List name…'}
                  className="w-full rounded-lg bg-paper-100 px-2.5 py-1.5 text-body text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400 mb-2"
                />

                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false)
                      setAddName('')
                    }}
                    className="rounded-lg px-2.5 py-1 text-small text-ink-400 hover:text-ink-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!addName.trim()}
                    className="rounded-lg bg-pine-600 px-3 py-1 text-small font-medium text-white disabled:opacity-50 hover:bg-pine-700 cursor-pointer transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true)
                  setAddName('')
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-body font-medium text-ink-600 hover:bg-paper-50 hover:text-pine-500 transition-colors cursor-pointer border border-dashed border-border-dashed"
              >
                <PlusIcon className="size-4 stroke-[2.2] text-ink-500" />
                <span>New list or board</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('#/settings')}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-body transition-colors cursor-pointer ${
                route.name === 'settings'
                  ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
                  : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <SettingsIcon
                  className={`size-4 shrink-0 transition-colors ${
                    route.name === 'settings' ? 'text-pine-500' : 'text-ink-400 group-hover:text-ink-700'
                  }`}
                />
                <span>Settings</span>
              </div>
              <kbd className="rounded bg-paper-200/60 px-1.5 py-0.5 font-mono text-micro text-ink-400">
                ,
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Collapsible Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 bg-paper-100 border-r border-border-sidebar overflow-hidden backdrop-blur-md"
      >
        {renderSidebarContent(isCollapsed)}
      </motion.aside>

      {/* Floating Popout Context Menu */}
      <AnimatePresence>
        {menuAnchor && activeMenuCollection && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={SPRINGS.popover}
            style={{ top: menuAnchor.y, left: menuAnchor.x }}
            className="glass-menu fixed z-[100] w-44 rounded-2xl p-1.5"
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
              onClick={() => startRename(activeMenuCollection)}
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
    </>
  )
}
