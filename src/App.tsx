import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { SPRINGS } from './lib/motion'
import { useStore } from './state/store'
import { useRoute } from './lib/route'
import { findCollection } from './lib/model'
import Sidebar from './components/Sidebar'
import MobileListsDrawer from './components/MobileListsDrawer'
import MobileBottomDock from './components/MobileBottomDock'
import CommandPalette from './components/CommandPalette'
import TaskRow from './components/TaskRow'
import TosView from './components/TosView'
import PrivacyView from './components/PrivacyView'
import LicensesView from './components/LicensesView'
import BatchActionBar from './components/BatchActionBar'
import { AndroidDownloadBanner, AndroidInstallModal, IOSInstallModal, usePWAInstall } from './components/InstallPWA'
import { AppUpdateBanner } from './components/AppUpdate'
import StoragePermissionOnboarding from './components/StoragePermissionOnboarding'
import { CalendarIcon, CheckIcon, FlagIcon, KanbanIcon, ListIcon, LogoMark, PlusIcon, SearchIcon, SettingsIcon } from './components/icons'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { MenuState, Route, Task, TaskStatus } from './types'
import { isNativePlatform } from './lib/sync'
import { triggerHaptic } from './lib/platform'
import { useTaskReminders } from './lib/notifications'
import { useAppUpdater } from './lib/useAppUpdater'
import { useSyncEngine } from './lib/useSyncEngine'
import { useTaskView } from './lib/useTaskView'
import { useKeyboardNav } from './lib/useKeyboardNav'
import { initBackButtonListener } from './lib/backButton'
import { parseTaskInput } from './lib/nlp'
import { addDaysISO, formatDue, todayISO } from './lib/date'
import { useIsDesktop } from './lib/useMediaQuery'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'

