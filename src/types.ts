export type CollectionViewMode = 'list' | 'board'
export type CollectionKind = 'board' | 'list'

export interface AppSettings {
  /** Master switch for due-date reminders. */
  notificationsEnabled?: boolean
  /** Local time "HH:MM" at which date-only due dates remind (default 09:00). */
  notificationTime?: string
  /** Desktop task modal layout style: centered dialog or right slide-out drawer. */
  taskModalLayout?: 'centered' | 'drawer'
  /** First day of the week for calendars and date pickers. */
  weekStartsOn?: 'monday' | 'sunday'
  /** Whether to play a subtle sound when completing a task. */
  soundEnabled?: boolean
  /** Default priority level applied to newly created tasks. */
  defaultTaskPriority?: PriorityLevel | 'none'
  /** Color theme: dark (warm editorial dark) or light (warm editorial daylight). */
  theme?: 'dark' | 'light' | 'system'
}

export interface Collection {
  id: string
  kind?: CollectionKind
  name: string
  createdAt: number
  updatedAt?: number
  favorite?: boolean
  defaultView?: CollectionViewMode
}

/** A deletion record so sync/merge can propagate removals across devices. */
export interface Tombstone {
  id: string
  kind: 'task' | 'collection'
  deletedAt: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

export type RecurrenceRule = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

/** How a task repeats. */
export interface Recurrence {
  rule: RecurrenceRule
  /** Repeats every N units (e.g. every 2 weeks). Default 1. */
  interval?: number
  /** Specific days of week for weekly recurrence: 0 = Sun, 1 = Mon, ..., 6 = Sat */
  daysOfWeek?: number[]
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface TaskLink {
  id: string
  url: string
  title?: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  createdAt: number
  updatedAt?: number
  completedAt: number | null
  listId: string | null
  dueDate: string | null
  description?: string
  priority?: PriorityLevel
  subtasks?: Subtask[]
  links?: TaskLink[]
  status?: TaskStatus
  recurrence?: Recurrence | null
}

export type Route =
  | { name: 'inbox' }
  | { name: 'today' }
  | { name: 'upcoming' }
  | { name: 'calendar' }
  | { name: 'completed' }
  | { name: 'settings' }
  | { name: 'tos' }
  | { name: 'privacy' }
  | { name: 'licenses' }
  | { name: 'collection'; id: string; kind?: CollectionKind }

export type MenuState = { kind: 'task'; id: string } | { kind: 'collection'; id: string } | null
