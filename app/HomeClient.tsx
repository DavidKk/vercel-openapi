'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbApi, TbCheck, TbCode, TbCopy, TbDownload, TbPlayerPlay, TbRobot, TbSelector, TbTerminal, TbX } from 'react-icons/tb'

import { useNotification } from '@/components/Notification'

type HomeTab = 'mcp' | 'function-calling' | 'skill' | 'api'

const TABS: { id: HomeTab; label: string; icon: ReactNode }[] = [
  { id: 'api', label: 'API', icon: <TbApi className="h-4 w-4" /> },
  { id: 'mcp', label: 'MCP', icon: <TbRobot className="h-4 w-4" /> },
  { id: 'function-calling', label: 'Function Calling', icon: <TbCode className="h-4 w-4" /> },
  { id: 'skill', label: 'Skill', icon: <TbTerminal className="h-4 w-4" /> },
]

/** Module options for ?includes= (same slugs as /api/mcp and function-calling). */
const MODULE_OPTIONS: { id: string; label: string }[] = [
  { id: 'holiday', label: 'Holiday' },
  { id: 'fuel-price', label: 'Fuel Price' },
  { id: 'exchange-rate', label: 'Exchange Rate' },
  { id: 'geo', label: 'China GEO' },
  { id: 'weather', label: 'Weather' },
  { id: 'movies', label: 'Movies' },
  { id: 'dns', label: 'DNS' },
  { id: 'finance', label: 'Finance' },
]

const ALL_MODULE_IDS = MODULE_OPTIONS.map((o) => o.id)

/**
 * Modal to select modules for ?includes=; chosen list is used to build MCP / function-calling / skill URLs.
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
      className="fixed top-0 left-0 z-50 !m-0 flex h-screen w-full items-center justify-center bg-black/40 p-4"
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
 * Client-side shell for the home page: four small tab cards switch one content panel below.
 * @returns Home page client layout
 */
export function HomeClient() {
  const [tab, setTab] = useState<HomeTab>('api')
  const [origin, setOrigin] = useState<string | null>(null)
  const [selectedIncludes, setSelectedIncludes] = useState<string[]>([])
  const [includesModalOpen, setIncludesModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { success: showSuccess } = useNotification()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  /** Omit ?includes= when all modules are selected (same as no filter). */
  const includesParam = selectedIncludes.length > 0 && selectedIncludes.length < MODULE_OPTIONS.length ? `?includes=${selectedIncludes.join(',')}` : ''

  const base = origin != null && origin.length > 0 ? origin : ''
  const bashCommand = base !== '' ? `curl -fsSL "${base}/api/install-skill" | bash -s -- all` : 'curl -fsSL "/api/install-skill" | bash -s -- all'

  const mcpUrl = base ? `${base}/api/mcp${includesParam}` : `/api/mcp${includesParam}`
  const functionCallingToolsUrl = base ? `${base}/api/function-calling/tools${includesParam}` : `/api/function-calling/tools${includesParam}`
  const functionCallingChatUrl = base ? `${base}/api/function-calling/chat${includesParam}` : `/api/function-calling/chat${includesParam}`
  const skillZipUrl = base ? `${base}/api/skills/all${includesParam}` : `/api/skills/all${includesParam}`

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

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select()
  }, [])

  const handleContainerClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  /** Open URL in new tab (for GET endpoints to see result). */
  const runGetUrl = useCallback((url: string) => {
    const full = url.startsWith('http') ? url : (typeof window !== 'undefined' ? window.location.origin : '') + url
    window.open(full, '_blank', 'noopener,noreferrer')
  }, [])

  /** Trigger download for Skill ZIP. */
  const runSkillDownload = useCallback(
    (url: string) => {
      const full = url.startsWith('http') ? url : (typeof window !== 'undefined' ? window.location.origin : '') + url
      const a = document.createElement('a')
      a.href = full
      a.download = 'skills.zip'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showSuccess('Download started')
    },
    [showSuccess]
  )

  // Top padding is intentionally larger while content is relatively short.
  // When the home page grows, consider reducing pt-[15vh] to keep layout balanced.
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center bg-gray-50 px-4 pt-[15vh] pb-12">
      <div className="flex w-full max-w-4xl flex-col gap-6 px-2 text-left">
        <div className="flex justify-center">
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
                <Link href="/geo/mcp" className="shrink-0 rounded border border-gray-300 bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800">
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
                    title="运行：新标签页查看"
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
            </>
          )}

          {tab === 'function-calling' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800">Function Calling endpoints</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">OpenAI-compatible tools + chat endpoints for Function Calling gateways.</p>
                </div>
                <Link href="/geo/function-calling" className="shrink-0 rounded border border-gray-300 bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800">
                  Open Playground
                </Link>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">Tools (GET)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={functionCallingToolsUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-20 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-0">
                      <button
                        type="button"
                        onClick={() => runGetUrl(functionCallingToolsUrl)}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Run: open tools JSON in new tab"
                        title="运行：新标签页查看"
                      >
                        <TbPlayerPlay className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(functionCallingToolsUrl)}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Copy tools endpoint"
                      >
                        <TbCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">Chat (POST)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={functionCallingChatUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-20 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-0">
                      <button
                        type="button"
                        onClick={() => runGetUrl(base ? `${base}/geo/function-calling` : '/geo/function-calling')}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Run: open Function Calling playground"
                        title="运行：打开 Playground"
                      >
                        <TbPlayerPlay className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(functionCallingChatUrl)}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Copy chat endpoint"
                      >
                        <TbCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'skill' && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800">Skill install command</p>
              <p className="mt-0.5 text-[11px] text-gray-600">
                One-line Bash command to download all API skills into your current directory. The command already uses this site&apos;s origin.
                {selectedIncludes.length > 0 && <span className="mt-1 block text-gray-500">已选模块时，下方为仅含所选模块的 ZIP 下载地址。</span>}
              </p>
              {selectedIncludes.length > 0 && (
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">ZIP 下载（含所选模块）</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={skillZipUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-20 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-0">
                      <button
                        type="button"
                        onClick={() => runSkillDownload(skillZipUrl)}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Run: download skill ZIP"
                        title="运行：下载 ZIP"
                      >
                        <TbDownload className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(skillZipUrl)}
                        className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                        aria-label="Copy skill ZIP URL"
                      >
                        <TbCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="relative mt-3" onClick={handleContainerClick}>
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={bashCommand}
                  onFocus={handleFocus}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-20 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
                <div className="absolute inset-y-0 right-1 flex items-center gap-0">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      runSkillDownload(skillZipUrl)
                    }}
                    className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                    aria-label="Run: download skill ZIP"
                    title="运行：下载 ZIP"
                  >
                    <TbDownload className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      copyText(bashCommand)
                      if (inputRef.current) {
                        inputRef.current.focus()
                        inputRef.current.select()
                      }
                    }}
                    className="flex h-full items-center justify-center px-2 text-gray-500 hover:text-gray-700"
                    aria-label="Copy install command"
                  >
                    <TbCopy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'api' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800">API</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">REST API playground by module (geo, holiday, fuel-price, exchange-rate).</p>
                </div>
                <Link href="/geo/api" className="shrink-0 rounded border border-gray-300 bg-gray-900 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800">
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
