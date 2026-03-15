'use client'

import type { DNSRecord } from '@/services/dns'

import { abbreviateIPv6 } from '../utils'
import { CopyButton } from './CopyButton'

/**
 * Group records by type (A, AAAA) and show as compact blocks with copy per value.
 * @param props.records Resolved DNS records
 */
export function ResultGroupedView({ records }: { records: DNSRecord[] }) {
  const byType = records.reduce<Record<string, DNSRecord[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})
  const order = ['A', 'AAAA']

  return (
    <div className="flex flex-col gap-4">
      {order.map((type) => {
        const list = byType[type]
        if (!list?.length) return null
        return (
          <div key={type}>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{type}</span>
            <ul className="flex flex-col gap-1.5">
              {list.map((r, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 py-2 pl-3 pr-2 font-mono text-sm text-gray-900">
                  <span className="min-w-0 truncate mr-auto">{type === 'AAAA' ? abbreviateIPv6(r.data) : r.data}</span>
                  <span className="shrink-0 text-xs text-gray-400">TTL {r.ttl}</span>
                  <CopyButton text={r.data} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {order.every((t) => !byType[t]?.length) && <p className="text-sm text-gray-500">No A or AAAA records.</p>}
    </div>
  )
}
