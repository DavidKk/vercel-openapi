'use client'

import classNames from 'classnames'
import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, type Ref, type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Width of the faux scrollbar track in CSS pixels */
const INDICATOR_TRACK_PX = 2

/** Minimum thumb size when content overflows */
const MIN_THUMB_PX = 12

/** Idle delay before fading the position indicator */
const SCROLL_IDLE_MS = 800

export type ScrollIndicatorAxis = 'vertical' | 'horizontal' | 'both'

export interface ScrollAreaProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  scrollClassName?: string
  scrollRef?: Ref<HTMLDivElement>
  scrollProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'ref' | 'style'>
  /**
   * Hide the native scrollbar and show a 2px non-interactive position indicator.
   * - `true` / `vertical`: vertical only (default)
   * - `horizontal`: horizontal only
   * - `both`: vertical + horizontal
   */
  indicator?: boolean | ScrollIndicatorAxis
  /** Reserve gutter padding for the indicator track */
  reserveGutter?: boolean
  /**
   * Shift the horizontal indicator onto the host bottom edge (e.g. content header `border-b`).
   * Use when the ScrollArea fills the header row and the thumb should coincide with that border.
   */
  alignHorizontalIndicatorWithHostBottom?: boolean
}

type ThumbState = { offset: number; size: number }
type IndicatorMode = ScrollIndicatorAxis

/**
 * Resolve indicator axis mode from the public `indicator` prop.
 * @param indicator Public indicator prop
 * @returns Normalized axis mode
 */
function resolveIndicatorMode(indicator: boolean | ScrollIndicatorAxis | undefined): IndicatorMode {
  if (indicator === 'horizontal') return 'horizontal'
  if (indicator === 'both') return 'both'
  return 'vertical'
}

/**
 * Compare thumb metrics for change detection.
 * @param a Previous thumb state
 * @param b Next thumb state
 * @returns True when both states are equal
 */
function thumbsEqual(a: ThumbState | null, b: ThumbState | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.offset === b.offset && a.size === b.size
}

/**
 * Compute vertical thumb geometry for a scroll element.
 * @param el Scroll container element
 * @returns Thumb metrics, or null when content does not overflow
 */
function computeVerticalThumb(el: HTMLElement): ThumbState | null {
  const { scrollHeight, clientHeight, scrollTop } = el
  if (scrollHeight <= clientHeight + 1) return null
  const thumbSize = Math.max(MIN_THUMB_PX, Math.round((clientHeight / scrollHeight) * clientHeight))
  const maxScroll = scrollHeight - clientHeight
  const thumbOffset = maxScroll <= 0 ? 0 : Math.round((scrollTop / maxScroll) * Math.max(0, clientHeight - thumbSize))
  return { offset: thumbOffset, size: thumbSize }
}

/**
 * Compute horizontal thumb geometry for a scroll element.
 * @param el Scroll container element
 * @returns Thumb metrics, or null when content does not overflow
 */
function computeHorizontalThumb(el: HTMLElement): ThumbState | null {
  const { scrollWidth, clientWidth, scrollLeft } = el
  if (scrollWidth <= clientWidth + 1) return null
  const thumbSize = Math.max(MIN_THUMB_PX, Math.round((clientWidth / scrollWidth) * clientWidth))
  const maxScroll = scrollWidth - clientWidth
  const thumbOffset = maxScroll <= 0 ? 0 : Math.round((scrollLeft / maxScroll) * Math.max(0, clientWidth - thumbSize))
  return { offset: thumbOffset, size: thumbSize }
}

/**
 * Resolve gutter padding classes for the indicator track.
 * @param mode Indicator axis mode
 * @param reserve Whether to reserve gutter space
 * @returns Tailwind class string
 */
function gutterClass(mode: IndicatorMode, reserve: boolean): string {
  if (!reserve) return ''
  if (mode === 'both') return 'pr-1.5 pb-1.5'
  if (mode === 'horizontal') return 'pb-1.5'
  return 'pr-1.5'
}

