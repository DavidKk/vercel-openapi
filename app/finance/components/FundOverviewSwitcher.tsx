'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TbChevronDown } from 'react-icons/tb'

import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'

import { formatFundEtfTitle, FUND_ETF_DROPDOWN_GROUPS, type FundEtfOhlcvSymbol } from '../constants/fundEtfOhlcv'
import { FundEtfOhlcvOverview } from './FundEtfOhlcvOverview'

interface FundOverviewSwitcherProps {
  /** Active six-digit fund/ETF symbol from the route */
  symbol: FundEtfOhlcvSymbol
}

/**
 * Fund/ETF overview with grouped dropdown (exchange daily vs fund NAV); trigger shows `name (code)` as one title.
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
          className="m-0 inline-flex max-w-full min-w-0 cursor-pointer select-none items-center gap-1 border-0 bg-transparent p-0 text-left text-base font-semibold text-gray-700 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        >
          <span className="min-w-0 truncate">{title}</span>
          <TbChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      }
    >
      <DropdownMenuScrollArea scrollClassName="max-h-72 py-0.5" scrollProps={{ role: 'menu', 'aria-label': 'Fund and ETF list' }}>
        {FUND_ETF_DROPDOWN_GROUPS.map((group, groupIndex) => (
          <div key={group.groupId} role="group" aria-label={group.groupLabel} className={groupIndex > 0 ? 'border-t border-gray-100 pt-1' : undefined}>
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.groupLabel}</div>
            {group.rows.map((row) => {
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
          </div>
        ))}
      </DropdownMenuScrollArea>
    </FloatingDropdown>
  )

  return (
    <section className="flex h-full flex-col">
      <FundEtfOhlcvOverview symbol={symbol} headerAddon={dropdownControl} />
    </section>
  )
}
