'use client'

import classNames from 'classnames'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface FloatingDropdownProps {
  /** Whether the menu panel is visible */
  open: boolean
  /** Called when the panel should close (outside click, Escape) or when implementing toggle on the trigger */
  onOpenChange: (open: boolean) => void
  /** Trigger area; place your button here and toggle `open` on click */
  trigger: ReactNode
  /** Menu panel content (rendered in a `document.body` portal) */
  children: ReactNode
  /** Align menu to trigger start (left in LTR) or end (right in LTR) */
  align?: 'start' | 'end'
  /** Minimum menu width in CSS pixels */
  menuMinWidth?: number
  /** When true, menu width is `max(trigger width, menuMinWidth)` */
  matchTriggerWidth?: boolean
  /** Classes on the fixed portal root (layout, border, shadow) */
  menuClassName?: string
  /** z-index utility; keep above app chrome and sidebars */
  zIndexClassName?: string
  /**
   * Classes on the trigger wrapper (the box used for layout + `getBoundingClientRect`).
   * Use `flex w-full` when the trigger should span a wide parent (e.g. a full-width channel picker); default `inline-flex` keeps intrinsic width (e.g. holiday toolbar button).
   */
  triggerWrapperClassName?: string
}

/**
 * Renders a dropdown panel in a portal with `position: fixed` so ancestors with `overflow: hidden` do not clip it.
 * Does not toggle `open` on trigger click — the trigger must call `onOpenChange` (e.g. flip boolean on button click).
 * Closes on outside mousedown and Escape.
 * @param props Portal dropdown configuration
 * @param props.triggerWrapperClassName Optional trigger box layout (default `inline-flex`)
 * @returns Trigger wrapper plus portaled menu when `open`
 */
export function FloatingDropdown(props: FloatingDropdownProps) {
  const {
    open,
    onOpenChange,
    trigger,
    children,
    align = 'end',
    menuMinWidth = 200,
    matchTriggerWidth = true,
    menuClassName = '',
    zIndexClassName = 'z-[1100]',
    triggerWrapperClassName,
  } = props

  const triggerWrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: menuMinWidth })

  const updatePosition = useCallback(() => {
    const el = triggerWrapRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    const w = matchTriggerWidth ? Math.max(rect.width, menuMinWidth) : menuMinWidth
    const left = align === 'end' ? rect.right - w : rect.left
    setPos({ top: rect.bottom + 4, left, width: w })
  }, [align, menuMinWidth, matchTriggerWidth])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    updatePosition()
    function onReposition() {
      updatePosition()
    }
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) {
      return
    }
    function onDocMouseDown(event: MouseEvent) {
      const t = event.target as Node
      if (triggerWrapRef.current?.contains(t)) {
        return
      }
      if (menuRef.current?.contains(t)) {
        return
      }
      onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const portal =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }} className={classNames(zIndexClassName, menuClassName)} role="presentation">
        {children}
      </div>,
      document.body
    )

  return (
    <>
      <div ref={triggerWrapRef} className={classNames('min-w-0', triggerWrapperClassName ?? 'inline-flex')}>
        {trigger}
      </div>
      {portal}
    </>
  )
}
