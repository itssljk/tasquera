export type CollectionKind = 'board' | 'list'

export interface AppSettings {
  showQuickAdd: boolean
}

export interface Collection {
  id: string
  kind: CollectionKind
  name: string
  createdAt: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

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
  | { name: 'collection'; id: string; kind: CollectionKind }

export type MenuState = { kind: 'task'; id: string } | { kind: 'collection'; id: string } | null
