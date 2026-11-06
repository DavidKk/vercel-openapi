'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbApi, TbCheck, TbCopy, TbPlayerPlay, TbRobot, TbSelector, TbX } from 'react-icons/tb'

import { BrandMark } from '@/components/BrandMark'
import { McpOneClickInstallBar } from '@/components/McpOneClickInstallBar'
import { useNotification } from '@/components/Notification'
import { TOOL_CATEGORIES } from '@/services/function-calling/categories'

type HomeTab = 'mcp' | 'api'

const TABS: { id: HomeTab; label: string; icon: ReactNode }[] = [
  { id: 'api', label: 'API', icon: <TbApi className="h-4 w-4" /> },
  { id: 'mcp', label: 'MCP', icon: <TbRobot className="h-4 w-4" /> },
]

/** Module options for ?includes= (same slugs as /api/mcp). */
const TOOL_CATEGORY_LABELS: Record<string, string> = {
  holiday: 'china-holiday',
  'fuel-price': 'china-fuel-price',
  'exchange-rate': 'Exchange Rate',
  weather: 'Weather API',
  geo: 'GEO API',
  movies: 'Movies',
  dns: 'DNS',
  finance: 'Finance',
  prices: 'china-prices',
  'proxy-rule': 'Proxy Rule',
}

/** Home includes picker order; geo/weather stay as API/MCP categories without UI modules. */
const MODULE_OPTIONS_ORDER: string[] = ['exchange-rate', 'movies', 'dns', 'finance', 'holiday', 'prices', 'fuel-price', 'proxy-rule', 'geo', 'weather']

const MODULE_OPTIONS: { id: string; label: string }[] = [
  ...MODULE_OPTIONS_ORDER.filter((id) => (TOOL_CATEGORIES as readonly string[]).includes(id)).map((id) => ({
    id,
    label: TOOL_CATEGORY_LABELS[id] ?? id,
  })),
  ...TOOL_CATEGORIES.filter((id) => !MODULE_OPTIONS_ORDER.includes(id)).map((id) => ({ id, label: TOOL_CATEGORY_LABELS[id] ?? id })),
]

const ALL_MODULE_IDS = MODULE_OPTIONS.map((o) => o.id)

/**
 * Modal to select modules for ?includes=; chosen list is used to build MCP URLs.
 */
function IncludesModal({ selectedIncludes, onSelect, onClose }: { selectedIncludes: string[]; onSelect: (ids: string[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<string[]>(selectedIncludes)
  const allChecked = draft.length === ALL_MODULE_IDS.length
  const someChecked = draft.length > 0
  const indeterminate = someChecked && !allChecked

  const toggle = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort()))
  }

  const handleSelectAllChange = () => {
    setDraft(allChecked ? [] : [...ALL_MODULE_IDS])
  }

  const handleConfirm = () => {
    onSelect(draft)
    onClose()
  }

  const allCheckboxRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = allCheckboxRef.current
    if (el) el.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <div
      className="fixed top-0 left-0 z-50 !m-0 flex h-[var(--app-viewport-height)] w-full items-center justify-center bg-pure-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="includes-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h2 id="includes-modal-title" className="text-sm font-semibold text-gray-900">
            Includes
          </h2>
          <button type="button" onClick={onClose} className="-m-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <TbX className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
          {MODULE_OPTIONS.map((opt) => (
            <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] text-gray-800 hover:bg-gray-100">
              <input
                type="checkbox"
                checked={draft.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="h-4 w-4 rounded-md border border-gray-300 bg-white accent-gray-900 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[12px] text-gray-800 hover:bg-gray-50">
            <input
              ref={allCheckboxRef}
              type="checkbox"
              checked={allChecked}
              onChange={handleSelectAllChange}
              className="h-4 w-4 rounded-md border border-gray-300 bg-white accent-gray-900 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <span className="font-medium">Select all</span>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded border border-gray-800 bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800"
            >
              <TbCheck className="h-3.5 w-3.5" />
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Client-side shell for the home page: API / MCP tab cards switch one content panel below.
 * @returns Home page client layout
 */
export function HomeClient() {
  const [tab, setTab] = useState<HomeTab>('api')
  const [origin, setOrigin] = useState<string | null>(null)
  const [selectedIncludes, setSelectedIncludes] = useState<string[]>([])
  const [includesModalOpen, setIncludesModalOpen] = useState(false)
  const { success: showSuccess } = useNotification()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  /** Omit ?includes= when all modules are selected (same as no filter). */
  const includesParam = selectedIncludes.length > 0 && selectedIncludes.length < MODULE_OPTIONS.length ? `?includes=${selectedIncludes.join(',')}` : ''

  const base = origin != null && origin.length > 0 ? origin : ''
  const mcpUrl = base ? `${base}/api/mcp${includesParam}` : `/api/mcp${includesParam}`

  const copyText = useCallback(
    async (text: string) => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        }
        showSuccess('Copied to clipboard')
      } catch {
        // no-op
      }
    },
    [showSuccess]
  )

  /** Open URL in new tab (for GET endpoints to see result). */
  const runGetUrl = useCallback((url: string) => {
    const full = url.startsWith('http') ? url : (typeof window !== 'undefined' ? window.location.origin : '') + url
    window.open(full, '_blank', 'noopener,noreferrer')
  }, [])

  // Top padding is intentionally larger while content is relatively short.
  // When the home page grows, consider reducing pt-[15vh] to keep layout balanced.
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center bg-gray-50 px-4 pt-[15vh] pb-12">
      <div className="flex w-full max-w-4xl flex-col gap-6 px-2 text-left">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={80} className="rounded-2xl" priority />
          <h1 className="select-none text-center text-4xl font-medium text-gray-300">Unbnd</h1>
        </div>

        <p className="text-center text-sm text-gray-700">
          Commonly used public APIs in one place. Use the icons in the header to open each module, explore HTTP and MCP endpoints, and integrate them into your tools.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[12px] font-medium transition-colors ${
                tab === t.id ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIncludesModalOpen(true)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[12px] font-medium transition-colors ${
              selectedIncludes.length > 0 ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Select modules for includes parameter"
          >
            <TbSelector className="h-4 w-4" />
            Includes
            {selectedIncludes.length > 0 && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{selectedIncludes.length}</span>}
          </button>
        </div>

        {includesModalOpen && <IncludesModal selectedIncludes={selectedIncludes} onSelect={setSelectedIncludes} onClose={() => setIncludesModalOpen(false)} />}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {tab === 'mcp' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800">Global MCP endpoint</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">
                    POST endpoint for all MCP tools. Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code>.
                  </p>
                </div>
                <Link href="/dns/mcp" className="shrink-0 rounded border border-gray-300 bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800">
                  Open Playground
                </Link>
              </div>
              <div className="relative mt-3">
                <input
                  type="text"
                  readOnly
                  value={mcpUrl}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-20 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
                <div className="absolute inset-y-0 right-1 flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => runGetUrl(mcpUrl)}
                    className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                    aria-label="Run: open MCP manifest in new tab"
                    title="Run: open in new tab"
                  >
                    <TbPlayerPlay className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(mcpUrl)}
                    className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                    aria-label="Copy MCP endpoint"
                  >
                    <TbCopy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <McpOneClickInstallBar endpointPath={`/api/mcp${includesParam}`} className="mt-3" />
            </>
          )}

          {tab === 'api' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800">API</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">REST API playground by module (dns, holiday, fuel-price, exchange-rate).</p>
                </div>
                <Link href="/dns/api" className="shrink-0 rounded border border-gray-300 bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800">
                  Open Playground
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
