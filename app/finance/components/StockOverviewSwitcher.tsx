'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { TbChevronDown } from 'react-icons/tb'

import { FMP_UNSUPPORTED_STOCK_MARKETS } from '@/app/finance/stock/fmpUnsupportedMarkets'
import { getSlugByMarket, STOCK_MARKET_ROUTE_OPTIONS } from '@/app/finance/stock/marketRoute'
import { CONTENT_PAGE_TITLE_TEXT_CLASS } from '@/app/Nav/constants'
import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'
import type { StockMarket } from '@/services/finance/stock/types'

import { StockMarketOverviewLoader } from './StockMarketOverviewLoader'
import { TasiOverviewLoader } from './TasiOverviewLoader'

interface StockOverviewSwitcherProps {
  market: StockMarket
}

/**
 * Stock overview switcher with dropdown-based market selection.
 * TASI is currently the only live market page; others are placeholders.
 */
export function StockOverviewSwitcher({ market }: StockOverviewSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isLiveMarket = useMemo(() => market === 'TASI', [market])

  const dropdownControl = (
    <FloatingDropdown
      open={open}
      onOpenChange={setOpen}
      align="start"
      menuMinWidth={220}
      matchTriggerWidth={false}
      triggerWrapperClassName="w-auto"
      menuClassName="rounded-md border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
      trigger={
        <button
          type="button"
          aria-label="Select stock market"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-7 max-w-full min-w-0 shrink-0 cursor-pointer select-none items-center gap-1 rounded-md border border-gray-300 bg-white px-2 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 sm:m-0 sm:h-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-left ${CONTENT_PAGE_TITLE_TEXT_CLASS}`}
        >
          <span>{market}</span>
          <TbChevronDown className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200 sm:h-4 sm:w-4 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      }
    >
      <DropdownMenuScrollArea scrollClassName="max-h-64 py-0.5" scrollProps={{ role: 'menu', 'aria-label': 'Stock market options' }}>
        {STOCK_MARKET_ROUTE_OPTIONS.map((option) => {
          const active = market === option.market
          const disabled = FMP_UNSUPPORTED_STOCK_MARKETS.has(option.market)
          return (
            <button
              key={option.slug}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              aria-disabled={disabled}
              disabled={disabled}
              className={`block w-full px-3 py-2 text-left text-xs ${
                active ? 'bg-gray-900 text-white' : disabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (disabled) return
                const slug = getSlugByMarket(option.market)
                router.push(`/finance/stock/${slug}`)
                setOpen(false)
              }}
            >
              {option.market}
              {disabled ? ' (Coming soon)' : ''}
            </button>
          )
        })}
      </DropdownMenuScrollArea>
    </FloatingDropdown>
  )

  return (
    <section className="flex h-full flex-col">
      {isLiveMarket ? (
        <TasiOverviewLoader headerTitle="" headerAddon={dropdownControl} />
      ) : (
        <StockMarketOverviewLoader market={market} headerTitle="" headerAddon={dropdownControl} />
      )}
    </section>
  )
}
