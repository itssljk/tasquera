import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import MobileListsDrawer from './MobileListsDrawer'
import type { Collection, Route } from '../types'

afterEach(() => {
  cleanup()
})

const mockCollections: Collection[] = [
  { id: 'c1', name: 'Personal Tasks', kind: 'list', createdAt: 1, favorite: true },
  { id: 'c2', name: 'Sprint Board', kind: 'board', createdAt: 2 },
]

const mockRoute: Route = { name: 'inbox' }

describe('MobileListsDrawer', () => {
  it('renders dedicated lists and boards, and excludes desktop sidebar views', () => {
    render(
      <MobileListsDrawer
        isOpen={true}
        onClose={vi.fn()}
        route={mockRoute}
        collections={mockCollections}
        countFor={() => 3}
      />
    )

    // Header and Lists & Boards present
    expect(screen.getAllByText('Lists & Boards').length).toBeGreaterThan(0)
    expect(screen.getByText('Personal Tasks')).toBeDefined()
    expect(screen.getByText('Sprint Board')).toBeDefined()
    expect(screen.getByText('Favorites')).toBeDefined()

    // Redundant sidebar items MUST NOT be in the drawer
    expect(screen.queryByText('Inbox')).toBeNull()
    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.queryByText('Upcoming')).toBeNull()
    expect(screen.queryByText('Logbook')).toBeNull()
    expect(screen.queryByText('Settings')).toBeNull()
    expect(screen.queryByText(/Search or command/i)).toBeNull()
  })

  it('navigates to collection and closes on item tap', () => {
    const onClose = vi.fn()
    render(
      <MobileListsDrawer
        isOpen={true}
        onClose={onClose}
        route={mockRoute}
        collections={mockCollections}
        countFor={() => 0}
      />
    )

    fireEvent.click(screen.getByText('Personal Tasks'))
    expect(window.location.hash).toBe('#/collection/c1')
    expect(onClose).toHaveBeenCalled()
  })

  it('allows creating a new list or board', () => {
    const onAddCollection = vi.fn()
    render(
      <MobileListsDrawer
        isOpen={true}
        onClose={vi.fn()}
        route={mockRoute}
        collections={mockCollections}
        countFor={() => 0}
        onAddCollection={onAddCollection}
      />
    )

    // Open add form
    fireEvent.click(screen.getByText('New list or board'))

    const input = screen.getByPlaceholderText('List name…')
    fireEvent.change(input, { target: { value: 'Design System' } })

    // Submit form
    fireEvent.click(screen.getByText('Create'))
    expect(onAddCollection).toHaveBeenCalledWith('list', 'Design System')
  })

  it('renders empty state when no lists exist', () => {
    render(
      <MobileListsDrawer
        isOpen={true}
        onClose={vi.fn()}
        route={mockRoute}
        collections={[]}
        countFor={() => 0}
      />
    )

    expect(screen.getByText('No lists or boards yet')).toBeDefined()
    expect(screen.getByText('Create list or board')).toBeDefined()
  })
})
