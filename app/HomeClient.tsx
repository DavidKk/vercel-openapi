'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbApi, TbCode, TbCopy, TbRobot, TbTerminal } from 'react-icons/tb'

import { useNotification } from '@/components/Notification'

type HomeTab = 'mcp' | 'function-calling' | 'skill' | 'api'

const TABS: { id: HomeTab; label: string; icon: ReactNode }[] = [
  { id: 'api', label: 'API', icon: <TbApi className="h-4 w-4" /> },
  { id: 'mcp', label: 'MCP', icon: <TbRobot className="h-4 w-4" /> },
  { id: 'function-calling', label: 'Function Calling', icon: <TbCode className="h-4 w-4" /> },
  { id: 'skill', label: 'Skill', icon: <TbTerminal className="h-4 w-4" /> },
]

/**
 * Client-side shell for the home page: four small tab cards switch one content panel below.
 * @returns Home page client layout
 */
export function HomeClient() {
  const [tab, setTab] = useState<HomeTab>('api')
  const [origin, setOrigin] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { success: showSuccess } = useNotification()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const bashCommand = origin != null && origin.length > 0 ? `curl -fsSL "${origin}/api/install-skill" | bash -s -- all` : 'curl -fsSL "/api/install-skill" | bash -s -- all'

  const mcpUrl = origin != null && origin.length > 0 ? `${origin}/api/mcp` : '/api/mcp'
  const functionCallingToolsUrl = origin != null && origin.length > 0 ? `${origin}/api/function-calling/tools` : '/api/function-calling/tools'
  const functionCallingChatUrl = origin != null && origin.length > 0 ? `${origin}/api/function-calling/chat` : '/api/function-calling/chat'

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

  // Top padding is intentionally larger while content is relatively short.
  // When the home page grows, consider reducing pt-[15vh] to keep layout balanced.
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center bg-gray-50 px-4 pt-[15vh] pb-12">
      <div className="w-full max-w-4xl space-y-6 px-2 text-left">
        <div className="flex justify-center">
          <h1 className="select-none text-center text-4xl font-medium text-gray-300">Unbnd</h1>
        </div>

        <p className="text-center text-sm text-gray-700">
          Commonly used public APIs in one place. Use the icons in the header to open each module, explore HTTP and MCP endpoints, and integrate them into your tools.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
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
        </div>

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
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
                <button
                  type="button"
                  onClick={() => copyText(mcpUrl)}
                  className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500"
                  aria-label="Copy MCP endpoint"
                >
                  <TbCopy className="h-4 w-4" />
                  <span className="sr-only">Copy MCP endpoint</span>
                </button>
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
              <div className="mt-3 space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">Tools (GET)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={functionCallingToolsUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => copyText(functionCallingToolsUrl)}
                      className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500"
                      aria-label="Copy Function Calling tools endpoint"
                    >
                      <TbCopy className="h-4 w-4" />
                      <span className="sr-only">Copy tools endpoint</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-700">Chat (POST)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={functionCallingChatUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => copyText(functionCallingChatUrl)}
                      className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500"
                      aria-label="Copy Function Calling chat endpoint"
                    >
                      <TbCopy className="h-4 w-4" />
                      <span className="sr-only">Copy chat endpoint</span>
                    </button>
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
              </p>
              <div className="relative mt-3" onClick={handleContainerClick}>
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={bashCommand}
                  onFocus={handleFocus}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 py-2 text-[12px] font-mono text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
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
                  className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500"
                  aria-label="Copy install command"
                >
                  <TbCopy className="h-4 w-4" />
                  <span className="sr-only">Copy install command</span>
                </button>
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
