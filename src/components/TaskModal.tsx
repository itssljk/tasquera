import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion, Reorder } from 'framer-motion'
import type { Collection, PriorityLevel, Recurrence, Subtask, Task, TaskLink, TaskStatus } from '../types'
import Dropdown from './Dropdown'
import { DatePickerPanel, DatePickerTrigger } from './DatePicker'
import RecurrencePicker from './RecurrencePicker'
import { useIsDesktop } from '../lib/useMediaQuery'
import { isMac } from '../lib/platform'
import { parseTaskInput } from '../lib/nlp'
import { formatDue } from '../lib/date'
import {
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  FlagIcon,
  GripVerticalIcon,
  InboxIcon,
  LinkIcon,
  PlusIcon,
  PromoteIcon,
  SubtaskIcon,
  TrashIcon,
} from './icons'

interface TaskModalProps {
  isOpen: boolean
  taskToEdit?: Task | null
  defaultListId?: string | null
  defaultStatus?: TaskStatus
  defaultDueDate?: string | null
  collections: Collection[]
  layout?: 'centered' | 'drawer'
  weekStartsOn?: 'monday' | 'sunday'
  onClose: () => void
  onSave: (taskData: Partial<Task> & { title: string }) => void
  onPromoteSubtask?: (subtaskTitle: string, listId?: string | null) => void
}

const PRIORITIES: { id: PriorityLevel; label: string; text: string }[] = [
  { id: 'low', label: 'Low', text: 'text-slateblue-600' },
  { id: 'medium', label: 'Medium', text: 'text-pine-500' },
  { id: 'high', label: 'High', text: 'text-amber-600' },
  { id: 'urgent', label: 'Urgent', text: 'text-terra-600' },
]

const toolbarIcon = 'size-3.5 shrink-0 text-ink-400'
const insetInput =
  'w-full rounded-lg bg-paper-50 px-3 py-2 text-body text-ink-900 outline-none ring-2 ring-transparent transition-shadow duration-150 focus:ring-pine-500/25 placeholder:text-ink-400'

