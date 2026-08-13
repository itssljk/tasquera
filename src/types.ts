export type CollectionKind = 'board' | 'list'

export interface AppSettings {
  showQuickAdd: boolean
}

export interface Collection {
  id: string
  kind: CollectionKind
  name: string
  createdAt: number
  updatedAt?: number
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

/** How a task repeats. Simple rules use only `rule`; custom rules add a modifier. */
export interface Recurrence {
  rule: RecurrenceRule
  /** Repeats every N units (e.g. every 3 days). */
  interval?: number
  /** Day of the month (1-31) for monthly-on-a-specific-day rules. */
  day?: number
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
  deadline?: string | null
  description?: string
  priority?: PriorityLevel
  subtasks?: Subtask[]
  links?: TaskLink[]
  images?: string[]
  archived: boolean
  status?: TaskStatus
  recurrence?: Recurrence | null
}

export type Route =
  | { name: 'inbox' }
  | { name: 'today' }
  | { name: 'upcoming' }
  | { name: 'calendar' }
  | { name: 'completed' }
  | { name: 'archive' }
  | { name: 'settings' }
  | { name: 'tos' }
  | { name: 'privacy' }
  | { name: 'search' }
  | { name: 'collection'; id: string; kind: CollectionKind }

export type MenuState = { kind: 'task'; id: string } | { kind: 'collection'; id: string } | null
