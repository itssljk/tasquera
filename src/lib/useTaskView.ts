import { useMemo } from 'react'
import type { Collection, Route, Task } from '../types'
import { formatDueHeading, getEffectiveDate, isOverdue, todayISO } from './date'

export interface ViewData {
  mode: 'list' | 'calendar' | 'settings' | 'tos' | 'privacy' | 'licenses' | 'board'
  title: string
  subtitle: string
  open: Task[]
  doneList: Task[]
  groups: { label: string; tasks: Task[] }[]
  reorderable: boolean
}

interface UseTaskViewProps {
  tasks: Task[]
  collections: Collection[]
  effectiveRoute: Route
}

export function useTaskView({ tasks, collections, effectiveRoute }: UseTaskViewProps) {
  const todayLong = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  )

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
      reorderable: false,
    }

    switch (effectiveRoute.name) {
      case 'inbox': {
        const open = tasks.filter((t) => !t.done && t.listId === null)
        const doneList = tasks.filter((t) => t.done && t.listId === null).sort(byCompleted)
        return { ...base, title: 'Inbox', subtitle: 'Tasks without a home', open, doneList, reorderable: true }
      }
      case 'today': {
        const due = tasks.filter((t) => !!getEffectiveDate(t) && getEffectiveDate(t)! <= today)
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
          .filter((t) => !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today)
          .sort(byDue)
        const groups: { label: string; tasks: Task[] }[] = []
        for (const t of upcoming) {
          const last = groups[groups.length - 1]
          const effDate = getEffectiveDate(t)!
          if (last && getEffectiveDate(last.tasks[0]) === effDate) last.tasks.push(t)
          else groups.push({ label: formatDueHeading(effDate), tasks: [t] })
        }
        const doneList = tasks.filter((t) => t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today).sort(byCompleted)
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
        const viewMode = col.defaultView || (col.kind === 'board' ? 'board' : 'list')
        if (viewMode === 'board') {
          const colTasks = tasks.filter((t) => t.listId === col.id)
          return { ...base, mode: 'board', title: col.name, subtitle: `${colTasks.length} ${colTasks.length === 1 ? 'task' : 'tasks'}`, open: colTasks }
        }
        const open = tasks.filter((t) => !t.done && t.listId === col.id)
        const doneList = tasks.filter((t) => t.done && t.listId === col.id).sort(byCompleted)
        return { ...base, title: col.name, subtitle: `${open.length} open`, open, doneList, reorderable: true }
      }
      case 'completed': {
        const doneList = tasks.filter((t) => t.done).sort(byCompleted)
        return { ...base, title: 'Completed', subtitle: `${doneList.length} done`, doneList }
      }
      case 'calendar':
        return { ...base, mode: 'calendar', title: 'Calendar', subtitle: '' }
      case 'settings':
        return { ...base, mode: 'settings', title: 'Settings', subtitle: '' }
      case 'tos':
        return { ...base, mode: 'tos', title: 'Terms of Service', subtitle: '' }
      case 'privacy':
        return { ...base, mode: 'privacy', title: 'Privacy Policy', subtitle: '' }
      case 'licenses':
        return { ...base, mode: 'licenses', title: 'Open Source Licenses', subtitle: '' }
      default:
        return base
    }
  }, [tasks, collections, effectiveRoute, todayLong])

  const countFor = (r: Route): number => {
    const today = todayISO()
    switch (r.name) {
      case 'inbox':
        return tasks.filter((t) => !t.done && t.listId === null).length
      case 'today':
        return tasks.filter((t) => !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! <= today).length
      case 'upcoming':
        return tasks.filter((t) => !t.done && !!getEffectiveDate(t) && getEffectiveDate(t)! > today).length
      case 'collection':
        return tasks.filter((t) => !t.done && t.listId === r.id).length
      case 'completed':
        return tasks.filter((t) => t.done).length
      default:
        return 0
    }
  }

  const emptyCopy = (): { title: string; sub?: string } => {
    switch (effectiveRoute.name) {
      case 'inbox':
        return { title: 'All caught up.', sub: 'Enjoy the quiet, or add what’s next.' }
      case 'today':
        return { title: 'Nothing due today.', sub: 'Take a breath, the rest can wait.' }
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

  return {
    view,
    countFor,
    emptyCopy,
    total,
    pct,
  }
}
