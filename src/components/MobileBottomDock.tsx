import { AnimatePresence, motion } from 'framer-motion'
import type { Route } from '../types'
import { SPRINGS } from '../lib/motion'
import { triggerHaptic } from '../lib/platform'
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
  const isLists = route.name === 'collection'

  const inboxCount = countFor({ name: 'inbox' })
  const todayCount = countFor({ name: 'today' })
  const upcomingCount = countFor({ name: 'upcoming' })

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-6 pointer-events-none md:hidden flex justify-center bg-gradient-to-t from-paper-50 via-paper-50/90 to-transparent">
      <nav className="pointer-events-auto flex items-center justify-between gap-1 w-full max-w-md rounded-2xl p-1.5 bg-paper-100/95 backdrop-blur-xl shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.4)]">
        {/* Inbox */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={SPRINGS.snappy}
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            window.location.hash = '#/inbox'
          }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors cursor-pointer ${
            isInbox ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isInbox && (
            <motion.div
              layoutId="mobileDockActive"
              transition={SPRINGS.liquidPill}
              className="absolute inset-0 rounded-xl bg-paper-200/80 border border-paper-300/40 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <InboxIcon className={`size-5 transition-colors ${isInbox ? 'text-pine-500' : 'text-ink-400'}`} />
            {inboxCount > 0 && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={inboxCount}
                  initial={{ scale: 0.6, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.6, y: 4 }}
                  transition={SPRINGS.snappy}
                  className="absolute -top-1 -right-2.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-paper-200 text-ink-700 border border-paper-300/70 text-micro font-bold tabular-nums shadow-2xs"
                >
                  {inboxCount > 99 ? '99+' : inboxCount}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Inbox</span>
        </motion.button>

        {/* Today */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={SPRINGS.snappy}
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            window.location.hash = '#/today'
          }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors cursor-pointer ${
            isToday ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isToday && (
            <motion.div
              layoutId="mobileDockActive"
              transition={SPRINGS.liquidPill}
              className="absolute inset-0 rounded-xl bg-paper-200/80 border border-paper-300/40 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <SunIcon className={`size-5 transition-colors ${isToday ? 'text-pine-500' : 'text-ink-400'}`} />
            {todayCount > 0 && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={todayCount}
                  initial={{ scale: 0.6, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.6, y: 4 }}
                  transition={SPRINGS.snappy}
                  className="absolute -top-1 -right-2.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-paper-200 text-ink-700 border border-paper-300/70 text-micro font-bold tabular-nums shadow-2xs"
                >
                  {todayCount > 99 ? '99+' : todayCount}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Today</span>
        </motion.button>

        {/* Center Quick Add Floating Trigger */}
        <div className="flex items-center justify-center px-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={SPRINGS.snappy}
            onClick={() => {
              triggerHaptic('light')
              onOpenCreateTask()
            }}
            aria-label="Add new task"
            className="flex size-11 items-center justify-center rounded-full bg-paper-200 text-ink-900 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-paper-300 transition-colors hover:bg-paper-300 active:bg-paper-400 cursor-pointer"
          >
            <PlusIcon className="size-5 stroke-[2.2]" />
          </motion.button>
        </div>

        {/* Upcoming */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={SPRINGS.snappy}
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            window.location.hash = '#/upcoming'
          }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors cursor-pointer ${
            isUpcoming ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isUpcoming && (
            <motion.div
              layoutId="mobileDockActive"
              transition={SPRINGS.liquidPill}
              className="absolute inset-0 rounded-xl bg-paper-200/80 border border-paper-300/40 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <UpcomingIcon className={`size-5 transition-colors ${isUpcoming ? 'text-pine-500' : 'text-ink-400'}`} />
            {upcomingCount > 0 && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={upcomingCount}
                  initial={{ scale: 0.6, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.6, y: 4 }}
                  transition={SPRINGS.snappy}
                  className="absolute -top-1 -right-2.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-paper-200 text-ink-700 border border-paper-300/70 text-micro font-bold tabular-nums shadow-2xs"
                >
                  {upcomingCount > 99 ? '99+' : upcomingCount}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <span className="relative z-10 text-caption mt-0.5">Upcoming</span>
        </motion.button>

        {/* Lists & More Sheet Trigger */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={SPRINGS.snappy}
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            onOpenSheet()
          }}
          className={`relative flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-colors cursor-pointer ${
            isLists ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {isLists && (
            <motion.div
              layoutId="mobileDockActive"
              transition={SPRINGS.liquidPill}
              className="absolute inset-0 rounded-xl bg-paper-200/80 border border-paper-300/40 shadow-2xs"
            />
          )}
          <span className="relative z-10 flex items-center justify-center">
            <ListIcon className={`size-5 transition-colors ${isLists ? 'text-pine-500' : 'text-ink-400'}`} />
          </span>
          <span className="relative z-10 text-caption mt-0.5">Lists</span>
        </motion.button>
      </nav>
    </div>
  )
}

