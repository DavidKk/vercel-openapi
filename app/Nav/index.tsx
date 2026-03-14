'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TbCalendarSearch, TbCloudRain, TbCurrencyDollar, TbGasStation, TbMapPin, TbMovie } from 'react-icons/tb'

import { Tooltip } from '@/components/Tooltip'

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
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700">
        <Image src="/logo-32.png" alt="Unbnd logo" width={24} height={24} className="h-6 w-6 shrink-0" />
        <span>Unbnd</span>
      </Link>
      <nav className="flex items-center gap-1" aria-label="Modules">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href) ?? false
          return (
            <Tooltip key={item.href} content={item.title}>
              <Link
                href={item.href}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-300 ring-inset' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
              </Link>
            </Tooltip>
          )
        })}
      </nav>
    </header>
  )
}