/**
 * App scroll region: hide the native scrollbar and show a 2px non-interactive position indicator.
 * Follows the CHAYA / ticket-janitor Custom Scroll contract from ui-interaction-skills `scroll-overflow`.
 * @param props Scroll area configuration
 * @param forwardedRef Ref to the outer relative wrapper
 * @returns Scroll area element
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(props, forwardedRef) {
  const { children, className, style, scrollClassName, scrollRef, scrollProps, indicator = true, reserveGutter = true, alignHorizontalIndicatorWithHostBottom = false } = props
  const { onScroll: userOnScroll, ...restScrollProps } = scrollProps ?? {}

  const innerRef = useRef<HTMLDivElement | null>(null)
  const lastVerticalThumbRef = useRef<ThumbState | null | undefined>(undefined)
  const lastHorizontalThumbRef = useRef<ThumbState | null | undefined>(undefined)
  const rafSyncRef = useRef(0)
  const scrollIdleTimerRef = useRef(0)

  const setScrollElement = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el
      if (typeof scrollRef === 'function') {
        scrollRef(el)
      } else if (scrollRef && 'current' in scrollRef) {
        scrollRef.current = el
      }
    },
    [scrollRef]
  )

  const indicatorMode = resolveIndicatorMode(indicator)
  const showVertical = indicatorMode === 'vertical' || indicatorMode === 'both'
  const showHorizontal = indicatorMode === 'horizontal' || indicatorMode === 'both'

  const [verticalThumb, setVerticalThumb] = useState<ThumbState | null>(null)
  const [horizontalThumb, setHorizontalThumb] = useState<ThumbState | null>(null)
  const [hovered, setHovered] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const showIndicator = hovered || scrolling

  const commitVerticalThumb = useCallback((next: ThumbState | null) => {
    if (lastVerticalThumbRef.current !== undefined && thumbsEqual(lastVerticalThumbRef.current, next)) return
    lastVerticalThumbRef.current = next
    setVerticalThumb(next)
  }, [])

  const commitHorizontalThumb = useCallback((next: ThumbState | null) => {
    if (lastHorizontalThumbRef.current !== undefined && thumbsEqual(lastHorizontalThumbRef.current, next)) return
    lastHorizontalThumbRef.current = next
    setHorizontalThumb(next)
  }, [])

  const markScrolling = useCallback(() => {
    setScrolling(true)
    if (scrollIdleTimerRef.current !== 0) window.clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = window.setTimeout(() => {
      scrollIdleTimerRef.current = 0
      setScrolling(false)
    }, SCROLL_IDLE_MS)
  }, [])

  const syncThumbs = useCallback(() => {
    const el = innerRef.current
    if (!el) {
      commitVerticalThumb(null)
      commitHorizontalThumb(null)
      return
    }
    commitVerticalThumb(showVertical ? computeVerticalThumb(el) : null)
    commitHorizontalThumb(showHorizontal ? computeHorizontalThumb(el) : null)
  }, [commitHorizontalThumb, commitVerticalThumb, showHorizontal, showVertical])

  const scheduleSyncThumbs = useCallback(() => {
    if (rafSyncRef.current !== 0) return
    rafSyncRef.current = requestAnimationFrame(() => {
      rafSyncRef.current = 0
      syncThumbs()
    })
  }, [syncThumbs])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      markScrolling()
      scheduleSyncThumbs()
      userOnScroll?.(event)
    },
    [markScrolling, scheduleSyncThumbs, userOnScroll]
  )

  useLayoutEffect(() => {
    syncThumbs()
  }, [syncThumbs, children])

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current !== 0) window.clearTimeout(scrollIdleTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => scheduleSyncThumbs())
    ro?.observe(el)
    const mo = new MutationObserver(() => scheduleSyncThumbs())
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      ro?.disconnect()
      mo.disconnect()
      if (rafSyncRef.current !== 0) {
        cancelAnimationFrame(rafSyncRef.current)
        rafSyncRef.current = 0
      }
    }
  }, [scheduleSyncThumbs])

  const viewportAxisClass =
    indicatorMode === 'vertical' ? 'overflow-x-hidden overflow-y-auto' : indicatorMode === 'horizontal' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto'

  const indicatorOpacityClass = classNames('transition-opacity duration-200 motion-reduce:transition-none', showIndicator ? 'opacity-100' : 'opacity-30')

  return (
    <div
      ref={forwardedRef}
      className={classNames('relative flex min-h-0 min-w-0 flex-col', alignHorizontalIndicatorWithHostBottom ? 'overflow-visible' : 'overflow-hidden', className)}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={setScrollElement}
        {...restScrollProps}
        onScroll={handleScroll}
        className={classNames('custom-scroll-hide-native min-h-0 min-w-0 flex-1', viewportAxisClass, gutterClass(indicatorMode, reserveGutter), scrollClassName)}
      >
        {children}
      </div>
      {showVertical && verticalThumb ? (
        <div
          className={classNames('pointer-events-none absolute right-0 top-0 z-[4] w-0.5', indicatorOpacityClass, indicatorMode === 'both' ? 'bottom-2' : 'bottom-0')}
          aria-hidden
        >
          <div className="absolute left-0 rounded-full bg-gray-400/80" style={{ width: INDICATOR_TRACK_PX, height: verticalThumb.size, top: verticalThumb.offset }} />
        </div>
      ) : null}
      {showHorizontal && horizontalThumb ? (
        <div
          className={classNames(
            'pointer-events-none absolute left-0 z-[4] h-0.5',
            alignHorizontalIndicatorWithHostBottom ? '-bottom-px' : 'bottom-0',
            indicatorOpacityClass,
            indicatorMode === 'both' ? 'right-2' : 'right-0'
          )}
          aria-hidden
        >
          <div className="absolute top-0 rounded-full bg-gray-400/80" style={{ height: INDICATOR_TRACK_PX, width: horizontalThumb.size, left: horizontalThumb.offset }} />
        </div>
      ) : null}
    </div>
  )
})

ScrollArea.displayName = 'ScrollArea'

type VirtuosoScrollerProps = HTMLAttributes<HTMLDivElement>

/**
 * Virtuoso `components.Scroller`: keeps the scroll node as Virtuoso's ref target while showing a vertical Custom Scroll indicator.
 * @param props Native div props from react-virtuoso (includes overflow/height styles)
 * @param forwardedRef Ref Virtuoso attaches to the scrolling element
 * @returns Relative host with hidden-native scroller and 2px indicator
 */
