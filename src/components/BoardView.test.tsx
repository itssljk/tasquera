import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import BoardView from './BoardView'
import type { Collection, Task } from '../types'

afterEach(() => {
  cleanup()
})

const mockBoard: Collection = {
  id: 'b1',
  name: 'Sprint Alpha',
  kind: 'board',
  createdAt: 1000,
}

const mockCollections: Collection[] = [mockBoard]

const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Research physics engines',
    description: 'Investigate Framer Motion spring presets',
    listId: 'b1',
    status: 'todo',
    done: false,
    priority: 'high',
    createdAt: 1000,
    updatedAt: 1000,
    completedAt: null,
    dueDate: null,
    subtasks: [],
    links: [],
  },
  {
    id: 't2',
    title: 'Implement 2D dragging',
    description: '',
    listId: 'b1',
    status: 'in_progress',
    done: false,
    priority: 'urgent',
    createdAt: 1001,
    updatedAt: 1001,
    completedAt: null,
    dueDate: null,
    subtasks: [],
    links: [],
  },
  {
    id: 't3',
    title: 'Archive initial specs',
    description: '',
    listId: 'b1',
    status: 'done',
    done: true,
    priority: 'medium',
    createdAt: 1002,
    updatedAt: 1002,
    completedAt: Date.now(),
    dueDate: null,
    subtasks: [],
    links: [],
  },
]

describe('BoardView Component', () => {
  it('renders all three Kanban columns with task titles in correct stages', () => {
    render(
      <BoardView
        board={mockBoard}
        tasks={mockTasks}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'To Do' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeDefined()

    expect(screen.getByText('Research physics engines')).toBeDefined()
    expect(screen.getByText('Implement 2D dragging')).toBeDefined()
    expect(screen.getByText('Archive initial specs')).toBeDefined()
  })

  it('triggers onToggle when check circle is clicked', () => {
    const onToggle = vi.fn()
    render(
      <BoardView
        board={mockBoard}
        tasks={mockTasks}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
      />,
    )

    const checkButtons = screen.getAllByRole('button', { name: /Mark as done|Move back to To Do/i })
    expect(checkButtons.length).toBeGreaterThan(0)
    fireEvent.click(checkButtons[0])

    expect(onToggle).toHaveBeenCalledWith('t1')
  })

  it('opens details modal when card is clicked', () => {
    const onEditDetails = vi.fn()
    render(
      <BoardView
        board={mockBoard}
        tasks={mockTasks}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
        onEditDetails={onEditDetails}
      />,
    )

    fireEvent.click(screen.getByText('Research physics engines'))
    expect(onEditDetails).toHaveBeenCalledWith(mockTasks[0])
  })

  it('allows inline card addition to a column', () => {
    const onAddTask = vi.fn()
    render(
      <BoardView
        board={mockBoard}
        tasks={mockTasks}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
        onAddTask={onAddTask}
      />,
    )

    const addButtons = screen.getAllByRole('button', { name: /Add card/i })
    fireEvent.click(addButtons[0])

    const input = screen.getByPlaceholderText(/Card title…/i)
    fireEvent.change(input, { target: { value: 'New task via quickadd' } })
    fireEvent.submit(input.closest('form')!)

    expect(onAddTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New task via quickadd',
        listId: 'b1',
        status: 'todo',
      }),
    )
  })

  it('renders empty column state when a column has no cards', () => {
    const tasksWithEmptyInProgress = mockTasks.filter((t) => t.status !== 'in_progress')
    render(
      <BoardView
        board={mockBoard}
        tasks={tasksWithEmptyInProgress}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
      />,
    )

    expect(screen.getByText('No cards in progress')).toBeDefined()
  })

  it('hides PC keyboard shortcuts in inline card addition on mobile viewports', () => {
    render(
      <BoardView
        board={mockBoard}
        tasks={mockTasks}
        collections={mockCollections}
        menu={null}
        onMenu={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onMove={vi.fn()}
      />,
    )

    const addButtons = screen.getAllByRole('button', { name: /Add card/i })
    fireEvent.click(addButtons[0])

    expect(screen.queryByText(/↵ Enter saves, Shift\+Enter expands/i)).toBeNull()
    const expandBtn = screen.getByRole('button', { name: 'Expand' })
    expect(expandBtn.getAttribute('title')).toBe('Expand to full modal')
  })
})
