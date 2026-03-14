'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TbBug } from 'react-icons/tb'

import { DEFAULT_DEBUG_ERROR_MESSAGE, useDebugPanelVisibility } from './context'

const TRIGGER_SIZE = 36
/** How much of the circle is hidden when collapsed (negative right); smaller = more visible. */
const FIXED_RIGHT = -12
/** Gap from viewport right when expanded (avoid overlapping scrollbar). */
const RIGHT_GAP = 10
const INITIAL_BOTTOM = 96

/**
 * Floating debug panel: circular trigger half off right edge; hover slides it out (fully visible),
 * click toggles panel. Drag trigger vertically only. Dev-only.
 */
export function DebugPanel() {
  const { visible, state } = useDebugPanelVisibility()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [bottom, setBottom] = useState(INITIAL_BOTTOM)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ y: 0, bottom: 0 })

  const handleTriggerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setDragging(true)
      dragStart.current = { y: e.clientY, bottom }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [bottom]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - dragStart.current.y
      setBottom(() => Math.max(4, Math.min(window.innerHeight - TRIGGER_SIZE - 8, dragStart.current.bottom - dy)))
    }
    const onUp = () => setDragging(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  if (!visible || !state) {
    return null
  }

  const { forceLoading, forceError, errorMessage, setForceLoading, setForceError, setErrorMessage } = state

  return (
    <div
      className="fixed z-[9999] flex flex-col items-end gap-2 transition-[right] duration-200 ease-out"
      style={{
        right: hovered ? RIGHT_GAP : FIXED_RIGHT,
        bottom,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setOpen(false)
      }}
    >
      {open && (
        <div className="rounded-lg border border-gray-300 bg-white p-3 shadow-lg" style={{ minWidth: 260 }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">DEBUG</div>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={forceLoading} onChange={(e) => setForceLoading(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Force loading</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={forceError !== null}
              onChange={(e) => {
                setForceError(e.target.checked ? errorMessage || DEFAULT_DEBUG_ERROR_MESSAGE : null)
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Force error</span>
          </label>
          {forceError !== null && (
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => {
                const v = e.target.value
                setErrorMessage(v)
                setForceError(v || DEFAULT_DEBUG_ERROR_MESSAGE)
              }}
              placeholder="Error message"
              className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800"
            />
          )}
        </div>
      )}
      <button
        type="button"
        onPointerDown={handleTriggerPointerDown}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
        aria-label="Debug panel (click to open, hover to reveal, drag vertically to move)"
      >
        <TbBug className="h-5 w-5" />
        {(forceLoading || forceError) && <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
      </button>
    </div>
  )
}
