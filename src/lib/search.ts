import type { Collection, Task } from '../types'

export interface SearchMatch {
  field: 'title' | 'subtask' | 'description' | 'link' | 'list' | 'priority' | 'status'
  snippet: string
  matchedTerms?: string[]
}

export interface SearchResult {
  task: Task
  listName: string
  match: SearchMatch
  matchedTerms?: string[]
}

export interface SearchOptions {
  includeArchived?: boolean
}

function fieldRank(field: SearchMatch['field']): number {
  switch (field) {
    case 'title':
      return 0
    case 'subtask':
      return 1
    case 'description':
      return 2
    case 'link':
      return 3
    case 'list':
      return 4
    case 'priority':
      return 5
    case 'status':
      return 6
  }
}

interface ParsedQuery {
  terms: string[]
  isDone?: boolean
  isInProgress?: boolean
  isRecurring?: boolean
  priority?: string
  inList?: string
}

function parseQuery(rawQuery: string): ParsedQuery {
  const parts = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const terms: string[] = []
  const parsed: ParsedQuery = { terms }

  for (const part of parts) {
    if (part === 'is:done' || part === 'is:completed' || part === 'status:done') {
      parsed.isDone = true
    } else if (part === 'is:open' || part === 'is:todo' || part === 'is:active' || part === 'status:todo') {
      parsed.isDone = false
    } else if (part === 'is:in_progress' || part === 'status:in_progress') {
      parsed.isInProgress = true
    } else if (part === 'is:recurring' || part === 'is:repeating') {
      parsed.isRecurring = true
    } else if (part.startsWith('p:') || part.startsWith('priority:')) {
      const val = part.slice(part.indexOf(':') + 1)
      if (['low', 'medium', 'high', 'urgent'].includes(val)) {
        parsed.priority = val
      } else {
        terms.push(part)
      }
    } else if (part.startsWith('in:')) {
      parsed.inList = part.slice(3)
    } else {
      terms.push(part)
    }
  }

  return parsed
}

export function searchTasks(
  tasks: Task[],
  collections: Collection[],
  query: string
): SearchResult[] {
  const q = query.trim()
  if (!q) return []

  const parsed = parseQuery(q)
  const results: SearchResult[] = []

  for (const t of tasks) {
    if (parsed.isDone !== undefined && t.done !== parsed.isDone) continue
    if (parsed.isInProgress && t.status !== 'in_progress') continue
    if (parsed.isRecurring && !t.recurrence) continue
    if (parsed.priority && t.priority !== parsed.priority) continue

    const listName = t.listId ? (collections.find((c) => c.id === t.listId)?.name ?? 'Inbox') : 'Inbox'
    if (parsed.inList && !listName.toLowerCase().includes(parsed.inList)) continue

    // Evaluate free text search terms
    let allTermsMatch = true
    const termMatchRecords: { term: string; field: SearchMatch['field']; snippet: string }[] = []

    for (const term of parsed.terms) {
      let termMatched = false

      if (t.title.toLowerCase().includes(term)) {
        termMatched = true
        termMatchRecords.push({ term, field: 'title', snippet: t.title })
      }
      if (t.description && t.description.toLowerCase().includes(term)) {
        termMatched = true
        termMatchRecords.push({ term, field: 'description', snippet: t.description })
      }
      for (const s of t.subtasks ?? []) {
        if (s.title.toLowerCase().includes(term)) {
          termMatched = true
          termMatchRecords.push({ term, field: 'subtask', snippet: s.title })
        }
      }
      for (const l of t.links ?? []) {
        if (l.url.toLowerCase().includes(term) || (l.title ?? '').toLowerCase().includes(term)) {
          termMatched = true
          termMatchRecords.push({ term, field: 'link', snippet: l.title || l.url })
        }
      }
      if (listName.toLowerCase().includes(term)) {
        termMatched = true
        termMatchRecords.push({ term, field: 'list', snippet: listName })
      }
      if (t.priority && t.priority.toLowerCase().includes(term)) {
        termMatched = true
        termMatchRecords.push({ term, field: 'priority', snippet: `Priority: ${t.priority}` })
      }

      if (!termMatched) {
        allTermsMatch = false
        break
      }
    }

    if (!allTermsMatch && parsed.terms.length > 0) continue

    // Determine primary match highlight
    let primaryMatch: SearchMatch = {
      field: 'title',
      snippet: t.title,
      matchedTerms: parsed.terms,
    }

    if (termMatchRecords.length > 0) {
      // Find non-title match if exists, or highest ranked match
      const nonTitleMatches = termMatchRecords.filter((m) => m.field !== 'title')
      const best = (nonTitleMatches.length > 0 ? nonTitleMatches : termMatchRecords).sort(
        (a, b) => fieldRank(a.field) - fieldRank(b.field)
      )[0]
      primaryMatch = {
        field: best.field,
        snippet: best.snippet,
        matchedTerms: parsed.terms,
      }
    }

    results.push({
      task: t,
      listName,
      match: primaryMatch,
      matchedTerms: parsed.terms,
    })
  }

  results.sort((a, b) => {
    if (a.task.done !== b.task.done) return a.task.done ? 1 : -1
    const rank = fieldRank(a.match.field) - fieldRank(b.match.field)
    if (rank !== 0) return rank
    return b.task.createdAt - a.task.createdAt
  })

  return results
}
