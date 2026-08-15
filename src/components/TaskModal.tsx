import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Collection, PriorityLevel, Recurrence, Subtask, Task, TaskLink, TaskStatus } from '../types'
import { putImage, resolveMany } from '../lib/attachments'
import Dropdown from './Dropdown'
import DatePicker from './DatePicker'
import RecurrencePicker from './RecurrencePicker'
import { useIsDesktop } from '../lib/useMediaQuery'
import {
  CheckCircleIcon,
  CloseIcon,
  ExternalLinkIcon,
  FlagIcon,
  ImageIcon,
  InboxIcon,
  LinkIcon,
  PaperclipIcon,
  PlusIcon,
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
  onClose: () => void
  onSave: (taskData: Partial<Task> & { title: string }) => void
}

const PRIORITIES: { id: PriorityLevel; label: string; text: string }[] = [
  { id: 'low', label: 'Low', text: 'text-slateblue-600' },
  { id: 'medium', label: 'Medium', text: 'text-pine-500' },
  { id: 'high', label: 'High', text: 'text-amber-600' },
  { id: 'urgent', label: 'Urgent', text: 'text-terra-600' },
]

const toolbarIcon = 'size-3.5 shrink-0 text-ink-400'
const insetInput =
  'w-full rounded-lg bg-paper-50 px-3 py-2 text-[13.5px] text-ink-900 outline-none ring-2 ring-transparent transition-shadow duration-150 focus:ring-pine-500/25 placeholder:text-ink-400'

