import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useDragControls } from 'framer-motion'

const LONG_PRESS_MS = 350
const MOVE_THRESHOLD_PX = 10
const CLICK_SUPPRESS_MS = 400

/**
 * Long-press-to-drag, paired with framer-motion `Reorder.Item`.
 *
 * On coarse-pointer (touch) devices a `Reorder.Item` with its built-in drag
 * listener would set `touch-action: none` on the whole row, which blocks
 * scrolling. Instead we disable the item's drag listener and arm the drag via
 * `controls.start()` after the pointer has been held still for ~350ms. If the
 * finger moves first, it's treated as a scroll and the press is cancelled.
 *
 * On fine-pointer (mouse/pen) devices framer's built-in drag is used, so these
 * handlers are inert; pass `dragListener={!isTouch}` on the `Reorder.Item`.
 *
 * A short suppression window after the drag starts stops the browser's
 * post-drag `click` from triggering the row's own onClick (e.g. opening the
 * edit dialog).
 */
export function useLongPressDrag() {
  const controls = useDragControls()
  const [isTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const [isDragging, setIsDragging] = useState(false)

  const timerRef = useRef<number | null>(null)
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickUntilRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    originRef.current = null
  }

  useEffect(() => clearTimer, [])

  const isInteractive = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false
    return !!target.closest(
      'button, input, textarea, select, a, label, [role="menu"], [role="dialog"], [contenteditable="true"]',
    )
  }

  const beginDrag = (e: ReactPointerEvent) => {
    clearTimer()
    suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS
    setIsDragging(true)
    controls.start(e.nativeEvent)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.pointerType === 'touch' && !e.isPrimary) return
    if (isInteractive(e.target)) return
    if (!isTouch) return // desktop uses framer's built-in drag
    originRef.current = { x: e.clientX, y: e.clientY }
    timerRef.current = window.setTimeout(() => beginDrag(e), LONG_PRESS_MS)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (timerRef.current === null || !originRef.current) return
    const dx = e.clientX - originRef.current.x
    const dy = e.clientY - originRef.current.y
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) clearTimer()
  }

  const onPointerUp = () => clearTimer()
  const onPointerCancel = () => clearTimer()

  const onClickCapture = (e: ReactMouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onDragStart = () => setIsDragging(true)
  const onDragEnd = () => setIsDragging(false)

  return {
    controls,
    isTouch,
    isDragging,
    onDragStart,
    onDragEnd,
    dragProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  }
}
