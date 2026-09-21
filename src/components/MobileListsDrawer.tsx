import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { SPRINGS } from '../lib/motion'
import { registerBackHandler } from '../lib/backButton'
import { triggerHaptic } from '../lib/platform'
import type { Collection, CollectionKind, Route } from '../types'
import {
  CloseIcon,
  EllipsisIcon,
  KanbanIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarFilledIcon,
  StarIcon,
  TrashIcon,
} from './icons'

interface MobileListsDrawerProps {
  isOpen: boolean
  onClose: () => void
  route: Route
  collections: Collection[]
  countFor: (route: Route) => number
  onAddCollection?: (kind: CollectionKind, name: string) => void
  onRenameCollection?: (id: string, name: string) => void
  onDeleteCollection?: (id: string) => void
  onToggleFavoriteCollection?: (id: string) => void
  onOpenBulkDelete?: () => void
}

export default function MobileListsDrawer({
  isOpen,
  onClose,
  route,
  collections,
  countFor,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  onToggleFavoriteCollection,
  onOpenBulkDelete,
}: MobileListsDrawerProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addKind, setAddKind] = useState<CollectionKind>('list')
  const [addName, setAddName] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const dragControls = useDragControls()

  // Hardware Android back-button & Escape handler
  useEffect(() => {
    if (!isOpen) return
    const unregister = registerBackHandler(() => {
      onClose()
      return true
    })
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuAnchor) {
          setMenuAnchor(null)
        } else if (isAdding) {
          setIsAdding(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unregister()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, menuAnchor, isAdding, onClose])

  // Close context menu on tap outside
  useEffect(() => {
    if (!menuAnchor) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [menuAnchor])

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

  const navigateTo = (hash: string) => {
    triggerHaptic('selection')
    window.location.hash = hash
    setMenuAnchor(null)
    onClose()
  }

  const handleCommitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = addName.trim()
    if (trimmed && onAddCollection) {
      triggerHaptic('light')
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

  const renderItem = (c: Collection) => {
    const isBoard = c.kind === 'board' || c.defaultView === 'board'
    const active = isCollectionActive && activeCollectionId === c.id
    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })
    const isMenuOpen = menuAnchor?.id === c.id
    const isRenaming = renamingId === c.id

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${
          active
            ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs'
            : 'text-ink-600 hover:bg-paper-50/70 hover:text-ink-900 active:bg-paper-50/90'
        }`}
      >
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitRename(c)
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-2"
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
              placeholder="List name…"
              aria-label={`Rename ${c.name}`}
              className="w-full min-w-0 rounded-lg bg-paper-100 px-2.5 py-1 text-body text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => navigateTo(`#/collection/${c.id}`)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-body cursor-pointer py-0.5"
          >
            {isBoard ? (
              <KanbanIcon
                className={`size-4.5 shrink-0 transition-colors ${
                  active ? 'text-pine-500' : 'text-ink-400'
                }`}
              />
            ) : (
              <ListIcon
                className={`size-4.5 shrink-0 transition-colors ${
                  active ? 'text-pine-500' : 'text-ink-400'
                }`}
              />
            )}
            <span className="truncate text-body">{c.name}</span>
          </button>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-1.5 ml-2">
            {c.favorite && (
              <StarFilledIcon className="size-3.5 text-pine-400 shrink-0" aria-hidden="true" />
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
                  let x = rect.right - menuWidth
                  if (x < 12) x = 12
                  let y = rect.bottom + 4
                  if (y + menuHeight > window.innerHeight - 12) {
                    y = rect.top - menuHeight - 4
                  }
                  setMenuAnchor({ id: c.id, x, y })
                }
              }}
              aria-label={`Actions for “${c.name}”`}
              aria-expanded={isMenuOpen}
              className={`flex size-8 items-center justify-center rounded-lg transition-colors text-ink-400 hover:text-ink-800 hover:bg-paper-200 active:bg-paper-300 cursor-pointer ${
                isMenuOpen ? 'text-ink-900 bg-paper-200 opacity-100' : 'opacity-80'
              }`}
            >
              <EllipsisIcon className="size-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#0c0b0a]/75 backdrop-blur-sm"
            />

            {/* Slide-out Drawer Panel dedicated to Lists only (sliding from the bottom full page) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={SPRINGS.sheet}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  onClose()
                }
              }}
              className="relative z-10 flex flex-col h-[94dvh] max-h-[100dvh] w-full max-w-2xl mx-auto rounded-t-[28px] bg-paper-100 border-t border-paper-200/60 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.6)] select-none overflow-hidden pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
            >
              {/* Drag Handle Bar */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1.5 rounded-full bg-paper-300/80" />
              </div>

              {/* Header */}
              <div className="shrink-0 px-4 pb-3 pt-0.5 flex items-center justify-between border-b border-paper-200/50">
                <div className="flex items-center gap-2">
                  <h2 className="text-body-lg font-bold text-ink-900 tracking-tight">
                    Lists & Boards
                  </h2>
                  {collections.length > 0 && (
                    <span className="rounded-full bg-paper-200 px-2 py-0.5 text-micro font-semibold text-ink-500 tabular-nums">
                      {collections.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {collections.length > 1 && onOpenBulkDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenBulkDelete()
                      }}
                      className="rounded-lg px-2 py-1 text-caption font-medium text-ink-500 hover:text-ink-900 hover:bg-paper-200 active:bg-paper-300 transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close lists drawer"
                    className="flex size-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-800 active:bg-paper-300 cursor-pointer"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Filter lists input when multiple lists exist */}
              {collections.length > 4 && (
                <div className="shrink-0 px-4 pt-3 pb-1">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-400" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter lists…"
                      className="w-full rounded-xl bg-paper-200/60 py-1.5 pl-8 pr-7 text-small text-ink-900 placeholder:text-ink-400 outline-none focus:bg-paper-200/90 focus:ring-1 focus:ring-pine-500/40 transition-colors"
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
                </div>
              )}

              {/* Scrollable lists content */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 [scrollbar-width:thin]">
                {filteredCollections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-paper-200/70 text-ink-400 mb-3">
                      <ListIcon className="size-6" />
                    </div>
                    <p className="text-body font-medium text-ink-800">
                      {normalizedQuery ? 'No matching lists' : 'No lists or boards yet'}
                    </p>
                    <p className="text-caption text-ink-400 mt-1 max-w-[200px] leading-relaxed">
                      {normalizedQuery
                        ? 'Try a different search term'
                        : 'Create lists or Kanban boards to organize projects.'}
                    </p>
                    {!normalizedQuery && !isAdding && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(true)
                          setAddName('')
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-pine-600 px-3 py-1.5 text-caption font-medium text-white shadow-xs hover:bg-pine-700 active:bg-pine-800 cursor-pointer transition-colors"
                      >
                        <PlusIcon className="size-3.5 stroke-[2.2]" />
                        <span>Create list or board</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Favorites Section */}
                    {favorites.length > 0 && (
                      <div>
                        <p className="px-3 pb-1.5 text-micro font-bold uppercase tracking-wider text-ink-400">
                          Favorites
                        </p>
                        <div className="space-y-0.5">
                          {favorites.map((c) => renderItem(c))}
                        </div>
                      </div>
                    )}

                    {/* Lists & Boards Section */}
                    <div>
                      <p className="px-3 pb-1.5 text-micro font-bold uppercase tracking-wider text-ink-400">
                        {favorites.length > 0 ? 'Lists & Boards' : 'All Lists & Boards'}
                      </p>
                      <div className="space-y-0.5">
                        {(favorites.length > 0 ? nonFavorites : filteredCollections).map((c) =>
                          renderItem(c)
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Pinned Area: "+ New list or board" */}
              <div className="shrink-0 p-3 border-t border-paper-200/50 bg-paper-100/90 backdrop-blur-sm">
                {isAdding ? (
                  <form
                    onSubmit={handleCommitAdd}
                    className="rounded-xl bg-paper-50 p-3 shadow-xs border border-paper-200/60"
                  >
                    {/* Kind selector (List vs Board) */}
                    <div className="mb-2.5 flex items-center rounded-lg bg-paper-200/60 p-0.5 text-caption font-medium">
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
                      className="w-full rounded-lg bg-paper-100 px-3 py-2 text-body text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400 mb-2.5"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false)
                          setAddName('')
                        }}
                        className="rounded-lg px-3 py-1.5 text-small text-ink-400 hover:text-ink-700 active:bg-paper-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!addName.trim()}
                        className="rounded-lg bg-pine-600 px-3.5 py-1.5 text-small font-medium text-white disabled:opacity-50 hover:bg-pine-700 active:bg-pine-800 cursor-pointer transition-colors shadow-xs"
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-body font-medium text-ink-700 bg-paper-200/50 hover:bg-paper-200 hover:text-pine-500 active:bg-paper-300 transition-colors cursor-pointer border border-dashed border-border-dashed"
                  >
                    <PlusIcon className="size-4 stroke-[2.2] text-ink-500" />
                    <span>New list or board</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Context Menu for Collection Actions */}
      <AnimatePresence>
        {menuAnchor && activeMenuCollection && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={SPRINGS.popover}
            style={{ top: menuAnchor.y, left: menuAnchor.x }}
            className="glass-menu fixed z-[100] w-44 rounded-2xl p-1.5 shadow-xl"
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
