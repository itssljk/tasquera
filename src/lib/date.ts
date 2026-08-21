export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** "Today", "Tomorrow", "Yesterday", or "Aug 18" / "Aug 18, 2027". */
export function formatDue(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === addDaysISO(today, 1)) return 'Tomorrow'
  if (iso === addDaysISO(today, -1)) return 'Yesterday'
  const d = parseISO(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Aug 12" from a timestamp. */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "Thursday, August 14". */
export function formatDueHeading(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function isOverdue(iso: string): boolean {
  return iso < todayISO()
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Get task's primary effective date (YYYY-MM-DD) from dueDate */
export function getEffectiveDate(task: { dueDate?: string | null }): string | null {
  return task.dueDate || null
}

/** Get next Monday ISO date string */
export function getNextMondayISO(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

/** Format time string "17:00" or "09:30" to friendly format ("5:00 PM", "9:30 AM") */
export function formatTimeLabel(timeStr: string): string {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  const hours = parseInt(hStr, 10)
  const minutes = parseInt(mStr, 10)
  if (isNaN(hours) || isNaN(minutes)) return timeStr

  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

