'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'

import { formatFundEtfTitle, FUND_ETF_OHLCV_SUB_TABS, type FundEtfOhlcvSymbol } from '../constants/fundEtfOhlcv'
import { FundEtfOhlcvOverview } from './FundEtfOhlcvOverview'

interface FundOverviewSwitcherProps {
  /** Active six-digit fund/ETF symbol from the route */
  symbol: FundEtfOhlcvSymbol
}

/**
 * Fund/ETF overview with dropdown-based selection; trigger shows `name (code)` as one title.
 *
 * @param props Current symbol from `/finance/fund/[symbol]`
 * @returns Section with header control and daily OHLCV body
 */
export function FundOverviewSwitcher({ symbol }: FundOverviewSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const title = formatFundEtfTitle(symbol)

  const dropdownControl = (
    <FloatingDropdown
      open={open}
      onOpenChange={setOpen}
      align="start"
      menuMinWidth={280}
      matchTriggerWidth={false}
      triggerWrapperClassName="w-auto max-w-full"
      menuClassName="rounded-md border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
      trigger={
        <button
          type="button"
          aria-label={`Select fund or ETF, current: ${title}`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="m-0 max-w-full cursor-pointer select-none border-0 bg-transparent p-0 text-left text-base font-semibold text-gray-700 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        >
          {title}
        </button>
      }
    >
      <DropdownMenuScrollArea scrollClassName="max-h-72 py-0.5" scrollProps={{ role: 'menu', 'aria-label': 'Fund and ETF list' }}>
        {FUND_ETF_OHLCV_SUB_TABS.map((row) => {
          const active = symbol === row.key
          return (
            <button
              key={row.key}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={`block w-full px-3 py-2 text-left text-sm ${active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => {
                router.push(`/finance/fund/${row.key}`)
                setOpen(false)
              }}
            >
              {row.title}
            </button>
          )
        })}
      </DropdownMenuScrollArea>
    </FloatingDropdown>
  )

  return (
    <section className="flex h-full flex-col">
      <FundEtfOhlcvOverview symbol={symbol} headerAddon={dropdownControl} />
    </section>
  )
}
