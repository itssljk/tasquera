import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection } from '../types'
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
  category: 'Views' | 'Lists' | 'Actions'
  keywords?: string[]
  icon: React.ReactNode
  onSelect: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  onOpenCreateTask: () => void
  onAddCollection: (name: string) => void
  onOpenBulkDelete?: () => void
  onClearCompleted?: () => void
  onExportData?: () => void
  onExportMarkdown?: () => void
  onToggleTheme?: () => void
}

export default function CommandPalette({
  isOpen,
  onClose,
  collections,
  onOpenCreateTask,
  onAddCollection,
  onOpenBulkDelete,
  onClearCompleted,
  onExportData,
  onExportMarkdown,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

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
        title: 'Go to Completed',
        subtitle: 'All finished tasks',
        category: 'Views',
        keywords: ['completed', 'done', 'archive', 'history', '>completed', '>done'],
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
        title: 'Create new list',
        subtitle: 'Add a new task list or collection',
        category: 'Actions',
        keywords: ['new list', 'add list', 'collection', 'create list', '>new'],
        icon: <ListIcon className="size-4 text-ink-400" />,
        onSelect: () => {
          const name = window.prompt('Enter list name:')
          if (name?.trim()) {
            onAddCollection(name.trim())
          }
          onClose()
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

    return list
  }, [collections, onOpenCreateTask, onAddCollection, onOpenBulkDelete, onClearCompleted, onExportData])

  const filteredItems = useMemo(() => {
    const raw = query.trim().toLowerCase()
    if (!raw) return items
    const q = raw.startsWith('>') ? raw.slice(1).trim() : raw
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((kw) => kw.toLowerCase().includes(q))
    )
  }, [items, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
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
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl bg-paper-100/95 shadow-2xl border border-paper-200/80 backdrop-blur-xl"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-paper-200/50 px-4 py-3.5">
              <SearchIcon className="size-5 shrink-0 text-ink-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search views, collections, or actions… (↑↓ to navigate, ↵ to jump)"
                className="w-full bg-transparent text-body-lg font-medium text-ink-900 placeholder:text-ink-400 outline-none"
              />
              <kbd className="hidden rounded-md bg-paper-200/80 px-2 py-0.5 font-sans text-caption font-medium text-ink-400 sm:inline-block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-body-lg text-ink-400">
                  No matching views or commands found
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                        isSelected ? 'bg-paper-50 shadow-2xs font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900'
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
                      <span className="shrink-0 text-caption font-semibold text-ink-400/80 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
