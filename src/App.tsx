import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { useStore } from './state/store'
import { useRoute } from './lib/route'
import { findCollection } from './lib/model'
import DesktopNavPill from './components/DesktopNavPill'
import MobileBottomDock from './components/MobileBottomDock'
import MobileDrawerSheet from './components/MobileDrawerSheet'
import CommandPalette from './components/CommandPalette'
import TaskRow from './components/TaskRow'
import TosView from './components/TosView'
import PrivacyView from './components/PrivacyView'
import LicensesView from './components/LicensesView'
import BatchActionBar from './components/BatchActionBar'
import { IOSInstallModal, usePWAInstall } from './components/InstallPWA'
import { AppUpdateBanner } from './components/AppUpdate'
import StoragePermissionOnboarding from './components/StoragePermissionOnboarding'
import { KanbanIcon, ListIcon, LogoMark, PlusIcon, SearchIcon } from './components/icons'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { MenuState, Route, Task, TaskStatus } from './types'
import { isNativePlatform } from './lib/sync'
import { useTaskReminders } from './lib/notifications'
import { useAppUpdater } from './lib/useAppUpdater'
import { useSyncEngine } from './lib/useSyncEngine'
import { useTaskView } from './lib/useTaskView'
import { useKeyboardNav } from './lib/useKeyboardNav'

