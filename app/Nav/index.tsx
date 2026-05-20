'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdPriceCheck } from 'react-icons/md'
import { TbCalendarSearch, TbChartLine, TbCloudRain, TbCurrencyDollar, TbGasStation, TbMapPin, TbMovie, TbRoute2, TbServer2 } from 'react-icons/tb'

import { ModuleNavMenuButton } from '@/components/ModuleNavContext'
import { Tooltip } from '@/components/Tooltip'

import { AuthEntry } from './AuthEntry'
import { getModuleSubPath, MODULES_WITH_MANAGER_PAGES } from './utils'

const RESIZE_DEBOUNCE_MS = 150

/** Mobile-only edge fade overlays hinting horizontal scroll (match header `bg-white`). */
const SCROLL_EDGE_FADE_BASE_CLASS = 'pointer-events-none absolute inset-y-0 z-10 w-6 transition-opacity duration-200 md:hidden'

/**
 * Wraps a scrollable nav: on mount, on mouse leave, and on resize (debounced), scrolls the element with aria-current="page" into view when overflow exists.
 * On mobile, shows left/right gradient fades when more content is off-screen.
 */
function ScrollToActiveOnLeave({
  children,
  className,
  routeKey,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  /** Re-run scroll-into-view and fade when the route changes. */
  routeKey?: string
} & Omit<React.ComponentPropsWithoutRef<'nav'>, 'className'>) {
  const ref = useRef<HTMLElement>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  const updateScrollFades = useCallback(() => {
    const el = ref.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const canScroll = scrollWidth > clientWidth + 1
    setFadeLeft(canScroll && scrollLeft > 2)
    setFadeRight(canScroll && scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  const scrollActiveIntoView = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const el = ref.current
      if (!el || el.scrollWidth <= el.clientWidth) return
      const active = el.querySelector('[aria-current="page"]')
      if (active instanceof HTMLElement) {
        active.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' })
      }
      requestAnimationFrame(updateScrollFades)
    },
    [updateScrollFades]
  )

  useEffect(() => {
    scrollActiveIntoView('auto')
    updateScrollFades()
  }, [routeKey, scrollActiveIntoView, updateScrollFades])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onScroll() {
      updateScrollFades()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(() => updateScrollFades())
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [updateScrollFades])

  useEffect(() => {
    function onResize() {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        resizeTimeoutRef.current = null
        scrollActiveIntoView('auto')
        updateScrollFades()
      }, RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [scrollActiveIntoView, updateScrollFades])

  const navClass = ['min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className].filter(Boolean).join(' ')

  return (
    <div className="relative min-w-0 flex-1">
      <div className={`${SCROLL_EDGE_FADE_BASE_CLASS} left-0 bg-gradient-to-r from-white to-transparent ${fadeLeft ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      <div className={`${SCROLL_EDGE_FADE_BASE_CLASS} right-0 bg-gradient-to-l from-white to-transparent ${fadeRight ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      <nav ref={ref} className={navClass} onMouseLeave={() => scrollActiveIntoView()} onScroll={updateScrollFades} {...rest}>
        {children}
      </nav>
    </div>
  )
}

/**
 * Global app header: title + icon links to modules. Shown on every page for a single, app-like shell.
 */
const NAV_ITEMS = [
  { href: '/exchange-rate', title: 'Exchange Rate', icon: <TbCurrencyDollar className="h-5 w-5" /> },
  { href: '/movies', title: 'Movies', icon: <TbMovie className="h-5 w-5" /> },
  { href: '/dns', title: 'DNS Query', icon: <TbServer2 className="h-5 w-5" /> },
  { href: '/finance', title: 'Finance', icon: <TbChartLine className="h-5 w-5" /> },
  { href: '/proxy-rule', title: 'Proxy Rule', icon: <TbRoute2 className="h-5 w-5" /> },
  { href: '/china-holiday', title: 'china-holiday', icon: <TbCalendarSearch className="h-5 w-5" /> },
  { href: '/china-prices', title: 'china-prices', icon: <MdPriceCheck className="h-5 w-5" /> },
  { href: '/china-fuel-price', title: 'china-fuel-price', icon: <TbGasStation className="h-5 w-5" /> },
  { href: '/china-geo', title: 'china-geo', icon: <TbMapPin className="h-5 w-5" /> },
  { href: '/china-weather', title: 'china-weather', icon: <TbCloudRain className="h-5 w-5" /> },
]

export function Nav() {
  const pathname = usePathname()
  const subPath = getModuleSubPath(pathname ?? null)

  const segments = (pathname ?? '').split('/').filter(Boolean)
  const currentModuleSlug = segments[0]
  const isOnManagePage = segments[1] === 'manage' && !!currentModuleSlug

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
      <div className="flex shrink-0 items-center gap-1">
        <ModuleNavMenuButton />
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700">
          <Image src="/logo-32.png" alt="Unbnd logo" width={24} height={24} className="h-6 w-6 shrink-0" />
          <span>Unbnd</span>
        </Link>
      </div>
      <ScrollToActiveOnLeave routeKey={pathname ?? ''} style={{ scrollBehavior: 'smooth' }} aria-label="Modules">
        <div className="flex min-w-max flex-nowrap items-center justify-end gap-1 pr-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false
            const targetModuleSlug = item.href.replace(/^\/+/, '').split('/')[0]

            let href = item.href
            if (isOnManagePage && MODULES_WITH_MANAGER_PAGES.has(targetModuleSlug)) {
              href = `${item.href}/manage`
            } else if (subPath) {
              href = `${item.href}${subPath}`
            }
            return (
              <Tooltip key={item.href} content={item.title}>
                <Link
                  href={href}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-300 ring-inset' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                  aria-label={item.title}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                </Link>
              </Tooltip>
            )
          })}
        </div>
      </ScrollToActiveOnLeave>
      <div className="shrink-0">
        <AuthEntry />
      </div>
    </header>
  )
}