export default function TaskModal(props: TaskModalProps) {
  const {
    isOpen,
    taskToEdit,
    defaultListId = null,
    defaultStatus = 'todo',
    defaultDueDate = null,
    collections,
    layout = 'centered',
    weekStartsOn = 'monday',
    onClose,
    onSave,
  } = props

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState<string | null>(defaultListId)
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<PriorityLevel>('medium')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [dueDate, setDueDate] = useState<string>('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [links, setLinks] = useState<TaskLink[]>([])

  // Temporary inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title)
        setDescription(taskToEdit.description || '')
        setListId(taskToEdit.listId)
        setStatus(taskToEdit.status || (taskToEdit.done ? 'done' : 'todo'))
        setPriority(taskToEdit.priority || 'medium')
        setRecurrence(taskToEdit.recurrence ?? null)
        setDueDate(taskToEdit.dueDate || '')
        setSubtasks(taskToEdit.subtasks || [])
        setLinks(taskToEdit.links || [])
      } else {
        setTitle('')
        setDescription('')
        setListId(defaultListId)
        setStatus(defaultStatus)
        setPriority('medium')
        setRecurrence(null)
        setDueDate(defaultDueDate || '')
        setSubtasks([])
        setLinks([])
      }
      setNewSubtaskTitle('')
      setNewLinkUrl('')
      setNewLinkTitle('')
      setShowAddLink(false)
      setScheduleOpen(false)
    }
  }, [isOpen, taskToEdit, defaultListId, defaultStatus, defaultDueDate])

  // Close the centered date dialog with Escape (capture phase so it wins over
  // the modal's own Escape handler, which would otherwise close the whole modal)
  useEffect(() => {
    if (!scheduleOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setScheduleOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [scheduleOpen])

  const nlpPreview = (() => {
    if (!title.trim() || taskToEdit) return null
    const parsed = parseTaskInput(title)
    if (parsed.dueDate || parsed.priority) return parsed
    return null
  })()

  const handleFormSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const parsed = parseTaskInput(trimmedTitle)
    const finalTitle = parsed.title || trimmedTitle
    const finalDueDate = parsed.dueDate || (dueDate || null)
    const finalPriority = (priority !== 'medium' && priority) ? priority : (parsed.priority || priority)

    onSave({
      title: finalTitle,
      description: description.trim(),
      listId: listId || null,
      status,
      done: status === 'done',
      priority: finalPriority,
      recurrence,
      dueDate: finalDueDate,
      subtasks,
      links,
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (scheduleOpen) {
        // Escape collapses the inline calendar before closing the modal
        setScheduleOpen(false)
      } else {
        onClose()
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleFormSubmit()
    }
  }

  // Subtask handlers & auto-completion helper
  const updateSubtasksWithAutoStatus = (newSubtasks: Subtask[]) => {
    setSubtasks(newSubtasks)
    if (newSubtasks.length > 0 && newSubtasks.every((s) => s.done)) {
      setStatus('done')
    } else if (status === 'done' && newSubtasks.length > 0 && !newSubtasks.every((s) => s.done)) {
      setStatus('in_progress')
    }
  }

  const addSubtask = () => {
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    const newSub: Subtask = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      title: trimmed,
      done: false,
    }
    const updated = [...subtasks, newSub]
    setNewSubtaskTitle('')
    updateSubtasksWithAutoStatus(updated)
  }

  const toggleSubtask = (id: string) => {
    const updated = subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    updateSubtasksWithAutoStatus(updated)
  }

  const removeSubtask = (id: string) => {
    const updated = subtasks.filter((s) => s.id !== id)
    updateSubtasksWithAutoStatus(updated)
  }

  const promoteSubtask = (s: Subtask) => {
    removeSubtask(s.id)
    props.onPromoteSubtask?.(s.title, listId)
  }


  // Link handlers
  const addLink = () => {
    let url = newLinkUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }
    const link: TaskLink = {
      id: Math.random().toString(36).slice(2),
      url,
      title: newLinkTitle.trim() || url.replace(/^https?:\/\/(www\.)?/, ''),
    }
    setLinks((prev) => [...prev, link])
    setNewLinkUrl('')
    setNewLinkTitle('')
    setShowAddLink(false)
  }

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  const isDesktop = useIsDesktop()
  const doneSubtasksCount = subtasks.filter((s) => s.done).length
  const showLinks = links.length > 0 || showAddLink
  const priorityStyle = PRIORITIES.find((p) => p.id === priority) ?? PRIORITIES[1]
  const isCentered = isDesktop && layout === 'centered'

  const modalBody = (
    <>
      {/* Mobile grab handle */}
      <div className="flex w-full justify-center pt-2.5 pb-1 md:hidden">
        <div className="h-1 w-10 rounded-full bg-ink-300/50" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-paper-200/60 px-6 sm:px-7 py-3 sm:py-3.5">
        <span className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-500">
          {taskToEdit ? 'Edit Task' : 'New Task'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="rounded-lg p-1.5 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900 cursor-pointer"
        >
          <CloseIcon className="size-[18px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-5">
          {/* Title */}
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            className="mt-4 w-full bg-transparent text-display font-bold leading-tight tracking-tight text-ink-900 placeholder:text-ink-400 outline-none"
          />

          {nlpPreview && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-pine-500/10 px-2.5 py-1 text-caption font-medium text-pine-400">
              <span className="text-pine-500 font-semibold">Auto-detected:</span>
              {nlpPreview.dueDate && <span>Due {formatDue(nlpPreview.dueDate)}</span>}
              {nlpPreview.dueDate && nlpPreview.priority && <span>•</span>}
              {nlpPreview.priority && <span className="capitalize">{nlpPreview.priority} priority</span>}
            </div>
          )}

          {/* Description */}
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, context, notes…"
            className="mt-3 w-full resize-y bg-transparent text-body-lg leading-relaxed text-ink-700 placeholder:text-ink-400 outline-none min-h-[52px]"
          />

          {/* Metadata toolbar */}
          <div className="mt-5 h-px bg-paper-200/70" />
          <div className="mt-4 flex flex-wrap items-center gap-1">
            {/* List */}
            <Dropdown<string>
              value={listId ?? ''}
              onChange={(v) => setListId(v || null)}
              ariaLabel="List"
              icon={<InboxIcon className={toolbarIcon} />}
              options={[{ value: '', label: 'Inbox' }, ...collections.map((c) => ({ value: c.id, label: c.name }))]}
            />

            {/* Status */}
            <Dropdown<TaskStatus>
              value={status}
              onChange={setStatus}
              ariaLabel="Status"
              icon={<CheckCircleIcon className={toolbarIcon} />}
              options={[
                { value: 'todo', label: 'To do' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'done', label: 'Done' },
              ]}
            />

            {/* Priority */}
            <Dropdown<PriorityLevel>
              value={priority}
              onChange={setPriority}
              ariaLabel="Priority"
              icon={<FlagIcon className={toolbarIcon} />}
              valueTextClass={priorityStyle.text}
              options={PRIORITIES.map((p) => ({ value: p.id, label: p.label, textClass: p.text }))}
            />

            {/* Recurrence */}
            <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          </div>

          {/* Schedule: due date chip */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <DatePickerTrigger
              value={dueDate}
              onChange={setDueDate}
              accentColor="pine"
              open={scheduleOpen}
              onToggle={() => setScheduleOpen((cur) => !cur)}
            />
          </div>

          {/* Subtasks */}
          <div className="mt-7 space-y-2">
            <span className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-ink-500">
              <SubtaskIcon className="size-3.5 text-ink-400" />
              Subtasks {subtasks.length > 0 && `(${doneSubtasksCount}/${subtasks.length})`}
            </span>

            {subtasks.length > 0 && (
              <Reorder.Group
                axis="y"
                values={subtasks}
                onReorder={updateSubtasksWithAutoStatus}
                className="space-y-1"
              >
                {subtasks.map((s) => (
                  <Reorder.Item
                    key={s.id}
                    value={s}
                    className="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors duration-150 hover:bg-paper-200/50"
                  >
                    <span className="cursor-grab active:cursor-grabbing text-ink-400/50 hover:text-ink-400 opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <GripVerticalIcon className="size-3.5" />
                    </span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => toggleSubtask(s.id)}
                      aria-label={s.done ? `Mark “${s.title}” as incomplete` : `Mark “${s.title}” as complete`}
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-all duration-150 cursor-pointer ${
                        s.done
                          ? 'border-pine-600 bg-pine-600 text-paper-50 shadow-xs'
                          : 'border-ink-400/50 bg-paper-100/40 hover:border-pine-500 hover:bg-pine-500/10'
                      }`}
                    >
                      {s.done && <CheckIcon className="size-2.5 stroke-[2.5]" />}
                    </motion.button>
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => {
                        const val = e.target.value
                        setSubtasks((prev) => prev.map((sub) => (sub.id === s.id ? { ...sub, title: val } : sub)))
                      }}
                      className={`flex-1 bg-transparent text-body-lg outline-none transition-colors duration-150 ${
                        s.done ? 'line-through text-ink-400' : 'text-ink-900'
                      }`}
                    />
                    <div className="flex items-center gap-0.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {props.onPromoteSubtask && (
                        <button
                          type="button"
                          onClick={() => promoteSubtask(s)}
                          title="Promote to standalone task"
                          aria-label={`Promote “${s.title}” to task`}
                          className="rounded-md p-1 text-ink-400 transition-all duration-150 hover:text-pine-500 hover:bg-paper-200/60 cursor-pointer"
                        >
                          <PromoteIcon className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSubtask(s.id)}
                        aria-label={`Remove subtask “${s.title}”`}
                        className="rounded-md p-1 text-ink-400 transition-all duration-150 hover:text-terra-600 hover:bg-paper-200/60 cursor-pointer"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSubtask()
                  }
                }}
                placeholder="Add a subtask…"
                aria-label="New subtask title"
                className={`${insetInput} flex-1`}
              />
              <button
                type="button"
                onClick={addSubtask}
                aria-label="Add subtask"
                className="rounded-lg p-2 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-pine-600"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Add link affordance */}
          {!showLinks && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddLink(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body font-medium text-ink-600 transition-all duration-150 hover:bg-paper-200/80 hover:text-ink-900"
              >
                <PlusIcon className="size-3.5 text-ink-400" />
                Add link
              </button>
            </div>
          )}

          {/* Links Section */}
          {showLinks && (
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-ink-500">
                  <LinkIcon className="size-3.5 text-ink-400" />
                  Links {links.length > 0 && `(${links.length})`}
                </span>
                {!showAddLink && (
                  <button
                    type="button"
                    onClick={() => setShowAddLink(true)}
                    aria-label="Add link"
                    className="rounded-lg p-1 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-pine-600"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                )}
              </div>

              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map((l) => (
                    <div
                      key={l.id}
                      className="group flex items-center gap-1.5 rounded-lg bg-paper-50 py-1.5 pl-3 pr-1.5 text-body"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex max-w-[220px] items-center gap-1.5 text-ink-700 transition-colors duration-150 hover:text-pine-600"
                      >
                        <ExternalLinkIcon className="size-3 shrink-0 text-ink-400" />
                        <span className="truncate">{l.title || l.url}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => removeLink(l.id)}
                        aria-label={`Remove link “${l.title || l.url}”`}
                        className="rounded p-0.5 text-ink-400 transition-all duration-150 hover:text-terra-600 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <CloseIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddLink && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL (e.g. https://github.com/…)"
                    aria-label="Link URL"
                    className={insetInput}
                  />
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Title / description (optional)"
                    aria-label="Link title"
                    className={insetInput}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddLink(false)}
                      className="px-2.5 py-1.5 text-small text-ink-500 transition-colors duration-150 hover:text-ink-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addLink}
                      className="rounded-lg bg-pine-600 px-3 py-1.5 text-small font-medium text-[#fbf9f5] transition-colors duration-150 hover:bg-pine-700"
                    >
                      Add link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer actions */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-4 border-t border-paper-200/70 bg-paper-100/95 px-6 sm:px-7 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:py-3.5 backdrop-blur-xs">
          <span className="hidden text-small text-ink-400 sm:block">
            Press{' '}
            <kbd className="rounded-md bg-paper-200 px-1.5 py-0.5 font-sans text-micro font-medium text-ink-500">
              {isMac() ? '⌘Enter' : 'Ctrl+Enter'}
            </kbd>{' '}
            to save
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-body-lg font-medium text-ink-600 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900 active:scale-98 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleFormSubmit()}
              className="rounded-xl bg-pine-600 px-5 py-2 text-body-lg font-semibold text-[#fbf9f5] shadow-xs transition-all duration-150 hover:bg-pine-700 active:scale-95 cursor-pointer"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
    </>
  )

  return (
    <>
      <motion.div
        key="taskmodal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-[#0c0b0a]/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {isCentered ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          <motion.div
            key="taskmodal-panel-centered"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label={taskToEdit ? 'Edit task' : 'New task'}
            className="pointer-events-auto relative flex flex-col w-full max-w-[580px] max-h-[85vh] rounded-2xl border border-paper-200/80 bg-paper-100 text-ink-900 shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            {modalBody}
          </motion.div>
        </div>
      ) : (
        <motion.div
          key="taskmodal-panel-drawer"
          initial={isDesktop ? { x: '100%' } : { y: '100%' }}
          animate={isDesktop ? { x: 0 } : { y: 0 }}
          exit={isDesktop ? { x: '100%' } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label={taskToEdit ? 'Edit task' : 'New task'}
          className={`fixed z-50 flex flex-col bg-paper-100 text-ink-900 overflow-hidden ${
            isDesktop
              ? 'inset-y-0 right-0 w-full max-w-[560px] border-l border-paper-200/80 shadow-[-24px_0_60px_rgba(0,0,0,0.6)]'
              : 'inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-[28px] border-t border-paper-200/80 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]'
          }`}
        >
          {modalBody}
        </motion.div>
      )}

      {/* Centered date picker dialog */}
      {scheduleOpen && (
        <div
          className="fixed inset-0 z-[70] bg-[#0c0b0a]/60 backdrop-blur-sm"
          onClick={() => setScheduleOpen(false)}
        />
      )}
      {scheduleOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Set due date"
          className="pointer-events-none fixed inset-0 z-[71] flex items-center justify-center p-4"
        >
          <div className="pointer-events-auto w-full max-w-[340px] animate-pop">
            <DatePickerPanel
              value={dueDate}
              onChange={setDueDate}
              accentColor="pine"
              weekStartsOn={weekStartsOn}
              onClose={() => setScheduleOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
