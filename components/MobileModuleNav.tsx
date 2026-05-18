'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbMenu2, TbX } from 'react-icons/tb'

import { findActiveDashboardSidebarItem, isDashboardSidebarItemActive } from '@/components/dashboard-sidebar-utils'

import type { DashboardSidebarItem } from './DashboardSidebar'

interface MobileModuleNavProps {
  items: DashboardSidebarItem[]
}

/** Drawer open/close animation duration (ms); keep in sync with Tailwind duration classes. */
const DRAWER_TRANSITION_MS = 300

const drawerLinkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[color,background-color,transform,opacity] duration-200 ease-out motion-reduce:transition-none'
const drawerLinkActive = 'bg-gray-900 text-white'
const drawerLinkInactive = 'text-gray-700 hover:bg-gray-100'

/**
 * Mobile module sub-navigation: compact bar with current section title and a left drawer for all module links.
 * @param props Sidebar items for the current module
 * @returns Mobile-only nav bar and drawer (hidden from `md` up)
 */
export function MobileModuleNav(props: Readonly<MobileModuleNavProps>) {
  const { items } = props
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  /** Portal mounted (includes exit animation). */
  const [visible, setVisible] = useState(false)
  /** Enter animation active (panel slid in, backdrop opaque). */
  const [entered, setEntered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const drawerId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const activeItem = findActiveDashboardSidebarItem(pathname, items)
  const barTitle = activeItem?.title ?? 'Menu'

  const openDrawer = useCallback(() => {
    setOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

  useEffect(() => {
    if (open) {
      setVisible(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(frame)
    }

    setEntered(false)
    const timer = window.setTimeout(() => setVisible(false), DRAWER_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!visible) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [visible])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closeDrawer])

  useEffect(() => {
    if (open) {
      const firstLink = panelRef.current?.querySelector('a')
      if (firstLink instanceof HTMLElement) {
        firstLink.focus()
      }
      return
    }
    if (!visible) {
      menuButtonRef.current?.focus()
    }
  }, [open, visible])

  return (
    <>
      <div className="flex w-full shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-gray-100 motion-reduce:transition-none ${
            open ? 'scale-95 bg-gray-100 shadow-inner' : 'scale-100'
          }`}
          aria-expanded={open}
          aria-controls={drawerId}
          aria-label={open ? 'Close module menu' : 'Open module menu'}
          onClick={() => (open ? closeDrawer() : openDrawer())}
        >
          <span className="relative block h-5 w-5" aria-hidden>
            <TbMenu2
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                open ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <TbX
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'
              }`}
            />
          </span>
        </button>
        <span
          className={`min-w-0 truncate text-sm font-semibold text-gray-900 transition-opacity duration-200 motion-reduce:transition-none ${open ? 'opacity-70' : 'opacity-100'}`}
        >
          {barTitle}
        </span>
      </div>

      {mounted && visible
        ? createPortal(
            <div
              className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
                entered ? 'opacity-100' : 'opacity-0'
              }`}
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
                aria-label="Close module menu"
                onClick={closeDrawer}
              />
              <aside
                ref={panelRef}
                id={drawerId}
                role="dialog"
                aria-modal="true"
                aria-label="Module navigation"
                className={`absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none motion-reduce:duration-0 ${
                  entered ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <div
                  className={`flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                    entered ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
                  }`}
                  style={{ transitionDelay: entered ? '60ms' : '0ms' }}
                >
                  <span className="text-sm font-semibold text-gray-900">Module menu</span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
                    aria-label="Close module menu"
                    onClick={closeDrawer}
                  >
                    <TbX className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  {items.map((item, index) => {
                    const isActive = isDashboardSidebarItemActive(pathname, item)
                    const className = [drawerLinkBase, isActive ? drawerLinkActive : drawerLinkInactive, entered ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'].join(
                      ' '
                    )
                    const staggerMs = 80 + index * 40
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={className}
                        style={{ transitionDelay: entered ? `${staggerMs}ms` : '0ms' }}
                        aria-label={item.ariaLabel}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={closeDrawer}
                      >
                        <span
                          className={[
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200',
                            isActive ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-600',
                            entered ? 'scale-100' : 'scale-90',
                          ].join(' ')}
                          style={{ transitionDelay: entered ? `${staggerMs + 20}ms` : '0ms' }}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    )
                  })}
                </nav>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