// Heavy views and modals code-split on demand
const BoardView = lazy(() => import('./components/BoardView'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const SettingsView = lazy(() => import('./components/SettingsView'))
const TaskModal = lazy(() => import('./components/TaskModal'))
const BulkDeleteListsModal = lazy(() => import('./components/BulkDeleteListsModal'))

function EmptyState({
  title,
  sub,
  actionLabel,
  onAction,
}: {
  title: string
  sub?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[32vh] flex-col items-center justify-center py-12 text-center"
    >
      <p className="font-serif italic text-display-md leading-snug tracking-tight text-ink-900">{title}</p>
      {sub && <p className="mx-auto mt-2 max-w-sm text-body text-ink-500">{sub}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-paper-100 px-4 py-2 text-body font-semibold text-pine-600 ring-1 ring-paper-200 transition-colors hover:bg-pine-500/10 hover:ring-pine-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 cursor-pointer"
        >
          <PlusIcon className="size-3.5" />
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}

export default function App() {
  const store = useStore()
  const route = useRoute()
  const isDesktop = useIsDesktop()
  const pwaInstall = usePWAInstall()
  const updater = useAppUpdater()

  // Due-date & deadline reminders
  useTaskReminders(store.tasks, store.settings)

  const [menu, setMenu] = useState<MenuState>(null)
  const [isDrawerSheetOpen, setIsDrawerSheetOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [upcomingMode, setUpcomingMode] = useState<'agenda' | 'calendar'>('agenda')
  const [showCompletedArchive, setShowCompletedArchive] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tasquera:sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('tasquera:sidebar-collapsed', String(next))
      } catch {}
      return next
    })
  }

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    taskToEdit?: Task | null
    defaultListId?: string | null
    defaultStatus?: TaskStatus
    defaultDueDate?: string | null
  }>({ isOpen: false })

  const [inlineQuickAddTitle, setInlineQuickAddTitle] = useState('')
  const inlineQuickAddRef = useRef<HTMLInputElement>(null)

  const handleInlineQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inlineQuickAddTitle.trim()
    if (!trimmed) return
    const parsed = parseTaskInput(trimmed)

    let defaultDueDate: string | null = null
    if (effectiveRoute.name === 'today') {
      defaultDueDate = todayISO()
    } else if (effectiveRoute.name === 'upcoming') {
      defaultDueDate = addDaysISO(todayISO(), 1)
    }

    const dueDate = parsed.dueDate ?? defaultDueDate

    store.addTask({
      title: parsed.title || trimmed,
      dueDate,
      priority: parsed.priority,
      listId: activeListId,
      status: 'todo',
    })

    // The view you typed in may not show the task you just created (e.g.
    // "Walk dog tomorrow" from Today, or a dated task from Inbox) — say so.
    const today = todayISO()
    const taskVisibleHere =
      effectiveRoute.name === 'inbox'
        ? dueDate === null
        : effectiveRoute.name === 'today'
          ? !!dueDate && dueDate <= today
          : effectiveRoute.name === 'upcoming'
            ? !!dueDate && dueDate > today
            : true
    if (dueDate && !taskVisibleHere) {
      store.showToast(`Saved to ${formatDue(dueDate)} — find it in Upcoming`)
    }

    setInlineQuickAddTitle('')
  }

  // Sync engine handling native/web filesystem access & polling
  const {
    syncDirHandle,
    syncError,
    syncNeedsPermission,
    showStorageOnboarding,
    lastSyncTime,
    lastSyncSizeBytes,
    syncResolveMsg,
    isFileSystemSupported,
    handleSelectSyncFolder,
    handleDisconnectSyncFolder,
    handleStorageOnboardingGrant,
    handleStorageOnboardingNotNow,
  } = useSyncEngine({
    tasks: store.tasks,
    collections: store.collections,
    tombstones: store.tombstones,
    mergeState: store.mergeState,
  })

  // Synchronize color theme on HTML root element
  useEffect(() => {
    const theme = store.settings?.theme || 'dark'
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.add('theme-light')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.remove('theme-light')
    }
  }, [store.settings?.theme])

  // Clear batch selection when switching routes
  useEffect(() => {
    setSelectedTaskIds([])
  }, [route])

  // Auto-dismiss the undo/notification toast after a pause
  useEffect(() => {
    if (!store.undoToastMessage) return
    const t = setTimeout(() => store.clearUndoToast(), 6000)
    return () => clearTimeout(t)
  }, [store.undoToastMessage, store.clearUndoToast])

  // Configure transparent edge-to-edge status bar on native platform, synced with theme
  useEffect(() => {
    if (isNativePlatform()) {
      const isLight = store.settings?.theme === 'light'
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark }).catch(() => {})
      StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {})
    }
  }, [store.settings?.theme])

  useEffect(() => {
    initBackButtonListener()
    // Preload heavy BoardView component chunk
    import('./components/BoardView')
  }, [])

  const { tasks, collections } = store

  const activeCollection =
    route.name === 'collection' ? findCollection(collections, route.id) : undefined

  useEffect(() => {
    if (route.name === 'collection' && !activeCollection) {
      window.location.hash = '#/inbox'
    }
  }, [route, activeCollection])

  const effectiveRoute: Route =
    route.name === 'collection'
      ? activeCollection
        ? { name: 'collection', id: activeCollection.id, kind: activeCollection.kind }
        : { name: 'inbox' }
      : route

  const activeListId = activeCollection ? activeCollection.id : null

  // Task view computation (grouping, filtering, sorting, counts)
  const { view, countFor, emptyCopy, total, pct } = useTaskView({
    tasks,
    collections,
    effectiveRoute,
  })

  // Synchronize calendar mode when navigating to #/calendar
  useEffect(() => {
    if (route.name === 'calendar') {
      setUpcomingMode('calendar')
    }
  }, [route.name])

  const isCalendarActive =
    view.mode === 'calendar' ||
    effectiveRoute.name === 'calendar' ||
    (effectiveRoute.name === 'upcoming' && upcomingMode === 'calendar')

  const openCreateModal = (
    listId: string | null = activeListId,
    status: TaskStatus = 'todo',
    dueDate: string | null = null
  ) => {
    setModalState({
      isOpen: true,
      taskToEdit: null,
      defaultListId: listId,
      defaultStatus: status,
      defaultDueDate: dueDate,
    })
  }

  const openEditModal = (task: Task) => {
    setModalState({
      isOpen: true,
      taskToEdit: task,
      defaultListId: task.listId,
      defaultStatus: task.status || (task.done ? 'done' : 'todo'),
    })
  }

  const closeModal = () => setModalState({ isOpen: false })

  const handleSaveTask = (taskData: Partial<Task> & { title: string }) => {
    if (modalState.taskToEdit) {
      store.updateTask(modalState.taskToEdit.id, taskData)
    } else {
      store.addTask(taskData)
    }
  }

  const handlePromoteSubtask = (subtaskTitle: string, listId?: string | null) => {
    store.addTask(subtaskTitle, listId ?? activeListId)
  }

  // Keyboard list navigation for Vim / Arrow navigation
  const currentListTasks =
    view.groups.length > 0
      ? view.groups.flatMap((g) => g.tasks)
      : effectiveRoute.name === 'completed'
        ? view.doneList
        : view.open

  const { focusedId } = useKeyboardNav({
    tasks: currentListTasks,
    onToggle: store.toggleTask,
    onEdit: openEditModal,
    onDelete: store.deleteTask,
    enabled:
      view.mode === 'list' &&
      !modalState.isOpen &&
      !isCommandPaletteOpen &&
      !isDrawerSheetOpen &&
      !isBulkDeleteOpen,
  })

  const handleSelectToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Global Keyboard Shortcuts: Cmd/Ctrl+K, 1 (Inbox), 2 (Today), 3 (Upcoming), 4 (Palette), / (New task)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
        return
      }

      if (isInput) return

      if (e.key === '?') {
        e.preventDefault()
        setIsShortcutsOpen(true)
      } else if (e.key === '1') {
        e.preventDefault()
        window.location.hash = '#/inbox'
      } else if (e.key === '2') {
        e.preventDefault()
        window.location.hash = '#/today'
      } else if (e.key === '3') {
        e.preventDefault()
        window.location.hash = '#/upcoming'
      } else if (e.key === '4') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      } else if (e.key === '[') {
        e.preventDefault()
        handleToggleSidebar()
      } else if (e.key === ',') {
        e.preventDefault()
        window.location.hash = '#/settings'
      } else if (e.key === '/' || e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        if (inlineQuickAddRef.current && (view.mode === 'list' || !modalState.isOpen)) {
          inlineQuickAddRef.current.focus()
          inlineQuickAddRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        } else {
          openCreateModal(activeListId)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeListId, view.mode, modalState.isOpen])

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!menu) return
    const handleOutsidePointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (
        target.closest('[role="menu"]') ||
        target.closest('[aria-label="Task actions"]') ||
        target.closest('[aria-label^="Actions for "]') ||
        target.closest('[aria-label^="Actions for “"]') ||
        target.closest('[data-menu-trigger]')
      ) {
        return
      }
      setMenu(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menu])

  const renderRow = (task: Task, done: boolean, meta?: string) => (
    <TaskRow
      key={task.id}
      task={task}
      done={done}
      meta={meta}
      collections={collections}
      reorderable={view.reorderable}
      selected={selectedTaskIds.includes(task.id)}
      isKeyboardFocused={focusedId === task.id}
      onSelectToggle={handleSelectToggle}
      menuOpen={menu?.kind === 'task' && menu.id === task.id}
      onToggleMenu={(id) => setMenu(id ? { kind: 'task', id } : null)}
      onToggle={store.toggleTask}
      onDelete={store.deleteTask}
      onUpdate={store.updateTask}
      onMove={store.moveTask}
      onEditDetails={openEditModal}
    />
  )

  const handleToggleTheme = () => {
    store.updateSettings({
      theme: (store.settings?.theme ?? 'dark') === 'light' ? 'dark' : 'light',
    })
  }

  const handleExportMarkdown = () => {
    const md = store.exportMarkdown(activeListId)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(md)
    }
    return md
  }

  const routeKey =
    effectiveRoute.name === 'collection'
      ? `collection-${effectiveRoute.id}`
      : effectiveRoute.name === 'upcoming'
        ? `upcoming-${upcomingMode}`
        : effectiveRoute.name

  return (
    <div className="min-h-screen bg-paper-50 flex selection:bg-pine-500/20">
      {/* Collapsible Left Sidebar dedicated to Lists & Boards (Desktop) */}
      <Sidebar
        route={effectiveRoute}
        collections={collections}
        countFor={countFor}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={handleToggleSidebar}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onAddCollection={store.addCollection}
        onRenameCollection={store.renameCollection}
        onDeleteCollection={store.deleteCollection}
        onToggleFavoriteCollection={store.toggleFavoriteCollection}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
      />

      {/* Dedicated Slide-Out Drawer for Lists & Boards (Mobile) */}
      <MobileListsDrawer
        isOpen={isDrawerSheetOpen}
        onClose={() => setIsDrawerSheetOpen(false)}
        route={effectiveRoute}
        collections={collections}
        countFor={countFor}
        onAddCollection={store.addCollection}
        onRenameCollection={store.renameCollection}
        onDeleteCollection={store.deleteCollection}
        onToggleFavoriteCollection={store.toggleFavoriteCollection}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
      />

      {/* Main Column: Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Top Minimal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-paper-50/90 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="size-5" />
            <span className="font-serif italic text-brand tracking-tight text-ink-900">
              Tasquera<span className="text-pine-500">.</span>
            </span>
            {syncDirHandle && (
              <span
                title={lastSyncTime ? `Synced: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Sync connected'}
                className="size-1.5 rounded-full bg-pine-500 shadow-[0_0_6px_rgba(46,160,105,0.8)]"
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Search & Commands"
              className="flex size-10 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-paper-100 hover:text-ink-900 cursor-pointer"
            >
              <SearchIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection')
                if (effectiveRoute.name === 'settings') {
                  window.location.hash = '#/inbox'
                } else {
                  window.location.hash = '#/settings'
                }
              }}
              aria-label="Settings"
              className={`flex size-10 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                effectiveRoute.name === 'settings'
                  ? 'bg-paper-200 text-pine-500 shadow-2xs'
                  : 'text-ink-500 hover:bg-paper-100 hover:text-ink-900'
              }`}
            >
              <SettingsIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* Main Focus Canvas */}
        <main className="flex-1 w-full overflow-y-auto">
        <div
          className={`mx-auto w-full px-4 sm:px-6 lg:px-8 pb-32 pt-5 sm:pt-5 lg:pt-6 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            view.mode === 'board' || isCalendarActive
              ? 'max-w-[1440px]'
              : 'max-w-[720px]'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {(view.mode === 'list' || view.mode === 'board' || isCalendarActive) && (
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5">
                  <div className="min-w-0">
                    <h1 className="font-serif italic text-display-md sm:text-display-lg font-normal leading-tight tracking-tight text-ink-900 truncate pb-1 pr-2">
                      {isCalendarActive ? 'Upcoming' : view.title}
                    </h1>
                    {view.subtitle && !isCalendarActive &&
                      (effectiveRoute.name === 'today' ? (
                        <p className="mt-1 flex items-center gap-2 text-body font-medium text-ink-500">
                          <span className="size-1.5 rounded-full bg-pine-500 shrink-0" />
                          <span className="tabular-nums tracking-normal">{view.subtitle}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-body text-ink-500">
                          {view.subtitle}
                        </p>
                      ))}
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-start shrink-0 pt-0.5">
                    {/* View Switcher for Collections (List vs Board) */}
                    {effectiveRoute.name === 'collection' && activeCollection && (
                      <div className="relative flex items-center rounded-xl bg-paper-100 p-0.5 border border-paper-200/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => store.setCollectionViewMode(activeCollection.id, 'list')}
                          className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                            view.mode === 'list'
                              ? 'text-ink-900 font-semibold'
                              : 'text-ink-500 hover:text-ink-900'
                          }`}
                          aria-label="List view"
                          title="List view"
                        >
                          {view.mode === 'list' && (
                            <motion.div
                              layoutId="active-collection-view-tab"
                              className="absolute inset-0 rounded-[7px] bg-paper-50 shadow-xs"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <ListIcon className="size-3.5" />
                            <span>List</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => store.setCollectionViewMode(activeCollection.id, 'board')}
                          className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                            view.mode === 'board'
                              ? 'text-ink-900 font-semibold'
                              : 'text-ink-500 hover:text-ink-900'
                          }`}
                          aria-label="Board view"
                          title="Board view"
                        >
                          {view.mode === 'board' && (
                            <motion.div
                              layoutId="active-collection-view-tab"
                              className="absolute inset-0 rounded-[7px] bg-paper-50 shadow-xs"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <KanbanIcon className="size-3.5" />
                            <span>Board</span>
                          </span>
                        </button>
                      </div>
                    )}

                    {/* View Switcher for Upcoming (Agenda vs Calendar) */}
                    {(effectiveRoute.name === 'upcoming' || effectiveRoute.name === 'calendar') && (
                      <div className="relative flex items-center rounded-xl bg-paper-100 p-0.5 border border-paper-200/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (effectiveRoute.name === 'calendar') {
                              window.location.hash = '#/upcoming'
                            }
                            setUpcomingMode('agenda')
                          }}
                          className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                            upcomingMode === 'agenda' && effectiveRoute.name !== 'calendar'
                              ? 'text-ink-900 font-semibold'
                              : 'text-ink-500 hover:text-ink-900'
                          }`}
                          aria-label="Agenda view"
                          title="Agenda view"
                        >
                          {upcomingMode === 'agenda' && effectiveRoute.name !== 'calendar' && (
                            <motion.div
                              layoutId="active-upcoming-view-tab"
                              className="absolute inset-0 rounded-[7px] bg-paper-50 shadow-xs"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <ListIcon className="size-3.5" />
                            <span>Agenda</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpcomingMode('calendar')}
                          className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-small font-medium transition-colors cursor-pointer ${
                            upcomingMode === 'calendar' || effectiveRoute.name === 'calendar'
                              ? 'text-ink-900 font-semibold'
                              : 'text-ink-500 hover:text-ink-900'
                          }`}
                          aria-label="Calendar view"
                          title="Calendar view"
                        >
                          {(upcomingMode === 'calendar' || effectiveRoute.name === 'calendar') && (
                            <motion.div
                              layoutId="active-upcoming-view-tab"
                              className="absolute inset-0 rounded-[7px] bg-paper-50 shadow-xs"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <CalendarIcon className="size-3.5" />
                            <span>Calendar</span>
                          </span>
                        </button>
                      </div>
                    )}

                    {view.mode === 'list' && effectiveRoute.name === 'completed' ? (
                      view.doneList.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={store.clearCompleted}
                          className="shrink-0 rounded-xl px-3 py-1.5 text-body font-medium transition-colors duration-150 text-terra-600 hover:bg-terra-50 cursor-pointer"
                        >
                          Clear all
                        </motion.button>
                      )
                    ) : view.mode === 'list' && !isCalendarActive && total > 0 ? (
                      <div className="w-28 shrink-0 text-right">
                        <p className="text-small font-medium text-ink-500 tabular-nums">
                          {view.doneList.length}
                          <span className="px-0.5 text-ink-400">of</span>
                          {total}
                          <span className="pl-1">done</span>
                        </p>
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-paper-300">
                          <motion.div
                            className="h-full rounded-full bg-pine-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </header>
              )}

              <Suspense fallback={<div className="py-20 text-center text-body text-ink-500">Loading…</div>}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {view.mode === 'board' ? (
                    activeCollection && (
                      <motion.div
                        key={`board-${activeCollection.id}`}
                        initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                        transition={SPRINGS.contentSlide}
                      >
                        <BoardView
                          board={activeCollection}
                          tasks={tasks.filter((t) => t.listId === activeCollection.id)}
                          collections={collections}
                          menu={menu}
                          weekStartsOn={store.settings.weekStartsOn ?? 'monday'}
                          onMenu={setMenu}
                          onToggle={store.toggleTask}
                          onDelete={store.deleteTask}
                          onUpdate={store.updateTask}
                          onMove={store.moveTask}
                          onOpenCreateModal={openCreateModal}
                          onEditDetails={openEditModal}
                          onReorderColumnTasks={store.reorderColumnTasks}
                          onAddTask={store.addTask}
                        />
                      </motion.div>
                    )
                  ) : isCalendarActive ? (
                    <motion.div
                      key="calendar"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                      className="mt-2"
                    >
                      <CalendarView
                        tasks={tasks}
                        collections={collections}
                        menu={menu}
                        weekStartsOn={store.settings.weekStartsOn ?? 'monday'}
                        onMenu={setMenu}
                        onToggle={store.toggleTask}
                        onDelete={store.deleteTask}
                        onUpdate={store.updateTask}
                        onMove={store.moveTask}
                        onEditDetails={openEditModal}
                        onOpenCreateModal={openCreateModal}
                        onAddTask={store.addTask}
                      />
                    </motion.div>
                  ) : view.mode === 'settings' ? (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                      className="mt-2"
                    >
                      <SettingsView
                        settings={store.settings}
                        onUpdateSettings={store.updateSettings}
                        onClearAll={store.clearAll}
                        onExportData={store.exportData}
                        onImportData={store.importData}
                        onExportMarkdown={handleExportMarkdown}
                        canInstallPWA={isNativePlatform() ? false : pwaInstall.canInstall}
                        isStandalonePWA={isNativePlatform() ? false : pwaInstall.isStandalone}
                        onInstallPWA={pwaInstall.promptInstall}
                        isFileSystemSupported={isFileSystemSupported}
                        isNative={isNativePlatform()}
                        isSyncActive={!!syncDirHandle}
                        syncNeedsPermission={syncNeedsPermission}
                        lastSyncFormatted={lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : null}
                        syncSizeBytes={lastSyncSizeBytes}
                        syncErrorMsg={syncError}
                        syncResolveMsg={syncResolveMsg}
                        onSelectSyncFolder={handleSelectSyncFolder}
                        onDisconnectSyncFolder={handleDisconnectSyncFolder}
                        updater={updater}
                        collections={collections}
                        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
                        onOpenShortcuts={isDesktop ? () => setIsShortcutsOpen(true) : undefined}
                      />
                    </motion.div>
                  ) : view.mode === 'tos' ? (
                    <motion.div
                      key="tos"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                      className="mt-2"
                    >
                      <TosView />
                    </motion.div>
                  ) : view.mode === 'privacy' ? (
                    <motion.div
                      key="privacy"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                      className="mt-2"
                    >
                      <PrivacyView />
                    </motion.div>
                  ) : view.mode === 'licenses' ? (
                    <motion.div
                      key="licenses"
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                      className="mt-2"
                    >
                      <LicensesView />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`list-${effectiveRoute.name === 'collection' ? effectiveRoute.id : effectiveRoute.name}`}
                      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                      transition={SPRINGS.contentSlide}
                    >
                      {effectiveRoute.name !== 'completed' && (
                        <form
                          onSubmit={handleInlineQuickAdd}
                          className="group relative mb-4 flex items-center gap-3 rounded-xl bg-paper-100/70 px-3.5 py-2.5 ring-1 ring-paper-200/80 transition-all focus-within:bg-paper-100 focus-within:ring-2 focus-within:ring-pine-500/40"
                        >
                          <PlusIcon className="size-4 shrink-0 text-ink-500" />
                          <input
                            ref={inlineQuickAddRef}
                            type="text"
                            value={inlineQuickAddTitle}
                            onChange={(e) => setInlineQuickAddTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                inlineQuickAddRef.current?.blur()
                              }
                            }}
                            placeholder={isDesktop ? 'Add a task… (press "/" or "c" to focus, "Enter" to save)' : 'Add a task…'}
                            className="w-full bg-transparent text-body font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(() => {
                              const parsed = parseTaskInput(inlineQuickAddTitle)
                              return (
                                <>
                                  {parsed.dueDate && (
                                    <span className="inline-flex items-center gap-1 rounded bg-pine-500/15 px-2 py-0.5 text-micro font-medium text-pine-300">
                                      <CalendarIcon className="size-3" />
                                      {formatDue(parsed.dueDate)}
                                    </span>
                                  )}
                                  {parsed.priority && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-micro font-medium text-amber-300 capitalize">
                                      <FlagIcon className="size-3" />
                                      {parsed.priority}
                                    </span>
                                  )}
                                </>
                              )
                            })()}
                            {inlineQuickAddTitle.trim() && (
                              <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-pine-600 px-2.5 py-1 text-caption font-semibold text-[#fbf9f5] transition-colors hover:bg-pine-700 cursor-pointer"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </form>
                      )}

                      {/* Empty state: quiet whisper under the rapid-capture input */}
                      {view.open.length === 0 && view.groups.length === 0 && (
                        effectiveRoute.name === 'completed' ? (
                          view.doneList.length === 0 && <EmptyState {...emptyCopy()} />
                        ) : (
                          <EmptyState {...emptyCopy()} />
                        )
                      )}

                      {view.groups.length > 0 ? (
                        view.groups.map((g) => (
                          <section key={g.label} className="mt-5">
                            <div className="flex items-center gap-3">
                              <h2
                                className={`shrink-0 text-body font-semibold uppercase tracking-[0.1em] ${
                                  g.label === 'Overdue' ? 'text-terra-600' : 'text-ink-500'
                                }`}
                              >
                                {g.label}
                              </h2>
                              <div className="h-px flex-1 bg-paper-200/50" />
                            </div>
                            <ul className="mt-1">
                              <AnimatePresence mode="popLayout" initial={false}>
                                {g.tasks.map((t) => renderRow(t, false))}
                              </AnimatePresence>
                            </ul>
                          </section>
                        ))
                      ) : effectiveRoute.name === 'completed' ? (
                        <ul className="mt-6">
                          <AnimatePresence mode="popLayout" initial={false}>
                            {view.doneList.map((t) => renderRow(t, true))}
                          </AnimatePresence>
                        </ul>
                      ) : view.open.length > 0 ? (
                        <div className="mt-4">
                          {view.reorderable ? (
                            <Reorder.Group
                              axis="y"
                              values={view.open.map((t) => t.id)}
                              onReorder={(ids) => store.reorderTasks(ids)}
                            >
                              <AnimatePresence mode="popLayout" initial={false}>
                                {view.open.map((t) => renderRow(t, false))}
                              </AnimatePresence>
                            </Reorder.Group>
                          ) : (
                            <ul>
                              <AnimatePresence mode="popLayout" initial={false}>
                                {view.open.map((t) => renderRow(t, false))}
                              </AnimatePresence>
                            </ul>
                          )}
                        </div>
                      ) : null}

                      {/* In-place collapsible completed archive */}
                      {view.doneList.length > 0 && effectiveRoute.name !== 'completed' && (
                        <div className="mt-8 pt-4 border-t border-paper-200/50">
                          <button
                            type="button"
                            onClick={() => setShowCompletedArchive((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-small font-medium text-ink-500 hover:bg-paper-100/60 hover:text-ink-800 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <CheckIcon className="size-4 text-pine-500" />
                              <span>Completed ({view.doneList.length})</span>
                            </div>
                            <span className="text-caption font-medium text-ink-400">
                              {showCompletedArchive ? 'Hide' : 'Show'}
                            </span>
                          </button>

                          <AnimatePresence>
                            {showCompletedArchive && (
                              <motion.ul
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={SPRINGS.snappy}
                                className="mt-2 space-y-0.5 overflow-hidden"
                              >
                                {view.doneList.map((t) => renderRow(t, true))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      </div>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <BatchActionBar
            selectedCount={selectedTaskIds.length}
            collections={collections}
            onMarkDone={() => {
              triggerHaptic('success')
              store.batchToggleTasks(selectedTaskIds, true)
              setSelectedTaskIds([])
            }}
            onMarkTodo={() => {
              store.batchToggleTasks(selectedTaskIds, false)
              setSelectedTaskIds([])
            }}
            onReschedule={(date) => {
              store.batchScheduleTasks(selectedTaskIds, date)
              setSelectedTaskIds([])
            }}
            onMoveToList={(listId) => {
              store.batchMoveTasks(selectedTaskIds, listId)
              setSelectedTaskIds([])
            }}
            onDelete={() => {
              triggerHaptic('warning')
              store.batchDeleteTasks(selectedTaskIds)
              setSelectedTaskIds([])
            }}
            onClearSelection={() => setSelectedTaskIds([])}
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Bottom Dock */}
      {selectedTaskIds.length === 0 && (
        <MobileBottomDock
          route={effectiveRoute}
          countFor={countFor}
          onOpenCreateTask={() => openCreateModal(activeListId)}
          onOpenSheet={() => setIsDrawerSheetOpen(true)}
        />
      )}

      {/* Universal Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        collections={collections}
        tasks={tasks}
        onSelectTask={openEditModal}
        onOpenCreateTask={() => openCreateModal(activeListId)}
        onAddCollection={store.addCollection}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
        onClearCompleted={store.clearCompleted}
        onExportData={store.exportData}
        onExportMarkdown={handleExportMarkdown}
        onToggleTheme={handleToggleTheme}
        onOpenShortcuts={isDesktop ? () => setIsShortcutsOpen(true) : undefined}
      />

      {/* Task Edit / Create Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <Suspense fallback={null}>
            <TaskModal
              isOpen={modalState.isOpen}
              taskToEdit={modalState.taskToEdit}
              defaultListId={modalState.defaultListId}
              defaultStatus={modalState.defaultStatus}
              defaultDueDate={modalState.defaultDueDate}
              collections={collections}
              layout={store.settings.taskModalLayout ?? 'drawer'}
              weekStartsOn={store.settings.weekStartsOn ?? 'monday'}
              onClose={closeModal}
              onSave={handleSaveTask}
              onPromoteSubtask={handlePromoteSubtask}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Bulk Delete Lists Modal */}
      <AnimatePresence>
        {isBulkDeleteOpen && (
          <Suspense fallback={null}>
            <BulkDeleteListsModal
              isOpen={isBulkDeleteOpen}
              onClose={() => setIsBulkDeleteOpen(false)}
              collections={collections}
              tasks={tasks}
              onDeleteCollections={store.deleteCollections}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Cheat Sheet Modal (?) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Undo / Redo Toast */}
      <AnimatePresence>
        {store.undoToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] md:bottom-8 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl bg-paper-100 px-4 py-2.5 text-body font-medium text-ink-900 shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-paper-200 sm:rounded-full sm:px-6 sm:py-3 sm:text-body-lg"
          >
            <span className="min-w-0 font-medium text-ink-900 tracking-tight">
              {isDesktop ? store.undoToastMessage : store.undoToastMessage.replace(/\s*\([^)]*\)/g, '')}
            </span>
            <div className="flex items-center gap-3 border-l border-paper-300/80 pl-3 sm:gap-4 sm:pl-4">
              {store.canUndo && (
                <button
                  type="button"
                  onClick={store.undo}
                  className="font-semibold text-pine-600 hover:text-pine-500 transition-colors cursor-pointer"
                >
                  Undo
                </button>
              )}
              {store.canRedo && (
                <button
                  type="button"
                  onClick={store.redo}
                  className="font-semibold text-amber-600 hover:text-amber-500 transition-colors cursor-pointer"
                >
                  Redo
                </button>
              )}
              <button
                type="button"
                onClick={store.clearUndoToast}
                className="text-ink-400 hover:text-ink-900 transition-colors p-0.5 rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Close notification"
              >
                <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isNativePlatform() && (
        <>
          <IOSInstallModal
            isOpen={pwaInstall.showIOSModal}
            onClose={() => pwaInstall.setShowIOSModal(false)}
          />
          <AndroidInstallModal
            isOpen={pwaInstall.showAndroidModal}
            onClose={() => pwaInstall.setShowAndroidModal(false)}
            onInstallPWA={pwaInstall.promptPWA}
          />
          <AndroidDownloadBanner
            onOpenModal={() => pwaInstall.setShowAndroidModal(true)}
          />
        </>
      )}

      <AppUpdateBanner updater={updater} />

      {isNativePlatform() && (
        <StoragePermissionOnboarding
          isOpen={showStorageOnboarding}
          onGrant={handleStorageOnboardingGrant}
          onNotNow={handleStorageOnboardingNotNow}
        />
      )}
    </div>
  )
}
