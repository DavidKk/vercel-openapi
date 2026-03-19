'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { TbCalendarSearch, TbChartLine, TbCloudRain, TbCurrencyDollar, TbGasStation, TbMapPin, TbMovie, TbWorld } from 'react-icons/tb'

import { Tooltip } from '@/components/Tooltip'

import { AuthEntry } from './AuthEntry'
import { getModuleSubPath } from './utils'

const RESIZE_DEBOUNCE_MS = 150

/**
 * Wraps a scrollable nav: on mount, on mouse leave, and on resize (debounced), scrolls the element with aria-current="page" into view when overflow exists.
 */
function ScrollToActiveOnLeave({ children, ...rest }: { children: React.ReactNode } & React.ComponentPropsWithoutRef<'nav'>) {
  const ref = useRef<HTMLElement>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scrollActiveIntoView(behavior: ScrollBehavior = 'smooth') {
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const active = el.querySelector('[aria-current="page"]')
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' })
    }
  }

  useEffect(() => {
    scrollActiveIntoView('auto')
  }, [])

  useEffect(() => {
    function onResize() {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        resizeTimeoutRef.current = null
        scrollActiveIntoView('auto')
      }, RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [])

  return (
    <nav ref={ref} onMouseLeave={() => scrollActiveIntoView()} {...rest}>
      {children}
    </nav>
  )
}

/**
 * Global app header: title + icon links to modules. Shown on every page for a single, app-like shell.
 */
const NAV_ITEMS = [
  { href: '/holiday', title: 'Holiday', icon: <TbCalendarSearch className="h-5 w-5" /> },
  { href: '/fuel-price', title: 'Fuel Price', icon: <TbGasStation className="h-5 w-5" /> },
  { href: '/exchange-rate', title: 'Exchange Rate', icon: <TbCurrencyDollar className="h-5 w-5" /> },
  { href: '/geo', title: 'China GEO', icon: <TbMapPin className="h-5 w-5" /> },
  { href: '/weather', title: 'Weather', icon: <TbCloudRain className="h-5 w-5" /> },
  { href: '/movies', title: 'Movies', icon: <TbMovie className="h-5 w-5" /> },
  { href: '/dns', title: 'DNS Query', icon: <TbWorld className="h-5 w-5" /> },
  { href: '/finance', title: 'Finance', icon: <TbChartLine className="h-5 w-5" /> },
]

export function Nav() {
  const pathname = usePathname()
  const subPath = getModuleSubPath(pathname ?? null)

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700">
        <Image src="/logo-32.png" alt="Unbnd logo" width={24} height={24} className="h-6 w-6 shrink-0" />
        <span>Unbnd</span>
      </Link>
      <ScrollToActiveOnLeave
        className="flex-1 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollBehavior: 'smooth' }}
        aria-label="Modules"
      >
        <div className="flex min-w-max flex-nowrap items-center justify-end gap-1 pr-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false
            const href = subPath ? `${item.href}${subPath}` : item.href
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