export default function TaskModal(props: TaskModalProps) {
  const {
    isOpen,
    taskToEdit,
    defaultListId = null,
    defaultStatus = 'todo',
    defaultDueDate = null,
    collections,
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
  const [deadline, setDeadline] = useState<string>('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [links, setLinks] = useState<TaskLink[]>([])
  const [images, setImages] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // Temporary inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showAddImage, setShowAddImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

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
        setDeadline(taskToEdit.deadline || '')
        setSubtasks(taskToEdit.subtasks || [])
        setLinks(taskToEdit.links || [])
        setImages(taskToEdit.images || [])
      } else {
        setTitle('')
        setDescription('')
        setListId(defaultListId)
        setStatus(defaultStatus)
        setPriority('medium')
        setRecurrence(null)
        setDueDate(defaultDueDate || '')
        setDeadline('')
        setSubtasks([])
        setLinks([])
        setImages([])
      }
      setNewSubtaskTitle('')
      setNewLinkUrl('')
      setNewLinkTitle('')
      setShowAddLink(false)
      setNewImageUrl('')
      setShowAddImage(false)
      setPreviewImage(null)
      setIsDraggingOver(false)
      void resolveMany(taskToEdit?.images ?? []).then(setImageUrls)
    }
  }, [isOpen, taskToEdit, defaultListId, defaultStatus, defaultDueDate])

  if (!isOpen) return null

  const handleFormSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    onSave({
      title: trimmedTitle,
      description: description.trim(),
      listId: listId || null,
      status,
      done: status === 'done',
      priority,
      recurrence,
      dueDate: dueDate || null,
      deadline: deadline || null,
      subtasks,
      links,
      images,
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
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

  // Image handlers
  const processImageFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          putImage(result).then((id) => {
            setImages((prev) => [...prev, id])
            setImageUrls((prev) => ({ ...prev, [id]: result }))
          })
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const addImageUrl = () => {
    const url = newImageUrl.trim()
    if (!url) return
    setImages((prev) => [...prev, url])
    setImageUrls((prev) => ({ ...prev, [url]: url }))
    setNewImageUrl('')
    setShowAddImage(false)
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    processImageFiles(files)
    e.target.value = ''
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

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        e.preventDefault()
        processImageFiles(imageFiles)
      }
    }
  }

  const removeImage = (index: number) => {
    // Removal is deferred: the store diffs old vs. new on save, so cancelling
    // the edit leaves the attachment intact.
    const ref = images[index]
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageUrls((prev) => {
      const next = { ...prev }
      delete next[ref]
      return next
    })
  }

  const isDesktop = useIsDesktop()
  const doneSubtasksCount = subtasks.filter((s) => s.done).length
  const showLinks = links.length > 0 || showAddLink
  const showImages = images.length > 0 || showAddImage
  const priorityStyle = PRIORITIES.find((p) => p.id === priority) ?? PRIORITIES[1]

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

      <motion.div
        key="taskmodal-panel"
        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
        animate={isDesktop ? { x: 0 } : { y: 0 }}
        exit={isDesktop ? { x: '100%' } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        role="dialog"
        aria-modal="true"
        aria-label={taskToEdit ? 'Edit task' : 'New task'}
        className={`fixed z-50 flex flex-col bg-paper-100 text-ink-900 overflow-hidden ${
          isDesktop
            ? 'inset-y-0 right-0 w-full max-w-[560px] border-l border-paper-200/80 shadow-[-24px_0_60px_rgba(0,0,0,0.6)]'
            : 'inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-[28px] border-t border-paper-200/80 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] pb-[env(safe-area-inset-bottom,0px)]'
        }`}
      >
        {/* Mobile grab handle */}
        <div className="flex w-full justify-center pt-2.5 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-ink-300/50" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-paper-200/60 px-6 sm:px-7 py-3 sm:py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            {taskToEdit ? 'Edit Task' : 'New Task'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-lg p-1.5 text-ink-400 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900"
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
            className="mt-4 w-full bg-transparent text-[24px] font-bold leading-tight tracking-tight text-ink-900 placeholder:text-ink-400 outline-none"
          />

          {/* Description */}
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, context, notes…"
            className="mt-3 w-full resize-y bg-transparent text-[14.5px] leading-relaxed text-ink-700 placeholder:text-ink-400 outline-none min-h-[52px]"
          />

          {/* Metadata toolbar */}
          <div className="mt-5 h-px bg-paper-200/70" />
          <div className="mt-5 flex flex-wrap items-center gap-1">
            {/* List / Board */}
            <Dropdown<string>
              value={listId ?? ''}
              onChange={(v) => setListId(v || null)}
              ariaLabel="List or board"
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

          {/* Date & Deadline Fields */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-paper-200/50 p-2 border border-paper-200/60">
            {/* Due date */}
            <DatePicker
              mode="date"
              value={dueDate}
              onChange={setDueDate}
              label="Due:"
              accentColor="pine"
            />

            {/* Deadline */}
            <DatePicker
              mode="datetime"
              value={deadline}
              onChange={setDeadline}
              label="Deadline:"
              accentColor="amber"
            />
          </div>


          {/* Subtasks */}
          <div className="mt-7 space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              <SubtaskIcon className="size-3.5 text-ink-400" />
              Subtasks {subtasks.length > 0 && `(${doneSubtasksCount}/${subtasks.length})`}
            </span>

            {subtasks.length > 0 && (
              <div className="space-y-0.5">
                {subtasks.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors duration-150 hover:bg-paper-200/50"
                  >
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleSubtask(s.id)}
                      className="size-4 shrink-0 cursor-pointer rounded accent-pine-600"
                    />
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => {
                        const val = e.target.value
                        setSubtasks((prev) => prev.map((sub) => (sub.id === s.id ? { ...sub, title: val } : sub)))
                      }}
                      className={`flex-1 bg-transparent text-[14px] outline-none ${
                        s.done ? 'line-through text-ink-500' : 'text-ink-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSubtask(s.id)}
                      aria-label={`Remove subtask “${s.title}”`}
                      className="rounded p-1 text-ink-400 transition-all duration-150 hover:text-terra-600 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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

          {/* Add link / image affordances */}
          {(!showLinks || !showImages) && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-[13px] text-ink-500">
              {!showLinks && (
                <button
                  type="button"
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink-900"
                >
                  <LinkIcon className="size-3.5 text-ink-400" />
                  Add link
                </button>
              )}
              {!showImages && (
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-ink-900">
                    <PaperclipIcon className="size-3.5 text-ink-400" />
                    Upload image
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-ink-300">·</span>
                  <button
                    type="button"
                    onClick={() => setShowAddImage(true)}
                    className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink-900"
                  >
                    <LinkIcon className="size-3.5 text-ink-400" />
                    Image URL
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Links Section */}
          {showLinks && (
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
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
                      className="group flex items-center gap-1.5 rounded-lg bg-paper-50 py-1.5 pl-3 pr-1.5 text-[13px]"
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
                      className="px-2.5 py-1.5 text-[12.5px] text-ink-500 transition-colors duration-150 hover:text-ink-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addLink}
                      className="rounded-lg bg-pine-600 px-3 py-1.5 text-[12.5px] font-medium text-[#fbf9f5] transition-colors duration-150 hover:bg-pine-700"
                    >
                      Add link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Images Section */}
          {showImages && (
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  <ImageIcon className="size-3.5 text-ink-400" />
                  Images & attachments {images.length > 0 && `(${images.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-ink-500 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900">
                    <PaperclipIcon className="size-3.5" />
                    Upload
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                  {!showAddImage && (
                    <button
                      type="button"
                      onClick={() => setShowAddImage(true)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-ink-500 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900"
                    >
                      <LinkIcon className="size-3.5" />
                      URL
                    </button>
                  )}
                </div>
              </div>

              {showAddImage && (
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL…"
                    aria-label="Image URL"
                    className={`${insetInput} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="rounded-lg bg-pine-600 px-3 py-2 text-[12.5px] font-medium text-[#fbf9f5] transition-colors duration-150 hover:bg-pine-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddImage(false)}
                    className="px-2 py-2 text-[12.5px] text-ink-500 transition-colors duration-150 hover:text-ink-900"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl bg-paper-50 shadow-xs border border-paper-200/60">
                      <img
                        src={imageUrls[img] ?? img}
                        alt={`Attachment ${idx + 1}`}
                        onClick={() => setPreviewImage(imageUrls[img] ?? img)}
                        className="h-full w-full cursor-pointer object-cover transition-transform duration-200 hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label={`Remove attachment ${idx + 1}`}
                        className="absolute right-1.5 top-1.5 rounded-full bg-paper-200/90 p-1 text-ink-900 transition-all duration-150 hover:bg-terra-600 hover:text-[#fbf9f5] md:opacity-0 md:group-hover:opacity-100"
                      >
                        <CloseIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-paper-300/80 p-4 cursor-pointer text-center transition-colors duration-150 hover:border-pine-400 hover:bg-paper-50">
                  <PaperclipIcon className="size-5 text-ink-400" />
                  <span className="text-[13px] font-medium text-ink-700">Click or drop images here to upload</span>
                  <span className="text-[11.5px] text-ink-400">Supports PNG, JPG, WebP or paste from clipboard</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Drag & drop overlay indicator */}
        <AnimatePresence>
          {isDraggingOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-paper-100/95 p-6 text-center backdrop-blur-xs border-2 border-dashed border-pine-500"
            >
              <PaperclipIcon className="mb-2 size-10 animate-bounce text-pine-600" />
              <p className="text-[17px] font-bold text-ink-900">Drop images here</p>
              <p className="text-[13px] text-ink-500">They will be automatically attached to this task</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky footer actions */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-4 border-t border-paper-200/70 bg-paper-100/95 px-6 sm:px-7 py-3.5 backdrop-blur-xs">
          <span className="hidden text-[12px] text-ink-400 sm:block">
            Press{' '}
            <kbd className="rounded-md bg-paper-200 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-ink-500">
              Ctrl+Enter
            </kbd>{' '}
            to save
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[14px] font-medium text-ink-600 transition-colors duration-150 hover:bg-paper-200/60 hover:text-ink-900 active:scale-98"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleFormSubmit()}
              className="rounded-xl bg-pine-600 px-5 py-2 text-[14px] font-semibold text-[#fbf9f5] shadow-xs transition-all duration-150 hover:bg-pine-700 active:scale-95"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox image preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4"
            onClick={() => setPreviewImage(null)}
          >
            <img src={previewImage} alt="Enlarged preview" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