// Heavy views and modals code-split on demand
const BoardView = lazy(() => import('./components/BoardView'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const SettingsView = lazy(() => import('./components/SettingsView'))
const TaskModal = lazy(() => import('./components/TaskModal'))
const BulkDeleteListsModal = lazy(() => import('./components/BulkDeleteListsModal'))

function EmptyState({
  title,
  sub,
  onAction,
  actionLabel,
}: {
  title: string
  sub?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[52vh] flex-col items-center justify-center py-14 text-center"
    >
      <LogoMark className="mx-auto mb-7 size-12 shadow-sm" />
      <p className="font-sans text-display font-bold leading-snug tracking-tight text-ink-900">{title}</p>
      {sub && <p className="mx-auto mt-2.5 max-w-xs text-body-lg text-ink-500">{sub}</p>}
      {onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-pine-600 px-4 py-2.5 text-body-lg font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800 cursor-pointer"
        >
          <PlusIcon className="size-4 stroke-[2.2]" />
          <span>{actionLabel ?? 'Add a task'}</span>
        </motion.button>
      )}
    </motion.div>
  )
}

export default function App() {
  const store = useStore()
  const route = useRoute()
  const pwaInstall = usePWAInstall()
  const updater = useAppUpdater()

  // Due-date & deadline reminders
  useTaskReminders(store.tasks, store.settings)

  const [menu, setMenu] = useState<MenuState>(null)
  const [isDrawerSheetOpen, setIsDrawerSheetOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    taskToEdit?: Task | null
    defaultListId?: string | null
    defaultStatus?: TaskStatus
    defaultDueDate?: string | null
  }>({ isOpen: false })

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

  // Configure transparent edge-to-edge status bar on native platform
  useEffect(() => {
    if (isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {})
    }
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

      if (e.key === '1') {
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
      } else if (e.key === '/') {
        e.preventDefault()
        openCreateModal(activeListId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeListId])

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!menu) return
    const handleOutsidePointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (
        target.closest('[role="menu"]') ||
        target.closest('[aria-label="Task actions"]') ||
        target.closest('[aria-label^="Actions for "] ||') ||
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
    effectiveRoute.name === 'collection' ? `collection-${effectiveRoute.id}` : effectiveRoute.name

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col selection:bg-pine-500/20">
      {/* Desktop Floating Navigation Pill */}
      <div className="sticky top-0 z-30 hidden md:block">
        <DesktopNavPill
          route={effectiveRoute}
          collections={collections}
          countFor={countFor}
          onOpenCreateTask={() => openCreateModal(activeListId)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleFavoriteCollection={store.toggleFavoriteCollection}
          onDeleteCollection={store.deleteCollection}
          onRenameCollection={store.renameCollection}
          onAddCollection={store.addCollection}
          onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
        />
      </div>

      {/* Mobile Top Minimal Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-paper-50/90 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="font-sans text-brand font-bold tracking-tight text-ink-900">
            Tasquera<span className="text-pine-500">.</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Search & Commands"
            className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-paper-100 cursor-pointer"
          >
            <SearchIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Focus Canvas */}
      <main className="flex-1 w-full overflow-y-auto">
        <div
          className={`mx-auto w-full px-4 sm:px-6 lg:px-8 pb-32 pt-4 sm:pt-8 lg:pt-10 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            view.mode === 'board' ? 'max-w-[1400px]' : 'max-w-[720px]'
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
              {(view.mode === 'list' || view.mode === 'board') && (
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5">
                  <div className="min-w-0">
                    <h1 className="font-sans text-display-md sm:text-display-lg font-bold leading-none tracking-tight text-ink-900 truncate">
                      {view.title}
                    </h1>
                    {view.subtitle &&
                      (effectiveRoute.name === 'today' ? (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-paper-300/60 bg-paper-100/70 px-3 py-1 font-medium text-ink-500">
                          <span className="size-1.5 rounded-full bg-pine-500" />
                          <span className="text-small">{view.subtitle}</span>
                        </div>
                      ) : (
                        <p className="mt-2.5 text-small font-medium uppercase tracking-[0.16em] text-ink-500">
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
                    ) : view.mode === 'list' && total > 0 ? (
                      <div className="w-28 shrink-0 text-right">
                        <p className="text-small font-medium text-ink-500">
                          {view.doneList.length} of {total} done
                        </p>
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-paper-200">
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
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
                        />
                      </motion.div>
                    )
                  ) : view.mode === 'calendar' ? (
                    <motion.div
                      key="calendar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
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
                      />
                    </motion.div>
                  ) : view.mode === 'tos' ? (
                    <motion.div
                      key="tos"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="mt-2"
                    >
                      <TosView />
                    </motion.div>
                  ) : view.mode === 'privacy' ? (
                    <motion.div
                      key="privacy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="mt-2"
                    >
                      <PrivacyView />
                    </motion.div>
                  ) : view.mode === 'licenses' ? (
                    <motion.div
                      key="licenses"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="mt-2"
                    >
                      <LicensesView />
                    </motion.div>
                  ) : view.open.length === 0 && view.doneList.length === 0 && view.groups.length === 0 ? (
                    <motion.div
                      key={`empty-${effectiveRoute.name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <EmptyState
                        {...emptyCopy()}
                        onAction={
                          effectiveRoute.name !== 'completed'
                            ? () => openCreateModal(activeListId)
                            : undefined
                        }
                        actionLabel="Add task"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`list-${effectiveRoute.name === 'collection' ? effectiveRoute.id : effectiveRoute.name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
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
                      ) : (
                        <div className="mt-4 space-y-3">
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
                          <button
                            type="button"
                            onClick={() => openCreateModal(activeListId)}
                            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-paper-300/80 px-3.5 py-2.5 text-body font-medium text-ink-500 transition-colors hover:border-pine-500/50 hover:bg-paper-100/60 hover:text-pine-600 cursor-pointer"
                          >
                            <PlusIcon className="size-4 stroke-[2]" />
                            <span>Add task…</span>
                          </button>
                        </div>
                      )}
                      {view.doneList.length > 0 && effectiveRoute.name !== 'completed' && (
                        <p className="mt-8 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = '#/completed'
                            }}
                            className="rounded-full border border-paper-300/70 px-4 py-1.5 text-small font-medium text-ink-500 transition-colors duration-150 hover:border-pine-500/40 hover:text-pine-600 cursor-pointer"
                          >
                            View {view.doneList.length} completed {view.doneList.length === 1 ? 'task' : 'tasks'}
                          </button>
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <BatchActionBar
            selectedCount={selectedTaskIds.length}
            collections={collections}
            onMarkDone={() => {
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
              store.batchDeleteTasks(selectedTaskIds)
              setSelectedTaskIds([])
            }}
            onClearSelection={() => setSelectedTaskIds([])}
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Bottom Dock */}
      <MobileBottomDock
        route={effectiveRoute}
        countFor={countFor}
        onOpenCreateTask={() => openCreateModal(activeListId)}
        onOpenSheet={() => setIsDrawerSheetOpen(true)}
      />

      {/* Mobile Pull-Up Sheet */}
      <MobileDrawerSheet
        isOpen={isDrawerSheetOpen}
        onClose={() => setIsDrawerSheetOpen(false)}
        route={effectiveRoute}
        collections={collections}
        countFor={countFor}
        onAddCollection={store.addCollection}
        onRenameCollection={store.renameCollection}
        onDeleteCollection={store.deleteCollection}
        onToggleFavoriteCollection={store.toggleFavoriteCollection}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
      />

      {/* Universal Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        collections={collections}
        onOpenCreateTask={() => openCreateModal(activeListId)}
        onAddCollection={store.addCollection}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
        onClearCompleted={store.clearCompleted}
        onExportData={store.exportData}
        onExportMarkdown={handleExportMarkdown}
        onToggleTheme={handleToggleTheme}
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
              layout={store.settings.taskModalLayout ?? 'centered'}
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

      {/* Undo / Redo Toast */}
      <AnimatePresence>
        {store.undoToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-20 md:bottom-8 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl bg-paper-100 px-4 py-2.5 text-body font-medium text-ink-900 shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-paper-200 sm:rounded-full sm:px-6 sm:py-3 sm:text-body-lg"
          >
            <span className="min-w-0 font-medium text-ink-900 tracking-tight">{store.undoToastMessage}</span>
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
        <IOSInstallModal
          isOpen={pwaInstall.showIOSModal}
          onClose={() => pwaInstall.setShowIOSModal(false)}
        />
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
