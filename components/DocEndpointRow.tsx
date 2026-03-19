'use client'

import { FiCopy } from 'react-icons/fi'
import { MdOutlineAdminPanelSettings } from 'react-icons/md'

import { DOC_ENDPOINT_PATH_CLASS } from '@/app/Nav/constants'
import { MethodBadge } from '@/components/MethodBadge'
import { useNotification } from '@/components/Notification'
import { Tooltip } from '@/components/Tooltip'

export interface DocEndpointRowProps {
  /** HTTP method (GET, POST, PUT, etc.); color varies by method */
  method: string
  /** Path (e.g. "/api/holiday", "/api/mcp") */
  path: string
  /** Whether to show a copy button on the right side. */
  enableCopy?: boolean
  /** Optional small tag rendered on the far-right area (e.g. "admin"). */
  rightTag?: string
}

/**
 * One row for doc panel: method badge (color by type) + path.
 * @param props Endpoint row props
 * @returns React node
 */
export function DocEndpointRow(props: DocEndpointRowProps) {
  const { method, path, enableCopy = false, rightTag } = props
  const { success } = useNotification()

  /**
   * Copy endpoint descriptor (e.g. "GET /api/mcp/prices") to clipboard.
   * Falls back gracefully when Clipboard API is unavailable.
   */
  function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
    const copyText = (() => {
      const trimmed = path.trim()
      if (/^https?:\/\//i.test(trimmed)) return trimmed
      if (trimmed.startsWith('/')) {
        if (typeof window !== 'undefined' && window.location.origin) {
          return `${window.location.origin}${trimmed}`
        }
      }
      return trimmed
    })()

    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        success('Copied to clipboard')
      })
      .catch(() => {})
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <MethodBadge method={method} />
        <code className={DOC_ENDPOINT_PATH_CLASS}>{path}</code>
        {rightTag ? (
          rightTag === 'admin' ? (
            <Tooltip content="ADMIN" placement="top">
              <MdOutlineAdminPanelSettings className="h-3 w-3 text-indigo-700" aria-label="ADMIN" />
            </Tooltip>
          ) : (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700" aria-label={rightTag}>
              {rightTag}
            </span>
          )
        ) : null}
      </div>
      {enableCopy ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            onClick={handleCopy}
            title={`Copy ${method.toUpperCase()} ${path}`}
            aria-label={`Copy ${method.toUpperCase()} ${path}`}
          >
            <FiCopy className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
