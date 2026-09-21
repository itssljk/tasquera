import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRINGS } from '../lib/motion'
import { registerBackHandler } from '../lib/backButton'
import { useIsDesktop } from '../lib/useMediaQuery'
import type { Collection, Task } from '../types'
import { searchTasks } from '../lib/search'
import {
  CalendarIcon,
  CheckCircleIcon,
  DownloadIcon,
  InboxIcon,
  KanbanIcon,
  ListIcon,
  NotesIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SunIcon,
  TrashIcon,
  UpcomingIcon,
} from './icons'

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: 'Tasks' | 'Views' | 'Lists' | 'Actions'
  keywords?: string[]
  icon: React.ReactNode
  onSelect: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  tasks?: Task[]
  onSelectTask?: (task: Task) => void
  onOpenCreateTask: () => void
  onAddCollection: (nameOrKind: string, nameOrDefaultView?: string) => void
  onOpenBulkDelete?: () => void
  onClearCompleted?: () => void
  onExportData?: () => void
  onExportMarkdown?: () => void
  onToggleTheme?: () => void
  onOpenShortcuts?: () => void
}

export default function CommandPalette({
  isOpen,
  onClose,
  collections,
  tasks = [],
  onSelectTask,
  onOpenCreateTask,
  onAddCollection,
  onOpenBulkDelete,
  onClearCompleted,
  onExportData,
  onExportMarkdown,
  onToggleTheme,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListKind, setNewListKind] = useState<'list' | 'board'>('list')
  const inputRef = useRef<HTMLInputElement>(null)
  const listNameInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setIsCreatingList(false)
      setNewListName('')
      setNewListKind('list')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    return registerBackHandler(() => {
      onClose()
      return true
    })
  }, [isOpen, onClose])

  const navigateTo = (hash: string) => {
    window.location.hash = hash
    onClose()
  }

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // Primary views
      {
        id: 'view-inbox',
        title: 'Go to Inbox',
        subtitle: 'Unsorted tasks',
        category: 'Views',
        keywords: ['inbox', 'unsorted', 'home', '>inbox'],
        icon: <InboxIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo('#/inbox'),
      },
      {
        id: 'view-today',
        title: 'Go to Today',
        subtitle: 'Tasks due today and overdue',
        category: 'Views',
        keywords: ['today', 'due', 'schedule', '>today', '>overdue'],
        icon: <SunIcon className="size-4 text-amber-500" />,
        onSelect: () => navigateTo('#/today'),
      },
      {
        id: 'view-upcoming',
        title: 'Go to Upcoming',
        subtitle: 'Scheduled upcoming tasks',
        category: 'Views',
        keywords: ['upcoming', 'future', 'planned', '>upcoming'],
        icon: <UpcomingIcon className="size-4 text-slateblue-400" />,
        onSelect: () => navigateTo('#/upcoming'),
      },
      {
        id: 'view-calendar',
        title: 'Go to Calendar',
        subtitle: 'Month grid & week agenda view',
        category: 'Views',
        keywords: ['calendar', 'month', 'week', 'agenda', '>calendar'],
        icon: <CalendarIcon className="size-4 text-pine-400" />,
        onSelect: () => navigateTo('#/calendar'),
      },
      {
        id: 'view-completed',
        title: 'Go to Logbook',
        subtitle: 'Historical archive of completed tasks',
        category: 'Views',
        keywords: ['logbook', 'completed', 'done', 'archive', 'history', '>logbook', '>done'],
        icon: <CheckCircleIcon className="size-4 text-pine-500" />,
        onSelect: () => navigateTo('#/completed'),
      },
      {
        id: 'view-settings',
        title: 'Go to Settings',
        subtitle: 'App preferences & folder sync',
        category: 'Views',
        keywords: ['settings', 'preferences', 'sync', 'syncthing', 'backup', 'theme', '>settings'],
        icon: <SettingsIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo('#/settings'),
      },
      // Quick Actions
      {
        id: 'action-new-task',
        title: 'Create new task',
        subtitle: 'Open task creation drawer',
        category: 'Actions',
        keywords: ['create', 'new', 'task', 'add', '>new'],
        icon: <PlusIcon className="size-4 text-pine-400" />,
        onSelect: () => {
          onClose()
          onOpenCreateTask()
        },
      },
      {
        id: 'action-new-list',
        title: 'Create new list or board',
        subtitle: 'Add a new task list or kanban board',
        category: 'Actions',
        keywords: ['new list', 'add list', 'collection', 'create list', 'board', 'kanban', '>new'],
        icon: <ListIcon className="size-4 text-ink-400" />,
        onSelect: () => {
          setIsCreatingList(true)
          setTimeout(() => listNameInputRef.current?.focus(), 40)
        },
      },
    ]

    if (onClearCompleted) {
      list.push({
        id: 'action-clear-completed',
        title: 'Clear completed tasks',
        subtitle: 'Remove completed tasks across your lists (reversible with Undo)',
        category: 'Actions',
        keywords: ['clear completed', 'clean done', 'empty completed', '>clear'],
        icon: <TrashIcon className="size-4 text-amber-500" />,
        onSelect: () => {
          onClose()
          onClearCompleted()
        },
      })
    }

    if (onExportData) {
      list.push({
        id: 'action-export-backup',
        title: 'Export JSON Backup',
        subtitle: 'Download full local data backup file',
        category: 'Actions',
        keywords: ['export', 'backup', 'download', 'save', 'json', '>export'],
        icon: <DownloadIcon className="size-4 text-pine-400" />,
        onSelect: () => {
          onClose()
          onExportData()
        },
      })
    }

    if (onExportMarkdown) {
      list.push({
        id: 'action-export-markdown',
        title: 'Export Markdown Checklist',
        subtitle: 'Copy or export tasks as Markdown checklist',
        category: 'Actions',
        keywords: ['export markdown', 'markdown', 'checklist', 'copy markdown', '>export', '>markdown'],
        icon: <DownloadIcon className="size-4 text-slateblue-400" />,
        onSelect: () => {
          onClose()
          onExportMarkdown()
        },
      })
    }

    if (onToggleTheme) {
      list.push({
        id: 'action-toggle-theme',
        title: 'Toggle Theme (Light / Dark)',
        subtitle: 'Switch between Warm Editorial Dark and Daylight Light theme',
        category: 'Actions',
        keywords: ['toggle theme', 'theme', 'dark mode', 'light mode', 'daylight', '>theme'],
        icon: <SunIcon className="size-4 text-amber-500" />,
        onSelect: () => {
          onClose()
          onToggleTheme()
        },
      })
    }

    if (collections.length > 0 && onOpenBulkDelete) {
      list.push({
        id: 'action-bulk-delete-lists',
        title: 'Bulk delete lists…',
        subtitle: 'Select and remove multiple lists',
        category: 'Actions',
        keywords: ['delete lists', 'bulk delete', 'remove lists', 'trash', '>delete', '>clear'],
        icon: <TrashIcon className="size-4 text-terra-600" />,
        onSelect: () => {
          onClose()
          onOpenBulkDelete()
        },
      })
    }

    // Legal / Info Views
    list.push(
      {
        id: 'view-tos',
        title: 'Terms of Service',
        subtitle: 'Legal terms & local-first policy',
        category: 'Views',
        keywords: ['tos', 'terms', 'legal'],
        icon: <ShieldCheckIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo('#/tos'),
      },
      {
        id: 'view-privacy',
        title: 'Privacy Policy',
        subtitle: 'Data handling & privacy information',
        category: 'Views',
        keywords: ['privacy', 'data', 'policy'],
        icon: <ShieldCheckIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo('#/privacy'),
      },
      {
        id: 'view-licenses',
        title: 'Open Source Licenses',
        subtitle: 'Third-party notices & acknowledgments',
        category: 'Views',
        keywords: ['licenses', 'open source', 'notices', 'attribution'],
        icon: <NotesIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo('#/licenses'),
      }
    )

    // Append Collections / Lists
    collections.forEach((c) => {
      list.push({
        id: `col-${c.id}`,
        title: c.name,
        subtitle: c.defaultView === 'board' ? 'Board View' : 'List View',
        category: 'Lists',
        keywords: [c.name.toLowerCase(), c.defaultView === 'board' ? 'kanban' : 'list', 'collection'],
        icon: c.defaultView === 'board' ? <KanbanIcon className="size-4 text-pine-400" /> : <ListIcon className="size-4 text-ink-400" />,
        onSelect: () => navigateTo(`#/collection/${c.id}`),
      })
    })

    if (isDesktop && onOpenShortcuts) {
      list.push({
        id: 'action-shortcuts',
        title: 'Keyboard shortcuts',
        subtitle: 'View shortcut cheat sheet (?)',
        category: 'Actions',
        keywords: ['shortcuts', 'hotkeys', 'cheat', 'help', 'keyboard', 'keys', '?'],
        icon: <NotesIcon className="size-4 text-ink-400" />,
        onSelect: () => {
          onClose()
          onOpenShortcuts()
        },
      })
    }

    return list
  }, [collections, onOpenCreateTask, onAddCollection, onOpenBulkDelete, onClearCompleted, onExportData, onExportMarkdown, onToggleTheme, onOpenShortcuts, isDesktop])

  const filteredItems = useMemo(() => {
    const raw = query.trim()
    if (!raw) return items

    const q = raw.startsWith('>') ? raw.slice(1).trim().toLowerCase() : raw.toLowerCase()

    // 1. Task search results across title, description, subtasks, links, priorities, lists
    let taskItems: PaletteItem[] = []
    if (!raw.startsWith('>') && tasks.length > 0) {
      const taskResults = searchTasks(tasks, collections, raw)
      taskItems = taskResults.slice(0, 10).map((r) => {
        const isDone = r.task.done || r.task.status === 'done'
        const isProg = !isDone && r.task.status === 'in_progress'
        const matchFieldBadge =
          r.match.field !== 'title' ? `[${r.match.field}] ${r.match.snippet}` : null

        return {
          id: `task-${r.task.id}`,
          title: r.task.title,
          subtitle: matchFieldBadge
            ? `${matchFieldBadge} · in ${r.listName}`
            : `in ${r.listName}${r.task.dueDate ? ` · due ${r.task.dueDate}` : ''}`,
          category: 'Tasks' as const,
          keywords: [r.task.title.toLowerCase()],
          icon: (
            <span
              className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border ${
                isDone
                  ? 'border-pine-500 bg-pine-500/20 text-pine-400'
                  : isProg
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-ink-400/50 bg-paper-100'
              }`}
            >
              {isDone ? (
                <span className="size-1.5 rounded-full bg-pine-500" />
              ) : isProg ? (
                <span className="size-1.5 rounded-full bg-amber-500" />
              ) : null}
            </span>
          ),
          onSelect: () => {
            onClose()
            onSelectTask?.(r.task)
          },
        }
      })
    }

    // 2. Filtered command / navigation items
    const otherMatches = q
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
            item.category.toLowerCase().includes(q) ||
            item.keywords?.some((kw) => kw.toLowerCase().includes(q))
        )
      : items

    return [...taskItems, ...otherMatches]
  }, [items, query, tasks, collections, onSelectTask, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isCreatingList) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsCreatingList(false)
        setNewListName('')
        setTimeout(() => inputRef.current?.focus(), 40)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleCommitListCreation = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newListName.trim()
    if (trimmed) {
      onAddCollection(newListKind, trimmed)
    }
    setIsCreatingList(false)
    setNewListName('')
    onClose()
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView?.({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-[#0c0b0a]/75 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: -8, filter: 'blur(4px)' }}
            transition={SPRINGS.modal}
            className="glass-modal relative z-10 w-full max-w-xl overflow-hidden rounded-2xl p-0"
            onKeyDown={handleKeyDown}
          >
            {isCreatingList ? (
              <form onSubmit={handleCommitListCreation} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif italic text-display-md text-ink-900">
                    New Collection
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingList(false)
                      setNewListName('')
                    }}
                    className="text-small text-ink-400 hover:text-ink-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* List vs Board Segment Switcher */}
                <div className="mb-3 flex items-center rounded-xl bg-paper-200/60 p-1 text-small font-medium">
                  <button
                    type="button"
                    onClick={() => setNewListKind('list')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors cursor-pointer ${
                      newListKind === 'list'
                        ? 'bg-paper-50 text-ink-900 font-semibold shadow-2xs'
                        : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    <ListIcon className="size-4" />
                    <span>Task List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewListKind('board')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors cursor-pointer ${
                      newListKind === 'board'
                        ? 'bg-paper-50 text-ink-900 font-semibold shadow-2xs'
                        : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    <KanbanIcon className="size-4" />
                    <span>Kanban Board</span>
                  </button>
                </div>

                <input
                  ref={listNameInputRef}
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={newListKind === 'board' ? 'e.g. Project Roadmap…' : 'e.g. Reading List…'}
                  className="w-full rounded-xl bg-paper-100 px-3.5 py-2.5 text-body-lg text-ink-900 outline-none ring-1 ring-pine-500/40 placeholder:text-ink-400 mb-4"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingList(false)
                      setNewListName('')
                    }}
                    className="rounded-xl px-4 py-2 text-body font-medium text-ink-500 hover:bg-paper-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newListName.trim()}
                    className="rounded-xl bg-pine-600 px-5 py-2 text-body font-semibold text-on-accent shadow-xs transition-colors hover:bg-pine-700 disabled:opacity-40 cursor-pointer"
                  >
                    Create {newListKind === 'board' ? 'Board' : 'List'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-paper-200/50 px-4 py-3.5">
                  <SearchIcon className="size-5 shrink-0 text-ink-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      isDesktop
                        ? 'Search tasks, views, or commands… (↑↓ to navigate, ↵ to jump)'
                        : 'Search tasks, views, or commands…'
                    }
                    className="w-full bg-transparent text-body-lg font-medium text-ink-900 placeholder:text-ink-400 outline-none"
                  />
                  <kbd className="hidden rounded-md bg-paper-200/80 px-2 py-0.5 font-sans text-caption font-medium text-ink-400 md:inline-block">
                    ESC
                  </kbd>
                </div>

                <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-body-lg text-ink-400">
                      No matching tasks, views, or commands found
                    </div>
                  ) : (
                    filteredItems.map((item, index) => {
                      const isSelected = index === selectedIndex
                      const showGroupHeader =
                        index === 0 || filteredItems[index - 1].category !== item.category
                      return (
                        <div key={item.id} className="relative w-full">
                          {showGroupHeader && (
                            <div
                              className="mt-2 mb-1 flex items-center gap-2 px-3 pt-2 first:mt-0 first:pt-0"
                              role="presentation"
                            >
                              <span className="text-caption font-semibold uppercase tracking-wider text-ink-400">
                                {item.category === 'Tasks' ? 'Tasks' : item.category === 'Views' ? 'Views' : item.category === 'Lists' ? 'Lists & Boards' : 'Actions'}
                              </span>
                              <span className="h-px flex-1 bg-paper-200/60" />
                            </div>
                          )}
                          {isSelected && (
                            <motion.div
                              layoutId="commandPaletteSelection"
                              transition={SPRINGS.liquidPill}
                              className="absolute inset-0 rounded-xl bg-paper-50/90 shadow-2xs border border-white/5"
                            />
                          )}
                          <button
                            type="button"
                            data-selected={isSelected}
                            onClick={item.onSelect}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`relative z-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                              isSelected ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-800'
                            }`}
                          >
                            <span className="shrink-0">{item.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-body-lg leading-tight ${isSelected ? 'text-ink-900' : 'text-ink-700'}`}>
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-small text-ink-400 mt-0.5 truncate">{item.subtitle}</p>
                              )}
                            </div>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
