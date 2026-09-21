import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import CommandPalette from './CommandPalette'
import type { Collection, Task } from '../types'

afterEach(() => {
  cleanup()
})

const mockCollections: Collection[] = [
  { id: 'c1', name: 'Work', kind: 'list', createdAt: 1 },
]

const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Ship release v1.2',
    description: 'Prepare production notes',
    listId: 'c1',
    status: 'todo',
    done: false,
    priority: 'high',
    createdAt: 100,
    updatedAt: 100,
    completedAt: null,
    dueDate: null,
    subtasks: [{ id: 's1', title: 'Verify changelog', done: false }],
    links: [],
  },
]

describe('CommandPalette Integration', () => {
  it('renders task search results when typing a task query', () => {
    const onSelectTask = vi.fn()
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        collections={mockCollections}
        tasks={mockTasks}
        onSelectTask={onSelectTask}
        onOpenCreateTask={vi.fn()}
        onAddCollection={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/Search tasks, views, or commands/i)
    fireEvent.change(input, { target: { value: 'release' } })

    expect(screen.getByText('Ship release v1.2')).toBeDefined()
    expect(screen.getByText('Tasks')).toBeDefined()

    // Clicking the task triggers onSelectTask
    fireEvent.click(screen.getByText('Ship release v1.2'))
    expect(onSelectTask).toHaveBeenCalledWith(mockTasks[0])
  })

  it('searches subtasks and displays matched snippet', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        collections={mockCollections}
        tasks={mockTasks}
        onSelectTask={vi.fn()}
        onOpenCreateTask={vi.fn()}
        onAddCollection={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/Search tasks, views, or commands/i)
    fireEvent.change(input, { target: { value: 'changelog' } })

    expect(screen.getByText('Ship release v1.2')).toBeDefined()
    expect(screen.getByText(/\[subtask\] Verify changelog/i)).toBeDefined()
  })

  it('opens in-palette collection creator and submits cleanly', () => {
    const onAddCollection = vi.fn()
    const onClose = vi.fn()

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        collections={mockCollections}
        tasks={mockTasks}
        onSelectTask={vi.fn()}
        onOpenCreateTask={vi.fn()}
        onAddCollection={onAddCollection}
      />
    )

    // Find and click "Create new list or board"
    const createItem = screen.getByText('Create new list or board')
    fireEvent.click(createItem)

    // Check that inline creator is rendered
    expect(screen.getByText('New Collection')).toBeDefined()
    const nameInput = screen.getByPlaceholderText(/e\.g\. Reading List/i)
    fireEvent.change(nameInput, { target: { value: 'Q4 Goals' } })

    // Submit form
    const createBtn = screen.getByText('Create List')
    fireEvent.click(createBtn)

    expect(onAddCollection).toHaveBeenCalledWith('list', 'Q4 Goals')
    expect(onClose).toHaveBeenCalled()
  })

  it('hides PC-specific info on mobile viewports', () => {
    // Default test environment has isDesktop = false
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        collections={mockCollections}
        tasks={mockTasks}
        onOpenCreateTask={vi.fn()}
        onAddCollection={vi.fn()}
        onOpenShortcuts={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Search tasks, views, or commands…')
    expect(input).toBeDefined()
    expect(screen.queryByText(/Keyboard shortcuts/i)).toBeNull()
    expect(screen.queryByText(/View shortcut cheat sheet/i)).toBeNull()
  })

  it('displays PC-specific navigation and shortcuts on desktop viewports', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        collections={mockCollections}
        tasks={mockTasks}
        onOpenCreateTask={vi.fn()}
        onAddCollection={vi.fn()}
        onOpenShortcuts={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/Search tasks, views, or commands… \(↑↓ to navigate, ↵ to jump\)/i)
    expect(input).toBeDefined()
    expect(screen.getByText('Keyboard shortcuts')).toBeDefined()
    expect(screen.getByText('View shortcut cheat sheet (?)')).toBeDefined()
  })
})
