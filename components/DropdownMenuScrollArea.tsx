'use client'

import classNames from 'classnames'
import { forwardRef, type HTMLAttributes, type ReactNode, type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Width of the faux scrollbar track in CSS pixels */
const INDICATOR_TRACK_PX = 2

/** Minimum thumb height when content overflows (keeps a visible sliver) */
const MIN_THUMB_PX = 2

export interface DropdownMenuScrollAreaProps {
  /** Scrollable root element (`ul` for listbox menus, default `div`) */
  as?: 'div' | 'ul'
  children: ReactNode
  /** Classes merged onto the outer `position: relative` wrapper */
  className?: string
  /** Classes merged onto the scroll container (e.g. `max-h-64 py-0.5`) */
  scrollClassName?: string
  /**
   * Extra attributes for the scroll container (`role`, `aria-*`, `id`).
   * `onScroll` runs after the internal position sync.
   */
  scrollProps?: Omit<HTMLAttributes<HTMLElement>, 'className' | 'children' | 'ref' | 'style'>
}

type ThumbState = { top: number; height: number }

function thumbsEqual(a: ThumbState | null, b: ThumbState | null): boolean {
  if (a === null && b === null) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  return a.top === b.top && a.height === b.height
}

/**
 * Scrollable dropdown panel region with a hidden native scrollbar and a fixed-width (2px) black position indicator.
 * macOS overlay scrollbars often ignore narrow `::-webkit-scrollbar` widths; this component avoids native thumbs entirely.
 * @param props Layout and scroll container configuration
 * @param ref Ref to the scrollable `div` or `ul` root (for focus management)
 * @returns Relative wrapper, scrollable child, and a non-interactive thumb overlay
 */
export const DropdownMenuScrollArea = forwardRef<HTMLDivElement | HTMLUListElement, DropdownMenuScrollAreaProps>(function DropdownMenuScrollArea(props, forwardedRef) {
  const { as: As = 'div', children, className, scrollClassName, scrollProps } = props
  const { onScroll: userOnScroll, ...restScrollProps } = scrollProps ?? {}

  const scrollRef = useRef<HTMLDivElement | HTMLUListElement | null>(null)
  const lastThumbRef = useRef<ThumbState | null | undefined>(undefined)
  const forwardedRefRef = useRef(forwardedRef)
  forwardedRefRef.current = forwardedRef

  const rafSyncRef = useRef(0)

  const setScrollElement = useCallback((el: HTMLDivElement | HTMLUListElement | null) => {
    scrollRef.current = el
    const ref = forwardedRefRef.current
    if (typeof ref === 'function') {
      ref(el)
    } else if (ref) {
      ref.current = el
    }
  }, [])

  const [thumb, setThumb] = useState<ThumbState | null>(null)

  const commitThumb = useCallback((next: ThumbState | null) => {
    if (lastThumbRef.current !== undefined && thumbsEqual(lastThumbRef.current, next)) {
      return
    }
    lastThumbRef.current = next
    setThumb(next)
  }, [])

  const syncThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      commitThumb(null)
      return
    }
    const scrollHeight = el.scrollHeight
    const clientHeight = el.clientHeight
    if (scrollHeight <= clientHeight) {
      commitThumb(null)
      return
    }
    const thumbHeight = Math.max(MIN_THUMB_PX, Math.round((clientHeight / scrollHeight) * clientHeight))
    const maxScroll = scrollHeight - clientHeight
    const scrollTop = el.scrollTop
    const thumbTop = maxScroll <= 0 ? 0 : Math.round((scrollTop / maxScroll) * Math.max(0, clientHeight - thumbHeight))
    commitThumb({ top: thumbTop, height: thumbHeight })
  }, [commitThumb])

  const scheduleSyncThumb = useCallback(() => {
    if (rafSyncRef.current !== 0) {
      return
    }
    rafSyncRef.current = requestAnimationFrame(() => {
      rafSyncRef.current = 0
      syncThumb()
    })
  }, [syncThumb])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      scheduleSyncThumb()
      userOnScroll?.(event)
    },
    [scheduleSyncThumb, userOnScroll]
  )

  useLayoutEffect(() => {
    syncThumb()
  }, [syncThumb])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => {
      scheduleSyncThumb()
    })
    ro.observe(el)
    const mo = new MutationObserver(() => {
      scheduleSyncThumb()
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
      if (rafSyncRef.current !== 0) {
        cancelAnimationFrame(rafSyncRef.current)
        rafSyncRef.current = 0
      }
    }
  }, [scheduleSyncThumb])

  return (
    <div className={classNames('relative', className)}>
      <As
        ref={setScrollElement}
        {...(restScrollProps as object)}
        onScroll={handleScroll}
        className={classNames('dropdown-menu-scroll overflow-auto pr-1.5', 'min-h-0', scrollClassName)}
      >
        {children}
      </As>
      {thumb ? (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex justify-end" style={{ width: INDICATOR_TRACK_PX }} aria-hidden>
          <div
            className="absolute left-0 rounded-full bg-black"
            style={{
              width: INDICATOR_TRACK_PX,
              height: thumb.height,
              top: thumb.top,
            }}
          />
        </div>
      ) : null}
    </div>
  )
})

DropdownMenuScrollArea.displayName = 'DropdownMenuScrollArea'
