import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, PriorityLevel, Task, TaskLink, TaskStatus } from '../types'
import { triggerTaskConfetti } from '../lib/confetti'
import { putImage, resolveMany } from '../lib/attachments'
import { DatePickerPanel, DatePickerTrigger } from './DatePicker'
import RecurrencePicker from './RecurrencePicker'
import {
  ArchiveIcon,
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  FlagIcon,
  ImageIcon,
  InboxIcon,
  KanbanIcon,
  LinkIcon,
  ListIcon,
  NotesIcon,
  PaperclipIcon,
  PlusIcon,
  SubtaskIcon,
  TrashIcon,
} from './icons'

interface BoardCardDetailsProps {
  task: Task
  boardName: string
  collections?: Collection[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: () => void
  onArchive: () => void
  onMove?: (id: string, listId: string | null) => void
  onEditDetails?: (task: Task) => void
}

const PRIORITIES: { id: PriorityLevel; label: string; dot: string; text: string; bg: string }[] = [
  { id: 'low', label: 'Low', dot: 'bg-slateblue-600', text: 'text-slateblue-600', bg: 'bg-slateblue-600/15' },
  { id: 'medium', label: 'Medium', dot: 'bg-pine-500', text: 'text-pine-500', bg: 'bg-pine-500/15' },
  { id: 'high', label: 'High', dot: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-600/15' },
  { id: 'urgent', label: 'Urgent', dot: 'bg-terra-600', text: 'text-terra-600', bg: 'bg-terra-600/15' },
]

function TaskCheckCircle({
  done,
  status,
  onClick,
}: {
  done: boolean
  status?: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const isDone = done || status === 'done'
  const isInProgress = !isDone && status === 'in_progress'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.84 }}
      onClick={onClick}
      aria-label={isDone ? 'Mark as to-do' : isInProgress ? 'Mark as done' : 'Mark as in progress'}
      className="mt-0.5 relative flex size-6 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-pine-500/50"
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'transparent'}
          stroke={isDone ? 'var(--color-pine-600)' : isInProgress ? 'var(--color-amber-600)' : 'var(--color-ink-400)'}
          strokeWidth="2"
          className="transition-colors duration-200"
        />
        {isDone ? (
          <motion.path
            d="M7.5 12.5l3.2 3.2 6-6.4"
            fill="none"
            stroke="#FBF9F5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : isInProgress ? (
          <circle cx="12" cy="12" r="3.5" fill="#FBF9F5" />
        ) : null}
      </svg>
    </motion.button>
  )
}

