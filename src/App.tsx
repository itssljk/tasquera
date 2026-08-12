import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { useStore } from './state/store'
import { useRoute } from './lib/route'
import { formatDueHeading, getEffectiveDate, isOverdue, todayISO } from './lib/date'
import Sidebar from './components/Sidebar'
import TaskRow from './components/TaskRow'
import BoardView from './components/BoardView'
import CalendarView from './components/CalendarView'
import SettingsView from './components/SettingsView'
import TosView from './components/TosView'
import PrivacyView from './components/PrivacyView'
import TaskModal from './components/TaskModal'
import { LogoMark, MenuIcon, PlusIcon } from './components/icons'
import type { MenuState, Route, Task, TaskStatus } from './types'
import { triggerTaskConfetti } from './lib/confetti'

interface ViewData {
  mode: 'list' | 'calendar' | 'settings' | 'tos' | 'privacy' | 'archive' | 'board'
  title: string
  subtitle: string
  open: Task[]
  doneList: Task[]
  groups: { label: string; tasks: Task[] }[]
  archivedList: Task[]
  reorderable: boolean
}

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
      className="py-24 text-center"
    >
      <div className="mx-auto mb-7 flex size-16 items-center justify-center rounded-full bg-pine-50 shadow-xs">
        <LogoMark className="size-8" />
      </div>
      <p className="font-sans text-[24px] font-bold leading-snug tracking-tight text-ink-900">{title}</p>
      {sub && <p className="mx-auto mt-2.5 max-w-xs text-[15px] text-ink-500">{sub}</p>}
      {onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-pine-600 px-4 py-2.5 text-[14px] font-medium text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700 active:bg-pine-800"
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
  const [menu, setMenu] = useState<MenuState>(null)
  const [drawer, setDrawer] = useState(false)
  const [armClear, setArmClear] = useState(false)
  const quickRef = useRef<HTMLInputElement>(null)

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    taskToEdit?: Task | null
    defaultListId?: string | null
    defaultStatus?: TaskStatus
  }>({ isOpen: false })

  const { tasks, collections } = store

  useEffect(() => {
    if (route.name === 'collection' && !collections.some((c) => c.id === route.id)) {
      window.location.hash = '#/inbox'
    }
    setArmClear(false)
  }, [route, collections])

  const effectiveRoute: Route =
    route.name === 'collection' && !collections.some((c) => c.id === route.id) ? { name: 'inbox' } : route

  const activeListId = effectiveRoute.name === 'collection' ? effectiveRoute.id : null
  const activeCollection = activeListId ? collections.find((c) => c.id === activeListId) : undefined

  const todayLong = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const view = useMemo<ViewData>(() => {
    const today = todayISO()
    const getEff = (t: Task) => getEffectiveDate(t) ?? ''
    const byDue = (a: Task, b: Task) => getEff(a).localeCompare(getEff(b)) || a.createdAt - b.createdAt
    const byCompleted = (a: Task, b: Task) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
    const base: ViewData = {
      mode: 'list',
      title: '',
      subtitle: '',
      open: [],
      doneList: [],
      groups: [],
      archivedList: [],
      reorderable: false,
    }
    switch (effectiveRoute.name) {
      case 'inbox': {
        const open = tasks.filter((t) => !t.archived && !t.done && t.listId === null)
        const doneList = tasks.filter((t) => !t.archived && t.done && t.listId === null).sort(byCompleted)
        return { ...base, title: 'Inbox', subtitle: 'Tasks without a home', open, doneList, reorderable: true }
      }
      case 'today': {
        const due = tasks.filter((t) => !t.archived && !!getEffectiveDate(t) && getEffectiveDate(t)! <= today)
        const overdue = due.filter((t) => !t.done && isOverdue(getEffectiveDate(t)!)).sort(byDue)
        const todays = due.filter((t) => !t.done && !isOverdue(getEffectiveDate(t)!)).sort(byDue)
        const doneList = due.filter((t) => t.done).sort(byCompleted)
        const groups = [
          ...(overdue.length ? [{ label: 'Overdue', tasks: overdue }] : []),
          ...(todays.length ? [{ label: 'Today', tasks: todays }] : []),
        ]
        return { ...base, title: 'Today', subtitle: todayLong, open: [...overdue, ...todays], doneList, groups }
      }
      case 'upcoming': {
        const upcoming = tasks
          .filter((t) => !t.archived && !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today)
          .sort(byDue)
        const groups: { label: string; tasks: Task[] }[] = []
        for (const t of upcoming) {
          const last = groups[groups.length - 1]
          const effDate = getEffectiveDate(t)!
          if (last && getEffectiveDate(last.tasks[0]) === effDate) last.tasks.push(t)
          else groups.push({ label: formatDueHeading(effDate), tasks: [t] })
        }
        const doneList = tasks.filter((t) => !t.archived && t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today).sort(byCompleted)
        return {
          ...base,
          title: 'Upcoming',
          subtitle: upcoming.length ? `From ${formatDueHeading(getEffectiveDate(upcoming[0])!)}` : 'Nothing scheduled',
          open: upcoming,
          doneList,
          groups,
        }
      }
      case 'collection': {
        const col = collections.find((c) => c.id === effectiveRoute.id)
        if (!col) return { ...base, title: 'Inbox', subtitle: 'Tasks without a home', reorderable: true }
        if (col.kind === 'board') {
          const colTasks = tasks.filter((t) => !t.archived && t.listId === col.id)
          return { ...base, mode: 'board', title: col.name, subtitle: 'Kanban board', open: colTasks }
        }
        const open = tasks.filter((t) => !t.archived && !t.done && t.listId === col.id)
        const doneList = tasks.filter((t) => !t.archived && t.done && t.listId === col.id).sort(byCompleted)
        return { ...base, title: col.name, subtitle: `${open.length} open`, open, doneList, reorderable: true }
      }
      case 'completed': {
        const doneList = tasks.filter((t) => !t.archived && t.done).sort(byCompleted)
        return { ...base, title: 'Completed', subtitle: `${doneList.length} done`, doneList }
      }
      case 'archive': {
        const archivedList = tasks.filter((t) => t.archived).sort((a, b) => b.createdAt - a.createdAt)
        return { ...base, mode: 'archive', title: 'Archive', subtitle: `${archivedList.length} kept`, archivedList }
      }
      case 'calendar':
        return { ...base, mode: 'calendar', title: 'Calendar', subtitle: '' }
      case 'settings':
        return { ...base, mode: 'settings', title: 'Settings', subtitle: '' }
      case 'tos':
        return { ...base, mode: 'tos', title: 'Terms of Service', subtitle: '' }
      case 'privacy':
        return { ...base, mode: 'privacy', title: 'Privacy Policy', subtitle: '' }
    }
  }, [tasks, collections, effectiveRoute])

  const countFor = (r: Route): number => {
    const today = todayISO()
    switch (r.name) {
      case 'inbox':
        return tasks.filter((t) => !t.archived && !t.done && t.listId === null).length
      case 'today':
        return tasks.filter((t) => !t.archived && !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! <= today).length
      case 'upcoming':
        return tasks.filter((t) => !t.archived && !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today).length
      case 'collection':
        return tasks.filter((t) => !t.archived && !t.done && t.listId === r.id).length
      case 'completed':
        return tasks.filter((t) => !t.archived && t.done).length
      default:
        return 0
    }
  }

  const listName = (t: Task): string => {
    if (!t.listId) return 'Inbox'
    return collections.find((c) => c.id === t.listId)?.name ?? 'Inbox'
  }

  const handleClearAll = (e: React.MouseEvent) => {
    if (!armClear) {
      setArmClear(true)
      return
    }
    triggerTaskConfetti(e.currentTarget as HTMLElement)
    store.clearCompleted()
    setArmClear(false)
  }

  const openCreateModal = (listId: string | null = activeListId, status: TaskStatus = 'todo') => {
    setModalState({ isOpen: true, taskToEdit: null, defaultListId: listId, defaultStatus: status })
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

  const renderRow = (task: Task, done: boolean, meta?: string) => (
    <TaskRow
      key={task.id}
      task={task}
      done={done}
      meta={meta}
      collections={collections}
      reorderable={view.reorderable}
      menuOpen={menu?.kind === 'task' && menu.id === task.id}
      onToggleMenu={(id) => setMenu(id ? { kind: 'task', id } : null)}
      onToggle={store.toggleTask}
      onDelete={store.deleteTask}
      onUpdate={store.updateTask}
      onMove={store.moveTask}
      onArchive={store.archiveTask}
      onRestore={store.restoreTask}
      onEditDetails={openEditModal}
    />
  )

  const emptyCopy = (): { title: string; sub?: string } => {
    switch (effectiveRoute.name) {
      case 'inbox':
        return { title: 'All caught up.', sub: 'Enjoy the quiet — or add what’s next.' }
      case 'today':
        return { title: 'Nothing due today.', sub: 'Take a breath — the rest can wait.' }
      case 'upcoming':
        return { title: 'Nothing scheduled.', sub: 'Set a due date on a task and it will show up here.' }
      case 'collection':
        return { title: `Nothing in ${view.title} yet.`, sub: 'Add a task above, or move one here.' }
      case 'completed':
        return { title: 'Nothing completed yet.', sub: 'Finished tasks will rest here.' }
      default:
        return { title: 'Nothing here.', sub: undefined }
    }
  }

  const total = view.open.length + view.doneList.length
  const pct = total > 0 ? Math.round((view.doneList.length / total) * 100) : 0

  const sidebarProps = {
    showQuickAdd: store.settings.showQuickAdd,
    route,
    collections,
    countFor,
    quickAddRef: quickRef,
    addPlaceholder: activeCollection ? `Add to ${activeCollection.name}…` : 'Add a task…',
    onQuickAdd: (title: string) => store.addTask(title, activeListId),
    menu,
    onMenu: setMenu,
    onOpenCreateModal: openCreateModal,
    onAddCollection: store.addCollection,
    onRenameCollection: store.renameCollection,
    onDeleteCollection: store.deleteCollection,
    onReorderCollections: store.reorderCollections,
  }

  const routeKey =
    effectiveRoute.name === 'collection' ? `collection-${effectiveRoute.id}` : effectiveRoute.name

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-paper-50">
      <div className="hidden h-full md:block">
        <Sidebar {...sidebarProps} />
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[#0c0b0a]/75 backdrop-blur-md"
              onClick={() => setDrawer(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute inset-y-0 left-0 z-10 max-w-[85vw] shadow-[0_0_60px_rgba(0,0,0,0.7)]"
            >
              <Sidebar {...sidebarProps} onNavigate={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-paper-50/90 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="size-5" />
            <span className="font-sans text-[18px] font-bold tracking-tight text-ink-900">
              Tasquera<span className="text-pine-500">.</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => openCreateModal(activeListId)}
              aria-label="New task"
              className="rounded-lg bg-pine-600 p-2 text-[#fbf9f5] shadow-xs transition-colors hover:bg-pine-700"
            >
              <PlusIcon className="size-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-paper-100"
            >
              <MenuIcon className="size-5" />
            </motion.button>
          </div>
        </div>

        <div className={`mx-auto w-full px-6 pb-24 pt-10 sm:pt-14 ${view.mode === 'board' ? 'max-w-[1000px]' : 'max-w-[600px]'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {(view.mode === 'list' || view.mode === 'archive' || view.mode === 'board') && (
                <header className="flex items-start justify-between gap-6">
                  <div>
                    <h1 className="font-sans text-[26px] font-bold leading-none tracking-tight text-ink-900">{view.title}</h1>
                    <p className="mt-3 text-[12.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{view.subtitle}</p>
                  </div>
                  {view.mode === 'list' && effectiveRoute.name === 'completed' ? (
                    view.doneList.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleClearAll}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                          armClear ? 'bg-terra-600 text-[#fbf9f5]' : 'text-terra-600 hover:bg-terra-50'
                        }`}
                      >
                        {armClear ? 'Sure?' : 'Clear all'}
                      </motion.button>
                    )
                  ) : view.mode === 'list' && total > 0 ? (
                    <div className="w-28 shrink-0 pt-1 text-right">
                      <p className="text-[12px] font-medium text-ink-500">
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
                </header>
              )}

              {view.mode === 'board' ? (
                activeCollection && (
                  <BoardView
                    board={activeCollection}
                    tasks={tasks.filter((t) => !t.archived && t.listId === activeCollection.id)}
                    collections={collections}
                    menu={menu}
                    onMenu={setMenu}
                    onToggle={store.toggleTask}
                    onDelete={store.deleteTask}
                    onUpdate={store.updateTask}
                    onMove={store.moveTask}
                    onArchive={store.archiveTask}
                    onArchiveOldCompleted={store.archiveOldCompleted}
                    onOpenCreateModal={openCreateModal}
                    onEditDetails={openEditModal}
                    onReorderColumnTasks={store.reorderColumnTasks}
                  />
                )
              ) : view.mode === 'calendar' ? (
                <div className="mt-2">
                  <CalendarView
                    tasks={tasks}
                    collections={collections}
                    menu={menu}
                    onMenu={setMenu}
                    onToggle={store.toggleTask}
                    onDelete={store.deleteTask}
                    onUpdate={store.updateTask}
                    onMove={store.moveTask}
                    onArchive={store.archiveTask}
                  />
                </div>
              ) : view.mode === 'settings' ? (
                <div className="mt-2">
                  <SettingsView
                    settings={store.settings}
                    onUpdateSettings={store.updateSettings}
                    onClearAll={store.clearAll}
                    onArchiveOldCompleted={store.archiveOldCompleted}
                    onExportData={store.exportData}
                    onImportData={store.importData}
                  />
                </div>
              ) : view.mode === 'tos' ? (
                <div className="mt-2">
                  <TosView />
                </div>
              ) : view.mode === 'privacy' ? (
                <div className="mt-2">
                  <PrivacyView />
                </div>
              ) : view.mode === 'archive' ? (
                view.archivedList.length === 0 ? (
                  <EmptyState title="The archive is empty." sub="Archived tasks rest here, out of the way." />
                ) : (
                  <ul className="mt-6">
                    <AnimatePresence mode="popLayout">
                      {view.archivedList.map((t) => renderRow(t, t.done, `In ${listName(t)}`))}
                    </AnimatePresence>
                  </ul>
                )
              ) : view.open.length === 0 && view.doneList.length === 0 && view.groups.length === 0 ? (
                <EmptyState
                  {...emptyCopy()}
                  onAction={
                    effectiveRoute.name !== 'completed' && effectiveRoute.name !== 'archive'
                      ? () => openCreateModal(activeListId)
                      : undefined
                  }
                  actionLabel="Add task"
                />
              ) : (
                <>
                  {view.groups.length > 0 ? (
                    view.groups.map((g) => (
                      <section key={g.label} className="mt-6">
                        <h2
                          className={`text-[13px] font-semibold uppercase tracking-[0.1em] ${
                            g.label === 'Overdue' ? 'text-terra-600' : 'text-ink-500'
                          }`}
                        >
                          {g.label}
                        </h2>
                        <ul className="mt-1">
                          <AnimatePresence mode="popLayout">
                            {g.tasks.map((t) => renderRow(t, false))}
                          </AnimatePresence>
                        </ul>
                      </section>
                    ))
                  ) : effectiveRoute.name === 'completed' ? (
                    <ul className="mt-6">
                      <AnimatePresence mode="popLayout">
                        {view.doneList.map((t) => renderRow(t, true))}
                      </AnimatePresence>
                    </ul>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {view.reorderable ? (
                        <Reorder.Group
                          axis="y"
                          values={view.open.map((t) => t.id)}
                          onReorder={(ids) => store.reorderTasks(ids)}
                        >
                          <AnimatePresence mode="popLayout">
                            {view.open.map((t) => renderRow(t, false))}
                          </AnimatePresence>
                        </Reorder.Group>
                      ) : (
                        <ul>
                          <AnimatePresence mode="popLayout">
                            {view.open.map((t) => renderRow(t, false))}
                          </AnimatePresence>
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => openCreateModal(activeListId)}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-paper-300 px-3.5 py-2.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:border-pine-500/50 hover:bg-paper-100 hover:text-pine-600"
                      >
                        <PlusIcon className="size-4 stroke-[2]" />
                        <span>Add task...</span>
                      </button>
                    </div>
                  )}
                  {view.doneList.length > 0 && effectiveRoute.name !== 'completed' && (
                    <p className="mt-8 text-center text-[12.5px] text-ink-400">
                      <button
                        type="button"
                        onClick={() => { window.location.hash = '#/completed' }}
                        className="transition-colors duration-150 hover:text-pine-600"
                      >
                        View {view.doneList.length} completed {view.doneList.length === 1 ? 'task' : 'tasks'}
                      </button>
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {menu && <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />}

      <AnimatePresence>
        {modalState.isOpen && (
          <TaskModal
            isOpen={modalState.isOpen}
            taskToEdit={modalState.taskToEdit}
            defaultListId={modalState.defaultListId}
            defaultStatus={modalState.defaultStatus}
            collections={collections}
            onClose={closeModal}
            onSave={handleSaveTask}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {store.undoToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-8 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl bg-[#f4efe6] px-4 py-2.5 text-[13.5px] font-medium text-[#1c1917] shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-[#e6dfd3] sm:rounded-full sm:px-6 sm:py-3 sm:text-[14.5px]"
          >
            <span className="min-w-0 font-medium text-[#1c1917] tracking-tight">{store.undoToastMessage}</span>
            <div className="flex items-center gap-3 border-l border-[#dcd3c1] pl-3 sm:gap-4 sm:pl-4">
              {store.canUndo && (
                <button
                  type="button"
                  onClick={store.undo}
                  className="font-semibold text-[#1c1917] hover:opacity-75 transition-opacity"
                >
                  Undo
                </button>
              )}
              {store.canRedo && (
                <button
                  type="button"
                  onClick={store.redo}
                  className="font-semibold text-[#f59e0b] hover:text-[#d97706] transition-colors"
                >
                  Redo
                </button>
              )}
              <button
                type="button"
                onClick={store.clearUndoToast}
                className="text-[#8a8073] hover:text-[#1c1917] transition-colors p-0.5 rounded-full flex items-center justify-center"
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
    </div>
  )
}
