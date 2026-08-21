import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, Route } from '../types'
import { findCollection } from '../lib/model'
import {
  CalendarIcon,
  CheckCircleIcon,
  EllipsisIcon,
  KanbanIcon,
  ListIcon,
  PencilIcon,
  SearchIcon,
  SettingsIcon,
  StarFilledIcon,
  StarIcon,
  TrashIcon,
} from './icons'
import { APP_VERSION_DISPLAY } from '../constants'

interface MobileDrawerSheetProps {
  isOpen: boolean
  onClose: () => void
  route: Route
  collections: Collection[]
  countFor: (route: Route) => number
  onAddCollection: (name: string) => void
  onRenameCollection: (id: string, name: string) => void
  onDeleteCollection: (id: string) => void
  onToggleFavoriteCollection?: (id: string) => void
  onOpenCommandPalette: () => void
  onOpenBulkDelete?: () => void
}

export default function MobileDrawerSheet({
  isOpen,
  onClose,
  route,
  collections,
  countFor,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  onToggleFavoriteCollection,
  onOpenCommandPalette,
  onOpenBulkDelete,
}: MobileDrawerSheetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; x: number; y: number } | null>(null)

  const normalizedQuery = filterQuery.trim().toLowerCase()
  const filteredCollections = normalizedQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
    : collections

  const activeMenuCollection = menuAnchor ? collections.find((c) => c.id === menuAnchor.id) : null

  const handleCommitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (addName.trim()) {
      onAddCollection(addName.trim())
    }
    setIsAdding(false)
    setAddName('')
  }

  const navigateTo = (hash: string) => {
    window.location.hash = hash
    setMenuAnchor(null)
    setFilterQuery('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0c0b0a]/75 backdrop-blur-md"
            onClick={() => {
              setMenuAnchor(null)
              setFilterQuery('')
              onClose()
            }}
          />

          {/* Swipe-Up Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) {
                setMenuAnchor(null)
                setFilterQuery('')
                onClose()
              }
            }}
            onScroll={() => setMenuAnchor(null)}
            className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-paper-100/98 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-3 shadow-2xl border-t border-paper-200/80 backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Drag Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-paper-300/80" />

            {/* Quick Search Trigger */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setMenuAnchor(null)
                  setFilterQuery('')
                  onClose()
                  onOpenCommandPalette()
                }}
                className="flex w-full items-center gap-2.5 rounded-xl bg-paper-50 px-3.5 py-2.5 text-body-lg text-ink-500 shadow-2xs border border-paper-200/50"
              >
                <SearchIcon className="size-4 text-ink-400" />
                <span>Search views, lists, or commands…</span>
              </button>
            </div>

            {/* Collections Section */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-small font-bold uppercase tracking-[0.14em] text-ink-400">
                  Lists
                </span>
                <div className="flex items-center gap-1.5">
                  {collections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenBulkDelete?.()
                      }}
                      className="rounded-lg bg-paper-200/60 px-2.5 py-1 text-small font-medium text-ink-400 active:bg-paper-300 transition-colors"
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
                    className="rounded-lg bg-paper-200/60 px-2.5 py-1 text-small font-medium text-pine-400 active:bg-paper-300 transition-colors"
                  >
                    + List
                  </button>
                </div>
              </div>

              {/* Inline Add Form */}
              {isAdding && (
                <form onSubmit={handleCommitAdd} className="mb-3 rounded-xl bg-paper-50 p-3 shadow-xs border border-paper-200/60">
                  <span className="text-caption font-semibold text-ink-400 uppercase tracking-wider block mb-1.5">
                    New List
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="List name…"
                      className="w-full rounded-lg bg-paper-100 px-3 py-2 text-body-lg text-ink-900 outline-none ring-1 ring-pine-500/40"
                    />
                    <button
                      type="submit"
                      disabled={!addName.trim()}
                      className="rounded-lg bg-pine-600 px-3.5 py-2 text-body font-medium text-white disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="rounded-lg px-2.5 py-2 text-body text-ink-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Filter for 7+ lists */}
              {collections.length > 6 && (
                <div className="relative mb-2.5">
                  <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-400" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter lists…"
                    className="w-full rounded-xl bg-paper-50 py-2 pl-9 pr-8 text-body text-ink-900 placeholder:text-ink-400 outline-none ring-1 ring-paper-200/60 focus:ring-pine-500/40"
                  />
                  {filterQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-caption text-ink-400 hover:text-ink-700 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {collections.length === 0 ? (
                <p className="py-4 text-center text-body text-ink-400 italic">No lists created yet</p>
              ) : filteredCollections.length === 0 ? (
                <p className="py-4 text-center text-body text-ink-400 italic">No matching lists</p>
              ) : (
                <div className="space-y-1">
                  {filteredCollections.map((c) => {
                    const activeCollection = route.name === 'collection' ? findCollection(collections, route.id) : undefined
                    const active = route.name === 'collection' && (activeCollection?.id === c.id || route.id === c.id)
                    const count = countFor({ name: 'collection', id: c.id, kind: c.kind })
                    const isMenuOpen = menuAnchor?.id === c.id

                    return (
                      <div
                        key={c.id}
                        className={`relative flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                          active ? 'bg-paper-50 font-medium text-ink-900 shadow-2xs' : 'text-ink-700 active:bg-paper-50/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => navigateTo(`#/collection/${c.id}`)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          {c.defaultView === 'board' ? (
                            <KanbanIcon className={`size-4 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400'}`} />
                          ) : (
                            <ListIcon className={`size-4 shrink-0 ${active ? 'text-pine-400' : 'text-ink-400'}`} />
                          )}
                          <span className="truncate text-body-lg">{c.name}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {c.favorite && <StarFilledIcon className="size-3.5 text-pine-400" />}
                          {count > 0 && <span className="text-small tabular-nums text-ink-400 font-medium">{count}</span>}

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
                                if (y + menuHeight > window.innerHeight - 16) {
                                  y = rect.top - menuHeight - 6
                                }
                                if (x < 12) x = 12
                                setMenuAnchor({ id: c.id, x, y })
                              }
                            }}
                            className={`rounded-lg p-1 transition-colors ${
                              isMenuOpen ? 'bg-paper-200 text-ink-900' : 'text-ink-400 hover:bg-paper-200'
                            }`}
                          >
                            <EllipsisIcon className="size-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Secondary Views List */}
            <div className="border-t border-paper-200/50 pt-4 space-y-1 mb-6">
              <button
                type="button"
                onClick={() => navigateTo('#/calendar')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-lg text-ink-700 hover:bg-paper-50"
              >
                <CalendarIcon className="size-4 text-ink-400" />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/completed')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-lg text-ink-700 hover:bg-paper-50"
              >
                <CheckCircleIcon className="size-4 text-pine-400" />
                <span>Completed</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('#/settings')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-lg text-ink-700 hover:bg-paper-50"
              >
                <SettingsIcon className="size-4 text-ink-400" />
                <span>Settings</span>
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-small text-ink-500 pt-2 border-t border-paper-200/40">
              <span className="font-mono text-ink-400">v{APP_VERSION_DISPLAY}</span>
              <div className="flex items-center gap-3">
                <a href="#/tos" onClick={onClose} className="hover:text-ink-900 transition-colors">Terms</a>
                <span>·</span>
                <a href="#/privacy" onClick={onClose} className="hover:text-ink-900 transition-colors">Privacy</a>
              </div>
            </div>
          </motion.div>

          {/* Floating Popout Actions Menu */}
          <AnimatePresence>
            {menuAnchor && activeMenuCollection && (
              <motion.div
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body-lg font-medium text-ink-700 hover:bg-paper-100 hover:text-ink-900 transition-colors"
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
                    const newName = window.prompt('Rename list:', activeMenuCollection.name)
                    if (newName?.trim()) onRenameCollection(activeMenuCollection.id, newName.trim())
                    setMenuAnchor(null)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body-lg font-medium text-ink-700 hover:bg-paper-100 hover:text-ink-900 transition-colors"
                >
                  <PencilIcon className="size-4 text-ink-400" />
                  <span>Rename</span>
                </button>
                <div className="mx-1.5 my-1 h-px bg-paper-200/60" />
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete ${activeMenuCollection.name}? This can’t be undone.`)) {
                      onDeleteCollection(activeMenuCollection.id)
                    }
                    setMenuAnchor(null)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-body-lg font-medium text-terra-600 hover:bg-terra-50 transition-colors"
                >
                  <TrashIcon className="size-4" />
                  <span>Delete</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  )
}