export const VirtuosoCustomScroller = forwardRef<HTMLDivElement, VirtuosoScrollerProps>(function VirtuosoCustomScroller(props, forwardedRef) {
  const { className, style, onScroll: userOnScroll, children, ...rest } = props
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastThumbRef = useRef<ThumbState | null | undefined>(undefined)
  const rafSyncRef = useRef(0)
  const scrollIdleTimerRef = useRef(0)
  const [thumb, setThumb] = useState<ThumbState | null>(null)
  const [hovered, setHovered] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const showIndicator = hovered || scrolling

  const setScrollElement = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        forwardedRef.current = el
      }
    },
    [forwardedRef]
  )

  const commitThumb = useCallback((next: ThumbState | null) => {
    if (lastThumbRef.current !== undefined && thumbsEqual(lastThumbRef.current, next)) return
    lastThumbRef.current = next
    setThumb(next)
  }, [])

  const syncThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      commitThumb(null)
      return
    }
    commitThumb(computeVerticalThumb(el))
  }, [commitThumb])

  const scheduleSyncThumb = useCallback(() => {
    if (rafSyncRef.current !== 0) return
    rafSyncRef.current = requestAnimationFrame(() => {
      rafSyncRef.current = 0
      syncThumb()
    })
  }, [syncThumb])

  const markScrolling = useCallback(() => {
    setScrolling(true)
    if (scrollIdleTimerRef.current !== 0) window.clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = window.setTimeout(() => {
      scrollIdleTimerRef.current = 0
      setScrolling(false)
    }, SCROLL_IDLE_MS)
  }, [])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      markScrolling()
      scheduleSyncThumb()
      userOnScroll?.(event)
    },
    [markScrolling, scheduleSyncThumb, userOnScroll]
  )

  useLayoutEffect(() => {
    syncThumb()
  }, [syncThumb, children])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => scheduleSyncThumb())
    ro?.observe(el)
    return () => {
      ro?.disconnect()
      if (rafSyncRef.current !== 0) {
        cancelAnimationFrame(rafSyncRef.current)
        rafSyncRef.current = 0
      }
      if (scrollIdleTimerRef.current !== 0) window.clearTimeout(scrollIdleTimerRef.current)
    }
  }, [scheduleSyncThumb])

  const { height, width, ...restStyle } = (style ?? {}) as CSSProperties & { height?: string | number; width?: string | number }

  return (
    <div className="relative min-h-0 min-w-0" style={{ height, width }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        ref={setScrollElement}
        {...rest}
        onScroll={handleScroll}
        style={{ ...restStyle, height: '100%', width: '100%' }}
        className={classNames('custom-scroll-hide-native h-full min-h-0 overflow-y-auto', className)}
      >
        {children}
      </div>
      {thumb ? (
        <div
          className={classNames(
            'pointer-events-none absolute bottom-0 right-0 top-0 z-[4] w-0.5 transition-opacity duration-200 motion-reduce:transition-none',
            showIndicator ? 'opacity-100' : 'opacity-30'
          )}
          aria-hidden
        >
          <div className="absolute left-0 rounded-full bg-gray-400/80" style={{ width: INDICATOR_TRACK_PX, height: thumb.size, top: thumb.offset }} />
        </div>
      ) : null}
    </div>
  )
})

VirtuosoCustomScroller.displayName = 'VirtuosoCustomScroller'