export default function BoardCardDetails({
  task,
  boardName,
  collections = [],
  onClose,
  onUpdate,
  onDelete,
  onArchive,
  onMove,
}: BoardCardDetailsProps) {
  const [localTitle, setLocalTitle] = useState(task.title)
  const [localDesc, setLocalDesc] = useState(task.description || '')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState<'due' | 'deadline' | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [showAddImageUrl, setShowAddImageUrl] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const moveDropdownRef = useRef<HTMLDivElement>(null)
  const priorityDropdownRef = useRef<HTMLDivElement>(null)

  // Sync state when task prop changes
  useEffect(() => {
    setLocalTitle(task.title)
    setLocalDesc(task.description || '')
    void resolveMany(task.images ?? []).then(setImageUrls)
  }, [task])

  // Handle escape key and clicks outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null)
        } else if (scheduleOpen) {
          setScheduleOpen(null)
        } else if (showPriorityDropdown) {
          setShowPriorityDropdown(false)
        } else if (showMoveDropdown) {
          setShowMoveDropdown(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, scheduleOpen, showPriorityDropdown, showMoveDropdown, onClose])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target as Node)) {
        setShowMoveDropdown(false)
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
        setShowPriorityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isDone = task.done || task.status === 'done'
  const isInProgress = !isDone && task.status === 'in_progress'

  const subtasksCount = task.subtasks?.length ?? 0
  const subtasksDoneCount = task.subtasks?.filter((s) => s.done).length ?? 0
  const subtasksPct = subtasksCount > 0 ? Math.round((subtasksDoneCount / subtasksCount) * 100) : 0
  const linksCount = task.links?.length ?? 0
  const imagesCount = task.images?.length ?? 0

  // Live title updating
  const handleTitleBlur = () => {
    const trimmed = localTitle.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    } else {
      setLocalTitle(task.title)
    }
  }

  // Live description updating
  const handleDescBlur = () => {
    const trimmed = localDesc.trim()
    if (trimmed !== (task.description || '')) {
      onUpdate(task.id, { description: trimmed })
    }
  }

  const handleToggleDone = (e: MouseEvent<HTMLButtonElement>) => {
    let nextStatus: TaskStatus = 'todo'
    let nextDone = false
    if (!isDone && !isInProgress) {
      nextStatus = 'in_progress'
    } else if (isInProgress) {
      nextStatus = 'done'
      nextDone = true
      triggerTaskConfetti(e.currentTarget)
    } else {
      nextStatus = 'todo'
      nextDone = false
    }

    onUpdate(task.id, {
      status: nextStatus,
      done: nextDone,
      completedAt: nextDone ? Date.now() : null,
    })
  }

  const handleStatusChange = (status: TaskStatus) => {
    const nextDone = status === 'done'
    if (nextDone && !isDone) {
      triggerTaskConfetti(null)
    }
    onUpdate(task.id, {
      status,
      done: nextDone,
      completedAt: nextDone ? (task.completedAt ?? Date.now()) : null,
    })
  }

  // Subtask handlers
  const handleToggleSubtask = (e: MouseEvent, subtaskId: string) => {
    e.stopPropagation()
    if (!task.subtasks) return
    const newSubtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
    const allDone = newSubtasks.length > 0 && newSubtasks.every((s) => s.done)
    let newStatus = task.status
    if (allDone) {
      newStatus = 'done'
      triggerTaskConfetti(e.currentTarget as HTMLElement)
    } else if (task.status === 'done' && !allDone) {
      newStatus = 'in_progress'
    }
    onUpdate(task.id, {
      subtasks: newSubtasks,
      status: newStatus,
      done: newStatus === 'done',
    })
  }

  const handleAddSubtask = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    const updated = [
      ...(task.subtasks || []),
      { id: Math.random().toString(36).slice(2) + Date.now().toString(36), title: trimmed, done: false },
    ]
    let newStatus = task.status
    if (task.status === 'done') {
      newStatus = 'in_progress'
    }
    onUpdate(task.id, { subtasks: updated, status: newStatus, done: newStatus === 'done' })
    setNewSubtaskTitle('')
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    const updated = (task.subtasks || []).filter((s) => s.id !== subtaskId)
    onUpdate(task.id, { subtasks: updated })
  }

  // Link handlers
  const handleAddLink = (e: FormEvent) => {
    e.preventDefault()
    if (!newLinkUrl.trim()) return
    let url = newLinkUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const newLink: TaskLink = {
      id: Math.random().toString(36).slice(2),
      url,
      title: newLinkTitle.trim() || url.replace(/^https?:\/\/(www\.)?/, ''),
    }
    onUpdate(task.id, { links: [...(task.links || []), newLink] })
    setNewLinkUrl('')
    setNewLinkTitle('')
    setShowAddLink(false)
  }

  const handleRemoveLink = (linkId: string) => {
    onUpdate(task.id, { links: (task.links || []).filter((l) => l.id !== linkId) })
  }

  // Image handlers
  const processImageFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          putImage(result).then((id) => {
            const updated = [...(task.images || []), id]
            onUpdate(task.id, { images: updated })
            setImageUrls((prev) => ({ ...prev, [id]: result }))
          })
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAddImageUrl = (e: FormEvent) => {
    e.preventDefault()
    const url = newImageUrl.trim()
    if (!url) return
    const updated = [...(task.images || []), url]
    onUpdate(task.id, { images: updated })
    setImageUrls((prev) => ({ ...prev, [url]: url }))
    setNewImageUrl('')
    setShowAddImageUrl(false)
  }

  const handleRemoveImage = (index: number) => {
    const updated = [...(task.images || [])]
    updated.splice(index, 1)
    onUpdate(task.id, { images: updated })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFiles(e.dataTransfer.files)
    }
  }

  const currentPriority = PRIORITIES.find((p) => p.id === (task.priority ?? 'medium')) ?? PRIORITIES[1]

  const activeCollection = collections.find((c) => c.id === task.listId)
  const currentListName = activeCollection?.name || boardName || 'Inbox'

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`relative flex flex-col max-h-[92vh] sm:max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper-50 shadow-2xl text-ink-900 sm:border sm:border-paper-200/40 ${
            isDraggingOver ? 'ring-2 ring-pine-500/50 bg-pine-50/20' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Bottom Sheet Handle */}
          <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
            <div className="h-1 w-10 rounded-full bg-paper-300/80" />
          </div>

          {/* Top Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-paper-200/50 px-4 sm:px-6 py-2.5 sm:py-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Board / List Breadcrumb */}
              <div className="relative shrink-0" ref={moveDropdownRef}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => setShowMoveDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg bg-paper-100/90 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 hover:bg-paper-200 hover:text-ink-900 transition-colors cursor-pointer"
                >
                  <KanbanIcon className="size-3.5 text-ink-400" />
                  <span className="max-w-[100px] sm:max-w-[130px] truncate">{currentListName}</span>
                </motion.button>

                <AnimatePresence>
                  {showMoveDropdown && onMove && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-xl bg-paper-100 p-1.5 shadow-xl border border-paper-200 text-[12.5px]"
                    >
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                        Move to Collection
                      </p>
                      <motion.button
                        type="button"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        onClick={() => {
                          onMove(task.id, null)
                          setShowMoveDropdown(false)
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          task.listId === null ? 'bg-paper-200 text-pine-400 font-semibold' : 'text-ink-700 hover:bg-paper-200/60'
                        }`}
                      >
                        <InboxIcon className="size-3.5 shrink-0" />
                        <span className="truncate">Inbox</span>
                      </motion.button>
                      {collections.map((c) => (
                        <motion.button
                          key={c.id}
                          type="button"
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          onClick={() => {
                            onMove(task.id, c.id)
                            setShowMoveDropdown(false)
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            task.listId === c.id ? 'bg-paper-200 text-pine-400 font-semibold' : 'text-ink-700 hover:bg-paper-200/60'
                          }`}
                        >
                          {c.kind === 'board' ? (
                            <KanbanIcon className="size-3.5 shrink-0 text-ink-400" />
                          ) : (
                            <ListIcon className="size-3.5 shrink-0 text-ink-400" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Selector Segment */}
              <div className="flex items-center rounded-lg bg-paper-100/90 p-0.5 text-[11px] sm:text-[11.5px] font-medium text-ink-500">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => handleStatusChange('todo')}
                  className={`rounded-md px-2 sm:px-2.5 py-1 whitespace-nowrap text-center transition-all cursor-pointer ${
                    !task.done && (task.status === 'todo' || !task.status)
                      ? 'bg-paper-200 text-ink-900 font-semibold shadow-2xs'
                      : 'hover:text-ink-900'
                  }`}
                >
                  To Do
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => handleStatusChange('in_progress')}
                  className={`rounded-md px-2 sm:px-2.5 py-1 whitespace-nowrap text-center transition-all cursor-pointer ${
                    !task.done && task.status === 'in_progress'
                      ? 'bg-amber-600/20 text-amber-600 font-semibold shadow-2xs'
                      : 'hover:text-amber-600'
                  }`}
                >
                  In Progress
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => handleStatusChange('done')}
                  className={`rounded-md px-2 sm:px-2.5 py-1 whitespace-nowrap text-center transition-all cursor-pointer ${
                    task.done || task.status === 'done'
                      ? 'bg-pine-600/20 text-pine-400 font-semibold shadow-2xs'
                      : 'hover:text-pine-400'
                  }`}
                >
                  Done
                </motion.button>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.12 }}
                onClick={onArchive}
                title="Archive task"
                className="rounded-lg p-2 sm:p-1.5 text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors cursor-pointer"
              >
                <ArchiveIcon className="size-4" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.12 }}
                onClick={onDelete}
                title="Delete task"
                className="rounded-lg p-2 sm:p-1.5 text-ink-400 hover:bg-terra-50 hover:text-terra-600 transition-colors cursor-pointer"
              >
                <TrashIcon className="size-4" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.12 }}
                onClick={onClose}
                title="Close (Esc)"
                className="rounded-lg p-2 sm:p-1.5 text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors ml-0.5 cursor-pointer"
              >
                <CloseIcon className="size-4.5" />
              </motion.button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6 [scrollbar-width:thin]">
            {/* Title Row with CheckCircle */}
            <div className="flex items-start gap-3">
              <TaskCheckCircle done={isDone} status={task.status} onClick={handleToggleDone} />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Task title…"
                  className={`w-full bg-transparent font-sans text-[19px] sm:text-[21px] font-bold leading-snug tracking-tight text-ink-900 outline-none placeholder:text-ink-400 transition-colors ${
                    isDone ? 'line-through text-ink-400' : ''
                  }`}
                />
              </div>
            </div>

            {/* Quick Properties Chips Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-paper-200/40 pb-4">
              {/* Priority Picker */}
              <div className="relative" ref={priorityDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                    task.priority && task.priority !== 'medium'
                      ? `${currentPriority.bg} ${currentPriority.text} font-semibold`
                      : 'bg-paper-100 text-ink-600 hover:bg-paper-200 hover:text-ink-900'
                  }`}
                >
                  <FlagIcon className="size-3.5" />
                  <span className="capitalize">{task.priority ?? 'Priority'}</span>
                </button>

                <AnimatePresence>
                  {showPriorityDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 top-full mt-1.5 z-50 w-44 rounded-xl bg-paper-100 p-1.5 shadow-xl border border-paper-200 text-[12px]"
                    >
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                        Select Priority
                      </p>
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onUpdate(task.id, { priority: p.id })
                            setShowPriorityDropdown(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                            (task.priority ?? 'medium') === p.id
                              ? `${p.bg} ${p.text} font-semibold`
                              : 'text-ink-700 hover:bg-paper-200/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${p.dot}`} />
                            <span className="capitalize">{p.label}</span>
                          </div>
                          {(task.priority ?? 'medium') === p.id && <CheckIcon className="size-3" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Due Date Trigger */}
              <DatePickerTrigger
                value={task.dueDate || ''}
                mode="date"
                open={scheduleOpen === 'due'}
                placeholder="Due date"
                onToggle={() => setScheduleOpen((prev) => (prev === 'due' ? null : 'due'))}
                onChange={(val) => onUpdate(task.id, { dueDate: val || null })}
              />

              {/* Deadline Trigger */}
              <DatePickerTrigger
                value={task.deadline || ''}
                mode="datetime"
                open={scheduleOpen === 'deadline'}
                placeholder="Deadline"
                accentColor="amber"
                onToggle={() => setScheduleOpen((prev) => (prev === 'deadline' ? null : 'deadline'))}
                onChange={(val) => onUpdate(task.id, { deadline: val || null })}
              />

              {/* Recurrence Trigger */}
              <RecurrencePicker
                value={task.recurrence ?? null}
                onChange={(r) => onUpdate(task.id, { recurrence: r })}
              />
            </div>

            {/* Schedule Inline Panels */}
            <AnimatePresence>
              {scheduleOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-xl bg-paper-100/80 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                      {scheduleOpen === 'due' ? 'Set Due Date' : 'Set Deadline'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setScheduleOpen(null)}
                      className="rounded p-1 text-ink-400 hover:text-ink-900 cursor-pointer"
                    >
                      <CloseIcon className="size-3.5" />
                    </button>
                  </div>
                  <DatePickerPanel
                    value={scheduleOpen === 'due' ? task.dueDate || '' : task.deadline || ''}
                    mode={scheduleOpen === 'due' ? 'date' : 'datetime'}
                    accentColor={scheduleOpen === 'due' ? 'pine' : 'amber'}
                    onClose={() => setScheduleOpen(null)}
                    onChange={(val) => {
                      if (scheduleOpen === 'due') {
                        onUpdate(task.id, { dueDate: val || null })
                      } else {
                        onUpdate(task.id, { deadline: val || null })
                      }
                      setScheduleOpen(null)
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes / Description Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                <NotesIcon className="size-3.5 text-pine-600" />
                <span>Notes & Context</span>
              </div>
              <textarea
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={handleDescBlur}
                rows={3}
                placeholder="Add notes, ideas, or links to help you execute this task…"
                className="w-full resize-y rounded-xl bg-paper-100/60 p-3.5 text-[14px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 focus:bg-paper-100 focus:ring-1 focus:ring-pine-500/30 transition-all [scrollbar-width:none]"
              />
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                    <SubtaskIcon className="size-3.5 text-pine-600" />
                    <span>Subtasks</span>
                  </span>
                  {subtasksCount > 0 && (
                    <span className="rounded-full bg-paper-200/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-500">
                      {subtasksDoneCount}/{subtasksCount}
                    </span>
                  )}
                </div>
                {subtasksCount > 0 && (
                  <span className="text-[12px] font-semibold text-pine-500">{subtasksPct}%</span>
                )}
              </div>

              {subtasksCount > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
                  <motion.div
                    className="h-full rounded-full bg-pine-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${subtasksPct}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              )}

              {/* Subtasks List */}
              {subtasksCount > 0 && (
                <div className="space-y-1.5 pt-1">
                  {task.subtasks?.map((s) => (
                    <div
                      key={s.id}
                      className="group/sub flex items-center justify-between gap-2.5 rounded-xl bg-paper-100/40 px-3 py-2 hover:bg-paper-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.86 }}
                          onClick={(e) => handleToggleSubtask(e, s.id)}
                          className={`flex size-4.5 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer ${
                            s.done ? 'bg-pine-600 text-paper-50' : 'border border-ink-400/50 hover:border-pine-500'
                          }`}
                        >
                          {s.done && <CheckIcon className="size-2.5" />}
                        </motion.button>
                        <span
                          className={`text-[13.5px] leading-snug truncate ${
                            s.done ? 'line-through text-ink-400' : 'text-ink-900'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(s.id)}
                        className="rounded p-1 text-ink-400 opacity-70 sm:opacity-0 sm:group-hover/sub:opacity-100 hover:text-terra-600 transition-all cursor-pointer"
                      >
                        <CloseIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add Subtask Input */}
              <form
                onSubmit={handleAddSubtask}
                className="flex items-center gap-2 rounded-xl bg-paper-100/60 px-3 py-2.5 sm:py-2 focus-within:bg-paper-100 focus-within:ring-1 focus-within:ring-pine-500/30 transition-all"
              >
                <PlusIcon className="size-4 shrink-0 text-ink-400" />
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a step or subtask…"
                  className="w-full bg-transparent text-[14px] sm:text-[13.5px] text-ink-900 placeholder:text-ink-400 outline-none"
                />
              </form>
            </div>

            {/* Links & Resources Section */}
            <div className="space-y-3 pt-2 border-t border-paper-200/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                  <LinkIcon className="size-3.5 text-pine-600" />
                  <span>Links & Resources {linksCount > 0 && `(${linksCount})`}</span>
                </div>
                {!showAddLink && (
                  <button
                    type="button"
                    onClick={() => setShowAddLink(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-pine-400 hover:text-pine-300 transition-colors cursor-pointer py-1"
                  >
                    <PlusIcon className="size-3.5" />
                    <span>Add link</span>
                  </button>
                )}
              </div>

              {linksCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {task.links?.map((l) => (
                    <div
                      key={l.id}
                      className="group/link flex items-center gap-1.5 rounded-lg bg-paper-100/80 px-2.5 py-1.5 text-[12.5px] text-pine-400 hover:bg-paper-200 transition-colors"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 truncate max-w-[240px] font-medium"
                      >
                        <ExternalLinkIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{l.title || l.url}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(l.id)}
                        className="rounded p-0.5 text-ink-400 opacity-70 sm:opacity-0 sm:group-hover/link:opacity-100 hover:text-terra-600 transition-colors cursor-pointer"
                      >
                        <CloseIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddLink && (
                <form onSubmit={handleAddLink} className="space-y-2 rounded-xl bg-paper-100/70 p-3">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    autoFocus
                    className="w-full rounded-lg bg-paper-50 px-3 py-2 text-[13.5px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-1 focus:ring-pine-500/40"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      placeholder="Title or label (optional)"
                      className="w-full rounded-lg bg-paper-50 px-3 py-2 text-[13.5px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-1 focus:ring-pine-500/40"
                    />
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAddLink(false)}
                        className="px-2.5 py-1 text-[12px] text-ink-500 hover:text-ink-900 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newLinkUrl.trim()}
                        className="rounded-lg bg-pine-600 px-3 py-1 text-[12px] font-medium text-paper-50 disabled:opacity-50 hover:bg-pine-500 transition-colors cursor-pointer"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Attachments / Images Section */}
            <div className="space-y-3 pt-2 border-t border-paper-200/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                  <ImageIcon className="size-3.5 text-pine-600" />
                  <span>Images & Attachments {imagesCount > 0 && `(${imagesCount})`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-pine-400 hover:text-pine-300 transition-colors cursor-pointer py-1"
                  >
                    <PaperclipIcon className="size-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddImageUrl((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-500 hover:text-ink-900 transition-colors cursor-pointer py-1"
                  >
                    <PlusIcon className="size-3.5" />
                    <span>URL</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) processImageFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {showAddImageUrl && (
                <form onSubmit={handleAddImageUrl} className="flex items-center gap-2 rounded-xl bg-paper-100/70 p-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL…"
                    autoFocus
                    className="w-full bg-paper-50 rounded-lg px-3 py-1.5 text-[13.5px] text-ink-900 placeholder:text-ink-400 outline-none focus:ring-1 focus:ring-pine-500/40"
                  />
                  <button
                    type="submit"
                    disabled={!newImageUrl.trim()}
                    className="rounded-lg bg-pine-600 px-3 py-1.5 text-[12px] font-medium text-paper-50 disabled:opacity-50 hover:bg-pine-500 transition-colors cursor-pointer"
                  >
                    Attach
                  </button>
                </form>
              )}

              {imagesCount > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {task.images?.map((ref, idx) => {
                    const src = imageUrls[ref] || ref
                    return (
                      <div
                        key={idx}
                        className="group/img relative size-20 sm:size-24 rounded-xl overflow-hidden bg-paper-100 cursor-pointer"
                        onClick={() => setLightboxImage(src)}
                      >
                        <img src={src} alt="Attachment" className="size-full object-cover transition-transform duration-200 group-hover/img:scale-105" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage(idx)
                          }}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-80 sm:opacity-0 sm:group-hover/img:opacity-100 hover:bg-terra-600 transition-all cursor-pointer"
                        >
                          <CloseIcon className="size-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between border-t border-paper-200/40 px-4 sm:px-6 py-3 bg-paper-100/40 text-[11px] text-ink-500 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-3">
            <span>
              Created {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            {task.completedAt && (
              <span className="text-pine-500 font-medium">
                Completed {new Date(task.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Lightbox Preview */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 rounded-full bg-paper-100 p-2 text-ink-900 shadow-xl hover:bg-paper-200 transition-transform hover:scale-110 cursor-pointer"
              >
                <CloseIcon className="size-4" />
              </button>
              <img
                src={lightboxImage}
                alt="Attachment preview"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
