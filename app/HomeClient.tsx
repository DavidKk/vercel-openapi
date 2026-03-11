'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TbCopy } from 'react-icons/tb'

import { useNotification } from '@/components/Notification'

/**
 * Client-side shell for the home page, including the skill install command helper
 * with one-click copy and auto-selection behavior.
 * @returns Home page client layout
 */
export function HomeClient() {
  const [origin, setOrigin] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { success: showSuccess } = useNotification()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const bashCommand = origin != null && origin.length > 0 ? `curl -fsSL "${origin}/api/install-skill" | bash -s -- all` : 'curl -fsSL "/api/install-skill" | bash -s -- all'

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(bashCommand)
      }
      showSuccess('Copied to clipboard')
    } catch {
      // no-op
    }
  }, [bashCommand, showSuccess])

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select()
  }, [])

  const handleContainerClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-4xl space-y-6 px-2 text-left">
        <div className="flex justify-center">
          <h1 className="select-none text-center text-4xl font-medium text-gray-300">Unbnd</h1>
        </div>

        <p className="text-center text-sm text-gray-700">
          Commonly used public APIs in one place. Use the icons in the header to open each module, explore HTTP and MCP endpoints, and integrate them into your tools.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-600">Skill install command</p>
          <p className="mt-1 text-[11px] text-gray-600">
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
                handleCopy()
                if (inputRef.current) {
                  inputRef.current.focus()
                  inputRef.current.select()
                }
              }}
              className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500"
              aria-label="Copy install command"
            >
              <TbCopy className="h-4 w-4" />
              <span className="sr-only">Copy</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
