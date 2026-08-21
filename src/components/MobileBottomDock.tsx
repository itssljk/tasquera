import { motion } from 'framer-motion'
import type { Route } from '../types'
import {
  InboxIcon,
  ListIcon,
  PlusIcon,
  SunIcon,
  UpcomingIcon,
} from './icons'

interface MobileBottomDockProps {
  route: Route
  countFor: (route: Route) => number
  onOpenCreateTask: () => void
  onOpenSheet: () => void
}

export default function MobileBottomDock({
  route,
  countFor,
  onOpenCreateTask,
  onOpenSheet,
}: MobileBottomDockProps) {
  const isInbox = route.name === 'inbox'
  const isToday = route.name === 'today'
  const isUpcoming = route.name === 'upcoming'
  const isCollectionOrOther = route.name === 'collection' || route.name === 'calendar' || route.name === 'completed' || route.name === 'settings'

  const inboxCount = countFor({ name: 'inbox' })
  const todayCount = countFor({ name: 'today' })
  const upcomingCount = countFor({ name: 'upcoming' })

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-2 pointer-events-none md:hidden flex justify-center">
      <nav className="pointer-events-auto flex items-center justify-between gap-1 w-full max-w-md rounded-2xl bg-paper-100/95 p-1.5 shadow-2xl border border-paper-200/80 backdrop-blur-xl">
        {/* Inbox */}
        <button
          type="button"
          onClick={() => { window.location.hash = '#/inbox' }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors ${
            isInbox ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isInbox && (
            <motion.div
              layoutId="mobileDockActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <InboxIcon className={`size-5 ${isInbox ? 'text-pine-400' : 'text-ink-400'}`} />
            {inboxCount > 0 && (
              <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-pine-600 text-micro font-bold text-white">
                {inboxCount > 99 ? '99+' : inboxCount}
              </span>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Inbox</span>
        </button>

        {/* Today */}
        <button
          type="button"
          onClick={() => { window.location.hash = '#/today' }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors ${
            isToday ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isToday && (
            <motion.div
              layoutId="mobileDockActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <SunIcon className={`size-5 ${isToday ? 'text-amber-500' : 'text-ink-400'}`} />
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-amber-500 text-micro font-bold text-black">
                {todayCount > 99 ? '99+' : todayCount}
              </span>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Today</span>
        </button>

        {/* Center Quick Add Floating Trigger */}
        <div className="flex items-center justify-center px-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenCreateTask}
            aria-label="Add new task"
            className="flex size-11 items-center justify-center rounded-full bg-pine-600 text-white shadow-lg transition-transform hover:bg-pine-700 active:bg-pine-800"
          >
            <PlusIcon className="size-5 stroke-[2.4]" />
          </motion.button>
        </div>

        {/* Upcoming */}
        <button
          type="button"
          onClick={() => { window.location.hash = '#/upcoming' }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors ${
            isUpcoming ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isUpcoming && (
            <motion.div
              layoutId="mobileDockActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <UpcomingIcon className={`size-5 ${isUpcoming ? 'text-slateblue-400' : 'text-ink-400'}`} />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-slateblue-500 text-micro font-bold text-white">
                {upcomingCount > 99 ? '99+' : upcomingCount}
              </span>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Upcoming</span>
        </button>

        {/* Lists & More Sheet Trigger */}
        <button
          type="button"
          onClick={onOpenSheet}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors ${
            isCollectionOrOther ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isCollectionOrOther && (
            <motion.div
              layoutId="mobileDockActive"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-xl bg-paper-50 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <ListIcon className={`size-5 ${isCollectionOrOther ? 'text-pine-400' : 'text-ink-400'}`} />
          </span>
          <span className="relative z-10 text-caption mt-0.5">Lists</span>
        </button>
      </nav>
    </div>
  )
}
